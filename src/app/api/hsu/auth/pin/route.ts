// Innskráning með 4 stafa aðgangskóða — aðeins á traustu tæki.

import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { DEVICE_COOKIE, MAX_PIN_FAILURES, clientIp, sameOrigin, sha256, startSession, throttle, verifySecret } from "@/lib/hsu/auth";
import { fail, json, readJson } from "@/lib/hsu/server";
import { tr } from "@/lib/hsu/i18n/server";
import { apiDoctor } from "@/lib/hsu/i18n/messages/api-doctor";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const t = tr(req, apiDoctor);
  if (!sameOrigin(req)) return fail(t("req.invalid"), 403);
  if (!(await throttle(`pin:${clientIp(req)}`, 30, 900))) return fail(t("pin.throttled"), 429);
  const jar = await cookies();
  const deviceToken = jar.get(DEVICE_COOKIE)?.value;
  if (!deviceToken) return json({ ok: false, error: t("pin.deviceUnknown"), deviceRevoked: true }, 401);

  const { data: dev } = await supabaseAdmin
    .from("hsu_devices")
    .select("id, doctor_id, pin_failures, expires_at")
    .eq("token_hash", sha256(deviceToken))
    .maybeSingle();
  if (!dev || new Date(dev.expires_at).getTime() < Date.now()) {
    jar.delete(DEVICE_COOKIE);
    return json({ ok: false, error: t("pin.deviceExpired"), deviceRevoked: true }, 401);
  }

  const { data: d } = await supabaseAdmin
    .from("hsu_doctors")
    .select("id, role, active, pin_hash, locked_until, must_change_password")
    .eq("id", dev.doctor_id)
    .maybeSingle();
  if (!d?.active || !d.pin_hash) {
    return json({ ok: false, error: t("pin.noPin"), deviceRevoked: false, noPin: true }, 401);
  }
  if (d.locked_until && new Date(d.locked_until).getTime() > Date.now()) {
    return fail(t("pin.locked"), 429);
  }

  const body = await readJson(req);
  const pin = String(body.pin ?? "");
  const ok = /^\d{4}$/.test(pin) && (await verifySecret(pin, d.pin_hash));

  if (!ok) {
    const failures = (dev.pin_failures ?? 0) + 1;
    if (failures >= MAX_PIN_FAILURES) {
      // Fimm röng gisk: tækið missir traustið. Lykilorð þarf til að fá það aftur.
      await supabaseAdmin.from("hsu_devices").delete().eq("id", dev.id);
      jar.delete(DEVICE_COOKIE);
      return json({ ok: false, error: t("pin.revoked"), deviceRevoked: true }, 401);
    }
    await supabaseAdmin.from("hsu_devices").update({ pin_failures: failures }).eq("id", dev.id);
    return json({ ok: false, error: t.n("pin.wrong", MAX_PIN_FAILURES - failures) }, 401);
  }

  await supabaseAdmin.from("hsu_devices").update({ pin_failures: 0, last_used_at: new Date().toISOString() }).eq("id", dev.id);
  await startSession(jar, d.id, "pin", req.headers.get("user-agent") ?? "");
  return json({ ok: true, next: d.must_change_password ? "/hsu/min-sida?t=stillingar" : d.role === "head" ? "/hsu/stjorn" : "/hsu/min-sida" });
}
