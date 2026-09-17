// Tungumál vaktakerfisins: kaka í vafranum og, sé læknir innskráður, á lækninn
// (svo tölvupóstar og tilkynningar berist á hans tungumáli).

import { cookies } from "next/headers";
import { after } from "next/server";
import { hsuSync } from "@/lib/hsu/calendar";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getDoctorSession, sameOrigin } from "@/lib/hsu/auth";
import { LANG_COOKIE, LANG_COOKIE_OPTS, isLang } from "@/lib/hsu/i18n/core";
import { fail, json, readJson } from "@/lib/hsu/server";
import { tr } from "@/lib/hsu/i18n/server";
import { apiDoctor } from "@/lib/hsu/i18n/messages/api-doctor";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const t = tr(req, apiDoctor);
  if (!sameOrigin(req)) return fail(t("req.invalid"), 403);
  const { lang } = await readJson(req);
  if (!isLang(lang)) return fail(t("req.unknownLang"));
  (await cookies()).set(LANG_COOKIE, lang, LANG_COOKIE_OPTS);
  const doctor = await getDoctorSession();
  if (doctor) {
    const { data: before } = await supabaseAdmin.from("hsu_doctors").select("lang").eq("id", doctor.id).maybeSingle();
    await supabaseAdmin.from("hsu_doctors").update({ lang }).eq("id", doctor.id);
    // Atburðir í Google-dagatali læknisins endurskrifaðir á nýja málinu.
    if (before?.lang !== lang) after(async () => { await hsuSync.syncDoctor(doctor.id).catch(() => {}); });
  }
  return json({ ok: true, lang });
}
