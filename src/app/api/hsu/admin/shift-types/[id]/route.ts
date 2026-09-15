// Breyta eða fjarlægja vaktategund.

import { supabaseAdmin } from "@/lib/supabase-admin";
import { audit } from "@/lib/hsu/auth";
import { UUID_RE, fail, json, readJson, requireManager } from "@/lib/hsu/server";
import { cleanShiftType } from "@/lib/hsu/shift-types";

export const runtime = "nodejs";

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireManager(req);
  if ("res" in auth) return auth.res;
  const { id } = await ctx.params;
  if (!UUID_RE.test(id)) return fail("Ógild beiðni");
  const patch = cleanShiftType(await readJson(req), true);
  if (typeof patch === "string") return fail(patch);
  const { data, error } = await supabaseAdmin.from("hsu_shift_types").update(patch).eq("id", id).select("*").single();
  if (error) return fail(error.message, 500);
  await audit(auth.actor.label, "shift_type.update", null, { id, fields: Object.keys(patch) });
  return json({ ok: true, shiftType: data });
}

/**
 * Tegund sem vaktir hafa verið búnar til úr er aðeins gerð óvirk: vaktirnar
 * sjálfar standa, og saga þeirra á að vísa í tegund sem er til.
 */
export async function DELETE(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireManager(req);
  if ("res" in auth) return auth.res;
  const { id } = await ctx.params;
  if (!UUID_RE.test(id)) return fail("Ógild beiðni");
  const { count } = await supabaseAdmin.from("hsu_shifts").select("id", { count: "exact", head: true }).eq("shift_type_id", id);
  const { error } = count
    ? await supabaseAdmin.from("hsu_shift_types").update({ active: false }).eq("id", id)
    : await supabaseAdmin.from("hsu_shift_types").delete().eq("id", id);
  if (error) return fail(error.message, 500);
  await audit(auth.actor.label, "shift_type.remove", null, { id, deactivated: Boolean(count) });
  return json({ ok: true, deactivated: Boolean(count) });
}
