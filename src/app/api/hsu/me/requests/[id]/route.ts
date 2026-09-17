// Læknir svarar beiðni yfirlæknis um vakt umfram hámark sitt.

import { after } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { audit } from "@/lib/hsu/auth";
import { hsuSync } from "@/lib/hsu/calendar";
import { shiftPhrase } from "@/lib/hsu/market";
import { notifyHeads } from "@/lib/hsu/notify";
import { UUID_RE, fail, json, originOf, readJson, requireDoctor } from "@/lib/hsu/server";
import { translator, type Lang } from "@/lib/hsu/i18n/core";
import { notifyMsgs } from "@/lib/hsu/i18n/messages/notify";
import { tr } from "@/lib/hsu/i18n/server";
import { apiDoctor } from "@/lib/hsu/i18n/messages/api-doctor";

export const runtime = "nodejs";

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireDoctor(req);
  if ("res" in auth) return auth.res;
  const t = tr(req, apiDoctor);
  const me = auth.doctor;
  const { id } = await ctx.params;
  if (!UUID_RE.test(id)) return fail(t("req.invalid"));
  const action = String((await readJson(req)).action ?? "");

  const { data: shift } = await supabaseAdmin
    .from("hsu_shifts")
    .select("id, doctor_id, confirm_status, shift_date, starts, ends, label, published, requested_by")
    .eq("id", id)
    .maybeSingle();
  if (!shift || shift.doctor_id !== me.id || shift.confirm_status !== "requested") {
    return fail(t("request.inactive"), 409);
  }
  const origin = originOf(req);
  const month = shift.shift_date.slice(0, 7);
  const n = (key: "accepted" | "declined") => ({
    origin,
    subject: (l: Lang) => translator(notifyMsgs, l)(`request.${key}.subject` as const, { name: me.name }),
    heading: (l: Lang) => translator(notifyMsgs, l)(`request.${key}.heading` as const),
    lines: [(l: Lang) => translator(notifyMsgs, l)(`request.${key}.line` as const, { name: me.name, shift: shiftPhrase(shift, l) })],
    path: `/hsu/stjorn?t=plan&m=${month}`,
  });

  if (action === "accept") {
    // Skilyrt á stöðuna svo tvöfaldur smellur samþykki ekki vakt sem var dregin til baka á meðan.
    const { data, error } = await supabaseAdmin.from("hsu_shifts")
      .update({ confirm_status: null }).eq("id", id).eq("doctor_id", me.id).eq("confirm_status", "requested").select("id");
    if (error) return fail(error.message, 500);
    if (!data?.length) return fail(t("request.inactive"), 409);
    if (shift.published) after(async () => { await hsuSync.syncDoctors([me.id]); });
    await audit(me.name, "request.accept", month, { shiftId: id });
    notifyHeads(n("accepted"));
    return json({ ok: true });
  }

  if (action === "decline") {
    const { data, error } = await supabaseAdmin.from("hsu_shifts")
      .update({ doctor_id: null, confirm_status: null, requested_by: "", requested_at: null })
      .eq("id", id).eq("doctor_id", me.id).eq("confirm_status", "requested").select("id");
    if (error) return fail(error.message, 500);
    if (!data?.length) return fail(t("request.inactive"), 409);
    await audit(me.name, "request.decline", month, { shiftId: id });
    notifyHeads(n("declined"));
    return json({ ok: true });
  }

  return fail(t("req.unknownAction"));
}
