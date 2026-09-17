// Tungumál vaktakerfisins: kaka í vafranum og, sé læknir innskráður, á lækninn
// (svo tölvupóstar og tilkynningar berist á hans tungumáli).

import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getDoctorSession, sameOrigin } from "@/lib/hsu/auth";
import { LANG_COOKIE, LANG_COOKIE_OPTS, isLang } from "@/lib/hsu/i18n/core";
import { fail, json, readJson } from "@/lib/hsu/server";

export const runtime = "nodejs";

export async function POST(req: Request) {
  if (!sameOrigin(req)) return fail("Invalid request", 403);
  const { lang } = await readJson(req);
  if (!isLang(lang)) return fail("Unknown language");
  (await cookies()).set(LANG_COOKIE, lang, LANG_COOKIE_OPTS);
  const doctor = await getDoctorSession();
  if (doctor) await supabaseAdmin.from("hsu_doctors").update({ lang }).eq("id", doctor.id);
  return json({ ok: true, lang });
}
