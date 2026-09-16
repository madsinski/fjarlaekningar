// Útskráning. forget=true gleymir líka tækinu.

import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { DEVICE_COOKIE, endSession, sameOrigin, sha256 } from "@/lib/vinnustod/auth";
import { fail, json, readJson } from "@/lib/vinnustod/server";

export const runtime = "nodejs";

export async function POST(req: Request) {
  if (!sameOrigin(req)) return fail("Ógild beiðni", 403);
  const body = await readJson(req);
  const jar = await cookies();
  await endSession(jar);
  if (body.forget) {
    const dev = jar.get(DEVICE_COOKIE)?.value;
    if (dev) await supabaseAdmin.from("gatt_devices").delete().eq("token_hash", sha256(dev));
    jar.delete(DEVICE_COOKIE);
  }
  return json({ ok: true });
}
