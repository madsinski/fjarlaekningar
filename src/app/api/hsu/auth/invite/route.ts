// Virkjun aðgangs (boð) og endurstilling lykilorðs — sami hlekkur, sama leið.

import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { clientIp, hashSecret, passwordProblem, pinProblem, sameOrigin, sha256, startSession, throttle, trustDevice } from "@/lib/hsu/auth";
import { fail, json, readJson } from "@/lib/hsu/server";
import { tr } from "@/lib/hsu/i18n/server";
import { apiDoctor } from "@/lib/hsu/i18n/messages/api-doctor";

export const runtime = "nodejs";

async function doctorForToken(token: string) {
  if (!token || token.length < 30) return null;
  const { data } = await supabaseAdmin
    .from("hsu_doctors")
    .select("id, name, email, role, active, password_hash, invite_expires_at")
    .eq("invite_token_hash", sha256(token))
    .maybeSingle();
  if (!data?.active || !data.invite_expires_at || new Date(data.invite_expires_at).getTime() < Date.now()) return null;
  return data;
}

export async function GET(req: Request) {
  const t = tr(req, apiDoctor);
  if (!(await throttle(`invite:${clientIp(req)}`, 60, 900))) return fail(t("invite.tooMany"), 429);
  const token = new URL(req.url).searchParams.get("token") ?? "";
  const d = await doctorForToken(token);
  if (!d) return fail(t("invite.expired"), 404);
  return json({ ok: true, name: d.name, email: d.email, reset: Boolean(d.password_hash) });
}

export async function POST(req: Request) {
  const t = tr(req, apiDoctor);
  if (!sameOrigin(req)) return fail(t("req.invalid"), 403);
  const body = await readJson(req);
  const d = await doctorForToken(String(body.token ?? ""));
  if (!d) return fail(t("invite.expired"), 404);

  const password = String(body.password ?? "");
  const pwErr = passwordProblem(password, t.lang);
  if (pwErr) return fail(pwErr);
  const pin = body.pin ? String(body.pin) : "";
  if (pin) {
    const pinErr = pinProblem(pin, t.lang);
    if (pinErr) return fail(pinErr);
  }

  const patch: Record<string, unknown> = {
    password_hash: await hashSecret(password),
    invite_token_hash: null,
    invite_expires_at: null,
    must_change_password: false,
    failed_logins: 0,
    locked_until: null,
  };
  if (!d.password_hash) patch.activated_at = new Date().toISOString();
  if (pin) patch.pin_hash = await hashSecret(pin);
  const { error } = await supabaseAdmin.from("hsu_doctors").update(patch).eq("id", d.id);
  if (error) return fail(error.message, 500);

  // Nýtt lykilorð: allar eldri lotur og traust tæki falla úr gildi. Sá sem
  // endurstillir vegna gruns um misnotkun á ekki að þurfa að gera meira.
  await supabaseAdmin.from("hsu_sessions").delete().eq("doctor_id", d.id);
  await supabaseAdmin.from("hsu_devices").delete().eq("doctor_id", d.id);

  const jar = await cookies();
  const ua = req.headers.get("user-agent") ?? "";
  await startSession(jar, d.id, "invite", ua);
  await trustDevice(jar, d.id, ua);
  return json({ ok: true, next: d.role === "head" ? "/hsu/stjorn" : "/hsu/min-sida" });
}
