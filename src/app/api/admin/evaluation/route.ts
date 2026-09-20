// Service evaluation — figures, programme configuration and assumptions.
//
// GET  — any active staff member reads. Returns everything the page needs in
//        one call, because it cannot draw itself without all of it.
// POST — admins write. `action` selects what.

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getCallerStaff, isAdmin } from "@/lib/admin-auth";
import { DEFAULT_ASSUMPTIONS, EMPTY_PROGRAMME, type Assumptions, type Programme } from "@/lib/evaluation/types";
import { DEFAULT_DESIGN_STATE, type DesignState } from "@/lib/evaluation/design";
import type { MonthRow, RosterMonth } from "@/lib/evaluation/totals";
import { MEDALIA_COLUMNS } from "@/lib/evaluation/import";
import { caseTypeChart, entryChart, toSlides, volumeChart } from "@/lib/evaluation/export";
import { total, totalRoster, type RosterMonth as RM } from "@/lib/evaluation/totals";
import { HSU_STATIONS, mergeOnboarding } from "@/lib/station-onboarding";

export const runtime = "nodejs";

const PROGRAMME_KEY = "evaluation_programme";
const ASSUMPTIONS_KEY = "evaluation_assumptions";
const DESIGN_KEY = "evaluation_design";

async function readSetting<T>(key: string, fallback: T): Promise<T> {
  const { data } = await supabaseAdmin.from("site_settings").select("value").eq("key", key).maybeSingle();
  return data?.value ? ({ ...fallback, ...(data.value as object) } as T) : fallback;
}

async function writeSetting(key: string, value: unknown, staffId: string) {
  await supabaseAdmin.from("site_settings").upsert(
    { key, value, updated_by: staffId, updated_at: new Date().toISOString() },
    { onConflict: "key" },
  );
}

/** Stations come from the rollout module so there is one truth about which
 *  stations exist. If it has not been set up, fall back to HSU's own list. */
async function readStations(): Promise<{ institution: string; short: string; stations: string[] }[]> {
  const { data } = await supabaseAdmin.from("site_settings").select("value").eq("key", "station_onboarding").maybeSingle();
  const state = mergeOnboarding(data?.value ?? null);
  const out = state.institutions
    .filter((i) => i.stations.length)
    .map((i) => ({ institution: i.short.toLowerCase() || i.id, short: i.short || i.name, stations: i.stations.map((s) => s.name) }));
  return out.length ? out : [{ institution: "hsu", short: "HSU", stations: HSU_STATIONS }];
}

/**
 * Staffing of our own service, from `roster_*` (Rota, under Staff) — NOT from
 * `hsu_*`, which is the on-call system we built for HSU and says nothing about
 * whether our service was covered.
 *
 * Returned per month carrying doctor IDs rather than a count, so the interface
 * can count DISTINCT doctors over whatever window is selected. Summing the
 * counts here would double-count a doctor who worked in two months.
 */
async function readRoster(): Promise<{ months: RosterMonth[]; activeDoctors: number }> {
  const from = new Date();
  from.setUTCMonth(from.getUTCMonth() - 24);

  const [shifts, doctors, swaps] = await Promise.all([
    supabaseAdmin.from("roster_shifts").select("id, shift_date, doctor_id, patients_seen").gte("shift_date", from.toISOString().slice(0, 10)),
    supabaseAdmin.from("roster_doctors").select("id").eq("active", true),
    supabaseAdmin.from("roster_swaps").select("shift_id").eq("status", "accepted"),
  ]);

  const months = new Map<string, RosterMonth>();
  const monthOfShift = new Map<string, string>();

  for (const s of shifts.data ?? []) {
    const month = `${String(s.shift_date).slice(0, 7)}-01`;
    monthOfShift.set(s.id as string, month);
    const m = months.get(month) ?? { month, shifts: 0, covered: 0, doctors: [], patientsLogged: 0, swaps: 0 };
    m.shifts++;
    if (s.doctor_id) {
      m.covered++;
      if (!m.doctors.includes(s.doctor_id as string)) m.doctors.push(s.doctor_id as string);
    }
    m.patientsLogged += (s.patients_seen as number) || 0;
    months.set(month, m);
  }

  for (const sw of swaps.data ?? []) {
    const m = months.get(monthOfShift.get(sw.shift_id as string) ?? "");
    if (m) m.swaps++;
  }

  return {
    months: [...months.values()].sort((a, b) => a.month.localeCompare(b.month)),
    activeDoctors: doctors.data?.length ?? 0,
  };
}

