// Aggregating monthly rows over a chosen window.
//
// Two rules that are easy to get wrong and expensive to get wrong:
//
//   Rates and medians are WEIGHTED, never averaged. A quiet month with four
//   cases must not pull the figure as hard as a busy one with ninety.
//
//   Unmeasured is not zero. A blank field drops out of the calculation rather
//   than counting as nothing — "no serious incidents" and "we did not look for
//   serious incidents" are different statements and the dashboard shows them
//   differently.

import { erindi } from "@/erindi";
import { summarise, type ExclusionRow } from "./exclusions";

export type CaseCounts = { total: number; resolved: number; referred: number };
export type NamedCount = { label: string; count: number };

/** One station, one month. Mirrors `evaluation_months`. */
export type MonthRow = {
  id?: string;
  institution: string;
  station: string;
  /** yyyy-mm-01 */
  month: string;

  cases_total: number;
  cases_resolved: number;
  cases_referred: number;
  cases_repeat: number;
  codes_outside_set: number;
  screening_stops: number;
  /** Subset of cases_referred: turned away as unsuitable rather than referred
   *  onward as normal care. The difference is the whole point — only this is a
   *  safety figure. */
  excluded_by_doctor: number;
  /** Both gates in one place. */
  exclusion_reasons: ExclusionRow[];
  prescriptions: number;
  antibiotics: number;
  response_median_min: number | null;
  response_p95_min: number | null;
  cases_by_type: Record<string, CaseCounts>;
  entry_direct: number;
  /** Routed by a nurse, receptionist or records staff. The export cannot
   *  separate them, so they are counted together — what matters for workload
   *  is whether the health centre spent time on it at all. */
  entry_via_staff: number;
  general_total: number;
  general_resolved: number;
  general_unresolved_reasons: NamedCount[];

  institution_contacts: number | null;
  revisits_7d: number | null;
  locum_cost_isk: number | null;
  institution_calls: number | null;

  survey_sent: number;
  survey_responses: number;
  survey_easy_pct: number | null;
  survey_reuse_pct: number | null;
  survey_would_not_have_sought_pct: number | null;
  time_to_resolution_median_h: number | null;
  trips_avoided: number | null;
  staff_nurses_positive_pct: number | null;
  staff_doctors_positive_pct: number | null;

  deviations: number;
  near_misses: number;
  serious_incidents: number;

  doctors_left: number;
  support_questions: number;
  uptime_pct: number | null;

  // Second-wave modules. All nullable: a module that is off never asks, and
  // unmeasured must read as unmeasured rather than as zero.
  clinician_minutes_median: number | null;
  home_tests_used: number | null;
  home_tests_changed_decision: number | null;
  images_submitted: number | null;
  images_inadequate: number | null;
  reach_under40_pct: number | null;
  reach_over70_pct: number | null;
  reach_other_language_pct: number | null;
  demand_evening_pct: number | null;
  demand_weekend_pct: number | null;
  ooh_alternative_pct: number | null;
  institution_dna_pct: number | null;
  concordance_checked: number | null;
  concordance_agreed: number | null;
  followup_contacted: number | null;
  followup_adhered: number | null;
  implementation_days: number | null;
  training_hours: number | null;

  note: string;
  sources_present: string[];
  entered_by_name?: string;
  updated_at?: string;
};

const COUNT_KEYS = [
  "cases_total", "cases_resolved", "cases_referred", "cases_repeat",
  "codes_outside_set", "screening_stops", "excluded_by_doctor", "prescriptions", "antibiotics",
  "entry_direct", "entry_via_staff",
  "general_total", "general_resolved", "survey_sent", "survey_responses",
  "deviations", "near_misses", "serious_incidents",
  "doctors_left", "support_questions",
] as const;

const NULLABLE_KEYS = [
  "response_median_min", "response_p95_min", "institution_contacts", "revisits_7d",
  "locum_cost_isk", "institution_calls", "survey_easy_pct", "survey_reuse_pct",
  "survey_would_not_have_sought_pct", "time_to_resolution_median_h", "trips_avoided",
  "staff_nurses_positive_pct", "staff_doctors_positive_pct", "uptime_pct",
  "clinician_minutes_median", "home_tests_used", "home_tests_changed_decision",
  "images_submitted", "images_inadequate",
  "reach_under40_pct", "reach_over70_pct", "reach_other_language_pct",
  "demand_evening_pct", "demand_weekend_pct", "ooh_alternative_pct", "institution_dna_pct",
  "concordance_checked", "concordance_agreed", "followup_contacted", "followup_adhered",
  "implementation_days", "training_hours",
] as const;

