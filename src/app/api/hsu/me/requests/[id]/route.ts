// Læknir svarar beiðni yfirlæknis um vakt umfram hámark sitt.

import { after } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { audit } from "@/lib/hsu/auth";
import { hsuSync } from "@/lib/hsu/calendar";
import { shiftPhrase } from "@/lib/hsu/market";
import { notifyHeads } from "@/lib/hsu/notify";
import { UUID_RE, fail, json, originOf, readJson, requireDoctor } from "@/lib/hsu/server";

export const runtime = "nodejs";

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireDoctor(req);
  if ("res" in auth) return auth.res;
  const me = auth.doctor;
  const { id } = await ctx.params;
  if (!UUID_RE.test(id)) return fail("Ógild beiðni");
  const action = String((await readJson(req)).action ?? "");

  const { data: shift } = await supabaseAdmin
    .from("hsu_shifts")
    .select("id, doctor_id, confirm_status, shift_date, starts, ends, label, published, requested_by")
    .eq("id", id)
    .maybeSingle();
  if (!shift || shift.doctor_id !== me.id || shift.confirm_status !== "requested") {
    return fail("Beiðnin er ekki lengur virk", 409);
  }
  const origin = originOf(req);
  const month = shift.shift_date.slice(0, 7);

  if (action === "accept") {
    // Skilyrt á stöðuna svo tvöfaldur smellur samþykki ekki vakt sem var dregin til baka á meðan.
    const { data, error } = await supabaseAdmin.from("hsu_shifts")
      .update({ confirm_status: null }).eq("id", id).eq("doctor_id", me.id).eq("confirm_status", "requested").select("id");
    if (error) return fail(error.message, 500);
    if (!data?.length) return fail("Beiðnin er ekki lengur virk", 409);
    if (shift.published) after(async () => { await hsuSync.syncDoctors([me.id]); });
    await audit(me.name, "request.accept", month, { shiftId: id });
    notifyHeads({ origin, subject: `${me.name} samþykkti aukavakt`, heading: "Aukavakt samþykkt", lines: [`${me.name} samþykkti að taka vaktina ${shiftPhrase(shift)}.`], path: `/hsu/stjorn?t=plan&m=${month}` });
    return json({ ok: true });
  }

  if (action === "decline") {
    const { data, error } = await supabaseAdmin.from("hsu_shifts")
      .update({ doctor_id: null, confirm_status: null, requested_by: "", requested_at: null })
      .eq("id", id).eq("doctor_id", me.id).eq("confirm_status", "requested").select("id");
    if (error) return fail(error.message, 500);
    if (!data?.length) return fail("Beiðnin er ekki lengur virk", 409);
    await audit(me.name, "request.decline", month, { shiftId: id });
    notifyHeads({ origin, subject: `${me.name} hafnaði aukavakt`, heading: "Aukavakt hafnað", lines: [`${me.name} getur ekki tekið vaktina ${shiftPhrase(shift)}. Vaktin er aftur án læknis.`], path: `/hsu/stjorn?t=plan&m=${month}` });
    return json({ ok: true });
  }

  return fail("Óþekkt aðgerð");
}
