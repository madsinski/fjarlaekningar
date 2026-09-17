// Velja eða fjarlægja 4 stafa aðgangskóða.

import { supabaseAdmin } from "@/lib/supabase-admin";
import { hashSecret, pinProblem, verifySecret } from "@/lib/hsu/auth";
import { fail, json, readJson, requireDoctor } from "@/lib/hsu/server";
import { tr } from "@/lib/hsu/i18n/server";
import { apiDoctor } from "@/lib/hsu/i18n/messages/api-doctor";

export const runtime = "nodejs";

export async function PUT(req: Request) {
  const auth = await requireDoctor(req);
  if ("res" in auth) return auth.res;
  const t = tr(req, apiDoctor);
  const body = await readJson(req);
  const pin = String(body.pin ?? "");
  const problem = pinProblem(pin, t.lang);
  if (problem) return fail(problem);
  // Lykilorð til staðfestingar: sá sem kemst í opna lotu á ekki að geta sett
  // sinn eigin kóða og haldið aðganginum eftir að lotan rennur út.
  const { data: d } = await supabaseAdmin.from("hsu_doctors").select("password_hash").eq("id", auth.doctor.id).single();
  if (!(await verifySecret(String(body.password ?? ""), d?.password_hash))) return fail(t("password.wrong"), 401);
  await supabaseAdmin.from("hsu_doctors").update({ pin_hash: await hashSecret(pin) }).eq("id", auth.doctor.id);
  await supabaseAdmin.from("hsu_devices").update({ pin_failures: 0 }).eq("doctor_id", auth.doctor.id);
  return json({ ok: true });
}

export async function DELETE(req: Request) {
  const auth = await requireDoctor(req);
  if ("res" in auth) return auth.res;
  await supabaseAdmin.from("hsu_doctors").update({ pin_hash: null }).eq("id", auth.doctor.id);
  return json({ ok: true });
}
