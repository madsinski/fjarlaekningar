// Breyta lækni, senda nýtt boð, setja lykilorð, afvirkja eða eyða.

import { supabaseAdmin } from "@/lib/supabase-admin";
import { audit, hashSecret, issueAccessLink, passwordProblem } from "@/lib/hsu/auth";
import { hsuSync } from "@/lib/hsu/calendar";
import { DOCTOR_COLUMNS, UUID_RE, fail, json, originOf, readJson, requireManager, toPublicDoctor } from "@/lib/hsu/server";
import { HSU_EMAIL_DOMAIN, normalizeEmail } from "@/lib/hsu/types";
import { cleanWeekdays, emailAllowed, sendInviteEmail, sendPromotedEmail } from "@/lib/hsu/doctors";
import { isLang, translator } from "@/lib/hsu/i18n/core";
import { accountEmails } from "@/lib/hsu/i18n/messages/account-emails";
import { notifyDoctors } from "@/lib/hsu/notify";

export const runtime = "nodejs";

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireManager(req);
  if ("res" in auth) return auth.res;
  const { id } = await ctx.params;
  if (!UUID_RE.test(id)) return fail("Ógild beiðni");
  const body = await readJson(req);
  const self = auth.actor.kind === "doctor" && auth.actor.doctor.id === id;

  const { data: current } = await supabaseAdmin.from("hsu_doctors").select(DOCTOR_COLUMNS).eq("id", id).maybeSingle();
  if (!current) return fail("Læknir fannst ekki", 404);

  const patch: Record<string, unknown> = {};
  if (typeof body.name === "string" && body.name.trim()) patch.name = body.name.trim().slice(0, 120);
  if (typeof body.email === "string") {
    const email = normalizeEmail(body.email);
    if (!emailAllowed(email)) return fail(`Notandanafn þarf að vera @${HSU_EMAIL_DOMAIN} netfang.`);
    patch.email = email;
  }
  if (typeof body.phone === "string") patch.phone = body.phone.slice(0, 40);
  if (typeof body.title === "string") patch.title = body.title.slice(0, 80);
  if (typeof body.color === "string" && /^#[0-9a-f]{6}$/i.test(body.color)) patch.color = body.color;
  if (typeof body.can_bakvakt === "boolean") patch.can_bakvakt = body.can_bakvakt;
  const days = cleanWeekdays(body.day_weekdays);
  if (days) patch.day_weekdays = days;
  if (typeof body.needs_bakvakt === "boolean") patch.needs_bakvakt = body.needs_bakvakt;
  if (body.fte !== undefined) patch.fte = Math.min(100, Math.max(0, Math.round(Number(body.fte)) || 0));
  if (body.role === "head" || body.role === "doctor") {
    // Yfirlæknir getur ekki lækkað sjálfan sig — þá gæti enginn stjórnað.
    if (self && body.role !== "head") return fail("Þú getur ekki fjarlægt eigin yfirlæknisréttindi.");
    patch.role = body.role;
  }
  if (isLang(body.lang)) patch.lang = body.lang;
  // Gerður að yfirlækni: kynning og leiðarvísir yfirlæknis birtast aftur.
  const promoted = patch.role === "head" && current.role !== "head";
  if (promoted) {
    const seen = { ...((current.onboarding ?? {}) as Record<string, string>) };
    delete seen["tour:head"];
    delete seen["guide:head"];
    patch.onboarding = seen;
  }
  if (typeof body.active === "boolean") {
    if (self && !body.active) return fail("Þú getur ekki afvirkjað sjálfan þig.");
    patch.active = body.active;
  }

  let link: string | null = null;
  let emailed = false;
  const origin = originOf(req);

  if (body.set_password) {
    const pw = String(body.set_password);
    const problem = passwordProblem(pw);
    if (problem) return fail(problem);
    patch.password_hash = await hashSecret(pw);
    patch.must_change_password = true;
    patch.failed_logins = 0;
    patch.locked_until = null;
    if (!current.password_hash) patch.activated_at = new Date().toISOString();
  }
  if (body.clear_pin) patch.pin_hash = null;
  if (body.unlock) { patch.failed_logins = 0; patch.locked_until = null; }

  if (Object.keys(patch).length) {
    const { error } = await supabaseAdmin.from("hsu_doctors").update(patch).eq("id", id);
    if (error) {
      if (error.code === "23505") return fail("Annar læknir er með þetta netfang.", 409);
      return fail(error.message, 500);
    }
  }

  // Lykilorð sett af öðrum eða aðgangur afvirkjaður: allar lotur út.
  if (body.set_password || body.active === false || body.logout_all) {
    await supabaseAdmin.from("hsu_sessions").delete().eq("doctor_id", id);
    if (body.active === false) await supabaseAdmin.from("hsu_devices").delete().eq("doctor_id", id);
  }

  // Öryggistilkynning: lykilorði breytt af öðrum. Læknir sem þekkir ekki
  // breytinguna á að sjá hana strax, ekki næst þegar hann reynir að skrá sig inn.
  if (body.set_password && current.password_hash) {
    notifyDoctors({
      origin, subject: "Lykilorði þínu var breytt", heading: "Lykilorði breytt",
      notices: [{ doctorId: id, line: `${auth.actor.label} setti nýtt lykilorð á aðganginn þinn að vaktakerfinu. Þú hefur verið skráð(ur) út af öllum tækjum. Hafðu samband við yfirlækni ef þú kannast ekki við þetta.` }],
      cta: { label: "Skrá inn", path: "/hsu" },
    });
  }

  const who = {
    name: String(patch.name ?? current.name),
    email: String(patch.email ?? current.email),
    role: String(patch.role ?? current.role),
    lang: isLang(patch.lang) ? patch.lang : isLang(current.lang) ? current.lang : undefined,
  };
  if (body.resend_invite || body.invite_link) {
    link = await issueAccessLink(id, current.password_hash ? "reset" : "invite", origin);
    if (body.resend_invite) {
      const r = await sendInviteEmail(origin, who, link, auth.actor.label);
      emailed = r.ok;
    }
  }

  // Gerður að yfirlækni: virkur aðgangur fær tilkynningu og póst; óvirkur fær
  // nýtt boð með texta yfirlæknis (nema boð hafi verið sent í þessari sömu beiðni).
  if (promoted && who.email) {
    if (current.password_hash) {
      await sendPromotedEmail(origin, who, auth.actor.label);
      notifyDoctors({
        origin, email: false,
        subject: translator(accountEmails, who.lang ?? "is")("promoted.subject"),
        heading: translator(accountEmails, who.lang ?? "is")("promoted.heading"),
        notices: [{ doctorId: id, line: translator(accountEmails, who.lang ?? "is")("promoted.notice", { by: auth.actor.label }) }],
        cta: { label: "", path: "/hsu/stjorn" },
      });
    } else if (!body.resend_invite && current.active !== false) {
      link = await issueAccessLink(id, "invite", origin);
      emailed = (await sendInviteEmail(origin, who, link, auth.actor.label)).ok;
    }
  }

  await audit(auth.actor.label, "doctor.update", null, {
    doctorId: id,
    fields: Object.keys(patch).filter((k) => !k.includes("hash")),
    ...(body.set_password ? { setPassword: true } : {}),
    ...(body.resend_invite ? { invite: true } : {}),
  });

  const { data: fresh } = await supabaseAdmin.from("hsu_doctors").select(DOCTOR_COLUMNS).eq("id", id).single();
  return json({ ok: true, doctor: toPublicDoctor(fresh), link, emailed });
}

export async function DELETE(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireManager(req);
  if ("res" in auth) return auth.res;
  const { id } = await ctx.params;
  if (!UUID_RE.test(id)) return fail("Ógild beiðni");
  if (auth.actor.kind === "doctor" && auth.actor.doctor.id === id) return fail("Þú getur ekki eytt sjálfum þér.");
  // Dagatal læknisins hreinsað áður en röðin hverfur — annars sitja vaktirnar
  // eftir í Google-dagatali hans án þess að nokkur geti fjarlægt þær.
  await hsuSync.disconnect(id).catch(() => {});
  const { error } = await supabaseAdmin.from("hsu_doctors").delete().eq("id", id);
  if (error) return fail(error.message, 500);
  await audit(auth.actor.label, "doctor.delete", null, { doctorId: id });
  return json({ ok: true });
}
