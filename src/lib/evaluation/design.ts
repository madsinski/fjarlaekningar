// Study design — the decisions that determine what the figures are allowed to
// mean, and which have to be made before the data arrives rather than after.
//
// The measurement system had no stated design. That is not a cosmetic gap: an
// unstated design defaults to the weakest one — an uncontrolled before-and-after
// at a single site — and quietly inherits every threat that comes with it.
// Secular trend, seasonality, regression to the mean and the Hawthorne effect
// are all live here, and none of them can be dealt with afterwards.
//
// Two things in this file are worth more than everything else in it:
//
//   1. Ask for the baseline MONTH BY MONTH, not as one annual total. A monthly
//      series supports interrupted time series, which separates the effect of
//      the service from a trend that was already running. A single total
//      cannot, and cannot be un-aggregated afterwards.
//
//   2. Ask for the same monthly figures at stations that are NOT yet live.
//      A staged rollout is a stepped wedge waiting to happen: later sites are
//      comparisons for earlier ones, concurrently, which controls for anything
//      that changed nationally.
//
// Note what is and is not recoverable. The baseline itself is NOT lost by
// going live — it sits in Saga and can be extracted retrospectively whenever
// somebody runs the query. What expires is the goodwill to run it and the
// institutional memory of what else was happening that year. The comparison
// stations expire for real: a station stops being a comparison the day it
// goes live, and that is the clock actually running.
//
// What cannot be recovered at all is anything that had to be asked of a
// person at the time — how long staff spent per case before, what they
// thought of the service, what patients would otherwise have done. Those have
// no record in any system, and a question asked a year late gets a year-late
// answer.

import type { Module } from "./types";

// ── Designs ─────────────────────────────────────────────────────────────────

export type DesignId = "before-after" | "its" | "controlled" | "stepped-wedge";

export type Design = {
  id: DesignId;
  /**
   * The proper name. These are real terms from health-services research, not
   * labels invented here, so they stay — an ethics committee and a journal
   * both expect them. They are shown as a small secondary label rather than
   * as the heading, because nobody should have to recognise "stepped wedge"
   * to choose between four options.
   */
  name: string;
  /** What you read first: what you actually do, in words anyone can follow. */
  plainName: string;
  /** The procedure itself, in a sentence or two. */
  whatYouDo: string;
  /** What it does, in one sentence. */
  summary: string;
  /** What it lets you claim that the weaker options do not. */
  claim: string;
  /** What has to be true for it to be available. */
  requires: string[];
  /** What it does not protect against. */
  threats: string[];
  /** Effort beyond what is already planned. */
  cost: string;
  /** Roughly where it sits for a clinical or academic audience. */
  strength: 1 | 2 | 3 | 4;
  /** Can it still be chosen once the pilot has been running a while? */
  decideBy: string;
};

