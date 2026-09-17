// Yfirlæknir samþykkir eða hafnar vaktaskiptum, eða fellir boð niður.

import { after } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { audit } from "@/lib/hsu/auth";
import { shiftPhrase, transferShift } from "@/lib/hsu/market";
import { notifyDoctors } from "@/lib/hsu/notify";
import { say } from "@/lib/hsu/shift-edit";
import { DEFAULT_LANG, isLang, translator } from "@/lib/hsu/i18n/core";
import { UUID_RE, fail, hsuEmailHtml, json, originOf, readJson, requireManager, sendHsuEmail } from "@/lib/hsu/server";
import { tr } from "@/lib/hsu/i18n/server";
import { apiAdmin } from "@/lib/hsu/i18n/messages/api-admin";
import { emailMode } from "@/lib/hsu/email-prefs";

export const runtime = "nodejs";

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireManager(req);
  if ("res" in auth) return auth.res;
  const t = tr(req, apiAdmin);
  const { id } = await ctx.params;
  if (!UUID_RE.test(id)) return fail(t("err.badRequest"));
  const action = String((await readJson(req)).action ?? "");
  const origin = originOf(req);

  const { data: swap } = await supabaseAdmin
    .from("hsu_swaps")
    .select("id, shift_id, from_doctor, to_doctor, taken_by, status, shift:hsu_shifts(shift_date, starts, ends, label, doctor_id)")
    .eq("id", id)
    .maybeSingle();
  if (!swap) return fail(t("err.notFound"), 404);
  const shift = swap.shift as unknown as { shift_date: string; starts: string; ends: string; label: string; doctor_id: string | null };
  const now = new Date().toISOString();

  if (action === "approve") {
    if (swap.status !== "awaiting_approval" || !swap.taken_by) return fail(t("err.nothingAwaiting"), 409);
    await transferShift({ swapId: swap.id, shiftId: swap.shift_id, fromDoctor: swap.from_doctor, toDoctor: swap.taken_by, actor: auth.actor.label, origin });
    notifyDoctors({
      origin,
      category: "marketMine",
      subject: say((l) => l("swapApproved.subject")),
      heading: say((l) => l("swapApproved.subject")),
      notices: [{ doctorId: swap.taken_by, line: say((l) => l("swapApproved.line", { by: auth.actor.label, shift: shiftPhrase(shift, l.lang) })) }],
    });
    return json({ ok: true });
  }

  if (action === "reject") {
    if (swap.status !== "awaiting_approval") return fail(t("err.nothingAwaiting"), 409);
    await supabaseAdmin.from("hsu_swaps").update({ status: "pending", taken_by: null }).eq("id", swap.id);
    await audit(auth.actor.label, "market.reject", shift.shift_date.slice(0, 7), { swapId: swap.id });
    after(async () => {
      if ((await emailMode("marketMine")) !== "now") return;
      const { data: d } = await supabaseAdmin.from("hsu_doctors").select("name, email, lang").eq("id", swap.taken_by).maybeSingle();
      if (d) {
        const lang = isLang(d.lang) ? d.lang : DEFAULT_LANG;
        const tl = translator(apiAdmin, lang);
        const vars = { by: auth.actor.label, shift: shiftPhrase(shift, lang) };
        await sendHsuEmail(d.email, tl("swapRejected.subject"), hsuEmailHtml({
          origin, lang, heading: tl("swapRejected.subject"),
          paragraphs: [tl("email.hello", { name: d.name }), tl("swapRejected.body", vars)],
        }), tl("swapRejected.text", vars));
      }
    });
    return json({ ok: true });
  }

  if (action === "cancel") {
    if (!["pending", "awaiting_approval"].includes(swap.status)) return fail(t("err.offerInactive"), 409);
    await supabaseAdmin.from("hsu_swaps").update({ status: "cancelled", resolved_at: now }).eq("id", swap.id);
    await supabaseAdmin.from("hsu_shifts").update({ status: "assigned" }).eq("id", swap.shift_id);
    await audit(auth.actor.label, "market.cancel", shift.shift_date.slice(0, 7), { swapId: swap.id });
    const vars = (lang: Parameters<typeof shiftPhrase>[1] = DEFAULT_LANG) => ({ by: auth.actor.label, shift: shiftPhrase(shift, lang) });
    const line = say((l) => l("offerCancelled.line", vars(l.lang)));
    notifyDoctors({
      origin,
      category: "marketMine",
      subject: say((l) => l("offerCancelled.subject")),
      heading: say((l) => l("offerCancelled.subject")),
      notices: [
        ...(swap.from_doctor ? [{ doctorId: swap.from_doctor, line: say((l) => l("offerCancelled.lineOwner", vars(l.lang))) }] : []),
        ...(swap.to_doctor ? [{ doctorId: swap.to_doctor, line }] : []),
        ...(swap.taken_by && swap.taken_by !== swap.to_doctor ? [{ doctorId: swap.taken_by, line }] : []),
      ],
    });
    return json({ ok: true });
  }

  return fail(t("err.unknownAction"));
}
