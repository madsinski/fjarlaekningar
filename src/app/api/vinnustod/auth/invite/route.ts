// Virkjun aðgangs (boð eða nýskráning) og nýtt lykilorð — sami hlekkur.

import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { clientIp, hashSecret, passwordProblem, pinProblem, sameOrigin, sha256, startSession, throttle, trustDevice } from "@/lib/vinnustod/auth";
import { fail, json, readJson } from "@/lib/vinnustod/server";

export const runtime = "nodejs";

async function userForToken(token: string) {
  if (!token || token.length < 30) return null;
  const { data } = await supabaseAdmin.from("gatt_users")
    .select("id, name, email, active, password_hash, invite_expires_at")
    .eq("invite_token_hash", sha256(token)).maybeSingle();
  if (!data?.active || !data.invite_expires_at || new Date(data.invite_expires_at).getTime() < Date.now()) return null;
  return data;
}

const GONE = "Hlekkurinn er útrunninn eða hefur þegar verið notaður.";

export async function GET(req: Request) {
  if (!(await throttle(`invite:${clientIp(req)}`, 60, 900))) return fail("Of margar tilraunir.", 429);
  const u = await userForToken(new URL(req.url).searchParams.get("token") ?? "");
  if (!u) return fail(GONE, 404);
  return json({ ok: true, name: u.name, email: u.email, reset: Boolean(u.password_hash) });
}

export async function POST(req: Request) {
  if (!sameOrigin(req)) return fail("Ógild beiðni", 403);
  if (!(await throttle(`invite:${clientIp(req)}`, 60, 900))) return fail("Of margar tilraunir.", 429);
  const body = await readJson(req);
  const u = await userForToken(String(body.token ?? ""));
  if (!u) return fail(GONE, 404);

  const password = String(body.password ?? "");
  const pwErr = passwordProblem(password);
  if (pwErr) return fail(pwErr);
  const pin = body.pin ? String(body.pin) : "";
  if (pin) {
    const pinErr = pinProblem(pin);
    if (pinErr) return fail(pinErr);
  }

  const patch: Record<string, unknown> = {
    password_hash: await hashSecret(password),
    invite_token_hash: null, invite_expires_at: null,
    must_change_password: false, failed_logins: 0, locked_until: null,
  };
  if (!u.password_hash) patch.activated_at = new Date().toISOString();
  if (pin) patch.pin_hash = await hashSecret(pin);
  const { error } = await supabaseAdmin.from("gatt_users").update(patch).eq("id", u.id);
  if (error) return fail(error.message, 500);

  // Nýtt lykilorð: eldri lotur og traust tæki falla úr gildi.
  await supabaseAdmin.from("gatt_sessions").delete().eq("user_id", u.id);
  await supabaseAdmin.from("gatt_devices").delete().eq("user_id", u.id);

  const jar = await cookies();
  const ua = req.headers.get("user-agent") ?? "";
  await startSession(jar, u.id, "invite", ua);
  await trustDevice(jar, u.id, ua);
  return json({ ok: true });
}
