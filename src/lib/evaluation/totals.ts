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

  // The advisor's programme (2026-09-29). Patient survey in two waves — day 0
  // and day 7 — each with its own response count, because a rate is weighted
  // by the wave it was asked in.
  survey_7d_sent: number;
  survey_7d_responses: number;
  survey_satisfied_pct: number | null;
  survey_substituted_pct: number | null;
  survey_test_obtain_pct: number | null;
  survey_test_perform_pct: number | null;
  survey_resolved_pct: number | null;
  survey_sought_care_7d_pct: number | null;
  survey_other_diagnosis_pct: number | null;
  /** Serious adverse reaction or allergy to a prescribed drug — from the day-7
   *  survey and incident reports together. */
  adverse_drug_reactions: number | null;
  /** Cases where the decision tree produced an outcome, and how many of those
   *  the doctor changed rather than confirmed. */
  tree_cases: number | null;
  tree_overridden: number | null;
  /** Of `revisits_7d`, those the manual review in Saga found were about the
   *  same problem. */
  revisits_related: number | null;
  /** HSU contacts in the same codes where an antibiotic was prescribed — the
   *  traditional-service comparator, from Saga. */
  institution_antibiotics: number | null;
  staff_satisfied_pct: number | null;
  staff_helps_pct: number | null;
  staff_continue_pct: number | null;

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
  "survey_7d_sent", "survey_7d_responses",
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
  "survey_satisfied_pct", "survey_substituted_pct", "survey_test_obtain_pct", "survey_test_perform_pct",
  "survey_resolved_pct", "survey_sought_care_7d_pct", "survey_other_diagnosis_pct",
  "adverse_drug_reactions", "tree_cases", "tree_overridden", "revisits_related", "institution_antibiotics",
  "staff_satisfied_pct", "staff_helps_pct", "staff_continue_pct",
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

    // Day-0 questions weigh by day-0 responses, day-7 by day-7 responses.
    survey_satisfied_pct: weighted(rows, (r) => r.survey_satisfied_pct, (r) => r.survey_responses),
    survey_substituted_pct: weighted(rows, (r) => r.survey_substituted_pct, (r) => r.survey_responses),
    survey_test_obtain_pct: weighted(rows, (r) => r.survey_test_obtain_pct, (r) => r.survey_responses),
    survey_test_perform_pct: weighted(rows, (r) => r.survey_test_perform_pct, (r) => r.survey_responses),
    survey_resolved_pct: weighted(rows, (r) => r.survey_resolved_pct, (r) => r.survey_7d_responses),
    survey_sought_care_7d_pct: weighted(rows, (r) => r.survey_sought_care_7d_pct, (r) => r.survey_7d_responses),
    survey_other_diagnosis_pct: weighted(rows, (r) => r.survey_other_diagnosis_pct, (r) => r.survey_7d_responses),
    adverse_drug_reactions: sumMeasured(rows, (r) => r.adverse_drug_reactions),
    tree_cases: sumMeasured(rows, (r) => r.tree_cases),
    tree_overridden: sumMeasured(rows, (r) => r.tree_overridden),
    revisits_related: sumMeasured(rows, (r) => r.revisits_related),
    institution_antibiotics: sumMeasured(rows, (r) => r.institution_antibiotics),
    // The staff survey runs once, at the end of the period.
    staff_satisfied_pct: weighted(rows, (r) => r.staff_satisfied_pct, () => 1),
    staff_helps_pct: weighted(rows, (r) => r.staff_helps_pct, () => 1),
    staff_continue_pct: weighted(rows, (r) => r.staff_continue_pct, () => 1),
  };
}

/**
 * Diagnosis codes at HSU in the agreed code set, before and after go-live.
 *
 * The baseline is Saga's monthly count over the months before go-live (three
 * years, per the advisor), with each code counted once per patient per day.
 * Year-on-year growth is taken from the baseline itself: the average change
 * between its twelve-month blocks, projected forward. That is the answer to
 * "how is the increase between years judged?" — the pilot is compared with
 * where the trend was already heading, not with a flat line.
 *
 * Works on monthly means, so a pilot window of five months and a baseline of
 * thirty-six compare fairly.
 */