export function emptyMonth(institution: string, station: string, month: string): MonthRow {
  const r = { institution, station, month } as MonthRow;
  for (const k of COUNT_KEYS) (r as Record<string, unknown>)[k] = 0;
  for (const k of NULLABLE_KEYS) (r as Record<string, unknown>)[k] = null;
  r.cases_by_type = {};
  r.exclusion_reasons = [];
  r.general_unresolved_reasons = [];
  r.note = "";
  r.sources_present = [];
  return r;
}

export const pct = (part: number, whole: number): number | null =>
  whole > 0 ? Math.round((part / whole) * 100) : null;

const sum = (rows: MonthRow[], pick: (r: MonthRow) => number) => rows.reduce((a, r) => a + (pick(r) || 0), 0);

function weighted(rows: MonthRow[], value: (r: MonthRow) => number | null, weight: (r: MonthRow) => number): number | null {
  let acc = 0, w = 0;
  for (const r of rows) {
    const v = value(r), k = weight(r) || 0;
    if (v === null || v === undefined || !k) continue;
    acc += v * k; w += k;
  }
  return w ? Math.round(acc / w) : null;
}

/** Sums only the months that actually carry a value; null if none do. */
function sumMeasured(rows: MonthRow[], pick: (r: MonthRow) => number | null): number | null {
  const measured = rows.filter((r) => pick(r) !== null && pick(r) !== undefined);
  return measured.length ? measured.reduce((a, r) => a + (pick(r) || 0), 0) : null;
}

/** Largest measured value. For a figure recorded once rather than monthly —
 *  summing "days to open the site" across twelve months would give a year. */
function maxMeasured(rows: MonthRow[], pick: (r: MonthRow) => number | null): number | null {
  const measured = rows.map(pick).filter((v): v is number => v !== null && v !== undefined);
  return measured.length ? Math.max(...measured) : null;
}

function mergeNamed(rows: MonthRow[], pick: (r: MonthRow) => NamedCount[]): NamedCount[] {
  const map = new Map<string, number>();
  for (const r of rows) for (const n of pick(r) || []) {
    const key = n?.label?.trim();
    if (key) map.set(key, (map.get(key) ?? 0) + (n.count || 0));
  }
  return [...map.entries()].map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count);
}

/**
 * Staffing of our own service, from `roster_*` (Rota, under Staff).
 *
 * Not `hsu_*` — that is the on-call system we built FOR HSU and says nothing
 * about whether our service was covered.
 *
 * Service-wide, not per station: the same doctor covers every site, so this
 * does not change when a station is selected. The interface has to say so,
 * or somebody reads "100% covered" on a station tab and believes it is about
 * that station.
 */
export type Roster = {
  shifts: number;
  covered: number;
  /** Distinct doctors over the window — counted, never summed across months. */
  doctors: number;
  activeDoctors: number;
  /** Patients doctors logged against their own shifts — an independent count. */
  patientsLogged: number;
  swaps: number;
};

export const EMPTY_ROSTER: Roster = { shifts: 0, covered: 0, doctors: 0, activeDoctors: 0, patientsLogged: 0, swaps: 0 };

export type RosterMonth = {
  month: string; shifts: number; covered: number;
  doctors: string[]; patientsLogged: number; swaps: number;
};

/** Doctor IDs are carried rather than counts, so the same doctor working two
 *  months counts once over a two-month window. */
export function totalRoster(rows: RosterMonth[], activeDoctors: number): Roster {
  const doctors = new Set<string>();
  for (const r of rows) for (const d of r.doctors) doctors.add(d);
  return {
    shifts: rows.reduce((a, r) => a + r.shifts, 0),
    covered: rows.reduce((a, r) => a + r.covered, 0),
    doctors: doctors.size,
    activeDoctors,
    patientsLogged: rows.reduce((a, r) => a + r.patientsLogged, 0),
    swaps: rows.reduce((a, r) => a + r.swaps, 0),
  };
}

export type Totals = ReturnType<typeof total>;

