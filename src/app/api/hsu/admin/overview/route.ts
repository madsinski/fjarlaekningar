// Allt sem vaktaskipulagið þarf fyrir einn mánuð, í einu kalli.

import { supabaseAdmin } from "@/lib/supabase-admin";
import {
  MONTH_RE, fail, json, listDoctors, loadMonth, loadMonthShifts, loadPendingSwaps, loadPreferences, loadShiftTypes, requireManager,
} from "@/lib/hsu/server";
import { tr } from "@/lib/hsu/i18n/server";
import { apiAdmin } from "@/lib/hsu/i18n/messages/api-admin";
import { normalizeEmailPrefs } from "@/lib/hsu/email-prefs";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const auth = await requireManager(req);
  if ("res" in auth) return auth.res;
  const month = new URL(req.url).searchParams.get("month") ?? "";
  if (!MONTH_RE.test(month)) return fail(tr(req, apiAdmin)("err.badMonth"));

  try {
    const today = new Date().toISOString().slice(0, 10);
    const [settings, shiftTypes, doctors, m, prefs, shifts, swaps, auditRows, months] = await Promise.all([
      supabaseAdmin.from("hsu_settings").select("unit_name, market_requires_approval, email_prefs").eq("id", 1).maybeSingle().then((r) => r.data),
      loadShiftTypes(),
      listDoctors(),
      loadMonth(month),
      loadPreferences(month),
      loadMonthShifts(month),
      loadPendingSwaps(),
      supabaseAdmin.from("hsu_audit").select("at, actor, action, detail").eq("month", month).order("at", { ascending: false }).limit(40).then((r) => r.data ?? []),
      supabaseAdmin.from("hsu_months").select("month, status").order("month").then((r) => r.data ?? []),
    ]);
    const actor = auth.actor;
    // Innleiðing yfirlæknis: hvað hann hefur séð og hvort dagatalið er tengt.
    let onboarding: Record<string, string> = {};
    let calendarConnected = false;
    if (actor.kind === "doctor") {
      const [{ data: me }, { data: sync }] = await Promise.all([
        supabaseAdmin.from("hsu_doctors").select("onboarding, calendar_token").eq("id", actor.doctor.id).maybeSingle(),
        supabaseAdmin.from("hsu_google_sync").select("doctor_id").eq("doctor_id", actor.doctor.id).maybeSingle(),
      ]);
      onboarding = (me?.onboarding ?? {}) as Record<string, string>;
      calendarConnected = Boolean(me?.calendar_token || sync);
    }
    // Tengiliður Fjarlækninga (sama og neyðarnúmerið í vinnustöðinni).
    const { data: contact } = await supabaseAdmin.from("gatt_settings").select("value").eq("key", "emergency_contact").maybeSingle();
    const c = (contact?.value ?? null) as { name?: string; phone?: string } | null;
    const phone = String(c?.phone ?? "").replace(/^\+354\s*/, "").replace(/^(\d{3})(\d{4})$/, "$1 $2");
    const support = c?.name && phone ? { name: c.name, phone } : null;
    return json({
      ok: true,
      actor: {
        kind: actor.kind,
        label: actor.label,
        doctorId: actor.kind === "doctor" ? actor.doctor.id : null,
        role: actor.kind === "doctor" ? actor.doctor.role : null,
        onboarding,
        calendarConnected,
      },
      support,
      settings: {
        unit_name: settings?.unit_name ?? "Heilsugæslan í Vestmannaeyjum",
        market_requires_approval: settings?.market_requires_approval ?? false,
        email_prefs: normalizeEmailPrefs(settings?.email_prefs),
      },
      shiftTypes,
      doctors,
      month: m,
      months,
      preferences: prefs,
      shifts,
      // Allar opnar færslur á vaktamarkaði, ekki bara þessa mánaðar: yfirlæknir
      // á að sjá það sem bíður hans óháð því hvaða mánuð hann er að skipuleggja.
      swaps: swaps.filter((s) => s.shift && s.shift.shift_date >= today),
      audit: auditRows,
    });
  } catch (e) {
    return fail(e instanceof Error ? e.message : String(e), 500);
  }
}
