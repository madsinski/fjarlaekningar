// Survey question model + shared logic for the "kannanir" feature.
//
// Answers are stored as a JSONB map keyed by question id. A value is a string
// for most types; multi_choice stores a string[]. Choice values are always the
// canonical Icelandic option text so analytics are language-independent even
// when the form is shown in English.

export type SurveyQuestionType =
  | "text"
  | "textarea"
  | "single_choice"
  | "multi_choice"
  | "scale" // unified numeric scale, higher = more positive
  | "nps" // recommend / likelihood, 0–max
  | "yes_no";

export type Locale = "is" | "en";

export type SurveyAnswerValue = string | string[];
export type SurveyAnswers = Record<string, SurveyAnswerValue>;

/** Show a question only if another question's answer matches one of `equals`. */
export interface SurveyCondition {
  questionId: string;
  equals: string[];
}

export interface SurveyQuestion {
  id: string;
  label: string;
  type: SurveyQuestionType;
  options?: string[]; // single_choice / multi_choice (canonical Icelandic values)
  helper?: string; // sub-text under the label
  required?: boolean;
  // scale / nps
  min?: number;
  max?: number;
  minLabel?: string; // label under the lowest value
  maxLabel?: string; // label under the highest value
  // conditional visibility
  showIf?: SurveyCondition;
  // English translations (filled by the Þýða function; optional)
  labelEn?: string;
  helperEn?: string;
  optionsEn?: string[];
  minLabelEn?: string;
  maxLabelEn?: string;
}

export const QUESTION_TYPE_LABELS: Record<SurveyQuestionType, string> = {
  text: "Stuttur texti",
  textarea: "Langur texti",
  single_choice: "Einn valkostur",
  multi_choice: "Fjölval",
  scale: "Kvarði (1–5)",
  nps: "Meðmæli (0–10)",
  yes_no: "Já / Nei",
};

export const YES_NO_OPTIONS = ["Já", "Nei"] as const;
export const YES_NO_OPTIONS_EN = ["Yes", "No"] as const;

/** Effective numeric bounds for a scale/nps question. */
export function scaleBounds(q: SurveyQuestion): { min: number; max: number } {
  if (q.type === "nps") return { min: q.min ?? 0, max: q.max ?? 10 };
  return { min: q.min ?? 1, max: q.max ?? 5 };
}

export function scaleValues(q: SurveyQuestion): number[] {
  const { min, max } = scaleBounds(q);
  const out: number[] = [];
  for (let v = min; v <= max; v++) out.push(v);
  return out;
}

/** Is a question currently shown, given the answers so far? */
export function isQuestionVisible(q: SurveyQuestion, answers: Record<string, unknown>): boolean {
  if (!q.showIf) return true;
  const dep = answers[q.showIf.questionId];
  if (dep === undefined || dep === null) return false;
  const vals = Array.isArray(dep) ? dep.map(String) : [String(dep)];
  return q.showIf.equals.some((e) => vals.includes(e));
}

/** Localized option list as {value, label} pairs — value stays Icelandic. */
export function localizedOptions(
  q: SurveyQuestion,
  locale: Locale,
): { value: string; label: string }[] {
  if (q.type === "yes_no") {
    return YES_NO_OPTIONS.map((v, i) => ({
      value: v,
      label: locale === "en" ? YES_NO_OPTIONS_EN[i] : v,
    }));
  }
  const base = q.options ?? [];
  const en = q.optionsEn;
  return base.map((opt, i) => ({
    value: opt,
    label: locale === "en" && en && en[i]?.trim() ? en[i] : opt,
  }));
}

/** Localized label/helper/scale labels for a question. */
export function localizeQuestion(q: SurveyQuestion, locale: Locale) {
  const pick = (is: string | undefined, en: string | undefined) =>
    locale === "en" && en?.trim() ? en : is ?? "";
  return {
    label: pick(q.label, q.labelEn),
    helper: pick(q.helper, q.helperEn),
    minLabel: pick(q.minLabel, q.minLabelEn),
    maxLabel: pick(q.maxLabel, q.maxLabelEn),
  };
}

function isEmpty(v: unknown): boolean {
  if (v === undefined || v === null) return true;
  if (Array.isArray(v)) return v.length === 0;
  return String(v).trim() === "";
}

/**
 * Validate a submitted answers map against the question set. Hidden questions
 * (failing their showIf) are skipped entirely. Returns an Icelandic error
 * string, or null if OK.
 */