export function total(rows: MonthRow[]) {
  const byType: Record<string, CaseCounts> = {};
  for (const r of rows) for (const [slug, c] of Object.entries(r.cases_by_type || {})) {
    const cur = byType[slug] ?? { total: 0, resolved: 0, referred: 0 };
    byType[slug] = {
      total: cur.total + (c?.total || 0),
      resolved: cur.resolved + (c?.resolved || 0),
      referred: cur.referred + (c?.referred || 0),
    };
  }

  const counts = Object.fromEntries(COUNT_KEYS.map((k) => [k, sum(rows, (r) => r[k] as number)])) as Record<
    (typeof COUNT_KEYS)[number],
    number
  >;

  const entry = {
    direct: counts.entry_direct,
    viaStaff: counts.entry_via_staff,
    total: counts.entry_direct + counts.entry_via_staff,
  };

  return {
    ...counts,
    months: rows.length,
    entry,
    byType,
    // Both gates, with the reasons the form was meant to catch but a clinician
    // did — each of those is a gap in the questionnaire logic.
    exclusions: summarise(rows.flatMap((r) => r.exclusion_reasons ?? [])),
    generalUnresolved: mergeNamed(rows, (r) => r.general_unresolved_reasons),

    institution_contacts: sumMeasured(rows, (r) => r.institution_contacts),
    revisits_7d: sumMeasured(rows, (r) => r.revisits_7d),
    locum_cost_isk: sumMeasured(rows, (r) => r.locum_cost_isk),
    institution_calls: sumMeasured(rows, (r) => r.institution_calls),
    trips_avoided: sumMeasured(rows, (r) => r.trips_avoided),

    response_median_min: weighted(rows, (r) => r.response_median_min, (r) => r.cases_total),
    response_p95_min: weighted(rows, (r) => r.response_p95_min, (r) => r.cases_total),
    time_to_resolution_median_h: weighted(rows, (r) => r.time_to_resolution_median_h, (r) => r.survey_responses),
    survey_easy_pct: weighted(rows, (r) => r.survey_easy_pct, (r) => r.survey_responses),
    survey_reuse_pct: weighted(rows, (r) => r.survey_reuse_pct, (r) => r.survey_responses),
    survey_would_not_have_sought_pct: weighted(rows, (r) => r.survey_would_not_have_sought_pct, (r) => r.survey_responses),
    staff_nurses_positive_pct: weighted(rows, (r) => r.staff_nurses_positive_pct, () => 1),
    staff_doctors_positive_pct: weighted(rows, (r) => r.staff_doctors_positive_pct, () => 1),
    uptime_pct: weighted(rows, (r) => r.uptime_pct, () => 1),

    home_tests_used: sumMeasured(rows, (r) => r.home_tests_used),
    home_tests_changed_decision: sumMeasured(rows, (r) => r.home_tests_changed_decision),
    images_submitted: sumMeasured(rows, (r) => r.images_submitted),
    images_inadequate: sumMeasured(rows, (r) => r.images_inadequate),
    concordance_checked: sumMeasured(rows, (r) => r.concordance_checked),
    concordance_agreed: sumMeasured(rows, (r) => r.concordance_agreed),
    followup_contacted: sumMeasured(rows, (r) => r.followup_contacted),
    followup_adhered: sumMeasured(rows, (r) => r.followup_adhered),
    // Implementation is entered once, in the go-live month, so the maximum
    // across the window is the figure — summing it would multiply by months.
    implementation_days: maxMeasured(rows, (r) => r.implementation_days),
    training_hours: maxMeasured(rows, (r) => r.training_hours),

    clinician_minutes_median: weighted(rows, (r) => r.clinician_minutes_median, (r) => r.cases_total),
    reach_under40_pct: weighted(rows, (r) => r.reach_under40_pct, (r) => r.cases_total),
    reach_over70_pct: weighted(rows, (r) => r.reach_over70_pct, (r) => r.cases_total),
    reach_other_language_pct: weighted(rows, (r) => r.reach_other_language_pct, (r) => r.cases_total),
    demand_evening_pct: weighted(rows, (r) => r.demand_evening_pct, (r) => r.cases_total),
    demand_weekend_pct: weighted(rows, (r) => r.demand_weekend_pct, (r) => r.cases_total),
    ooh_alternative_pct: weighted(rows, (r) => r.ooh_alternative_pct, (r) => r.survey_responses),
    institution_dna_pct: weighted(rows, (r) => r.institution_dna_pct, () => 1),
  };
}

/** The eleven case types with a defined scope. The catch-all and certificates
 *  are measured separately, and the order follows src/erindi.ts so this list
 *  cannot drift from the website. */
export const SCOPED_CASE_TYPES = erindi.filter(
  (e) => e.slug !== "almenn-laeknisthjonusta" && e.slug !== "laeknisvottord",
);

export function caseTypeRows(t: Totals) {
  return SCOPED_CASE_TYPES.map((e) => {
    const c = t.byType[e.slug] ?? { total: 0, resolved: 0, referred: 0 };
    return { slug: e.slug, name: e.titleEn, c, rate: pct(c.resolved, c.total) };
  });
}

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export function monthName(iso: string): string {
  const [y, m] = iso.split("-").map(Number);
  return `${MONTHS[(m || 1) - 1]} ${y}`;
}

export function monthISO(offset = 0): string {
  const d = new Date();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() + offset);
  return d.toISOString().slice(0, 10);
}

export function lastMonths(n: number): string[] {
  return Array.from({ length: n }, (_, i) => monthISO(-(n - 1 - i)));
}
