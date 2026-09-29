// Survey answers → the evaluation's monthly figures.
//
// The patient survey (day 0 and day 7) and the end-of-period staff survey live
// in /admin/surveys. Nobody types their percentages into the evaluation: they
// are computed here from `survey_responses`, per station and month, and merged
// into the monthly rows when the evaluation loads. One source, no copying.
//
// The mapping from question to field is fixed in code rather than configured,
// because it is part of the evaluation's definitions — the same as the frozen
// wording of the survey. Changing a question means a new survey version and a
// new entry here, never an edit to a survey that is already collecting.
//
// A response link carries ?stod=<station>. Responses without one are filed
// under UNKNOWN_STATION so they still count in "all stations" but never leak
// into a single station's figures.

import type { MonthRow } from "./totals";

export const SURVEYS = {
  day0: "thjonustukonnun-dagur-0",
  day7: "eftirfylgd-dagur-7",
  staff: "starfsfolk-hsu-lok-timabils",
} as const;

export type SurveyKind = keyof typeof SURVEYS;

export const UNKNOWN_STATION = "Óskráð stöð";

/** Fields that come from the surveys. Read-only in data entry. */
export const SURVEY_FIELDS = new Set<keyof MonthRow>([
  "survey_responses", "survey_satisfied_pct", "survey_reuse_pct", "survey_substituted_pct",
  "survey_would_not_have_sought_pct", "survey_test_obtain_pct", "survey_test_perform_pct",
  "survey_7d_responses", "survey_resolved_pct", "survey_sought_care_7d_pct", "survey_other_diagnosis_pct",
  "adverse_drug_reactions", "staff_satisfied_pct", "staff_helps_pct", "staff_continue_pct",
]);

/** "What would you most likely have done?" — the answers that mean another
 *  health service would have taken the case. Pharmacy and "other" count in
 *  neither group: they are not care HSU would have given. */
const SUBSTITUTED = new Set([
  "Leitað á heilsugæslu",
  "Leitað á bráðamóttöku eða læknavakt",
  "Leitað til einkarekinnar læknastofu",
]);
const NOTHING = "Ekkert, beðið og séð til";
const SERIOUS_REACTION = "Já, alvarlegar (þurfti að leita læknis)";

export type SurveyResponse = {
  kind: SurveyKind;
  station: string | null;
  submitted_at: string;
  answers: Record<string, unknown>;
};

type Acc = { yes: number; of: number };
const share = (a: Acc): number | null => (a.of ? Math.round((a.yes / a.of) * 100) : null);

/** Share of those who answered the question, never of everyone: a skipped
 *  question is missing, not "no". */
function tally(rs: SurveyResponse[], id: string, hit: (v: unknown) => boolean): Acc {
  const acc = { yes: 0, of: 0 };
  for (const r of rs) {
    const v = r.answers[id];
    if (v === undefined || v === null || v === "") continue;
    acc.of++;
    if (hit(v)) acc.yes++;
  }
  return acc;
}

/** Scale 1–5, top two boxes. */
const topBox = (v: unknown) => Number(v) >= 4;
const is = (x: string) => (v: unknown) => v === x;

export const monthOf = (iso: string) => `${iso.slice(0, 7)}-01`;

/** Per `station|yyyy-mm-01`, the survey figures for that station and month. */
export function surveyFigures(responses: SurveyResponse[]): Map<string, Partial<MonthRow>> {
  const groups = new Map<string, SurveyResponse[]>();
  for (const r of responses) {
    const key = `${r.station ?? UNKNOWN_STATION}|${monthOf(r.submitted_at)}`;
    const g = groups.get(key) ?? [];
    g.push(r);
    groups.set(key, g);
  }

  const out = new Map<string, Partial<MonthRow>>();
  for (const [key, rs] of groups) {
    const d0 = rs.filter((r) => r.kind === "day0");
    const d7 = rs.filter((r) => r.kind === "day7");
    const st = rs.filter((r) => r.kind === "staff");
    const f: Partial<MonthRow> = {};
    if (d0.length) {
      f.survey_responses = d0.length;
      f.survey_satisfied_pct = share(tally(d0, "overall", topBox));
      f.survey_reuse_pct = share(tally(d0, "reuse", is("Já")));
      f.survey_substituted_pct = share(tally(d0, "alternative", (v) => SUBSTITUTED.has(String(v))));
      f.survey_would_not_have_sought_pct = share(tally(d0, "alternative", is(NOTHING)));
      f.survey_test_obtain_pct = share(tally(d0, "hometest_obtain", topBox));
      f.survey_test_perform_pct = share(tally(d0, "hometest_perform", topBox));
    }
    if (d7.length) {
      f.survey_7d_responses = d7.length;
      f.survey_resolved_pct = share(tally(d7, "resolved", is("Já, að fullu")));
      f.survey_sought_care_7d_pct = share(tally(d7, "sought_other", is("Já")));
      // Of every day-7 respondent, not only those who went elsewhere — the
      // field is defined that way so it cannot swing on a handful of people.
      const other = d7.filter((r) => r.answers.other_diagnosis === "Já, aðra greiningu").length;
      f.survey_other_diagnosis_pct = Math.round((other / d7.length) * 100);
      f.adverse_drug_reactions = d7.filter((r) => r.answers.adverse === SERIOUS_REACTION).length;
    }
    if (st.length) {
      f.staff_satisfied_pct = share(tally(st, "satisfied", topBox));
      f.staff_helps_pct = share(tally(st, "helps", is("Já")));
      f.staff_continue_pct = share(tally(st, "continue", is("Já")));
    }
    out.set(key, f);
  }
  return out;
}

/**
 * Merges survey figures into the monthly rows. A station-month that has
 * survey answers but no row yet gets one. The survey is sent after every case,
 * so "sent" is the month's case count unless someone entered it by hand.
 */
export function mergeSurveys(
  rows: MonthRow[],
  figures: Map<string, Partial<MonthRow>>,
  blank: (station: string, month: string) => MonthRow,
): MonthRow[] {
  const byKey = new Map(rows.map((r) => [`${r.station}|${r.month.slice(0, 10)}`, { ...r }]));
  for (const [key, f] of figures) {
    const [station, month] = key.split("|");
    const row = byKey.get(key) ?? blank(station, month);
    Object.assign(row, f);
    if (!row.sources_present?.includes("survey")) row.sources_present = [...(row.sources_present ?? []), "survey"];
    byKey.set(key, row);
  }
  for (const row of byKey.values()) {
    if (row.survey_responses && !row.survey_sent) row.survey_sent = row.cases_total || 0;
    if (row.survey_7d_responses && !row.survey_7d_sent) row.survey_7d_sent = row.cases_total || 0;
  }
  return [...byKey.values()].sort((a, b) => a.month.localeCompare(b.month) || a.station.localeCompare(b.station));
}