export const DESIGNS: Design[] = [
  {
    id: "before-after",
    name: "Uncontrolled before-and-after",
    plainName: "Compare with how things were before",
    whatYouDo:
      "Take the twelve months before the service started at this station, take the twelve months after, and compare the two. Nothing else is measured and no other station is involved.",
    summary: "Compare the twelve months before the service with the twelve months after, at the same site.",
    claim: "Activity changed after we arrived — with no way to show that we were the cause.",
    requires: ["A baseline figure for the period before", "Twelve months of operation"],
    threats: [
      "Things were already changing anyway. Icelandic primary care did not stand still that year, and whatever shifted nationally gets credited to you (secular trend).",
      "Winter does the work for you. Four of your case types swing hard with the season — an autumn start compared against a spring baseline can show a big effect that is entirely the calendar.",
      "Bad patches get better on their own. Services get introduced where things were unusually bad, and unusually bad periods improve without anyone doing anything (regression to the mean).",
      "People try harder when watched. A station that knows it is being evaluated behaves differently, and that goes into your result too (Hawthorne effect).",
    ],
    cost: "None. This is what you get by default if you decide nothing.",
    strength: 1,
    decideBy: "Always available — it is the fallback, not a choice.",
  },
  {
    id: "its",
    name: "Interrupted time series",
    plainName: "Watch the monthly trend and look for a step",
    whatYouDo:
      "Instead of two big totals, you plot the number for every single month — before and after. Then you look for a step up or down at the exact month the service started, and for a change in the direction of travel.",
    summary: "Model the monthly series before and after go-live, and test for a change in level and in slope at that point.",
    claim: "Activity changed by X beyond the trend that was already running — which is a causal claim the before-and-after cannot make.",
    requires: [
      "Monthly counts for the period before go-live — twelve is comfortable, eight is the practical minimum. Already sitting in Saga; somebody just has to run the query.",
      "Monthly counts after too, not one lump sum",
      "The exact date the service started",
    ],
    threats: [
      "Anything else that changed the same month. If the health centre also reorganised its phone triage when you launched, there is no way to tell the two apart.",
      "Still one station, so anything peculiar to Vestmannaeyjar looks exactly like the service working.",
    ],
    cost: "One sentence in the request to HSU: monthly figures rather than an annual total. The data already exists.",
    strength: 2,
    decideBy: "Whenever you ask — the history does not go anywhere. But ask for months, not a year: a single total cannot be broken back down.",
  },
  {
    id: "controlled",
    name: "Controlled before-and-after",
    plainName: "Compare against a station that hasn't started yet",
    whatYouDo:
      "You measure the same things at a second health centre that is not running the service. If your numbers move and theirs do not over the same months, the service is the likeliest explanation.",
    summary: "Run the same measurements at a comparable station that is not receiving the service yet.",
    claim: "Activity changed at our site and did not change at a comparable one over the same period.",
    requires: [
      "A comparable station with no service",
      "The same monthly figures collected there throughout",
      "Agreement from the institution to supply both",
    ],
    threats: [
      "No two health centres are really alike — size, staffing and the mix of patients all differ.",
      "Word travels. In a country this small, patients at the comparison station may hear about the service and use it anyway, which blurs the comparison.",
    ],
    cost: "The institution supplies the same monthly figures for one more station. No work at the control site itself.",
    strength: 3,
    decideBy: "Before that station goes live. The day it gets the service it stops being a comparison — that is the clock that is actually running.",
  },
  {
    id: "stepped-wedge",
    name: "Stepped wedge",
    plainName: "Start stations one at a time, each checks the others",
    whatYouDo:
      "Stations go live in a planned order. Until its own turn comes, every station that has not started yet is a comparison for the ones already running — so the same change has to show up at each site, at a different time of year.",
    summary: "Stations go live one at a time in a planned order; each acts as a control for the others until its own turn.",
    claim: "The same change followed the service at each site in turn, at different calendar times — which rules out anything that happened nationally.",
    requires: [
      "A staged rollout with more than two sites — which is already the plan",
      "Monthly figures collected at every station from before the first go-live",
      "Go-live dates recorded accurately",
    ],
    threats: [
      "Needs more than two stations and enough months. With two it is simply the option above.",
      "Word travels between stations in the same institution.",
      "Later stations get a better version of the service, because you learned from the earlier ones — so the effect may grow as you go. Worth reporting rather than hiding: it is an argument for rolling out, not against.",
    ],
    cost:
      "Collecting the same monthly figures at stations before they go live. One line in the request you are already making, and the rollout is staged regardless.",
    strength: 4,
    decideBy:
      "Before the second station goes live. Vestmannaeyjar started on 17 August 2026 and nothing else has yet, so this is still fully available — but each station that opens removes one comparison.",
  },
];

export const DESIGN_BY_ID = Object.fromEntries(DESIGNS.map((d) => [d.id, d])) as Record<DesignId, Design>;

// ── Cohort ──────────────────────────────────────────────────────────────────
//
// Who counts as "in" is currently implicit, and different answers give
// materially different resolution rates. It has to be stated once and then
// never quietly changed.

export type CohortId = "offered" | "entered" | "reached-clinician";

export type Cohort = {
  id: CohortId;
  name: string;
  definition: string;
  /** Why you might choose it. */
  argument: string;
  /** Why you might not. */
  problem: string;
  measurable: boolean;
};

