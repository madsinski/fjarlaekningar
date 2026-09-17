// Taka vakt af vaktamarkaði, hafna beinu boði eða draga eigið boð til baka.

import { after } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { audit } from "@/lib/hsu/auth";
import { canDoBakvakt, hasShiftThatDay, isBakvaktShift, shiftPhrase, transferShift } from "@/lib/hsu/market";
import { hsuSync } from "@/lib/hsu/calendar";
import { notifyDoctors, notifyHeads } from "@/lib/hsu/notify";
import { UUID_RE, fail, hsuEmailHtml, json, originOf, readJson, requireDoctor, sendHsuEmail } from "@/lib/hsu/server";
import { DEFAULT_LANG, isLang, translator, type Lang } from "@/lib/hsu/i18n/core";
import { notifyMsgs } from "@/lib/hsu/i18n/messages/notify";
import { tr } from "@/lib/hsu/i18n/server";
import { apiDoctor } from "@/lib/hsu/i18n/messages/api-doctor";
import { emailMode } from "@/lib/hsu/email-prefs";

export const runtime = "nodejs";

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireDoctor(req);
  if ("res" in auth) return auth.res;
  const t = tr(req, apiDoctor);
  const me = auth.doctor;
  const { id } = await ctx.params;
  if (!UUID_RE.test(id)) return fail(t("req.invalid"));
  const action = String((await readJson(req)).action ?? "");

  const { data: swap } = await supabaseAdmin
    .from("hsu_swaps")
    .select("id, shift_id, from_doctor, to_doctor, taken_by, status, shift:hsu_shifts(shift_date, starts, ends, label, doctor_id)")
    .eq("id", id)
    .maybeSingle();
  if (!swap) return fail(t("swap.notFound"), 404);
  const shift = swap.shift as unknown as { shift_date: string; starts: string; ends: string; label: string; doctor_id: string | null } | null;
  if (!shift) return fail(t("shift.notFound"), 404);
  const now = new Date().toISOString();
  const origin = originOf(req);

  if (action === "accept") {
    if (swap.status !== "pending") return fail(t("swap.inactive"), 409);
    const mayTake = swap.to_doctor ? swap.to_doctor === me.id : swap.from_doctor !== me.id;
    if (!mayTake) return fail(t("req.notAllowed"), 403);
    if (shift.doctor_id !== swap.from_doctor) return fail(t("swap.alreadyMoved"), 409);
    if (shift.shift_date < now.slice(0, 10)) return fail(t("shift.past"));
    if (await hasShiftThatDay(me.id, shift.shift_date, swap.shift_id)) return fail(t("swap.overlap"), 409);
    if ((await isBakvaktShift(swap.shift_id)) && !(await canDoBakvakt(me.id))) return fail(t("swap.noBakvakt"), 403);

    const { data: settings } = await supabaseAdmin.from("hsu_settings").select("market_requires_approval").eq("id", 1).maybeSingle();
    if (settings?.market_requires_approval) {
      await supabaseAdmin.from("hsu_swaps").update({ status: "awaiting_approval", taken_by: me.id }).eq("id", swap.id).eq("status", "pending");
      await audit(me.name, "market.request", shift.shift_date.slice(0, 7), { swapId: swap.id });
      // Yfirlæknar fá póst á sínu tungumáli (sami póstur og áður: fyrirsögn = efni).
      const subject = (l: Lang) => translator(notifyMsgs, l)("market.approval.subject");
      notifyHeads({
        origin,
        subject,
        heading: subject,
        lines: [(l) => translator(notifyMsgs, l)("market.approval.line", { name: me.name, shift: shiftPhrase(shift, l) })],
        path: "/hsu/stjorn?t=markadur",
      });
      return json({ ok: true, awaitingApproval: true });
    }

    await transferShift({ swapId: swap.id, shiftId: swap.shift_id, fromDoctor: swap.from_doctor, toDoctor: me.id, actor: me.name, origin });
    return json({ ok: true });
  }

  if (action === "decline") {
    if (swap.status !== "pending" || swap.to_doctor !== me.id) return fail(t("req.notAllowed"), 403);
    await supabaseAdmin.from("hsu_swaps").update({ status: "declined", resolved_at: now }).eq("id", swap.id);
    await supabaseAdmin.from("hsu_shifts").update({ status: "assigned" }).eq("id", swap.shift_id);
    await audit(me.name, "market.decline", shift.shift_date.slice(0, 7), { swapId: swap.id });
    after(async () => {
      if ((await emailMode("marketMine")) !== "now") return;
      const { data: from } = await supabaseAdmin.from("hsu_doctors").select("email, lang").eq("id", swap.from_doctor).maybeSingle();
      if (from) {
        const lang = isLang(from.lang) ? from.lang : DEFAULT_LANG;
        const tn = translator(notifyMsgs, lang);
        const vars = { name: me.name, shift: shiftPhrase(shift, lang) };
        await sendHsuEmail(from.email, tn("market.declined.subject", vars), hsuEmailHtml({
          origin, lang, heading: tn("market.declined.heading"),
          paragraphs: [tn("market.declined.line", vars), tn("market.declined.hint")],
          cta: { label: tn("cta.myPage"), url: `${origin}/hsu/min-sida` },
        }), tn("market.declined.text", vars));
      }
    });
    return json({ ok: true });
  }

  if (action === "cancel") {
    if (!["pending", "awaiting_approval"].includes(swap.status) || swap.from_doctor !== me.id) return fail(t("req.notAllowed"), 403);
    await supabaseAdmin.from("hsu_swaps").update({ status: "cancelled", resolved_at: now }).eq("id", swap.id);
    await supabaseAdmin.from("hsu_shifts").update({ status: "assigned" }).eq("id", swap.shift_id);
    await audit(me.name, "market.cancel", shift.shift_date.slice(0, 7), { swapId: swap.id });
    after(async () => { await hsuSync.syncDoctors([me.id]); });
    // Sá sem fékk beint boð, eða bað um að taka vaktina, á að vita að boðið er fallið.
    const told = [swap.to_doctor, swap.taken_by].filter((x, i, a): x is string => Boolean(x) && a.indexOf(x) === i);
    notifyDoctors({
      origin,
      category: "marketMine",
      subject: (l) => translator(notifyMsgs, l)("market.cancelled.subject"),
      heading: (l) => translator(notifyMsgs, l)("market.cancelled.heading"),
      notices: told.map((doctorId) => ({
        doctorId,
        line: (l: Lang) => translator(notifyMsgs, l)("market.cancelled.line", { name: me.name, shift: shiftPhrase(shift, l) }),
      })),
      cta: { label: (l) => translator(notifyMsgs, l)("cta.market"), path: "/hsu/min-sida?t=markadur" },
    });
    return json({ ok: true });
  }

  return fail(t("req.unknownAction"));
}
