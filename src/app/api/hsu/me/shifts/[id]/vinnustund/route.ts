// Læknir merkir að hann hafi skráð útköll vaktarinnar í Vinnustund.
// Aðeins eigin vaktir. Engin gögn um útköllin sjálf fara hér um — aðeins hakið.

import { supabaseAdmin } from "@/lib/supabase-admin";
import { UUID_RE, fail, json, readJson, requireDoctor } from "@/lib/hsu/server";
import { tr } from "@/lib/hsu/i18n/server";
import { apiDoctor } from "@/lib/hsu/i18n/messages/api-doctor";

export const runtime = "nodejs";

export async function PUT(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireDoctor(req);
  if ("res" in auth) return auth.res;
  const t = tr(req, apiDoctor);
  const { id } = await ctx.params;
  if (!UUID_RE.test(id)) return fail(t("req.invalid"));
  const done = (await readJson(req)).done !== false;

  const { data, error } = await supabaseAdmin
    .from("hsu_shifts")
    .update({ vinnustund_logged_at: done ? new Date().toISOString() : null })
    .eq("id", id)
    .eq("doctor_id", auth.doctor.id)
    .select("id, vinnustund_logged_at");
  if (error) return fail(error.message, 500);
  if (!data?.length) return fail(t("shift.notYours"), 403);
  return json({ ok: true, vinnustund_logged_at: data[0].vinnustund_logged_at });
}
