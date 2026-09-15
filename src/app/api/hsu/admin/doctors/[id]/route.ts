// Breyta lækni, senda nýtt boð, setja lykilorð, afvirkja eða eyða.

import { supabaseAdmin } from "@/lib/supabase-admin";
import { audit, hashSecret, issueAccessLink, passwordProblem } from "@/lib/hsu/auth";
import { hsuSync } from "@/lib/hsu/calendar";
import { DOCTOR_COLUMNS, UUID_RE, fail, json, originOf, readJson, requireManager, toPublicDoctor } from "@/lib/hsu/server";
import { HSU_EMAIL_DOMAIN, normalizeEmail } from "@/lib/hsu/types";
import { emailAllowed, sendInviteEmail } from "@/lib/hsu/doctors";

export const runtime = "nodejs";

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireManager(req);
  if ("res" in auth) return auth.res;
  const { id } = await ctx.params;
  if (!UUID_RE.test(id)) return fail("Ógild beiðni");
  const body = await readJson(req);
  const self = auth.actor.kind === "doctor" && auth.actor.doctor.id === id;

  const { data: current } = await supabaseAdmin.from("hsu_doctors").select(DOCTOR_COLUMNS).eq("id", id).maybeSingle();
  if (!current) return fail("Læknir fannst ekki", 404);

  const patch: Record<string, unknown> = {};
  if (typeof body.name === "string" && body.name.trim()) patch.name = body.name.trim().slice(0, 120);
  if (typeof body.email === "string") {
    const email = normalizeEmail(body.email);
    if (!emailAllowed(email)) return fail(`Notandanafn þarf að vera @${HSU_EMAIL_DOMAIN} netfang.`);
    patch.email = email;
  }
  if (typeof body.phone === "string") patch.phone = body.phone.slice(0, 40);
  if (typeof body.title === "string") patch.title = body.title.slice(0, 80);
  if (typeof body.color === "string" && /^#[0-9a-f]{6}$/i.test(body.color)) patch.color = body.color;
  if (body.fte !== undefined) patch.fte = Math.min(100, Math.max(0, Math.round(Number(body.fte)) || 0));
  if (body.role === "head" || body.role === "doctor") {
    // Yfirlæknir getur ekki lækkað sjálfan sig — þá gæti enginn stjórnað.
    if (self && body.role !== "head") return fail("Þú getur ekki fjarlægt eigin yfirlæknisréttindi.");
    patch.role = body.role;
  }
  if (typeof body.active === "boolean") {
    if (self && !body.active) return fail("Þú getur ekki afvirkjað sjálfan þig.");
    patch.active = body.active;
  }

  let link: string | null = null;
  let emailed = false;
  const origin = originOf(req);

  if (body.set_password) {
    const pw = String(body.set_password);
    const problem = passwordProblem(pw);
    if (problem) return fail(problem);
    patch.password_hash = await hashSecret(pw);
    patch.must_change_password = true;
    patch.failed_logins = 0;
    patch.locked_until = null;
    if (!current.password_hash) patch.activated_at = new Date().toISOString();
  }
  if (body.clear_pin) patch.pin_hash = null;
  if (body.unlock) { patch.failed_logins = 0; patch.locked_until = null; }

  if (Object.keys(patch).length) {
    const { error } = await supabaseAdmin.from("hsu_doctors").update(patch).eq("id", id);
    if (error) {
      if (error.code === "23505") return fail("Annar læknir er með þetta netfang.", 409);
      return fail(error.message, 500);
    }
  }

  // Lykilorð sett af öðrum eða aðgangur afvirkjaður: allar lotur út.
  if (body.set_password || body.active === false || body.logout_all) {
    await supabaseAdmin.from("hsu_sessions").delete().eq("doctor_id", id);
    if (body.active === false) await supabaseAdmin.from("hsu_devices").delete().eq("doctor_id", id);
  }

  if (body.resend_invite || body.invite_link) {
    link = await issueAccessLink(id, current.password_hash ? "reset" : "invite", origin);
    if (body.resend_invite) {
      const r = await sendInviteEmail(origin, { name: String(patch.name ?? current.name), email: String(patch.email ?? current.email) }, link, auth.actor.label);
      emailed = r.ok;
    }
  }

  await audit(auth.actor.label, "doctor.update", null, {
    doctorId: id,
    fields: Object.keys(patch).filter((k) => !k.includes("hash")),
    ...(body.set_password ? { setPassword: true } : {}),
    ...(body.resend_invite ? { invite: true } : {}),
  });

  const { data: fresh } = await supabaseAdmin.from("hsu_doctors").select(DOCTOR_COLUMNS).eq("id", id).single();
  return json({ ok: true, doctor: toPublicDoctor(fresh), link, emailed });
}

export async function DELETE(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireManager(req);
  if ("res" in auth) return auth.res;
  const { id } = await ctx.params;
  if (!UUID_RE.test(id)) return fail("Ógild beiðni");
  if (auth.actor.kind === "doctor" && auth.actor.doctor.id === id) return fail("Þú getur ekki eytt sjálfum þér.");
  // Dagatal læknisins hreinsað áður en röðin hverfur — annars sitja vaktirnar
  // eftir í Google-dagatali hans án þess að nokkur geti fjarlægt þær.
  await hsuSync.disconnect(id).catch(() => {});
  const { error } = await supabaseAdmin.from("hsu_doctors").delete().eq("id", id);
  if (error) return fail(error.message, 500);
  await audit(auth.actor.label, "doctor.delete", null, { doctorId: id });
  return json({ ok: true });
}
