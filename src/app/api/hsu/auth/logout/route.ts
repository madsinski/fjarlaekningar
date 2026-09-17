// Útskráning. forget=true gleymir líka tækinu (aðgangskóði hættir að virka hér).

import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { DEVICE_COOKIE, endSession, getDoctorSession, sameOrigin, sha256 } from "@/lib/hsu/auth";
import { fail, json, readJson } from "@/lib/hsu/server";
import { tr } from "@/lib/hsu/i18n/server";
import { apiDoctor } from "@/lib/hsu/i18n/messages/api-doctor";

export const runtime = "nodejs";

export async function POST(req: Request) {
  if (!sameOrigin(req)) return fail(tr(req, apiDoctor)("req.invalid"), 403);
  const body = await readJson(req);
  const jar = await cookies();
  const me = await getDoctorSession();
  // Viðvera í vinnustöðinni hverfur með innskráningunni.
  if (me) await supabaseAdmin.from("gatt_presence").delete().eq("owner_kind", "hsu").eq("owner_id", me.id);
  await endSession(jar);
  if (body.forget) {
    const dev = jar.get(DEVICE_COOKIE)?.value;
    if (dev) await supabaseAdmin.from("hsu_devices").delete().eq("token_hash", sha256(dev));
    jar.delete(DEVICE_COOKIE);
  }
  return json({ ok: true });
}
