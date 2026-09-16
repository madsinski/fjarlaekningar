// Innskráning í vinnustöð með netfangi og lykilorði.

import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase-admin";
import {
  DEVICE_COOKIE, LOCK_MINUTES, MAX_PASSWORD_FAILURES,
  clientIp, normalizeEmail, sameOrigin, sha256, startSession, throttle, trustDevice, verifySecret,
} from "@/lib/vinnustod/auth";
import { fail, json, readJson } from "@/lib/vinnustod/server";

export const runtime = "nodejs";

const WRONG = "Rangt netfang eða lykilorð.";

export async function POST(req: Request) {
  if (!sameOrigin(req)) return fail("Ógild beiðni", 403);
  const body = await readJson(req);
  const email = normalizeEmail(String(body.email ?? ""));
  const password = String(body.password ?? "");
  if (!email || !password) return fail("Sláðu inn netfang og lykilorð.");
  if (!(await throttle(`login:${clientIp(req)}`, 30, 900))) {
    return fail("Of margar innskráningartilraunir frá þessu neti. Reyndu aftur eftir stutta stund.", 429);
  }
  // Á hvert netfang, óháð því hvort það er skráð: sá sem prófar lykilorð nær
  // aldrei læsingunni, sem annars segði að reikningurinn væri til.
  if (!(await throttle(`login-email:${email}`, 6, 900))) {
    return fail("Of margar innskráningartilraunir. Reyndu aftur eftir stutta stund.", 429);
  }

  const { data: u } = await supabaseAdmin
    .from("gatt_users")
    .select("id, active, password_hash, pin_hash, failed_logins, locked_until, must_change_password")
    .eq("email", email)
    .maybeSingle();

  if (u?.locked_until && new Date(u.locked_until).getTime() > Date.now()) {
    const mins = Math.ceil((new Date(u.locked_until).getTime() - Date.now()) / 60000);
    return fail(`Of margar rangar tilraunir. Reyndu aftur eftir ${mins} mín.`, 429);
  }

  // scrypt keyrir líka þegar notandinn er ekki til — svartíminn afhjúpar ekki netföng.
  const ok = await verifySecret(password, u?.active ? u.password_hash : null);
  if (!u || !u.active || !ok) {
    if (u) {
      const failures = (u.failed_logins ?? 0) + 1;
      await supabaseAdmin.from("gatt_users").update(
        failures >= MAX_PASSWORD_FAILURES
          ? { failed_logins: 0, locked_until: new Date(Date.now() + LOCK_MINUTES * 60000).toISOString() }
          : { failed_logins: failures },
      ).eq("id", u.id);
    }
    return fail(WRONG, 401);
  }

  const jar = await cookies();
  const ua = req.headers.get("user-agent") ?? "";
  await startSession(jar, u.id, "password", ua);
  // Tæki annars notanda er aldrei endurnýtt.
  const existing = jar.get(DEVICE_COOKIE)?.value;
  let reuse: string | undefined;
  if (existing) {
    const { data: dev } = await supabaseAdmin.from("gatt_devices").select("user_id").eq("token_hash", sha256(existing)).maybeSingle();
    if (dev?.user_id === u.id) reuse = existing;
  }
  await trustDevice(jar, u.id, ua, reuse);
  return json({ ok: true, hasPin: Boolean(u.pin_hash), mustChangePassword: u.must_change_password });
}
