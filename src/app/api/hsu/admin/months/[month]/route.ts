// Skref mánaðarins: opna fyrir óskir, loka í yfirferð, vaktaplan, birta.
// Einnig: minna þá á sem eiga eftir að senda óskir.

import { after } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { audit, throttle } from "@/lib/hsu/auth";
import { hsuSync } from "@/lib/hsu/calendar";
import {
  DATE_RE, MONTH_RE, fail, hsuEmailHtml, json, listDoctors, loadMonth, loadMonthShifts, loadPreferences, loadShiftTypes, originOf, readJson, requireManager, sendHsuEmail,
} from "@/lib/hsu/server";
import { requiredSlots, toPlanDoctors, toPlanSlots } from "@/lib/hsu/plan";
import { notifyDoctors } from "@/lib/hsu/notify";
import { say } from "@/lib/hsu/shift-edit";
import { MONTH_STATUS_ORDER, type MonthStatus } from "@/lib/hsu/types";
import { DEFAULT_LANG, isLang, translator, type Lang } from "@/lib/hsu/i18n/core";
import { dayLabelL, monthLabelL } from "@/lib/hsu/i18n/format";
import { tr } from "@/lib/hsu/i18n/server";
import { apiAdmin } from "@/lib/hsu/i18n/messages/api-admin";

export const runtime = "nodejs";

async function activeDoctors() {
  const { data } = await supabaseAdmin.from("hsu_doctors").select("id, name, email, lang").eq("active", true);
  return (data ?? []).map((d) => ({ ...d, lang: (isLang(d.lang) ? d.lang : DEFAULT_LANG) as Lang }));
}

export async function PUT(req: Request, ctx: { params: Promise<{ month: string }> }) {
  const auth = await requireManager(req);
  if ("res" in auth) return auth.res;
  const t = tr(req, apiAdmin);
  const { month } = await ctx.params;
  if (!MONTH_RE.test(month)) return fail(t("err.badMonth"));
  const body = await readJson(req);
  const origin = originOf(req);
  const before = await loadMonth(month);

  const patch: Record<string, unknown> = { month };
  if (body.prefs_deadline === null || body.prefs_deadline === "") patch.prefs_deadline = null;
  else if (typeof body.prefs_deadline === "string" && DATE_RE.test(body.prefs_deadline)) patch.prefs_deadline = body.prefs_deadline;
  if (typeof body.note === "string") patch.note = body.note.slice(0, 1000);

  let status = before?.status ?? "collecting";
  if (typeof body.status === "string" && (MONTH_STATUS_ORDER as string[]).includes(body.status)) {
    status = body.status as MonthStatus;
  }
  patch.status = status;

  if (status === "published" && before?.status !== "published") {
    const shifts = await loadMonthShifts(month);
    if (shifts.length === 0) return fail(t("err.noPlan"));
    const [types, doctors] = await Promise.all([loadShiftTypes(), listDoctors(false)]);
    // Aðeins vaktir sem á að manna: bakvakt sem enginn þarf er ekki gat.
    const empty = requiredSlots(toPlanSlots(shifts, types), toPlanDoctors(doctors)).filter((s) => !s.doctorId).length;
    if (empty > 0 && !body.allow_gaps) {
      return json({ ok: false, error: t.n("err.gaps", empty), needsConfirm: "gaps", empty }, 409);
    }
    patch.published_at = new Date().toISOString();
  }

  const { data: saved, error } = await supabaseAdmin.from("hsu_months").upsert(patch, { onConflict: "month" }).select("*").single();
  if (error) return fail(error.message, 500);

  const publishing = status === "published" && before?.status !== "published";
  const unpublishing = before?.status === "published" && status !== "published";
  if (publishing || unpublishing) {
    const ids = (await loadMonthShifts(month)).map((s) => s.id);
    if (ids.length) {
      const { error: pubErr } = await supabaseAdmin.from("hsu_shifts").update({ published: publishing }).in("id", ids);
      if (pubErr) return fail(pubErr.message, 500);
    }
    after(async () => { await hsuSync.syncAllConnected(); });
  }

  if (before?.status !== status || !before) {
    await audit(auth.actor.label, `month.${status}`, month, {});
  }

  // Tilkynningar.
  if (unpublishing) {
    const shifts = await loadMonthShifts(month);
    const withShifts = [...new Set(shifts.map((s) => s.doctor_id).filter(Boolean))] as string[];
    notifyDoctors({
      origin,
      subject: say((l) => l("unpublish.subject", { month: monthLabelL(month, l.lang) })),
      heading: say((l) => l("unpublish.heading")),
      notices: withShifts.map((doctorId) => ({
        doctorId,
        line: say((l) => l("unpublish.line", { by: auth.actor.label, month: monthLabelL(month, l.lang) })),
      })),
      cta: { label: say((l) => l("unpublish.cta")), path: "/hsu/min-sida" },
      email: "digest",
    });
  }
  const notify = Boolean(body.notify);
  if (notify && status === "collecting") {
    const deadline: string | null = saved.prefs_deadline ?? null;
    const url = `${origin}/hsu/min-sida?t=oskir&m=${month}`;
    after(async () => {
      for (const d of await activeDoctors()) {
        const tl = translator(apiAdmin, d.lang);
        const vars = { month: monthLabelL(month, d.lang), date: deadline ? dayLabelL(deadline, d.lang) : "", url };
        await sendHsuEmail(d.email, tl("open.subject", vars), hsuEmailHtml({
          origin, lang: d.lang, heading: tl("open.heading", vars),
          paragraphs: [tl("email.hello", { name: d.name }), tl(deadline ? "open.bodyDeadline" : "open.body", vars), ...(saved.note ? [saved.note] : [])],
          cta: { label: tl("open.cta"), url },
        }), tl(deadline ? "open.textDeadline" : "open.text", vars));
      }
    });
  }
  if (notify && publishing) {
    after(async () => {
      const shifts = await loadMonthShifts(month);
      for (const d of await activeDoctors()) {
        const n = shifts.filter((s) => s.doctor_id === d.id).length;
        const tl = translator(apiAdmin, d.lang);
        const vars = { month: monthLabelL(month, d.lang), url: `${origin}/hsu/min-sida` };
        await sendHsuEmail(d.email, tl("published.subject", vars), hsuEmailHtml({
          origin, lang: d.lang, heading: tl("published.heading", vars),
          paragraphs: [tl("email.hello", { name: d.name }), tl.n("published.body", n, vars), tl("published.calendar")],
          cta: { label: tl("published.cta"), url: vars.url },
        }), tl.n("published.text", n, vars));
      }
    });
  }

  return json({ ok: true, month: saved });
}