export const COHORTS: Cohort[] = [
  {
    id: "offered",
    name: "Everyone offered the service",
    definition: "Every patient a member of staff considered routing to us, whether or not they arrived.",
    argument:
      "The only denominator that answers the question an institution actually asks: of the cases that come to us, how many could you take?",
    problem:
      "Not measurable. Patients reach the service through four routes — direct, nurse, reception and records staff — and nobody counts the ones turned away at the door. Any attempt to count it produces a biased number with false precision, which is worse than no number.",
    measurable: false,
  },
  {
    id: "entered",
    name: "Everyone who started a questionnaire",
    definition: "Every patient who opened the portal and submitted, including those the red-flag screen stopped.",
    argument:
      "The closest thing to an intention-to-treat population: it includes the people the service could not help, which is the honest denominator for a safety claim.",
    problem:
      "Dilutes the resolution rate with cases that were never eligible, so the headline figure understates how the service performs on the work it is designed for.",
    measurable: true,
  },
  {
    id: "reached-clinician",
    name: "Everyone who reached a clinician",
    definition: "Patients who passed the questionnaire screen and were seen by a doctor.",
    argument:
      "Measures the service on the work it is actually designed to do, and matches how a clinical audience will read a resolution rate.",
    problem:
      "Excludes the screened-out, so it must always be reported alongside the stop rate. On its own it is the more flattering number and will be read as such.",
    measurable: true,
  },
];

export const COHORT_BY_ID = Object.fromEntries(COHORTS.map((c) => [c.id, c])) as Record<CohortId, Cohort>;

// ── Decisions that have to be pre-specified ─────────────────────────────────

export type DecisionId =
  | "primary-outcome" | "run-in" | "season" | "analysis-plan" | "missing-data" | "small-cells";

export type Decision = {
  id: DecisionId;
  /** Plain heading. The technical name, where there is one, lives in `why`. */
  name: string;
  question: string;
  why: string;
  /** What happens if it is left until the data is in. */
  ifLate: string;
  /** Sensible default, offered rather than imposed. */
  suggestion: string;
  timeCritical: boolean;
};

export const DECISIONS: Decision[] = [
  {
    id: "primary-outcome",
    name: "The one number this stands or falls on",
    question: "If you could only report a single figure, which would it be?",
    why:
      "This is called the primary outcome. The programme can produce over forty figures, and reporting all of them while pointing at whichever came out best is how an evaluation turns into a fishing expedition — anyone who knows the field will spot it. Naming one in advance, in writing, is the cheapest credibility you will ever buy.",
    ifLate:
      "Chosen after seeing the data, it is no longer a finding. Everything else becomes secondary and exploratory whether you label it that way or not.",
    suggestion:
      "Resolution rate within the agreed code set. It is the base claim, it is the one an institution asks about first, and it does not depend on anyone else supplying data.",
    timeCritical: true,
  },
  {
    id: "run-in",
    name: "The first few weeks",
    question: "Do the opening weeks at a station count towards the headline result?",
    why:
      "The first month at a new site is atypical in both directions: staff are still learning what fits, and patients mostly do not know the service exists. Including it drags the result down; excluding it without having said so in advance looks like cherry-picking.",
    ifLate:
      "Deciding to drop the first six weeks once you have seen that they were bad is indefensible, even when it is the right call analytically.",
    suggestion:
      "Exclude the first four weeks from the primary analysis, report the full series alongside it, and state the rule before the first case.",
    timeCritical: true,
  },
  {
    id: "season",
    name: "Stopping winter taking the credit",
    question: "How do you make sure the season is not doing the work your service was meant to do?",
    why:
      "Four of the eleven case types are respiratory or infectious and swing hard with the season. A pilot that runs August to December compared against a January to May baseline can show a large effect that is entirely the calendar.",
    ifLate:
      "Nothing can be done afterwards except caveat the result, and a caveat is not a correction.",
    suggestion:
      "Compare like-for-like calendar months, which needs at least twelve months of operation, or request twenty-four months of monthly baseline so the seasonal shape itself is known.",
    timeCritical: true,
  },
  {
    id: "analysis-plan",
    name: "Writing the plan down first",
    question: "What exactly will you compare, and how — agreed before anyone sees a number?",
    why:
      "A dated document written before the numbers exist is the single thing that separates an evaluation from a story told afterwards. It costs an afternoon and it is what an ethics committee, a journal and a procurement evaluator all look for.",
    ifLate:
      "There is no way to demonstrate afterwards that the analysis was not shaped by the result.",
    suggestion:
      "Two pages: design, cohort, primary and secondary outcomes, how the comparison is made, how missing months are handled. Date it and upload it here.",
    timeCritical: true,
  },
  {
    id: "missing-data",
    name: "When a month goes missing",
    question: "What do you do when an export fails or HSU does not send its figures?",
    why:
      "It will happen. If the rule is invented at the time, it will be invented in whichever direction suits the month in question.",
    ifLate: "A gap filled after the fact is indistinguishable from a gap filled to taste.",
    suggestion:
      "Leave the month out rather than impute it, state the number of missing months in every report, and never carry a figure forward.",
    timeCritical: false,
  },
  {
    id: "small-cells",
    name: "Numbers too small to publish",
    question: "What gets held back from anything that leaves the building?",
    why:
      "A case type with three cases at a station of four thousand people can identify someone, and a rate calculated on three cases means nothing anyway.",
    ifLate: "Less harmful than the others, but a rule applied inconsistently across reports is its own problem.",
    suggestion:
      "Suppress or combine anything under five. The dashboard already greys those rates as a reminder.",
    timeCritical: false,
  },
];

