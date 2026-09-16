// Hver á þetta tæki? Svo innskráningin geti boðið aðgangskóða.

import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { DEVICE_COOKIE, sha256 } from "@/lib/vinnustod/auth";
import { json } from "@/lib/vinnustod/server";

export const runtime = "nodejs";

export async function GET() {
  const jar = await cookies();
  const token = jar.get(DEVICE_COOKIE)?.value;
  if (!token) return json({ ok: true, known: false });
  const { data: dev } = await supabaseAdmin.from("gatt_devices").select("user_id, expires_at").eq("token_hash", sha256(token)).maybeSingle();
  if (!dev || new Date(dev.expires_at).getTime() < Date.now()) return json({ ok: true, known: false });
  const { data: u } = await supabaseAdmin.from("gatt_users").select("name, email, pin_hash, active").eq("id", dev.user_id).maybeSingle();
  if (!u?.active) return json({ ok: true, known: false });
  return json({ ok: true, known: true, name: u.name, email: u.email, hasPin: Boolean(u.pin_hash) });
}
