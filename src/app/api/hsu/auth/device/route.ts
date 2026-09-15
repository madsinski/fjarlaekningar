// Hver á þetta tæki? Svo innskráningarsíðan geti boðið upp á aðgangskóða.

import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { DEVICE_COOKIE, sha256 } from "@/lib/hsu/auth";
import { json } from "@/lib/hsu/server";

export const runtime = "nodejs";

export async function GET() {
  const jar = await cookies();
  const token = jar.get(DEVICE_COOKIE)?.value;
  if (!token) return json({ ok: true, known: false });
  const { data: dev } = await supabaseAdmin
    .from("hsu_devices")
    .select("doctor_id, expires_at")
    .eq("token_hash", sha256(token))
    .maybeSingle();
  if (!dev || new Date(dev.expires_at).getTime() < Date.now()) return json({ ok: true, known: false });
  const { data: d } = await supabaseAdmin
    .from("hsu_doctors")
    .select("name, email, pin_hash, active")
    .eq("id", dev.doctor_id)
    .maybeSingle();
  if (!d?.active) return json({ ok: true, known: false });
  return json({ ok: true, known: true, name: d.name, email: d.email, hasPin: Boolean(d.pin_hash) });
}