// ── Site roles ──────────────────────────────────────────────────────────────
//
// A station is not simply on or off. A station that has not gone live yet is a
// CONTROL, and it is only a control while that remains true — which is why the
// data has to start flowing before it gets the service, not after.

export type SiteRole = "live" | "pre-live" | "excluded";

export const SITE_ROLES: { id: SiteRole; name: string; note: string }[] = [
  { id: "live", name: "Live", note: "Running the service. Contributes intervention data." },
  {
    id: "pre-live",
    name: "Pre-live control",
    note:
      "Not yet running the service. Contributes baseline and control data — but only while it stays pre-live, so collection has to start now.",
  },
  { id: "excluded", name: "Not participating", note: "No data collected." },
];

export type SiteConfig = { role: SiteRole; goLive?: string; note?: string };

export type DesignState = {
  design: DesignId;
  cohort: CohortId;
  /**
   * Decision id → what was decided, and when.
   *
   * A decision can be cleared or edited — you have to be able to fix a typo or
   * change your mind. But an edit records `revisedAt` alongside the original
   * date and both are shown, because the entire value of deciding in advance
   * is lost if the text can be quietly rewritten once the numbers are in.
   * Clearing it removes the entry outright, which reads honestly as "not
   * decided" rather than as a decision that was never made.
   */
  decisions: Record<string, { text: string; decidedAt?: string; revisedAt?: string }>;
  sites: Record<string, SiteConfig>;
  /** Months of monthly baseline requested from the institution. */
  baselineMonths: number;
};

export const DEFAULT_DESIGN_STATE: DesignState = {
  design: "before-after",
  cohort: "reached-clinician",
  decisions: {},
  sites: {},
  baselineMonths: 12,
};

// ── Feasibility ─────────────────────────────────────────────────────────────

export type DesignCheck = { ok: boolean; label: string; detail: string };

/**
 * Whether the chosen design is actually supported by what is being collected.
 *
 * Deliberately blunt. A design chosen in the interface but not backed by data
 * is worse than no design at all, because it will be described in a report as
 * though it were real.
 */
