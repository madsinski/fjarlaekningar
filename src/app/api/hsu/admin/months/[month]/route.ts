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
import { MONTH_STATUS_ORDER, dayLabel, monthLabel, type MonthStatus } from "@/lib/hsu/types";

export const runtime = "nodejs";

async function activeDoctors() {
  const { data } = await supabaseAdmin.from("hsu_doctors").select("id, name, email").eq("active", true);
  return data ?? [];
}

export async function PUT(req: Request, ctx: { params: Promise<{ month: string }> }) {
  const auth = await requireManager(req);
  if ("res" in auth) return auth.res;
  const { month } = await ctx.params;
  if (!MONTH_RE.test(month)) return fail("Ógildur mánuður");
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
    if (shifts.length === 0) return fail("Ekkert vaktaplan er til fyrir mánuðinn.");
    const [types, doctors] = await Promise.all([loadShiftTypes(), listDoctors(false)]);
    // Aðeins vaktir sem á að manna: bakvakt sem enginn þarf er ekki gat.
    const empty = requiredSlots(toPlanSlots(shifts, types), toPlanDoctors(doctors)).filter((s) => !s.doctorId).length;
    if (empty > 0 && !body.allow_gaps) {
      return json({ ok: false, error: `${empty} vakt${empty === 1 ? "" : "ir"} án læknis.`, needsConfirm: "gaps", empty }, 409);
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
      origin, subject: `Vaktaplan ${monthLabel(month)} tekið úr birtingu`, heading: "Vaktaplan tekið úr birtingu",
      notices: withShifts.map((doctorId) => ({
        doctorId,
        line: `${auth.actor.label} tók vaktaplanið fyrir ${monthLabel(month)} úr birtingu til endurskoðunar. Vaktirnar eru ekki lengur í dagatalinu þínu; þú færð að vita þegar það er birt aftur.`,
      })),
      cta: { label: "Opna mína síðu", path: "/hsu/min-sida" },
      email: "digest",
    });
  }
  const notify = Boolean(body.notify);
  const label = monthLabel(month);
  if (notify && status === "collecting") {
    const deadline = saved.prefs_deadline ? ` fyrir ${dayLabel(saved.prefs_deadline)}` : "";
    after(async () => {
      for (const d of await activeDoctors()) {
        await sendHsuEmail(d.email, `Skráðu vaktaóskir fyrir ${label}`, hsuEmailHtml({
          origin, heading: `Vaktaóskir fyrir ${label}`,
          paragraphs: [`Sæl/l ${d.name}.`, `Opnað hefur verið fyrir vaktaóskir fyrir ${label}. Merktu þá daga sem þú getur ekki unnið og þá sem þú vilt helst vinna${deadline}.`, ...(saved.note ? [saved.note] : [])],
          cta: { label: "Skrá óskir", url: `${origin}/hsu/min-sida?t=oskir&m=${month}` },
        }), `Skráðu vaktaóskir fyrir ${label}${deadline}: ${origin}/hsu/min-sida?t=oskir&m=${month}`);
      }
    });
  }
  if (notify && publishing) {
    after(async () => {
      const shifts = await loadMonthShifts(month);
      for (const d of await activeDoctors()) {
        const n = shifts.filter((s) => s.doctor_id === d.id).length;
        await sendHsuEmail(d.email, `Vaktaplan ${label} er birt`, hsuEmailHtml({
          origin, heading: `Vaktaplan ${label}`,
          paragraphs: [`Sæl/l ${d.name}.`, `Vaktaplan fyrir ${label} hefur verið birt. Þú ert með ${n} vakt${n === 1 ? "" : "ir"}.`, "Vaktirnar birtast sjálfkrafa í dagatalinu þínu ef þú hefur tengt það."],
          cta: { label: "Sjá vaktirnar mínar", url: `${origin}/hsu/min-sida` },
        }), `Vaktaplan ${label} er birt. Þú ert með ${n} vaktir. ${origin}/hsu/min-sida`);
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
  const { month } = await ctx.params;
  if (!MONTH_RE.test(month)) return fail("Ógildur mánuður");
  const body = await readJson(req);
  if (body.action !== "remind") return fail("Óþekkt aðgerð");
  const scope = body.scope === "all" || body.scope === "one" ? body.scope : "missing";
  const origin = originOf(req);
  const [prefs, m, doctors] = await Promise.all([loadPreferences(month), loadMonth(month), activeDoctors()]);
  const done = new Set(prefs.filter((p) => p.status === "submitted" || p.status === "approved").map((p) => p.doctor_id));
  const chosen = scope === "all" ? doctors
    : scope === "one" ? doctors.filter((d) => d.id === body.doctorId)
    : doctors.filter((d) => !done.has(d.id));
  if (scope === "one" && !chosen.length) return fail("Læknirinn fannst ekki", 404);

  const targets: typeof doctors = [];
  let skipped = 0;
  for (const d of chosen) {
    if (await throttle(`remind:${month}:${d.id}`, 1, 60)) targets.push(d); else skipped++;
  }

  const label = monthLabel(month);
  const deadline = m?.prefs_deadline ? ` fyrir ${dayLabel(m.prefs_deadline)}` : "";
  const link = `/hsu/min-sida?t=oskir&m=${month}`;
  const lineFor = (id: string) => done.has(id)
    ? `Þú hefur sent óskir fyrir ${label}. Farðu yfir þær${deadline} ef eitthvað hefur breyst.`
    : `Við eigum eftir að fá vaktaóskirnar þínar fyrir ${label}${deadline}.`;

  if (targets.length) {
    await supabaseAdmin.from("hsu_notifications").insert(targets.map((d) => ({
      doctor_id: d.id, title: `Áminning: vaktaóskir fyrir ${label}`, lines: [lineFor(d.id)], link,
    })));
  }
  after(async () => {
    for (const d of targets) {
      await sendHsuEmail(d.email, `Áminning: vaktaóskir fyrir ${label}`, hsuEmailHtml({
        origin, heading: "Áminning um vaktaóskir",
        paragraphs: [`Sæl/l ${d.name}.`, lineFor(d.id)],
        cta: { label: done.has(d.id) ? "Skoða óskirnar mínar" : "Skrá óskir", url: `${origin}${link}` },
      }), `Áminning: ${lineFor(d.id)} ${origin}${link}`);
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
  if (!MONTH_RE.test(month)) return fail("Ógildur mánuður");
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