export type CodeVolume = {
  baselineMonths: number;
  baselinePerMonth: number | null;
  /** Twelve-month blocks, oldest first. Only complete blocks. */
  baselineYears: number[];
  /** Average change between consecutive baseline years, as a fraction. */
  trendPerYear: number | null;
  /** What the trend predicts per month for the pilot period. */
  expectedPerMonth: number | null;
  pilotMonths: number;
  pilotPerMonth: number | null;
  /** Our own cases per month over the same pilot months. */
  remotePerMonth: number | null;
  /** Of those, the cases inside the agreed code set — the like-for-like
   *  count against Saga. Equals remotePerMonth when codes are not recorded. */
  remoteInSetPerMonth: number | null;
  /** HSU's antibiotic share in the same codes over the baseline months — the
   *  traditional-service comparator. Only months where both were delivered. */
  baselineAbxPct: number | null;
};

export function codeVolume(rows: MonthRow[], goLive: string | undefined, baselineMonths: number): CodeVolume {
  const empty: CodeVolume = {
    baselineMonths: 0, baselinePerMonth: null, baselineYears: [], trendPerYear: null,
    expectedPerMonth: null, pilotMonths: 0, pilotPerMonth: null, remotePerMonth: null,
    remoteInSetPerMonth: null, baselineAbxPct: null,
  };
  if (!goLive) return empty;
  const start = goLive.slice(0, 7);
  // Several stations share a month: add them up first.
  type Cell = { hsu: number | null; remote: number; inSet: number; abx: number; abxOf: number };
  const byMonth = new Map<string, Cell>();
  for (const r of rows) {
    const m = r.month.slice(0, 7);
    const cur = byMonth.get(m) ?? { hsu: null, remote: 0, inSet: 0, abx: 0, abxOf: 0 };
    if (r.institution_contacts !== null && r.institution_contacts !== undefined) {
      cur.hsu = (cur.hsu ?? 0) + r.institution_contacts;
      if (r.institution_antibiotics !== null && r.institution_antibiotics !== undefined) {
        cur.abx += r.institution_antibiotics;
        cur.abxOf += r.institution_contacts;
      }
    }
    cur.remote += r.cases_total || 0;
    cur.inSet += Math.max(0, (r.cases_total || 0) - (r.codes_outside_set || 0));
    byMonth.set(m, cur);
  }
  const months = [...byMonth.keys()].sort();
  const before = months.filter((m) => m < start).slice(-baselineMonths).filter((m) => byMonth.get(m)!.hsu !== null);
  const after = months.filter((m) => m >= start && byMonth.get(m)!.hsu !== null);
  // Our own cases do not depend on Saga: every month from go-live that has
  // any cases counts, so "before (Saga) vs after (Medalia)" works even before
  // HSU has sent its own figures for the pilot months.
  const remoteMonths = months.filter((m) => m >= start && byMonth.get(m)!.remote > 0);
  const mean = (ms: string[], pick: (v: Cell) => number) =>
    ms.length ? ms.reduce((a, m) => a + pick(byMonth.get(m)!), 0) / ms.length : null;

  const years: number[] = [];
  for (let end = before.length; end - 12 >= 0; end -= 12) {
    years.unshift(before.slice(end - 12, end).reduce((a, m) => a + (byMonth.get(m)!.hsu ?? 0), 0));
  }
  const changes = years.slice(1).map((y, i) => (years[i] ? (y - years[i]) / years[i] : 0));
  const trend = changes.length ? changes.reduce((a, c) => a + c, 0) / changes.length : null;
  const lastYear = years.length ? years[years.length - 1] / 12 : mean(before, (v) => v.hsu ?? 0);
  const round = (v: number | null) => (v === null ? null : Math.round(v * 10) / 10);

  return {
    baselineMonths: before.length,
    baselinePerMonth: round(mean(before, (v) => v.hsu ?? 0)),
    baselineYears: years,
    trendPerYear: trend,
    expectedPerMonth: round(lastYear === null ? null : lastYear * (1 + (trend ?? 0))),
    pilotMonths: after.length,
    pilotPerMonth: round(mean(after, (v) => v.hsu ?? 0)),
    remotePerMonth: round(mean(remoteMonths, (v) => v.remote)),
    remoteInSetPerMonth: round(mean(remoteMonths, (v) => v.inSet)),
    baselineAbxPct: (() => {
      const b = before.reduce((a, m) => ({ x: a.x + byMonth.get(m)!.abx, of: a.of + byMonth.get(m)!.abxOf }), { x: 0, of: 0 });
      return b.of ? Math.round((b.x / b.of) * 100) : null;
    })(),
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
    return { slug: e.slug, name: e.title, c, rate: pct(c.resolved, c.total) };
  });
}

const MONTHS = ["janúar", "febrúar", "mars", "apríl", "maí", "júní", "júlí", "ágúst", "september", "október", "nóvember", "desember"];

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
