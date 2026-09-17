// Merkja tilkynningar læknis lesnar. Án auðkenna: allar ólesnar.

import { supabaseAdmin } from "@/lib/supabase-admin";
import { UUID_RE, fail, json, readJson, requireDoctor } from "@/lib/hsu/server";
import { tr } from "@/lib/hsu/i18n/server";
import { apiDoctor } from "@/lib/hsu/i18n/messages/api-doctor";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const auth = await requireDoctor(req);
  if ("res" in auth) return auth.res;
  const body = await readJson(req);
  const ids = Array.isArray(body.ids) ? body.ids.map(String).filter((x) => UUID_RE.test(x)).slice(0, 100) : null;
  let q = supabaseAdmin.from("hsu_notifications").update({ read_at: new Date().toISOString() })
    .eq("doctor_id", auth.doctor.id).is("read_at", null);
  if (ids) {
    if (!ids.length) return fail(tr(req, apiDoctor)("req.invalid"));
    q = q.in("id", ids);
  }
  const { error } = await q;
  if (error) return fail(error.message, 500);
  return json({ ok: true });
}