export function feasibility(state: DesignState, opts: { preLiveWithData: number; monthsOfData: number }): DesignCheck[] {
  const live = Object.values(state.sites).filter((s) => s.role === "live").length;
  const preLive = Object.values(state.sites).filter((s) => s.role === "pre-live").length;
  const goLives = Object.values(state.sites).filter((s) => s.role === "live" && s.goLive).length;

  const checks: DesignCheck[] = [
    {
      ok: state.baselineMonths >= 8,
      label: `Asking HSU for ${state.baselineMonths} separate months of "before" figures`,
      detail:
        state.baselineMonths >= 8
          ? "Enough separate months before you started to see what the trend was already doing, so you can tell your effect apart from a change that was happening anyway."
          : "Ask for the figures month by month, not as one yearly total. With a year lumped together you can only say \"it was X before and Y after\" — with monthly figures you can see whether numbers were already moving before you arrived. Eight months is the least that works, twelve is comfortable. The data is in Saga either way; this is only about how you ask for it.",
    },
    {
      ok: goLives === live && live > 0,
      label: `${goLives} of ${live} live station${live === 1 ? " has" : "s have"} a start date recorded`,
      detail:
        goLives === live && live > 0
          ? "You know exactly when the service started at each station, which is the line everything is measured against."
          : "Every comparison here is \"before this date\" versus \"after this date\". Without the exact date the service started at a station, there is nothing to compare across.",
    },
    {
      ok: preLive > 0,
      label: `${preLive} station${preLive === 1 ? "" : "s"} marked as not yet started`,
      detail:
        preLive > 0
          ? "Stations without the service act as a comparison — if your numbers move and theirs do not, the service is the likeliest reason."
          : "With nothing to compare against, anything that changed across Iceland that year gets credited to your service. Mark the HSU stations that have not started yet — they are your comparison group, and each one stops being available the day it goes live.",
    },
    {
      ok: opts.preLiveWithData > 0,
      label: `${opts.preLiveWithData} not-yet-started station${opts.preLiveWithData === 1 ? " is" : "s are"} actually sending figures`,
      detail:
        opts.preLiveWithData > 0
          ? "Comparison figures are arriving, not merely planned."
          : "Ticking a station as \"not yet started\" does nothing on its own. HSU has to be sending you its monthly figures for that station too — otherwise there is nothing to compare with.",
    },
    {
      ok: opts.monthsOfData >= 12,
      label: `${opts.monthsOfData} month${opts.monthsOfData === 1 ? "" : "s"} of your own figures so far`,
      detail:
        opts.monthsOfData >= 12
          ? "A full year, so you can compare September with September rather than September with March — which matters, because four of your case types are far commoner in winter."
          : "Under a year you are comparing different seasons, and winter can do the work your service was supposed to do. Four of the eleven case types swing hard with the calendar.",
    },
    {
      ok: !!state.decisions["primary-outcome"]?.text,
      label: "Chosen the one number this stands or falls on",
      detail: state.decisions["primary-outcome"]?.text
        ? "Named in advance, so everything else is openly a secondary finding."
        : "This system can produce over forty figures. If you decide afterwards which one mattered, you will — completely honestly — pick the one that came out well, and anyone who knows the field will see it. Naming one now costs nothing and is the cheapest credibility there is.",
    },
    {
      ok: !!state.decisions["analysis-plan"]?.text,
      label: "Written down what you will compare, before looking",
      detail: state.decisions["analysis-plan"]?.text
        ? "Written and dated before the numbers came in, so nobody can suggest the comparison was chosen to suit the result."
        : "About two pages, dated: which figures you will compare with which, over what months, and what you will do if a month goes missing. Writing it before you see any numbers is what stops you picking — quite unconsciously — whichever comparison happens to look best. It is also the first document an ethics committee or a procurement evaluator asks for.",
    },
  ];

  return checks;
}

/** The best design the current setup could actually support. Shown next to the
 *  chosen one, because the interesting case is when they differ. */
export function supportedDesign(state: DesignState, opts: { preLiveWithData: number }): DesignId {
  const live = Object.values(state.sites).filter((s) => s.role === "live" && s.goLive).length;
  const monthly = state.baselineMonths >= 8;
  if (live >= 3 && opts.preLiveWithData > 0 && monthly) return "stepped-wedge";
  if (opts.preLiveWithData > 0) return "controlled";
  if (monthly && live >= 1) return "its";
  return "before-after";
}

// ── The module ──────────────────────────────────────────────────────────────

