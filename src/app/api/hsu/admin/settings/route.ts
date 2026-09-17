// Stillingar HSU vaktakerfis.

import { supabaseAdmin } from "@/lib/supabase-admin";
import { audit } from "@/lib/hsu/auth";
import { fail, json, readJson, requireManager } from "@/lib/hsu/server";
import { EMAIL_CATEGORIES, canDigest, normalizeEmailPrefs, type EmailCategory, type EmailMode } from "@/lib/hsu/email-prefs";

export const runtime = "nodejs";

export async function PUT(req: Request) {
  const auth = await requireManager(req);
  if ("res" in auth) return auth.res;
  const body = await readJson(req);
  const patch: Record<string, unknown> = { id: 1, updated_at: new Date().toISOString() };
  if (typeof body.unit_name === "string" && body.unit_name.trim()) patch.unit_name = body.unit_name.trim().slice(0, 120);
  if (typeof body.market_requires_approval === "boolean") patch.market_requires_approval = body.market_requires_approval;
  // Tilkynningar í tölvupósti: einn hamur á flokk (now/digest/off).
  if (body.email_prefs && typeof body.email_prefs === "object") {
    const given = body.email_prefs as Record<string, unknown>;
    const out: Partial<Record<EmailCategory, EmailMode>> = {};
    for (const c of EMAIL_CATEGORIES) {
      const m = given[c];
      if (m === "now" || m === "off") out[c] = m;
      else if (m === "digest") { if (!canDigest(c)) return fail(`Flokkurinn ${c} styður ekki samantekt.`); out[c] = m; }
      else if (m !== undefined) return fail(`Ógild stilling fyrir ${c}.`);
    }
    patch.email_prefs = { ...normalizeEmailPrefs(null), ...out };
  }
  const { data, error } = await supabaseAdmin.from("hsu_settings").upsert(patch, { onConflict: "id" }).select("unit_name, market_requires_approval, email_prefs").single();
  if (error) return fail(error.message, 500);
  await audit(auth.actor.label, "settings.update", null, { fields: Object.keys(patch) });
  return json({ ok: true, settings: { ...data, email_prefs: normalizeEmailPrefs(data?.email_prefs) } });
}