export function validateAnswers(
  questions: SurveyQuestion[],
  answers: Record<string, unknown>,
): string | null {
  for (const q of questions) {
    if (!isQuestionVisible(q, answers)) continue;
    const v = answers[q.id];
    if (isEmpty(v)) {
      if (q.required) return `Reitur vantar: ${q.label}`;
      continue;
    }
    if (q.type === "single_choice" && q.options && !q.options.includes(String(v))) {
      return `Ógilt val: ${q.label}`;
    }
    if (q.type === "yes_no" && !YES_NO_OPTIONS.includes(String(v) as (typeof YES_NO_OPTIONS)[number])) {
      return `Ógilt val: ${q.label}`;
    }
    if (q.type === "multi_choice" && q.options) {
      const arr = Array.isArray(v) ? v.map(String) : [String(v)];
      if (arr.some((x) => !q.options!.includes(x))) return `Ógilt val: ${q.label}`;
    }
    if (q.type === "scale" || q.type === "nps") {
      const n = Number(v);
      const { min, max } = scaleBounds(q);
      if (!Number.isFinite(n) || n < min || n > max) return `Ógilt gildi: ${q.label}`;
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Analytics
// ---------------------------------------------------------------------------

export interface QuestionStats {
  question: SurveyQuestion;
  answered: number;
  /** value → count, in display order (options / scale values). */
  distribution: { value: string; label: string; count: number }[];
  /** Mean of numeric answers (scale/nps, or single_choice with numeric options). */
  mean: number | null;
  scaleMax: number | null;
  nps: { promoters: number; passives: number; detractors: number; score: number } | null;
  /** Free-text answers (text/textarea). */
  texts: string[];
}

export interface SurveyResponseLike {
  answers: Record<string, unknown>;
}

export function aggregateSurvey(
  questions: SurveyQuestion[],
  responses: SurveyResponseLike[],
): { total: number; perQuestion: QuestionStats[] } {
  const total = responses.length;

  const perQuestion = questions.map<QuestionStats>((q) => {
    const raw = responses
      .map((r) => r.answers?.[q.id])
      .filter((v) => !isEmpty(v));
    const answered =
      q.type === "multi_choice"
        ? raw.length
        : raw.length;

    const stats: QuestionStats = {
      question: q,
      answered,
      distribution: [],
      mean: null,
      scaleMax: null,
      nps: null,
      texts: [],
    };

    if (q.type === "text" || q.type === "textarea") {
      stats.texts = raw.map((v) => String(v)).filter(Boolean);
      return stats;
    }

    if (q.type === "scale" || q.type === "nps") {
      const { max } = scaleBounds(q);
      stats.scaleMax = max;
      const nums = raw.map((v) => Number(v)).filter((n) => Number.isFinite(n));
      if (nums.length) stats.mean = nums.reduce((a, b) => a + b, 0) / nums.length;
      stats.distribution = scaleValues(q).map((val) => ({
        value: String(val),
        label: String(val),
        count: nums.filter((n) => n === val).length,
      }));
      if (q.type === "nps" && nums.length) {
        const promoterMin = Math.ceil(max * 0.8); // 4–5 on a 0–5 scale
        const detractorMax = Math.ceil(max * 0.4); // 0–2 on a 0–5 scale
        const promoters = nums.filter((n) => n >= promoterMin).length;
        const detractors = nums.filter((n) => n <= detractorMax).length;
        const passives = nums.length - promoters - detractors;
        stats.nps = {
          promoters,
          passives,
          detractors,
          score: Math.round(((promoters - detractors) / nums.length) * 100),
        };
      }
      return stats;
    }

    if (q.type === "multi_choice") {
      const opts = q.options ?? [];
      stats.distribution = opts.map((opt) => ({
        value: opt,
        label: opt,
        count: raw.filter((v) => (Array.isArray(v) ? v.map(String).includes(opt) : String(v) === opt))
          .length,
      }));
      return stats;
    }

    // single_choice / yes_no
    const opts =
      q.type === "yes_no" ? [...YES_NO_OPTIONS] : q.options ?? [];
    const observed = raw.map((v) => String(v));
    const known = opts.length ? opts : Array.from(new Set(observed));
    stats.distribution = known.map((opt) => ({
      value: opt,
      label: opt,
      count: observed.filter((v) => v === opt).length,
    }));
    // Mean if every option is numeric (lets a numeric single_choice score).
    const numericOpts = known.every((o) => Number.isFinite(Number(o)));
    if (numericOpts && observed.length) {
      const nums = observed.map(Number).filter((n) => Number.isFinite(n));
      if (nums.length) {
        stats.mean = nums.reduce((a, b) => a + b, 0) / nums.length;
        stats.scaleMax = Math.max(...known.map(Number));
      }
    }
    return stats;
  });

  return { total, perQuestion };
}