export const DESIGN_MODULE: Module = {
  id: "study-design",
  name: "Study design",
  question: "What kind of evidence is this, and what is it allowed to conclude?",
  claim: "A stepped-wedge evaluation with interrupted time series analysis across the HSU rollout — pre-specified, dated, and controlled for secular trend.",
  category: "effectiveness",
  // Filed under effectiveness for the library only. `meta` keeps it off the
  // results dashboard: the design is a property of the whole evaluation, not a
  // measure of the service, and as an outcome card it displaced the resolution
  // rate — which is the one claim that category exists to make.
  meta: true,
  benefit: "Decides in advance what your numbers are allowed to mean, instead of finding out afterwards that they mean less than you hoped.",
  horizon: "now",
  core: true,
  effort: "low",
  sources: ["institution", "internal"],
  rationale:
    "Without a stated design the work defaults to the weakest one — uncontrolled before-and-after at a single site — and silently inherits secular trend, seasonality and regression to the mean. The upgrade is nearly free and comes in two parts, both of which have to happen before the data does. Ask for the baseline month by month rather than as an annual total, and start collecting the same figures at stations that are not live yet. A staged rollout is a stepped wedge waiting to happen: later sites are controls for earlier ones, concurrently, which rules out anything that changed nationally that year. Neither can be done retrospectively.",
  caveat:
    "A design chosen in an interface is not a design. It holds only if the data behind it is actually arriving — which is why the feasibility check is blunt about the difference between a site marked pre-live and a site whose figures are turning up.",
  protocol: [
    {
      text: "Ask the institution for the baseline MONTH BY MONTH, not as an annual total",
      detail:
        "Same request, same goodwill, same effort. A monthly series supports interrupted time series, which separates your effect from a trend that was already running; a single total supports nothing beyond a plain before-and-after. Eight months is the practical minimum, twelve is comfortable, twenty-four also gives you the seasonal shape.",
      timeCritical: true,
    },
    {
      text: "Start collecting the same monthly figures at stations that are not live yet",
      detail:
        "This is the step that expires. A station is only a control while it has no service, and the rollout is staged anyway — so the stepped wedge costs one extra line in an email today and is unavailable the moment the second site goes live.",
      timeCritical: true,
    },
    {
      text: "Record an accurate go-live date for every station",
      detail: "Without a dated intervention point there is no interruption to model and no wedge to step.",
      timeCritical: true,
    },
    {
      text: "Nominate the primary outcome in writing, before any data arrives",
      detail:
        "Forty metrics with no nominated primary is a fishing expedition. Choosing one afterwards is not a finding, however good it looks.",
      timeCritical: true,
    },
    {
      text: "Write the two-page analysis plan and date it",
      detail: "Design, cohort, primary and secondary outcomes, how comparisons are made, how missing months are handled. Upload it here.",
      timeCritical: true,
    },
    {
      text: "Decide the run-in rule and the seasonal window in advance",
      detail: "Dropping a bad first month after seeing it is indefensible even when it is analytically correct.",
      timeCritical: true,
    },
  ],
  fields: [],
  documents: [
    {
      id: "protocol",
      name: "Study protocol and analysis plan",
      why:
        "Dated before the data exists. This single document is what an ethics committee, a journal and a procurement evaluator all look for, and it is the difference between an evaluation and a story told afterwards.",
      required: true,
    },
    {
      id: "baseline-series",
      name: "Monthly baseline series",
      why: "The institution's monthly figures for the period before go-live, per station. The input that makes interrupted time series possible.",
      required: true,
    },
  ],
  metrics: [
    {
      id: "design_strength",
      name: "Design",
      headline: true,
      why:
        "What the evaluation is allowed to conclude. Everything else in this system produces numbers; this decides what they mean.",
      compute: ({ design }) => {
        if (!design) return { value: null, detail: "Chosen and checked on the Design step", missing: "Design decisions recorded" };
        const chosen = DESIGN_BY_ID[design.design];
        const preLive = Object.values(design.sites).filter((x) => x.role === "pre-live").length;
        const best = supportedDesign(design, { preLiveWithData: preLive });
        const gap = DESIGNS.findIndex((d) => d.id === best) < DESIGNS.findIndex((d) => d.id === design.design);
        return {
          value: chosen.name,
          // The interesting case is when the chosen design is stronger than the
          // data supports — that is a claim the evaluation cannot back.
          detail: gap
            ? `Claimed, but the data currently supports only ${DESIGN_BY_ID[best].name.toLowerCase()}`
            : `${COHORT_BY_ID[design.cohort].name.toLowerCase()} · ${design.baselineMonths} months of monthly baseline`,
          status: gap ? "poor" : chosen.strength >= 3 ? "good" : chosen.strength === 2 ? "fair" : "poor",
          assumption: gap
            ? "A design chosen in an interface is not a design. Either collect what it needs or report the weaker one."
            : undefined,
        };
      },
    },
  ],
};
