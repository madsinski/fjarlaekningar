// Medalia JSON export → monthly case figures.
//
// Medalia exports are patient-centred: a list of patients, each with
// questionnaire responses (`authored` + answers keyed by `linkId`),
// measurements and scores. There is no "case" object, so a case is defined
// here: one response to a questionnaire that is marked as a case type (an
// erindi), plus every other response from the same patient in the next seven
// days — which is where the doctor's outcome, diagnosis code and prescription
// are recorded.
//
// Which questionnaires are cases and which items hold the outcome, code and
// so on is a mapping set once on the data page and then frozen. No model is
// involved: the numbers come from the file and the mapping only.
//
// Parsed in the browser. The export carries pseudonymous patient IDs, ages and
// free text; only monthly counts per station are sent to the server.

import { inCodeSet } from "./saga";
import type { CaseCounts, MonthRow } from "./totals";

export type MedaliaAnswer = { linkId: string; text?: string; value: unknown };
export type MedaliaResponse = { questionnaireId?: string; questionnaireTitle: string; authored: string; answers: MedaliaAnswer[] };
export type MedaliaPatient = { patientId: string; groups?: string[]; questionnaireResponses?: MedaliaResponse[] };
export type MedaliaExport = { exportedAt?: string; client?: string; pathway?: string; patients: MedaliaPatient[] };

export type Outcome = "resolved" | "referred" | "turned_away" | "ignore";

/** The frozen mapping. Every part is optional: a field that is not mapped is
 *  left unmeasured rather than written as zero. */
export type MedaliaMap = {
  /** Questionnaire title → erindi slug ("" = a case of no particular type). */
  cases: Record<string, string>;
  /** Questionnaires whose `authored` time is the doctor's reply. */
  doctorQuestionnaires: string[];
  outcome?: { linkId: string; values: Record<string, Outcome> };
  stopped?: { linkId: string; values: string[] };
  icd?: { linkId: string };
  prescription?: { linkId: string; values: string[] };
  antibiotic?: { linkId: string; values: string[] };
  tree?: { linkId: string; changed: string[]; confirmed: string[] };
  homeTest?: { linkId: string; values: string[] };
};

export const EMPTY_MEDALIA_MAP: MedaliaMap = { cases: {}, doctorQuestionnaires: [] };

// ── What is in the file ─────────────────────────────────────────────────────

export type ItemInfo = { linkId: string; text: string; questionnaires: string[]; values: string[] | null; count: number };

/** Questionnaires and items in the export, for building the mapping. Values
 *  are listed only when they look like fixed options — short and few — so
 *  free text never reaches the screen. */
export function inventory(data: MedaliaExport) {
  const titles = new Map<string, number>();
  const items = new Map<string, { text: string; q: Set<string>; values: Set<string>; open: boolean; count: number }>();
  for (const p of data.patients ?? []) {
    for (const r of p.questionnaireResponses ?? []) {
      titles.set(r.questionnaireTitle, (titles.get(r.questionnaireTitle) ?? 0) + 1);
      for (const a of r.answers ?? []) {
        const it = items.get(a.linkId) ?? { text: a.text ?? "", q: new Set(), values: new Set(), open: false, count: 0 };
        it.q.add(r.questionnaireTitle);
        it.count++;
        const v = String(a.value ?? "");
        if (typeof a.value === "string" && v.length > 40) it.open = true;
        else if (!it.open) it.values.add(v);
        if (it.values.size > 15) it.open = true;
        items.set(a.linkId, it);
      }
    }
  }
  return {
    patients: data.patients?.length ?? 0,
    questionnaires: [...titles.entries()].map(([title, count]) => ({ title, count })).sort((a, b) => b.count - a.count),
    items: [...items.entries()]
      .map(([linkId, it]): ItemInfo => ({
        linkId, text: it.text, questionnaires: [...it.q], values: it.open ? null : [...it.values].sort(), count: it.count,
      }))
      .sort((a, b) => a.questionnaires[0].localeCompare(b.questionnaires[0]) || a.text.localeCompare(b.text)),
  };
}

// ── Aggregation ─────────────────────────────────────────────────────────────

const WINDOW_MS = 7 * 24 * 3600 * 1000;

const fold = (s: string) =>
  s.toLowerCase().replace(/ð/g, "d").replace(/þ/g, "th").replace(/æ/g, "ae").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "");

function median(xs: number[]): number | null {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return Math.round(s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2);
}
function p95(xs: number[]): number | null {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  return Math.round(s[Math.min(s.length - 1, Math.ceil(0.95 * s.length) - 1)]);
}

export type MedaliaResult = {
  rows: Partial<MonthRow>[];
  stats: { cases: number; stopped: number; bundledResponses: number; unknownGroups: string[]; first: string | null; last: string | null };
};

