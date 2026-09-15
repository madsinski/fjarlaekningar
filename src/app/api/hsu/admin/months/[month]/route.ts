// Skref mánaðarins: opna fyrir óskir, loka í yfirferð, vaktaplan, birta.
// Einnig: minna þá á sem eiga eftir að senda óskir.

import { after } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { audit } from "@/lib/hsu/auth";
import { hsuSync } from "@/lib/hsu/calendar";
import {
  DATE_RE, MONTH_RE, fail, hsuEmailHtml, json, loadMonth, loadMonthShifts, loadPreferences, originOf, readJson, requireManager, sendHsuEmail,
} from "@/lib/hsu/server";
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
    const empty = shifts.filter((s) => !s.doctor_id).length;
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

/** Áminning til þeirra sem hafa ekki sent inn óskir. */
export async function POST(req: Request, ctx: { params: Promise<{ month: string }> }) {
  const auth = await requireManager(req);
  if ("res" in auth) return auth.res;
  const { month } = await ctx.params;
  if (!MONTH_RE.test(month)) return fail("Ógildur mánuður");
  const body = await readJson(req);
  if (body.action !== "remind") return fail("Óþekkt aðgerð");
  const origin = originOf(req);
  const [prefs, m, doctors] = await Promise.all([loadPreferences(month), loadMonth(month), activeDoctors()]);
  const done = new Set(prefs.filter((p) => p.status === "submitted" || p.status === "approved").map((p) => p.doctor_id));
  const targets = doctors.filter((d) => !done.has(d.id));
  const label = monthLabel(month);
  const deadline = m?.prefs_deadline ? ` fyrir ${dayLabel(m.prefs_deadline)}` : "";
  for (const d of targets) {
    await sendHsuEmail(d.email, `Áminning: vaktaóskir fyrir ${label}`, hsuEmailHtml({
      origin, heading: "Áminning um vaktaóskir",
      paragraphs: [`Sæl/l ${d.name}.`, `Við eigum eftir að fá vaktaóskirnar þínar fyrir ${label}${deadline}.`],
      cta: { label: "Skrá óskir", url: `${origin}/hsu/min-sida?t=oskir&m=${month}` },
    }), `Áminning: skráðu vaktaóskir fyrir ${label}: ${origin}/hsu/min-sida?t=oskir&m=${month}`);
  }
  await audit(auth.actor.label, "month.remind", month, { count: targets.length });
  return json({ ok: true, sent: targets.length });
}