export async function GET(req: Request) {
  const caller = await getCallerStaff(req);
  if (!caller) return NextResponse.json({ ok: false, error: "Sign-in required" }, { status: 401 });

  try {
    const [monthsRes, programme, assumptions, stations, roster, docsRes, design] = await Promise.all([
      supabaseAdmin.from("evaluation_months").select("*").order("month", { ascending: true }),
      readSetting<Programme>(PROGRAMME_KEY, EMPTY_PROGRAMME),
      readSetting<Assumptions>(ASSUMPTIONS_KEY, DEFAULT_ASSUMPTIONS),
      readStations(),
      readRoster().catch(() => ({ months: [], activeDoctors: 0 })),
      supabaseAdmin.from("evaluation_documents").select("*").order("created_at", { ascending: false }),
      readSetting<DesignState>(DESIGN_KEY, DEFAULT_DESIGN_STATE),
    ]);
    if (monthsRes.error) throw monthsRes.error;

    return NextResponse.json({
      ok: true,
      months: monthsRes.data ?? [],
      programme,
      assumptions,
      stations,
      roster,
      documents: docsRes.data ?? [],
      design,
      admin: isAdmin(caller),
    });
  } catch {
    // Table missing — the migration has not been run. Say so plainly rather
    // than looking like a programme with no data in it.
    return NextResponse.json({
      ok: true,
      unavailable: true,
      months: [],
      programme: EMPTY_PROGRAMME,
      assumptions: DEFAULT_ASSUMPTIONS,
      stations: [{ institution: "hsu", short: "HSU", stations: HSU_STATIONS }],
      roster: { months: [], activeDoctors: 0 },
      documents: [],
      design: DEFAULT_DESIGN_STATE,
      admin: isAdmin(caller),
    });
  }
}

/**
 * Generate a deck into the presentations module.
 *
 * Charts are rendered here as SVG and uploaded to `presentation-assets`, which
 * is a public bucket — so the slide can reference them by URL like any other
 * image and the deck keeps working when it is shared or exported. They are
 * files rather than inline markup because a slide's image field takes a URL,
 * and because a chart that has been written down does not silently change when
 * next month's data arrives.
 */
async function buildDeck(
  programme: Programme,
  assumptions: Assumptions,
  rows: MonthRow[],
  rosterMonths: RM[],
  activeDoctors: number,
  station: string,
  period: string,
  staffId: string,
) {
  const t = total(rows);
  const roster = totalRoster(rosterMonths, activeDoctors);
  const stamp = Date.now();

  const upload = async (name: string, svg: string): Promise<string | undefined> => {
    const path = `evaluation/${stamp}-${name}.svg`;
    const { error } = await supabaseAdmin.storage
      .from("presentation-assets")
      .upload(path, Buffer.from(svg, "utf8"), { contentType: "image/svg+xml", upsert: true });
    if (error) return undefined;
    return supabaseAdmin.storage.from("presentation-assets").getPublicUrl(path).data.publicUrl;
  };

  const charts = {
    volume: await upload("volume", volumeChart(rows)),
    caseTypes: await upload("case-types", caseTypeChart(t)),
    entry: await upload("entry-routes", entryChart(t)),
  };

  const slides = toSlides(programme, { t, roster, a: assumptions }, { station, period, charts });

  // A slug that is stable per station and date but cannot collide with a deck
  // someone made by hand.
  const base = `evaluation-${station.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${new Date().toISOString().slice(0, 10)}`;
  let slug = base;
  for (let i = 2; i < 40; i++) {
    const { data } = await supabaseAdmin.from("presentation_decks").select("id").eq("slug", slug).maybeSingle();
    if (!data) break;
    slug = `${base}-${i}`;
  }

  const { data, error } = await supabaseAdmin
    .from("presentation_decks")
    .insert({
      slug,
      title: `Service evaluation — ${station}`,
      data: { slides, design: "lifeline" },
      created_by: staffId,
      updated_by: staffId,
    })
    .select("id, slug")
    .single();
  if (error) throw error;
  return { ...data, slides: slides.length };
}

/** Whitelist rather than blacklist, so a new column on the table does not
 *  silently become writable from a browser. */
const WRITABLE = new Set<string>([
  "institution", "station", "month",
  "cases_total", "cases_resolved", "cases_referred", "cases_repeat",
  "referred_primary_care", "referred_specialist", "referred_other", "referred_urgent",
  "codes_outside_set", "screening_stops", "screening_reasons", "prescriptions", "antibiotics",
  "response_median_min", "response_p95_min", "cases_by_type",
  "entry_direct", "entry_nurse", "entry_reception", "entry_records", "entry_other",
  "general_total", "general_resolved", "general_unresolved_reasons",
  "institution_contacts", "revisits_7d", "locum_cost_isk", "institution_calls",
  "survey_sent", "survey_responses", "survey_easy_pct", "survey_reuse_pct",
  "survey_would_not_have_sought_pct", "time_to_resolution_median_h", "trips_avoided",
  "staff_nurses_positive_pct", "staff_doctors_positive_pct",
  "deviations", "near_misses", "serious_incidents",
  "doctors_left", "support_questions", "uptime_pct",
  "clinician_minutes_median", "home_tests_used", "home_tests_changed_decision",
  "images_submitted", "images_inadequate",
  "reach_under40_pct", "reach_over70_pct", "reach_other_language_pct",
  "demand_evening_pct", "demand_weekend_pct", "ooh_alternative_pct", "institution_dna_pct",
  "concordance_checked", "concordance_agreed", "followup_contacted", "followup_adhered",
  "implementation_days", "training_hours",
  "note", "sources_present",
]);

