// Stillingar HSU vaktakerfis.

import { supabaseAdmin } from "@/lib/supabase-admin";
import { audit } from "@/lib/hsu/auth";
import { fail, json, readJson, requireManager } from "@/lib/hsu/server";

export const runtime = "nodejs";

export async function PUT(req: Request) {
  const auth = await requireManager(req);
  if ("res" in auth) return auth.res;
  const body = await readJson(req);
  const patch: Record<string, unknown> = { id: 1, updated_at: new Date().toISOString() };
  if (typeof body.unit_name === "string" && body.unit_name.trim()) patch.unit_name = body.unit_name.trim().slice(0, 120);
  if (typeof body.market_requires_approval === "boolean") patch.market_requires_approval = body.market_requires_approval;
  const { data, error } = await supabaseAdmin.from("hsu_settings").upsert(patch, { onConflict: "id" }).select("unit_name, market_requires_approval").single();
  if (error) return fail(error.message, 500);
  await audit(auth.actor.label, "settings.update", null, { fields: Object.keys(patch) });
  return json({ ok: true, settings: data });
}