/**
 * Áminning um vaktaóskir — má senda eins oft og þarf.
 *   { action: "remind", scope: "missing" }            þeim sem eiga eftir að senda
 *   { action: "remind", scope: "all" }                öllum virkum læknum
 *   { action: "remind", scope: "one", doctorId }      einum lækni
 * Sami læknir fær ekki tvær áminningar á sömu mínútu (tvísmellur).
 * Áminningin fer í tölvupóst og birtist líka á „Mínar vaktir“.
 */
export async function POST(req: Request, ctx: { params: Promise<{ month: string }> }) {
  const auth = await requireManager(req);
  if ("res" in auth) return auth.res;
  const t = tr(req, apiAdmin);
  const { month } = await ctx.params;
  if (!MONTH_RE.test(month)) return fail(t("err.badMonth"));
  const body = await readJson(req);
  if (body.action !== "remind") return fail(t("err.unknownAction"));
  const scope = body.scope === "all" || body.scope === "one" ? body.scope : "missing";
  const origin = originOf(req);
  const [prefs, m, doctors] = await Promise.all([loadPreferences(month), loadMonth(month), activeDoctors()]);
  const done = new Set(prefs.filter((p) => p.status === "submitted" || p.status === "approved").map((p) => p.doctor_id));
  const chosen = scope === "all" ? doctors
    : scope === "one" ? doctors.filter((d) => d.id === body.doctorId)
    : doctors.filter((d) => !done.has(d.id));
  if (scope === "one" && !chosen.length) return fail(t("err.theDoctorNotFound"), 404);

  const targets: typeof doctors = [];
  let skipped = 0;
  for (const d of chosen) {
    if (await throttle(`remind:${month}:${d.id}`, 1, 60)) targets.push(d); else skipped++;
  }

  const deadline: string | null = m?.prefs_deadline ?? null;
  const link = `/hsu/min-sida?t=oskir&m=${month}`;
  const varsFor = (lang: Lang) => ({ month: monthLabelL(month, lang), date: deadline ? dayLabelL(deadline, lang) : "" });
  const lineFor = (id: string, lang: Lang) => {
    const tl = translator(apiAdmin, lang);
    const key = done.has(id)
      ? (deadline ? "remind.doneDeadline" : "remind.done")
      : (deadline ? "remind.missingDeadline" : "remind.missing");
    return tl(key, varsFor(lang));
  };

  if (targets.length) {
    await supabaseAdmin.from("hsu_notifications").insert(targets.map((d) => ({
      doctor_id: d.id, title: translator(apiAdmin, d.lang)("remind.title", varsFor(d.lang)), lines: [lineFor(d.id, d.lang)], link,
    })));
  }
  after(async () => {
    for (const d of targets) {
      const tl = translator(apiAdmin, d.lang);
      const line = lineFor(d.id, d.lang);
      await sendHsuEmail(d.email, tl("remind.title", varsFor(d.lang)), hsuEmailHtml({
        origin, lang: d.lang, heading: tl("remind.heading"),
        paragraphs: [tl("email.hello", { name: d.name }), line],
        cta: { label: tl(done.has(d.id) ? "remind.ctaView" : "remind.ctaSubmit"), url: `${origin}${link}` },
      }), tl("remind.text", { line, url: `${origin}${link}` }));
    }
  });
  await audit(auth.actor.label, "month.remind", month, { count: targets.length, scope, names: targets.map((d) => d.name) });
  return json({ ok: true, sent: targets.length, skipped, reminders: await recentReminders(month) });
}

/** Síðustu áminningar fyrir mánuðinn (?reminders). */
export async function GET(req: Request, ctx: { params: Promise<{ month: string }> }) {
  const auth = await requireManager(req);
  if ("res" in auth) return auth.res;
  const { month } = await ctx.params;
  if (!MONTH_RE.test(month)) return fail(tr(req, apiAdmin)("err.badMonth"));
  return json({ ok: true, reminders: await recentReminders(month) });
}

async function recentReminders(month: string) {
  // Eftir „Byrja upp á nýtt“ teljast eldri áminningar ekki með.
  const { data: reset } = await supabaseAdmin.from("hsu_audit").select("at")
    .or(`and(action.eq.month.reset,month.eq.${month}),action.eq.system.reset`).order("at", { ascending: false }).limit(1);
  let q = supabaseAdmin.from("hsu_audit").select("at, actor, detail")
    .eq("action", "month.remind").eq("month", month).order("at", { ascending: false }).limit(5);
  if (reset?.[0]) q = q.gt("at", reset[0].at);
  const { data } = await q;
  return data ?? [];
}
