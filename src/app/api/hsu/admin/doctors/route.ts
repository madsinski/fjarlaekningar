// Skrá nýjan lækni: boð í tölvupósti, eða stjórnandi fyllir út og velur lykilorð.

import { supabaseAdmin } from "@/lib/supabase-admin";
import { audit, hashSecret, issueAccessLink, passwordProblem, pinProblem } from "@/lib/hsu/auth";
import { DOCTOR_COLUMNS, fail, json, listDoctors, originOf, readJson, requireManager, toPublicDoctor } from "@/lib/hsu/server";
import { cleanWeekdays, emailAllowed, sendInviteEmail } from "@/lib/hsu/doctors";
import { isLang } from "@/lib/hsu/i18n/core";
import { langOf, tr } from "@/lib/hsu/i18n/server";
import { apiAdmin } from "@/lib/hsu/i18n/messages/api-admin";
import { DOCTOR_COLORS, HSU_EMAIL_DOMAIN, normalizeEmail } from "@/lib/hsu/types";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const auth = await requireManager(req);
  if ("res" in auth) return auth.res;
  return json({ ok: true, doctors: await listDoctors() });
}

export async function POST(req: Request) {
  const auth = await requireManager(req);
  if ("res" in auth) return auth.res;
  const t = tr(req, apiAdmin);
  const body = await readJson(req);

  const name = String(body.name ?? "").trim();
  const email = normalizeEmail(String(body.email ?? ""));
  if (!name) return fail(t("err.nameMissing"));
  if (!emailAllowed(email)) return fail(t("err.emailDomain", { domain: HSU_EMAIL_DOMAIN }));
  const role = body.role === "head" ? "head" : "doctor";
  // Tungumál læknisins (viðmót og tölvupóstar); sjálfgefið það sem stjórnandinn notar.
  const lang = isLang(body.lang) ? body.lang : langOf(req);
  const fte = Math.min(100, Math.max(0, Math.round(Number(body.fte ?? 100)) || 0));
  const mode = body.mode === "manual" ? "manual" : body.mode === "link" ? "link" : "invite";

  const { count } = await supabaseAdmin.from("hsu_doctors").select("id", { count: "exact", head: true });
  const row: Record<string, unknown> = {
    name, email, role, fte, lang,
    phone: String(body.phone ?? "").slice(0, 40),
    title: String(body.title ?? "").slice(0, 80),
    can_bakvakt: body.can_bakvakt === true,
    day_weekdays: cleanWeekdays(body.day_weekdays) ?? [],
    needs_bakvakt: body.needs_bakvakt === true,
    color: typeof body.color === "string" && /^#[0-9a-f]{6}$/i.test(body.color) ? body.color : DOCTOR_COLORS[(count ?? 0) % DOCTOR_COLORS.length],
  };

  if (mode === "manual") {
    const password = String(body.password ?? "");
    const problem = passwordProblem(password, t.lang);
    if (problem) return fail(problem);
    row.password_hash = await hashSecret(password);
    row.activated_at = new Date().toISOString();
    // Lykilorð sem annar valdi á læknirinn að skipta um við fyrstu innskráningu.
    row.must_change_password = body.must_change_password !== false;
    if (body.pin) {
      const pinErr = pinProblem(String(body.pin), t.lang);
      if (pinErr) return fail(pinErr);
      row.pin_hash = await hashSecret(String(body.pin));
    }
  }

  const { data, error } = await supabaseAdmin.from("hsu_doctors").insert(row).select(DOCTOR_COLUMNS).single();
  if (error) {
    if (error.code === "23505") return fail(t("err.doctorExists"), 409);
    return fail(error.message, 500);
  }

  let link: string | null = null;
  let emailed = false;
  if (mode !== "manual") {
    const origin = originOf(req);
    link = await issueAccessLink(data.id, "invite", origin);
    if (mode === "invite") {
      const r = await sendInviteEmail(origin, { name, email, role, lang }, link, auth.actor.label);
      emailed = r.ok;
    }
  }
  await audit(auth.actor.label, "doctor.create", null, { doctorId: data.id, mode });
  const { data: fresh } = await supabaseAdmin.from("hsu_doctors").select(DOCTOR_COLUMNS).eq("id", data.id).single();
  return json({ ok: true, doctor: toPublicDoctor(fresh ?? data), link, emailed });
}
