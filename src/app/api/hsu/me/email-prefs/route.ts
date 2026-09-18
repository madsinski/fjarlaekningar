// Tilkynningar í tölvupósti: hver læknir velur sjálfur (Mín síða → Stillingar).
//   GET → { prefs, categories }
//   PUT { prefs: { flokkur: "now" | "digest" | "off", … } } — öll gildin; vantar = sjálfgefið

import { supabaseAdmin } from "@/lib/supabase-admin";
import { EMAIL_CATEGORIES, canDigest, categoriesFor, doctorEmailPrefs, normalizeEmailPrefs, type EmailCategory, type EmailMode } from "@/lib/hsu/email-prefs";
import { fail, json, readJson, requireDoctor } from "@/lib/hsu/server";
import { tr } from "@/lib/hsu/i18n/server";
import { apiDoctor } from "@/lib/hsu/i18n/messages/api-doctor";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const auth = await requireDoctor(req);
  if ("res" in auth) return auth.res;
  return json({ ok: true, prefs: await doctorEmailPrefs(auth.doctor.id), categories: categoriesFor(auth.doctor.role) });
}

export async function PUT(req: Request) {
  const auth = await requireDoctor(req);
  if ("res" in auth) return auth.res;
  const t = tr(req, apiDoctor);
  const given = ((await readJson(req)).prefs ?? {}) as Record<string, unknown>;
  const out: Partial<Record<EmailCategory, EmailMode>> = {};
  for (const c of EMAIL_CATEGORIES) {
    const m = given[c];
    if (m === undefined) continue;
    if (m === "now" || m === "off" || (m === "digest" && canDigest(c))) out[c] = m;
    else return fail(t("req.invalid"));
  }
  // Vafrinn sendir öll gildin í hvert sinn (í röð); það sem vantar fær sjálfgefið gildi.
  const prefs = normalizeEmailPrefs(out);
  const { error } = await supabaseAdmin.from("hsu_doctors").update({ email_prefs: prefs }).eq("id", auth.doctor.id);
  if (error) return fail(error.message, 500);
  return json({ ok: true, prefs });
}
