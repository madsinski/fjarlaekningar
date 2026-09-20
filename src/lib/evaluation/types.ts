// Service evaluation — the shape of a research module.
//
// The programme is assembled from modules rather than fixed in code, because
// the question "what should we measure?" is a clinical decision, not an
// engineering one. Each module is a self-contained unit a medical advisor can
// accept or reject on its own merits, and it carries everything that decision
// needs: the question it answers, the claim it earns you, how to run it, what
// it costs, what it cannot show, and what has to be in place first.
//
// Adding or removing a module changes the monthly data-entry fields, the
// documents you are asked for, the setup steps and the metrics on the
// dashboard — all derived from the enabled set, never duplicated.

import type { MonthRow } from "./totals";

export type Category = "effectiveness" | "safety" | "workload" | "experience" | "scalability";

export const CATEGORIES: { id: Category; name: string; question: string; gate?: boolean; note: string }[] = [
  {
    id: "effectiveness",
    name: "Effectiveness",
    question: "Do the cases get resolved?",
    note: "The base claim. Without it nothing else matters.",
  },
  {
    id: "safety",
    name: "Safety",
    question: "Is anyone harmed?",
    gate: true,
    note: "A gate, not a scale. An excellent resolution rate with one serious incident is a failed project, and no good number elsewhere offsets it.",
  },
  {
    id: "workload",
    name: "Workload relief",
    question: "Does this actually take work off the health centre?",
    note: "What the institution is buying. They are not shopping for better care — they are shopping for a way to staff their rota.",
  },
  {
    id: "experience",
    name: "Patient experience",
    question: "Was this better for the person?",
    note: "Not the same as effectiveness. The system can work perfectly and still be worse to use.",
  },
  {
    id: "scalability",
    name: "Scalability",
    question: "Can this be repeated at the next site?",
    gate: true,
    note: "The reason the pilot exists. A service nobody will staff does not transfer, however good the patient numbers are.",
  },
];

/** Where a number comes from. Drives the colour coding and who you have to ask. */
export type Source = "medalia" | "institution" | "survey" | "internal" | "study" | "derived";

export const SOURCES: Record<Source, { name: string; who: string }> = {
  medalia: { name: "Medalia", who: "Monthly export from the record system" },
  institution: { name: "Institution", who: "Requested from HSU — their contact register and finance" },
  survey: { name: "Survey", who: "Patient or staff questionnaire" },
  internal: { name: "Our systems", who: "Rota, workstation — automatic" },
  study: { name: "Field study", who: "A one-off measurement someone has to run" },
  derived: { name: "Derived", who: "Calculated from other figures plus an assumption" },
};

export type Status = "good" | "fair" | "poor";

/** One number the operator types in each month. `key` is a real column on
 *  `arangur_manudir`, so the field set is checked by the compiler and the CSV
 *  importer and the form can never drift apart. */
export type Field = {
  key: keyof MonthRow;
  label: string;
  help?: string;
  source: Source;
  /** Blank means "not measured" rather than zero. */
  nullable?: boolean;
  unit?: "count" | "percent" | "minutes" | "hours" | "isk";
};

/** A document that has to exist on paper before the module's numbers mean
 *  anything. These are the things that actually block a programme, and they
 *  have nowhere else to live. */
export type DocSpec = {
  id: string;
  name: string;
  why: string;
  /** The module cannot report without it. */
  required?: boolean;
};

/** One step of the protocol — what a person does, in order. */
export type Step = {
  text: string;
  detail?: string;
  /** Not recoverable later. A baseline not collected while goodwill is fresh
   *  is not collected at all, and a study that starts after people have got
   *  used to the service no longer measures what it was meant to measure. */
  timeCritical?: boolean;
  link?: { href: string; label: string };
};

export type MetricValue = {
  value: string | null;
  detail: string;
  missing?: string;
  status?: Status;
  /** An assumption the figure rests on, shown with it. */
  assumption?: string;
};

export type Metric = {
  id: string;
  name: string;
  why: string;
  /** The one figure for this module — the rest support it. */
  headline?: boolean;
  compute: (c: MetricContext) => MetricValue;
};

export type MetricContext = {
  t: import("./totals").Totals;
  roster: import("./totals").Roster;
  a: Assumptions;
  /** Present once a design has been chosen. Optional so every other metric
   *  stays independent of it. */
  design?: import("./design").DesignState;
};

export type Effort = "low" | "medium" | "high";

/** Whether this is worth doing in the pilot or is a later ambition. Lets an
 *  advisor triage a long catalogue without reading every card: "now" is what
 *  the Vestmannaeyjar year should carry, "later" is what a second site, a
 *  publication or a tender would want and which needs groundwork first. */
export type Horizon = "now" | "later";

export type Module = {
  id: string;
  name: string;
  /** The question in the words of the person who asks it. */
  question: string;
  /** The sentence you get to say if the module works out. */
  claim: string;
  category: Category;
  /** One plain sentence on what you practically get. Written for scanning a
   *  long list, not for winning an argument. */
  benefit: string;
  /** Why this is worth doing — the argument for the advisor. */
  rationale: string;
  horizon: Horizon;
  /** What it cannot show. Stated up front, because the person who names their
   *  own limitations first owns the discussion that follows. */
  caveat: string;
  effort: Effort;
  /** Always on — removing it would leave nothing to report. */
  core?: boolean;
  /**
   * Not an outcome. A meta module governs how the evaluation is run rather
   * than measuring the service, so it carries protocol steps, documents and
   * readiness like any other but is kept off the results dashboard — where it
   * would otherwise displace the headline of whatever category it was filed
   * under, and hide the claim that category exists to make.
   */
  meta?: boolean;
  /** Other modules this one needs. */
  requires?: string[];
  sources: Source[];
  protocol: Step[];
  fields: Field[];
  documents: DocSpec[];
  metrics: Metric[];
};

export type Assumptions = {
  /** Minutes of institution time one resolved case would otherwise have cost. */
  minutesSaved: number;
  /** Minutes the institution spends routing a case to us. Subtracted. */
  minutesSpent: number;
  hoursPerClinicDay: number;
  responseTargetMinutes: number;
  /** Has the time-and-motion study been run? Until it has, workload relief is
   *  a guess and is labelled as one. */
  studyDone: boolean;
};

export const DEFAULT_ASSUMPTIONS: Assumptions = {
  minutesSaved: 20,
  minutesSpent: 0,
  hoursPerClinicDay: 7,
  responseTargetMinutes: 120,
  studyDone: false,
};

/** Which modules are switched on, and in what order they appear. */
export type Programme = {
  enabled: string[];
  /** Per-module notes from the advisor review. */
  notes: Record<string, string>;
  /** Setup steps ticked off: `<moduleId>:<index>`. */
  done: Record<string, boolean>;
};

export const EMPTY_PROGRAMME: Programme = { enabled: [], notes: {}, done: {} };
