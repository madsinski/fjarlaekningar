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
//   1. Ask the institution for the baseline MONTH BY MONTH, not as one annual
//      total. Same request, same goodwill, same effort — but a monthly series
//      supports interrupted time series, which separates the effect of the
//      service from a trend that was already running. A single total cannot.
//
//   2. Start collecting the same monthly figures at stations that are NOT yet
//      live. A staged rollout is a stepped wedge waiting to happen: later sites
//      are controls for earlier ones, concurrently, controlling for everything
//      that changed nationally that year. It costs one line in an email now and
//      cannot be recovered once a site goes live.
//
// Both are free. Neither is possible retrospectively.

import type { Module } from "./types";

// ── Designs ─────────────────────────────────────────────────────────────────

export type DesignId = "before-after" | "its" | "controlled" | "stepped-wedge";

export type Design = {
  id: DesignId;
  name: string;
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
    summary: "Compare the twelve months before the service with the twelve months after, at the same site.",
    claim: "Activity changed after we arrived — with no way to show that we were the cause.",
    requires: ["A baseline figure for the period before", "Twelve months of operation"],
    threats: [
      "Secular trend — Icelandic primary care did not stand still that year, and anything that changed nationally is folded into your result.",
      "Seasonality — respiratory cases peak in winter. An autumn pilot against a spring baseline can show a large effect that is entirely the calendar.",
      "Regression to the mean — services tend to be introduced where a problem was unusually bad, and unusually bad periods improve on their own.",
      "Hawthorne effect — a site that knows it is being evaluated behaves differently.",
    ],
    cost: "None. This is what you get by default if you decide nothing.",
    strength: 1,
    decideBy: "Always available — it is the fallback, not a choice.",
  },
  {
    id: "its",
    name: "Interrupted time series",
    summary: "Model the monthly series before and after go-live, and test for a change in level and in slope at that point.",
    claim: "Activity changed by X beyond the trend that was already running — which is a causal claim the before-and-after cannot make.",
    requires: [
      "Monthly data points before go-live — twelve is comfortable, eight is the practical minimum",
      "Monthly points after, not a single aggregate",
      "A clearly dated intervention point",
    ],
    threats: [
      "A co-intervention at the same moment — if the health centre also changed its phone triage the month you launched, the two cannot be separated.",
      "Still single-site, so anything that happened only at that site is indistinguishable from the service.",
    ],
    cost: "One sentence in the baseline request: monthly figures rather than an annual total. Nothing else changes.",
    strength: 2,
    decideBy: "Before the baseline is requested. A single annual total cannot be un-aggregated afterwards.",
  },
  {
    id: "controlled",
    name: "Controlled before-and-after",
    summary: "Run the same measurements at a comparable station that is not receiving the service yet.",
    claim: "Activity changed at our site and did not change at a comparable one over the same period.",
    requires: [
      "A comparable station with no service",
      "The same monthly figures collected there throughout",
      "Agreement from the institution to supply both",
    ],
    threats: [
      "Sites are never truly comparable — size, staffing and case mix all differ.",
      "Contamination: in a country this small, patients at the control site may hear about the service and use it.",
    ],
    cost: "The institution supplies the same monthly figures for one more station. No work at the control site itself.",
    strength: 3,
    decideBy: "Before the control site goes live. Once it has the service it is no longer a control.",
  },
  {
    id: "stepped-wedge",
    name: "Stepped wedge",
    summary: "Stations go live one at a time in a planned order; each acts as a control for the others until its own turn.",
    claim: "The same change followed the service at each site in turn, at different calendar times — which rules out anything that happened nationally.",
    requires: [
      "A staged rollout with more than two sites — which is already the plan",
      "Monthly figures collected at every station from before the first go-live",
      "Go-live dates recorded accurately",
    ],
    threats: [
      "Needs enough sites and enough months; with two sites it is just a controlled before-and-after.",
      "Contamination between sites in the same institution.",
      "Later sites benefit from lessons learned at earlier ones, so the effect may grow over the rollout — which is worth reporting rather than hiding.",
    ],
    cost:
      "Collecting the same monthly figures at stations before they go live. One line in the request you are already making, and the rollout is staged regardless.",
    strength: 4,
    decideBy:
      "Before the second station goes live — and baseline collection at the later stations has to start before that. This is the one that expires.",
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
    name: "Primary outcome",
    question: "Which single figure is the one this evaluation stands or falls on?",
    why:
      "The programme can produce over forty metrics. Reporting all of them and highlighting whichever came out well is how an evaluation becomes a fishing expedition — and a reviewer who knows the field will say so. Nominating one in advance, in writing, is the cheapest credibility you will ever buy.",
    ifLate:
      "Chosen after seeing the data, it is no longer a finding. Everything else becomes secondary and exploratory whether you label it that way or not.",
    suggestion:
      "Resolution rate within the agreed code set. It is the base claim, it is the one an institution asks about first, and it does not depend on anyone else supplying data.",
    timeCritical: true,
  },
  {
    id: "run-in",
    name: "Run-in period",
    question: "Are the first weeks at a site excluded from the primary analysis?",
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
    name: "Seasonal window",
    question: "How do you stop winter doing the work your service was supposed to do?",
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
    name: "Analysis plan",
    question: "Which comparisons will be made, and how, written down before the data is looked at?",
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
    name: "Missing months",
    question: "What happens when an export fails or the institution does not send figures?",
    why:
      "It will happen. If the rule is invented at the time, it will be invented in whichever direction suits the month in question.",
    ifLate: "A gap filled after the fact is indistinguishable from a gap filled to taste.",
    suggestion:
      "Leave the month out rather than impute it, state the number of missing months in every report, and never carry a figure forward.",
    timeCritical: false,
  },
  {
    id: "small-cells",
    name: "Small cells",
    question: "What is suppressed in anything that leaves the building?",
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
  /** Decision id → what was decided, and when. */
  decisions: Record<string, { text: string; decidedAt?: string }>;
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
      label: `${state.baselineMonths} months of monthly baseline requested`,
      detail:
        state.baselineMonths >= 8
          ? "Enough pre-intervention points to model the trend that was already running."
          : "Interrupted time series needs eight monthly points before go-live, twelve to be comfortable. A single annual total supports nothing beyond a plain before-and-after.",
    },
    {
      ok: goLives === live && live > 0,
      label: `${goLives} of ${live} live sites have a recorded go-live date`,
      detail:
        goLives === live && live > 0
          ? "The intervention point is dated, which every design above the weakest requires."
          : "Without a dated go-live there is no interruption to model and no wedge to step.",
    },
    {
      ok: preLive > 0,
      label: `${preLive} pre-live control site${preLive === 1 ? "" : "s"}`,
      detail:
        preLive > 0
          ? "Later sites can act as concurrent controls — but only while they stay pre-live."
          : "With no pre-live sites there is no control group, and anything that changed nationally is folded into the result.",
    },
    {
      ok: opts.preLiveWithData > 0,
      label: `${opts.preLiveWithData} pre-live site${opts.preLiveWithData === 1 ? "" : "s"} already supplying data`,
      detail:
        opts.preLiveWithData > 0
          ? "Control data is actually arriving, not merely planned."
          : "Marking a site pre-live does nothing on its own. The institution has to be sending its monthly figures for that station too — this is the step that expires when the site goes live.",
    },
    {
      ok: opts.monthsOfData >= 12,
      label: `${opts.monthsOfData} months of operating data`,
      detail:
        opts.monthsOfData >= 12
          ? "A full year, so like-for-like calendar months can be compared and the season is not doing the work."
          : "Under twelve months, any comparison is across different seasons. Four of the eleven case types swing hard with the calendar.",
    },
    {
      ok: !!state.decisions["primary-outcome"]?.text,
      label: "Primary outcome nominated",
      detail: state.decisions["primary-outcome"]?.text
        ? "Written down, so the remaining metrics are openly secondary."
        : "Over forty metrics with no nominated primary is a fishing expedition, and a reviewer who knows the field will say so.",
    },
    {
      ok: !!state.decisions["analysis-plan"]?.text,
      label: "Analysis plan written",
      detail: state.decisions["analysis-plan"]?.text
        ? "Dated before the data, which is what separates an evaluation from a story told afterwards."
        : "Two pages, dated, before the numbers exist. The cheapest credibility available.",
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
