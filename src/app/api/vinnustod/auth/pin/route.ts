// Innskráning með 4 stafa aðgangskóða — aðeins á traustu tæki.

import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { DEVICE_COOKIE, MAX_PIN_FAILURES, clientIp, sameOrigin, sha256, startSession, throttle, verifySecret } from "@/lib/vinnustod/auth";
import { fail, json, readJson } from "@/lib/vinnustod/server";

export const runtime = "nodejs";

export async function POST(req: Request) {
  if (!sameOrigin(req)) return fail("Ógild beiðni", 403);
  if (!(await throttle(`pin:${clientIp(req)}`, 30, 900))) return fail("Of margar tilraunir. Reyndu aftur eftir stutta stund.", 429);
  const jar = await cookies();
  const deviceToken = jar.get(DEVICE_COOKIE)?.value;
  if (!deviceToken) return json({ ok: false, error: "Þetta tæki er ekki skráð. Skráðu þig inn með lykilorði.", deviceRevoked: true }, 401);

  const { data: dev } = await supabaseAdmin.from("gatt_devices")
    .select("id, user_id, pin_failures, expires_at").eq("token_hash", sha256(deviceToken)).maybeSingle();
  if (!dev || new Date(dev.expires_at).getTime() < Date.now()) {
    jar.delete(DEVICE_COOKIE);
    return json({ ok: false, error: "Þetta tæki er ekki lengur skráð. Skráðu þig inn með lykilorði.", deviceRevoked: true }, 401);
  }

  const { data: u } = await supabaseAdmin.from("gatt_users")
    .select("id, active, pin_hash, locked_until, must_change_password").eq("id", dev.user_id).maybeSingle();
  if (!u?.active || !u.pin_hash) {
    return json({ ok: false, error: "Enginn aðgangskóði er virkur. Skráðu þig inn með lykilorði.", noPin: true }, 401);
  }
  if (u.locked_until && new Date(u.locked_until).getTime() > Date.now()) {
    return fail("Aðgangur er tímabundið læstur. Reyndu aftur síðar.", 429);
  }

  const body = await readJson(req);
  const pin = String(body.pin ?? "");
  const ok = /^\d{4}$/.test(pin) && (await verifySecret(pin, u.pin_hash));
  if (!ok) {
    const failures = (dev.pin_failures ?? 0) + 1;
    if (failures >= MAX_PIN_FAILURES) {
      await supabaseAdmin.from("gatt_devices").delete().eq("id", dev.id);
      jar.delete(DEVICE_COOKIE);
      return json({ ok: false, error: "Of margar rangar tilraunir. Skráðu þig inn með lykilorði.", deviceRevoked: true }, 401);
    }
    await supabaseAdmin.from("gatt_devices").update({ pin_failures: failures }).eq("id", dev.id);
    const left = MAX_PIN_FAILURES - failures;
    return json({ ok: false, error: `Rangur kóði. ${left} tilraun${left === 1 ? "" : "ir"} eftir.` }, 401);
  }

  await supabaseAdmin.from("gatt_devices").update({ pin_failures: 0, last_used_at: new Date().toISOString() }).eq("id", dev.id);
  await startSession(jar, u.id, "pin", req.headers.get("user-agent") ?? "");
  return json({ ok: true, mustChangePassword: u.must_change_password });
}