export function aggregateMedalia(
  data: MedaliaExport,
  map: MedaliaMap,
  opts: { stations: string[]; defaultStation: string; codeSet: string[]; institution: string },
): MedaliaResult {
  const stationBy = new Map(opts.stations.map((s) => [fold(s), s]));
  const unknownGroups = new Set<string>();
  type Acc = {
    total: number; resolved: number; referred: number; turnedAway: number; stopped: number;
    rx: number; abx: number; outside: number; tree: number; treeChanged: number; tests: number;
    minutes: number[]; byType: Record<string, CaseCounts>;
  };
  const accs = new Map<string, Acc>();
  const acc = (k: string): Acc => {
    let a = accs.get(k);
    if (!a) { a = { total: 0, resolved: 0, referred: 0, turnedAway: 0, stopped: 0, rx: 0, abx: 0, outside: 0, tree: 0, treeChanged: 0, tests: 0, minutes: [], byType: {} }; accs.set(k, a); }
    return a;
  };
  let cases = 0, stoppedTotal = 0, bundled = 0;
  let first: string | null = null, last: string | null = null;

  for (const p of data.patients ?? []) {
    const station = (p.groups ?? []).map((g) => stationBy.get(fold(g))).find(Boolean) ?? opts.defaultStation;
    for (const g of p.groups ?? []) if (!stationBy.get(fold(g))) unknownGroups.add(g);
    const rs = [...(p.questionnaireResponses ?? [])].sort((a, b) => a.authored.localeCompare(b.authored));
    for (let i = 0; i < rs.length; i++) {
      const start = rs[i];
      if (!(start.questionnaireTitle in map.cases)) continue;
      const t0 = Date.parse(start.authored);
      // The case bundle: this response plus the patient's later responses to
      // non-case questionnaires within seven days.
      const bundle = [start];
      for (let j = i + 1; j < rs.length; j++) {
        if (rs[j].questionnaireTitle in map.cases) break;
        if (Date.parse(rs[j].authored) - t0 > WINDOW_MS) break;
        bundle.push(rs[j]);
      }
      bundled += bundle.length - 1;
      const answer = (linkId?: string): string | null => {
        if (!linkId) return null;
        for (const r of bundle) for (const a of r.answers ?? []) if (a.linkId === linkId && a.value !== null && a.value !== undefined && a.value !== "") return String(a.value);
        return null;
      };
      const month = `${start.authored.slice(0, 7)}-01`;
      const a = acc(`${station}|${month}`);
      if (!first || start.authored < first) first = start.authored;
      if (!last || start.authored > last) last = start.authored;

      // Stopped at the questionnaire: counted as a stop, never as a case.
      const stop = answer(map.stopped?.linkId);
      if (stop !== null && map.stopped?.values.includes(stop)) { a.stopped++; stoppedTotal++; continue; }

      cases++;
      a.total++;
      const type = map.cases[start.questionnaireTitle];
      const bt = type ? (a.byType[type] ??= { total: 0, resolved: 0, referred: 0 }) : null;
      if (bt) bt.total++;

      const outcome = map.outcome ? map.outcome.values[answer(map.outcome.linkId) ?? ""] : undefined;
      if (outcome === "resolved") { a.resolved++; if (bt) bt.resolved++; }
      if (outcome === "referred" || outcome === "turned_away") { a.referred++; if (bt) bt.referred++; }
      if (outcome === "turned_away") a.turnedAway++;

      const code = answer(map.icd?.linkId);
      if (code && opts.codeSet.length && !inCodeSet(code, opts.codeSet)) a.outside++;
      if (map.prescription && map.prescription.values.includes(answer(map.prescription.linkId) ?? "")) a.rx++;
      if (map.antibiotic && map.antibiotic.values.includes(answer(map.antibiotic.linkId) ?? "")) a.abx++;
      if (map.tree) {
        const v = answer(map.tree.linkId);
        if (v !== null && (map.tree.changed.includes(v) || map.tree.confirmed.includes(v))) {
          a.tree++;
          if (map.tree.changed.includes(v)) a.treeChanged++;
        }
      }
      if (map.homeTest && map.homeTest.values.includes(answer(map.homeTest.linkId) ?? "")) a.tests++;

      const reply = bundle.find((r) => map.doctorQuestionnaires.includes(r.questionnaireTitle));
      if (reply) a.minutes.push(Math.max(0, (Date.parse(reply.authored) - t0) / 60000));
    }
  }

  const rows = [...accs.entries()].map(([k, a]): Partial<MonthRow> => {
    const [station, month] = k.split("|");
    // An unmapped item is left out of the row altogether, so the upsert
    // keeps whatever is there instead of writing a zero that would read as
    // "0% resolved" when it means "not recorded".
    const row: Partial<MonthRow> = {
      institution: opts.institution, station, month,
      cases_total: a.total,
      cases_by_type: a.byType,
      sources_present: ["medalia"],
    };
    if (map.stopped) row.screening_stops = a.stopped;
    if (map.outcome) Object.assign(row, { cases_resolved: a.resolved, cases_referred: a.referred, excluded_by_doctor: a.turnedAway });
    if (map.prescription) row.prescriptions = a.rx;
    if (map.antibiotic) row.antibiotics = a.abx;
    if (map.icd && opts.codeSet.length) row.codes_outside_set = a.outside;
    if (map.doctorQuestionnaires.length) Object.assign(row, { response_median_min: median(a.minutes), response_p95_min: p95(a.minutes) });
    if (map.tree) Object.assign(row, { tree_cases: a.tree, tree_overridden: a.treeChanged });
    if (map.homeTest) row.home_tests_used = a.tests;
    return row;
  }).sort((x, y) => String(x.month).localeCompare(String(y.month)));

  return { rows, stats: { cases, stopped: stoppedTotal, bundledResponses: bundled, unknownGroups: [...unknownGroups].slice(0, 10), first, last } };
}

/** Saved once on the data page, reused for every later import. */
export type ImportConfig = {
  /** ICD-10 codes or prefixes in the agreed set — shared by Saga and Medalia. */
  codeSet: string[];
  medalia: MedaliaMap;
};

export const EMPTY_IMPORT_CONFIG: ImportConfig = { codeSet: [], medalia: EMPTY_MEDALIA_MAP };