function clean(row: Partial<MonthRow>, caller: { id: string; name: string }, allowed: Set<string> = WRITABLE) {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(row)) if (allowed.has(k)) out[k] = v;
  out.entered_by = caller.id;
  out.entered_by_name = caller.name;
  return out;
}

export async function POST(req: Request) {
  const caller = await getCallerStaff(req);
  if (!isAdmin(caller)) return NextResponse.json({ ok: false, error: "Admin role required" }, { status: 403 });

  let body: {
    action?: string;
    month?: Partial<MonthRow>;
    months?: Partial<MonthRow>[];
    programme?: Programme;
    assumptions?: Assumptions;
    design?: DesignState;
    deck?: { station: string; period: string; monthsIso: string[] };
  } = {};
  try { body = await req.json(); } catch { return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 }); }

  try {
    switch (body.action) {
      case "programme": {
        if (!body.programme) return NextResponse.json({ ok: false, error: "Programme missing" }, { status: 400 });
        await writeSetting(PROGRAMME_KEY, body.programme, caller!.id);
        return NextResponse.json({ ok: true });
      }

      case "assumptions": {
        if (!body.assumptions) return NextResponse.json({ ok: false, error: "Assumptions missing" }, { status: 400 });
        await writeSetting(ASSUMPTIONS_KEY, body.assumptions, caller!.id);
        return NextResponse.json({ ok: true });
      }

      case "design": {
        if (!body.design) return NextResponse.json({ ok: false, error: "Design missing" }, { status: 400 });
        await writeSetting(DESIGN_KEY, body.design, caller!.id);
        return NextResponse.json({ ok: true });
      }

      case "deck": {
        if (!body.deck?.station) return NextResponse.json({ ok: false, error: "Station required" }, { status: 400 });
        const [rowsRes, programme, assumptions, roster] = await Promise.all([
          supabaseAdmin.from("evaluation_months").select("*").order("month", { ascending: true }),
          readSetting<Programme>(PROGRAMME_KEY, EMPTY_PROGRAMME),
          readSetting<Assumptions>(ASSUMPTIONS_KEY, DEFAULT_ASSUMPTIONS),
          readRoster().catch(() => ({ months: [], activeDoctors: 0 })),
        ]);
        const want = new Set(body.deck.monthsIso ?? []);
        const rows = ((rowsRes.data ?? []) as MonthRow[]).filter(
          (r) => (body.deck!.station === "__all" || r.station === body.deck!.station) && (!want.size || want.has(r.month.slice(0, 10))),
        );
        const deck = await buildDeck(
          programme, assumptions, rows,
          roster.months.filter((m) => !want.size || want.has(m.month)),
          roster.activeDoctors,
          body.deck.station === "__all" ? "all stations" : body.deck.station,
          body.deck.period,
          caller!.id,
        );
        return NextResponse.json({ ok: true, deck });
      }

      case "import": {
        const rows = (body.months ?? []).filter((m) => m.station && m.month);
        if (!rows.length) return NextResponse.json({ ok: false, error: "No rows" }, { status: 400 });
        // Only the Medalia columns. Figures that come from elsewhere — the
        // contact register, surveys — are entered by hand and must not be
        // wiped by re-importing a month, with nobody able to see it happen.
        const allowed = new Set<string>(MEDALIA_COLUMNS as string[]);
        const { error } = await supabaseAdmin
          .from("evaluation_months")
          .upsert(rows.map((m) => clean(m, caller!, allowed)), { onConflict: "institution,station,month" });
        if (error) throw error;
        return NextResponse.json({ ok: true, count: rows.length });
      }

      default: {
        if (!body.month?.station || !body.month?.month) {
          return NextResponse.json({ ok: false, error: "Station and month required" }, { status: 400 });
        }
        const { error } = await supabaseAdmin
          .from("evaluation_months")
          .upsert(clean(body.month, caller!), { onConflict: "institution,station,month" });
        if (error) throw error;
        return NextResponse.json({ ok: true });
      }
    }
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : "Failed" }, { status: 500 });
  }
}
