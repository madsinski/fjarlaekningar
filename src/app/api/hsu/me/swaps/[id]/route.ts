// Taka vakt af vaktamarkaði, hafna beinu boði eða draga eigið boð til baka —
// og svara beiðni um VAKTASKIPTI (want_shift_id sett): samþykkja, hafna eða
// draga til baka. Yfirlæknir getur líka samþykkt skiptin (admin/swaps/[id]).

import { after } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { audit } from "@/lib/hsu/auth";
import { canDoBakvakt, hasShiftThatDay, isBakvaktShift, loadSwapSides, shiftPhrase, swapOverlap, swapShifts, transferShift } from "@/lib/hsu/market";
import { hsuSync } from "@/lib/hsu/calendar";
import { notifyDoctors, notifyHeads } from "@/lib/hsu/notify";
import { UUID_RE, fail, hsuEmailHtml, json, originOf, readJson, requireDoctor, sendHsuEmail } from "@/lib/hsu/server";
import { DEFAULT_LANG, isLang, translator, type Lang } from "@/lib/hsu/i18n/core";
import { notifyMsgs } from "@/lib/hsu/i18n/messages/notify";
import { tr } from "@/lib/hsu/i18n/server";
import { apiDoctor } from "@/lib/hsu/i18n/messages/api-doctor";
import { emailModeFor } from "@/lib/hsu/email-prefs";

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
    .select("id, shift_id, want_shift_id, from_doctor, to_doctor, taken_by, status, shift:hsu_shifts!hsu_swaps_shift_id_fkey(shift_date, starts, ends, label, doctor_id)")
    .eq("id", id)
    .maybeSingle();
  if (!swap) return fail(t("swap.notFound"), 404);
  const shift = swap.shift as unknown as { shift_date: string; starts: string; ends: string; label: string; doctor_id: string | null } | null;
  if (!shift) return fail(t("shift.notFound"), 404);
  const now = new Date().toISOString();
  const origin = originOf(req);

  // Skipti eru gagnkvæm og fara aðra leið en boð.
  if (swap.want_shift_id) {
    return swapAnswer(
      { id: swap.id, shift_id: swap.shift_id, want_shift_id: swap.want_shift_id, from_doctor: swap.from_doctor, to_doctor: swap.to_doctor, status: swap.status },
      action, me, t, origin,
    );
  }

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
      if ((await emailModeFor(swap.from_doctor, "marketMine")) !== "now") return;
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

/**
 * Svar við beiðni um vaktaskipti. Viðtakandinn samþykkir eða hafnar;
 * beiðandinn getur dregið hana til baka. Yfirlæknir samþykkir annars staðar.
 */
async function swapAnswer(
  swap: { id: string; shift_id: string; want_shift_id: string; from_doctor: string | null; to_doctor: string | null; status: string },
  action: string,
  me: { id: string; name: string },
  t: ReturnType<typeof tr<typeof apiDoctor.is>>,
  origin: string,
) {
  const now = new Date().toISOString();
  const sides = await loadSwapSides(swap.shift_id, swap.want_shift_id);
  if (!sides) return fail(t("shift.notFound"), 404);
  const { a: mine, b: theirs } = sides;   // mine = vaktin sem beiðandinn gefur
  const names = async () => {
    const { data } = await supabaseAdmin.from("hsu_doctors").select("id, name").in("id", [swap.from_doctor, swap.to_doctor].filter(Boolean) as string[]);
    return new Map((data ?? []).map((d) => [d.id as string, d.name as string]));
  };

  if (action === "accept") {
    if (swap.status !== "pending") return fail(t("swap.inactive"), 409);
    if (swap.to_doctor !== me.id) return fail(t("req.notAllowed"), 403);
    // Vaktirnar gætu hafa breyst frá því beiðnin var gerð.
    if (mine.doctor_id !== swap.from_doctor || theirs.doctor_id !== me.id) return fail(t("swapReq.gone"), 409);
    if (mine.shift_date < now.slice(0, 10) || theirs.shift_date < now.slice(0, 10)) return fail(t("shift.past"));
    if ((await isBakvaktShift(mine.id)) && !(await canDoBakvakt(me.id))) return fail(t("swap.noBakvakt"), 403);
    if ((await isBakvaktShift(theirs.id)) && !(await canDoBakvakt(swap.from_doctor!))) return fail(t("swap.targetNoBakvakt"), 409);
    const clash = await swapOverlap(mine, theirs);
    if (clash === "b") return fail(t("swap.overlap"), 409);
    if (clash === "a") return fail(t("swapReq.theirOverlap"), 409);

    await swapShifts({
      swapId: swap.id, a: mine, b: theirs,
      aDoctor: swap.from_doctor!, bDoctor: me.id,
      actor: me.name, origin,
    });
    return json({ ok: true });
  }

  if (action === "decline") {
    if (swap.status !== "pending" || swap.to_doctor !== me.id) return fail(t("req.notAllowed"), 403);
    await supabaseAdmin.from("hsu_swaps").update({ status: "declined", resolved_at: now }).eq("id", swap.id);
    await audit(me.name, "swap.decline", mine.shift_date.slice(0, 7), { swapId: swap.id });
    notifyDoctors({
      origin,
      category: "marketMine",
      subject: (l) => translator(notifyMsgs, l)("swap.declined.subject", { name: me.name }),
      heading: (l) => translator(notifyMsgs, l)("swap.declined.heading"),
      notices: [{
        doctorId: swap.from_doctor!,
        line: (l: Lang) => translator(notifyMsgs, l)("swap.declined.line", { name: me.name, gave: shiftPhrase(mine, l), got: shiftPhrase(theirs, l) }),
      }],
      cta: { label: (l) => translator(notifyMsgs, l)("cta.myShifts"), path: "/hsu/min-sida?t=plan" },
    });
    return json({ ok: true });
  }

  if (action === "cancel") {
    if (swap.status !== "pending" || swap.from_doctor !== me.id) return fail(t("req.notAllowed"), 403);
    await supabaseAdmin.from("hsu_swaps").update({ status: "cancelled", resolved_at: now }).eq("id", swap.id);
    await audit(me.name, "swap.cancel", mine.shift_date.slice(0, 7), { swapId: swap.id });
    const who = (await names()).get(me.id) ?? me.name;
    notifyDoctors({
      origin,
      category: "marketMine",
      subject: (l) => translator(notifyMsgs, l)("swap.cancelled.subject", { name: who }),
      heading: (l) => translator(notifyMsgs, l)("swap.cancelled.heading"),
      notices: swap.to_doctor ? [{ doctorId: swap.to_doctor, line: (l: Lang) => translator(notifyMsgs, l)("swap.cancelled.line", { name: who }) }] : [],
      cta: { label: (l) => translator(notifyMsgs, l)("cta.market"), path: "/hsu/min-sida?t=markadur" },
    });
    return json({ ok: true });
  }

  return fail(t("req.unknownAction"));
}
