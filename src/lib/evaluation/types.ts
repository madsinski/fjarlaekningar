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

// The three questions the medical advisor set for the Vestmannaeyjar pilot
// (2026-09-29), plus scalability for the modules a later site will want.
// Every module files under exactly one of them, and the report follows the
// same order, so the dashboard reads like the proposal HSU was shown.
export type Category = "patient" | "system" | "safety" | "scalability";

export const CATEGORIES: { id: Category; name: string; question: string; gate?: boolean; note: string }[] = [
  {
    id: "patient",
    name: "Fyrir sjúklinginn",
    question: "Virkar þjónustan fyrir sjúklinginn?",
    note: "Sjúklingurinn er spurður beint, á degi 0 og á degi 7. Við það bætist það sem Medalia skráir sjálfkrafa. Fylgstu sérstaklega með spurningunni um hvað sjúklingurinn hefði annars gert. Hún sýnir fyrst hvort þjónustan kemur í stað annarrar þjónustu eða býr til nýja eftirspurn.",
  },
  {
    id: "system",
    name: "Fyrir heilbrigðiskerfið",
    question: "Virkar þjónustan fyrir heilbrigðiskerfið?",
    note: "Þetta er það sem HSU kaupir. Erindi sem eru afgreidd að fullu í fjarþjónustu og færri greiningarkóðar á heilsugæslunni, borið saman við þriggja ára baseline úr Sögu. Loks hvort starfsfólkið vill halda þjónustunni.",
  },
  {
    id: "safety",
    name: "Öryggi",
    question: "Er þjónustan örugg?",
    gate: true,
    note: "Þetta eina má aldrei gefa eftir. Hátt hlutfall afgreiddra erinda dugar ekki ef eitt alvarlegt atvik verður. Þá hefur verkefnið mistekist og engin góð tala annars staðar bætir það upp. Allt annað á síðunni er betra eða verra. Hér er svarið bara já eða nei. Öryggi er skilyrði, ekki kvarði.",
  },
  {
    id: "scalability",
    name: "Yfirfærsla á aðrar stöðvar",
    question: "Gæti önnur heilsugæsla gert þetta líka?",
    note: "Þetta er ástæðan fyrir tilraunaverkefninu. Hér ræðst hvort farið er á næstu stöð, ekki hvort þessi stöð gekk vel. Þjónusta sem enginn vill manna flyst ekki annað, sama hve góðar tölurnar frá sjúklingum eru.",
  },
];

/** Where a number comes from. Drives the colour coding and who you have to ask. */
export type Source = "medalia" | "institution" | "survey" | "internal" | "study" | "derived";

export const SOURCES: Record<Source, { name: string; who: string }> = {
  medalia: { name: "Medalia", who: "Gagnaútdráttur (JSON) úr sjúkraskrárkerfi okkar, eftir 6 og 12 mánuði" },
  institution: { name: "Saga (HSU)", who: "Gagnaútdráttur (CSV) úr Sögu, sjúkraskrárkerfi HSU: baseline og yfirferð eftir 7 daga" },
  survey: { name: "Könnun", who: "Þjónustukönnun á degi 0 og á degi 7. Starfsmannakönnun hjá HSU í lok tímabilsins" },
  internal: { name: "Okkar kerfi", who: "Vaktaplan og vinnustöð. Skráist sjálfkrafa" },
  study: { name: "Vettvangsmæling", who: "Stök mæling sem einhver þarf að framkvæma" },
  derived: { name: "Reiknað", who: "Reiknað út frá öðrum tölum og forsendu" },
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
  /** When the figure has to be captured. Defaults from the source — see
   *  `fieldTiming()` — and is only set here where a field breaks the rule. */
  when?: Timing;
};

/**
 * When a figure has to be captured, which is the question that decides what
 * must be ready before a new station starts.
 *
 *   day1   Prospective: recorded as it happens, from the first patient. A
 *          survey not sent, or a field not coded in Medalia, cannot be
 *          reconstructed afterwards.
 *   later  Retrospective: already stored somewhere (Saga) and can be pulled
 *          after the fact, as long as the definition is fixed first.
 *   end    Asked once, at the end of the period.
 */
export type Timing = "day1" | "later" | "end";

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
  /** Diagnosis codes at HSU before and after go-live, from the Saga baseline.
   *  Computed from every month of the station rather than the selected
   *  window, because the comparison is the point. */
  codes?: import("./totals").CodeVolume;
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
  /**
   * Leads its category on the overview. Chosen deliberately, because the card
   * has to answer the category's own question: "does this take work off the
   * health centre?" is answered by workload relief, not by share of contact
   * volume, and leaving it to catalogue order put the wrong one there.
   */
  lead?: boolean;
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
