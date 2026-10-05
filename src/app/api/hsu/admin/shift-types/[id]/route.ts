// Breyta eða fjarlægja vaktategund.

import { supabaseAdmin } from "@/lib/supabase-admin";
import { audit } from "@/lib/hsu/auth";
import { UUID_RE, fail, json, readJson, requireManager } from "@/lib/hsu/server";
import { cleanShiftType } from "@/lib/hsu/shift-types";
import { tr } from "@/lib/hsu/i18n/server";
import { apiAdmin } from "@/lib/hsu/i18n/messages/api-admin";

export const runtime = "nodejs";


/**
 * Vaktategund gerð óvirk: tómu vaktirnar hennar eiga að hverfa STRAX úr
 * vaktaplaninu. Áður stóðu þær eftir þar til einhver ýtti á „Uppfæra vaktir",
 * svo yfirlæknir slökkti á tegundinni og sá engan mun.
 *
 * Aðeins ÓMANNAÐAR vaktir í ÓBIRTUM mánuðum frá og með deginum í dag:
 *   • mönnuð vakt er vinna sem einhver hefur þegar lagt í planið,
 *   • birt vakt er loforð sem læknirinn hefur séð.
 * Þær standa eftir og talan er skilað svo viðmótið geti sagt frá þeim.
 */
async function clearSlotsOfType(id: string): Promise<{ removed: number; kept: number }> {
  const today = new Date().toISOString().slice(0, 10);
  const { data: open } = await supabaseAdmin.from("hsu_months").select("month").eq("status", "published");
  const publishedMonths = new Set((open ?? []).map((m) => m.month as string));

  const { data: rows } = await supabaseAdmin
    .from("hsu_shifts").select("id, shift_date, doctor_id, published")
    .eq("shift_type_id", id).gte("shift_date", today);

  const mine = (rows ?? []).filter((r) => !r.published && !publishedMonths.has((r.shift_date as string).slice(0, 7)));
  const free = mine.filter((r) => !r.doctor_id).map((r) => r.id as string);
  if (free.length) await supabaseAdmin.from("hsu_shifts").delete().in("id", free);
  return { removed: free.length, kept: mine.length - free.length };
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireManager(req);
  if ("res" in auth) return auth.res;
  const t = tr(req, apiAdmin);
  const { id } = await ctx.params;
  if (!UUID_RE.test(id)) return fail(t("err.badRequest"));
  const patch = cleanShiftType(await readJson(req), true, t.lang);
  if (typeof patch === "string") return fail(patch);
  // Var hún virk fyrir breytinguna? Þá þarf að hreinsa vaktirnar þegar slökkt er.
  const { data: before } = await supabaseAdmin.from("hsu_shift_types").select("active").eq("id", id).maybeSingle();
  const { data, error } = await supabaseAdmin.from("hsu_shift_types").update(patch).eq("id", id).select("*").single();
  if (error) return fail(error.message, 500);
  const turnedOff = before?.active === true && data.active === false;
  const cleared = turnedOff ? await clearSlotsOfType(id) : { removed: 0, kept: 0 };
  await audit(auth.actor.label, "shift_type.update", null, { id, fields: Object.keys(patch), ...(turnedOff ? { removedShifts: cleared.removed, keptShifts: cleared.kept } : {}) });
  return json({ ok: true, shiftType: data, ...cleared });
}

/**
 * Tegund sem vaktir hafa verið búnar til úr er aðeins gerð óvirk: vaktirnar
 * sjálfar standa, og saga þeirra á að vísa í tegund sem er til.
 */
export async function DELETE(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireManager(req);
  if ("res" in auth) return auth.res;
  const t = tr(req, apiAdmin);
  const { id } = await ctx.params;
  if (!UUID_RE.test(id)) return fail(t("err.badRequest"));
  const { count } = await supabaseAdmin.from("hsu_shifts").select("id", { count: "exact", head: true }).eq("shift_type_id", id);
  const cleared = count ? await clearSlotsOfType(id) : { removed: 0, kept: 0 };
  // Hreinsunin getur fjarlægt síðustu vaktirnar — þá má eyða tegundinni alveg.
  const { count: left } = await supabaseAdmin.from("hsu_shifts").select("id", { count: "exact", head: true }).eq("shift_type_id", id);
  const { error } = left
    ? await supabaseAdmin.from("hsu_shift_types").update({ active: false }).eq("id", id)
    : await supabaseAdmin.from("hsu_shift_types").delete().eq("id", id);
  if (error) return fail(error.message, 500);
  await audit(auth.actor.label, "shift_type.remove", null, { id, deactivated: Boolean(count) });
  return json({ ok: true, deactivated: Boolean(count) });
}
