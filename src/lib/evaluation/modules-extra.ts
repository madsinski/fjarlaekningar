// The second wave of research modules.
//
// Kept in their own file so the first eighteen stay readable, but they are the
// same kind of thing and appear in the same catalogue. Several are marked
// `horizon: "later"` — they need groundwork the pilot year does not have, and
// an advisor should be able to see that without reading the whole card.
//
// Three of these answer questions the pilot cannot currently answer at all and
// that the next institution will certainly ask: how long does it take to open
// a site, how many more cases could you take, and are you only reaching the
// digitally confident.

import type { Module } from "./types";
import { pct } from "./totals";

const n = (v: number) => v.toLocaleString("en-GB");
const p = (v: number | null) => (v === null ? null : `${v}%`);

export const EXTRA_MODULES: Module[] = [
  // ── Scalability ───────────────────────────────────────────────────────────
  {
    id: "implementation",
    name: "Implementation cost",
    question: "How long does it take to open a site, and what does it cost them?",
    claim: "We opened the site in N days with H hours of their staff's time — and here is what that bought.",
    category: "scalability",
    benefit: "Answers the first question the next institution will ask.",
    horizon: "now",
    effort: "low",
    sources: ["internal"],
    rationale:
      "The pilot exists to find out whether this transfers, and yet implementation is the one thing nobody measures — everyone measures the outcome instead. Two numbers, recorded once per site, turn 'it went well' into a proposal a second institution can plan around. It also makes the eventual tender answer concrete: not 'we can scale', but 'four weeks and twelve hours of your staff's time'.",
    caveat:
      "One site is one data point, and the first site is always the slowest. Present it as a ceiling rather than an average until a second site exists.",
    protocol: [
      { text: "Record the date the agreement was signed and the date of the first case", detail: "Recorded once, in the go-live month. Cheap now, impossible to reconstruct honestly a year later.", timeCritical: true },
      { text: "Log hours of institution staff time spent on training and setup", link: { href: "/admin/onboarding", label: "Site rollout" } },
      { text: "Note what had to be redone, and why", detail: "The second site's saving is entirely in what you got wrong at the first." },
    ],
    fields: [
      { key: "implementation_days", label: "Days from agreement to first case", nullable: true, source: "internal" },
      { key: "training_hours", label: "Institution staff hours", unit: "hours", nullable: true, source: "internal" },
    ],
    documents: [
      { id: "rollout-log", name: "Rollout log", why: "What was done, in what order, and what had to be redone. This becomes the playbook for the second site." },
    ],
    metrics: [
      {
        id: "days_to_open", name: "Days to open a site", headline: true,
        why: "The closing line of any presentation about scaling, and the one that makes the rest credible.",
        compute: ({ t }) => ({
          value: t.implementation_days === null ? null : `${t.implementation_days} days`,
          detail: t.training_hours !== null ? `and ${t.training_hours} hours of institution staff time` : "Agreement signed to first case",
          missing: t.implementation_days === null ? "Go-live dates recorded" : undefined,
        }),
      },
    ],
  },

  {
    id: "capacity",
    name: "Capacity headroom",
    question: "How many more cases could we take without adding anyone?",
    claim: "Current staffing carries N cases a month and is running at X% of that.",
    category: "scalability",
    benefit: "Tells you whether you can say yes to the next site without hiring.",
    horizon: "now",
    effort: "medium",
    requires: ["clinician-effort"],
    sources: ["derived", "internal"],
    rationale:
      "A procurement evaluator will ask what volume you can absorb, and 'quite a lot' is not an answer. Derived from clinician minutes per case and hours actually rostered, so it costs nothing beyond the effort module. It also answers the question internally, before you commit to a second site and discover the rota cannot carry it.",
    caveat:
      "Headroom on paper is not headroom in practice — the constraint is usually who is willing to take an evening shift, not arithmetic. Read it next to shift coverage and swap rate.",
    protocol: [
      { text: "Confirm rostered hours are accurate in the Rota", link: { href: "/admin/roster", label: "Rota" } },
      { text: "Agree what utilisation you consider sustainable", detail: "Running a volunteer-adjacent rota at 90% is not the same as running a salaried one at 90%." },
    ],
    fields: [],
    documents: [],
    metrics: [
      {
        id: "utilisation", name: "Capacity used", headline: true,
        why: "What you can promise a second site without hiring. 'Quite a lot' is not an answer to a tender.",
        compute: ({ t, roster }) => {
          const mins = t.clinician_minutes_median;
          if (!mins || !roster.shifts) {
            return { value: null, detail: "Needs clinician minutes per case and rostered shifts", missing: mins ? "Shifts in the Rota" : "Clinician effort module" };
          }
          // A shift is 10:00–22:00 in the rota's own defaults.
          const capacity = Math.floor((roster.covered * 12 * 60) / mins);
          return {
            value: p(pct(t.cases_total, capacity)),
            detail: `${n(t.cases_total)} cases against about ${n(capacity)} the rostered hours could carry`,
            assumption: `Derived: ${roster.covered} covered shifts × 12 h ÷ ${mins} min per case. Paper headroom — the real constraint is usually who will take an evening.`,
          };
        },
      },
    ],
  },

  {
    id: "demand-pattern",
    name: "Demand pattern",
    question: "When do cases actually arrive?",
    claim: "X% of demand falls outside normal clinic hours — which is precisely the gap the service fills.",
    category: "scalability",
    benefit: "Shapes the rota around real demand, and evidences the out-of-hours argument.",
    horizon: "now",
    effort: "low",
    sources: ["medalia"],
    rationale:
      "Comes free from timestamps already in the export, and does two jobs. It tells you where to put shifts, and it quantifies the part of the argument everyone asserts and nobody evidences: that a large share of demand arrives when the health centre is shut. If that turns out to be false, you want to know before you build a proposal on it.",
    caveat:
      "Arrival time is when the patient chose to submit, which is shaped by when they were told the service exists. Early figures reflect the referral pattern as much as the underlying need.",
    protocol: [
      { text: "Ask Medalia for the share of cases submitted after 17:00 and at weekends", detail: "Shares, not timestamps — a timestamp at a small station is identifying." },
      { text: "Compare against the health centre's opening hours" },
    ],
    fields: [
      { key: "demand_evening_pct", label: "Submitted after 17:00", unit: "percent", nullable: true, source: "medalia" },
      { key: "demand_weekend_pct", label: "Submitted at weekends", unit: "percent", nullable: true, source: "medalia" },
    ],
    documents: [],
    metrics: [
      {
        id: "evening", name: "Arrived after 17:00", headline: true,
        why: "Evidence for the out-of-hours argument, and the shape the rota should take.",
        compute: ({ t }) => ({
          value: p(t.demand_evening_pct),
          detail: t.demand_weekend_pct !== null ? `${t.demand_weekend_pct}% at weekends` : "Against the health centre's opening hours",
          missing: t.demand_evening_pct === null ? "Timing split in the export" : undefined,
        }),
      },
    ],
  },

  // ── Workload ──────────────────────────────────────────────────────────────
  {
    id: "clinician-effort",
    name: "Clinician effort",
    question: "How much of our own doctors' time does a case take?",
    claim: "A case takes a median of M minutes of clinician time, so the unit cost is known rather than assumed.",
    category: "workload",
    benefit: "Turns your cost per case from a guess into a measured figure.",
    horizon: "now",
    effort: "medium",
    sources: ["medalia"],
    rationale:
      "Everything about unit economics and capacity rests on this one number, and without it both are guesses. It is also the figure that decides whether the service can ever pay for itself: a case that takes forty minutes of clinician time is a different business from one that takes eight.",
    caveat:
      "Time in the system is not the same as time spent — a doctor may have a record open while doing something else. Treat it as an upper bound unless it is sampled directly.",
    protocol: [
      { text: "Ask Medalia whether clinician time per case can be exported", detail: "Active time if they hold it, elapsed time in the record if not — and label which." },
      { text: "If it cannot, sample it: one week, doctors noting minutes per case", detail: "Twenty cases is enough for a median good enough to plan with." },
    ],
    fields: [{ key: "clinician_minutes_median", label: "Median clinician minutes per case", unit: "minutes", nullable: true, source: "medalia" }],
    documents: [],
    metrics: [
      {
        id: "minutes_per_case", name: "Clinician minutes per case", headline: true,
        why: "The number under every capacity and cost claim you will make.",
        compute: ({ t }) => ({
          value: t.clinician_minutes_median === null ? null : `${t.clinician_minutes_median} min`,
          detail: t.clinician_minutes_median && t.cases_total
            ? `About ${Math.round((t.clinician_minutes_median * t.cases_total) / 60)} clinician hours over the period`
            : "Median across all cases",
          missing: t.clinician_minutes_median === null ? "Clinician time in the export, or a one-week sample" : undefined,
        }),
      },
    ],
  },

  {
    id: "dna-avoidance",
    name: "Did-not-attend avoidance",
    question: "How much wasted capacity does this recover?",
    claim: "A remote case cannot be a no-show. At the institution's own DNA rate that is N appointments recovered.",
    category: "workload",
    benefit: "Converts a structural advantage of remote care into a number.",
    horizon: "now",
    effort: "low",
    requires: ["denominator"],
    sources: ["institution"],
    rationale:
      "One of the few genuinely structural advantages of remote care, and it is almost never quantified. Every case handled remotely is an appointment slot that could not be wasted, and health centres feel DNA acutely because the cost is already sunk when it happens. One figure from the institution turns it into a number.",
    caveat:
      "Assumes the case would otherwise have become an appointment, which is not true of all of them. Present it against the displacement figure, not on its own.",
    protocol: [
      { text: "Ask the institution for their did-not-attend rate for comparable appointments", timeCritical: true },
      { text: "Apply it only to cases that would plausibly have become an appointment" },
    ],
    fields: [{ key: "institution_dna_pct", label: "Institution did-not-attend rate", unit: "percent", nullable: true, source: "institution" }],
    documents: [],
    metrics: [
      {
        id: "dna", name: "Appointments recovered", headline: true,
        why: "A structural advantage of remote care that nobody bothers to quantify.",
        compute: ({ t }) => ({
          value: t.institution_dna_pct === null ? null : n(Math.round((t.cases_resolved * t.institution_dna_pct) / 100)),
          detail: t.institution_dna_pct === null
            ? "Needs the institution's own no-show rate"
            : `At their ${t.institution_dna_pct}% no-show rate, across ${n(t.cases_resolved)} resolved cases`,
          missing: t.institution_dna_pct === null ? "Did-not-attend rate from the institution" : undefined,
          assumption: "Assumes each resolved case would otherwise have become an appointment — true of some, not all.",
        }),
      },
    ],
  },

  {
    id: "out-of-hours",
    name: "Out-of-hours displacement",
    question: "Are we taking pressure off the out-of-hours service and A&E?",
    claim: "X% said they would otherwise have used the out-of-hours service or called 112.",
    category: "workload",
    benefit: "Extends the displacement argument beyond the health centre to the services that cost most.",
    horizon: "later",
    effort: "low",
    requires: ["access-gain"],
    sources: ["survey"],
    rationale:
      "The health centre is not the only thing being relieved, and the out-of-hours service and emergency care are far more expensive per contact. This is one extra option on a survey question you are already asking, and it reaches an audience the health-centre numbers do not: the people who fund emergency care.",
    caveat:
      "Self-reported, and people over-report that they would have sought urgent care. Label it as stated intent, and never convert it into a cost saving without saying so.",
    protocol: [
      { text: "Add the out-of-hours service and 112 as options to 'where would you otherwise have gone?'" },
      { text: "Report it as stated intent, never as displaced contacts" },
    ],
    fields: [{ key: "ooh_alternative_pct", label: "Would have used out-of-hours or 112", unit: "percent", nullable: true, source: "survey" }],
    documents: [],
    metrics: [
      {
        id: "ooh", name: "Would have gone out-of-hours", headline: true,
        why: "Reaches the people who fund emergency care, not just the health centre.",
        compute: ({ t }) => ({
          value: p(t.ooh_alternative_pct),
          detail: "Self-reported intent — not displaced contacts",
          missing: t.ooh_alternative_pct === null ? "Survey option" : undefined,
        }),
      },
    ],
  },

  // ── Effectiveness ─────────────────────────────────────────────────────────
  {
    id: "home-tests",
    name: "Home test utilisation",
    question: "Are the home tests earning their place?",
    claim: "Home tests were used in N cases and changed the decision in M of them.",
    category: "effectiveness",
    benefit: "Tells you whether to keep stocking the tests, or which ones to drop.",
    horizon: "now",
    effort: "low",
    sources: ["medalia"],
    rationale:
      "You already ship CRP and urine dipstick tests to every site and carry the stock. The useful split is between a test being used and a test changing the decision — a test that never changes anything is inventory with a story attached. This is also the most concrete answer to 'how can you diagnose without examining the patient?', which is the other question that always comes up.",
    caveat:
      "'Changed the decision' is a clinician's judgement recorded after the fact, so it will run optimistic. Treat the direction as reliable and the exact figure as soft.",
    protocol: [
      { text: "Record test used as a coded field, separately from the result" },
      { text: "Record whether the result changed the management decision", detail: "A single yes/no from the clinician. This is the field that makes the module worth having." },
      { text: "Reconcile against stock held at each site", link: { href: "/admin/onboarding", label: "Site rollout" } },
    ],
    fields: [
      { key: "home_tests_used", label: "Cases using a home test", nullable: true, source: "medalia" },
      { key: "home_tests_changed_decision", label: "of which it changed the decision", nullable: true, source: "medalia" },
    ],
    documents: [],
    metrics: [
      {
        id: "test_value", name: "Tests that changed the decision", headline: true,
        why: "A test that never changes anything is inventory. This is also the best answer to 'how can you diagnose without examining?'",
        compute: ({ t }) => ({
          value: t.home_tests_changed_decision === null || !t.home_tests_used
            ? null
            : p(pct(t.home_tests_changed_decision, t.home_tests_used)),
          detail: t.home_tests_used
            ? `${n(t.home_tests_changed_decision ?? 0)} of ${n(t.home_tests_used)} cases where a test was used`
            : "Needs test use recorded per case",
          missing: t.home_tests_used === null ? "Test fields in the export" : undefined,
        }),
      },
    ],
  },

  {
    id: "image-quality",
    name: "Image adequacy",
    question: "Can patients actually take a usable photograph?",
    claim: "X% of submitted images were adequate to reach a decision without a second request.",
    category: "effectiveness",
    benefit: "Tells you whether the skin and eye case types are viable as designed.",
    horizon: "later",
    effort: "medium",
    sources: ["medalia"],
    rationale:
      "Four of the eleven case types depend on a photograph taken by the patient on their own phone. If a meaningful share are unusable, those case types carry a hidden cost — a second request, a delay, and a patient who has already waited. This is the module that either validates the visual case types or tells you to rewrite the instructions.",
    caveat:
      "Adequacy is a clinician's judgement and will vary between doctors. It is useful as a trend and as a prompt to improve the guidance, not as a precise rate.",
    protocol: [
      { text: "Record images submitted and whether a re-take was requested" },
      { text: "Review the inadequate ones quarterly and rewrite the photo instructions", detail: "The entire value of this module is the instruction rewrite it prompts." },
    ],
    fields: [
      { key: "images_submitted", label: "Images submitted", nullable: true, source: "medalia" },
      { key: "images_inadequate", label: "Inadequate, re-take requested", nullable: true, source: "medalia" },
    ],
    documents: [],
    metrics: [
      {
        id: "image_ok", name: "Images adequate first time", headline: true,
        why: "Four case types depend on a patient-taken photograph. This says whether that assumption holds.",
        compute: ({ t }) => ({
          value: t.images_submitted && t.images_inadequate !== null
            ? p(pct(t.images_submitted - t.images_inadequate, t.images_submitted))
            : null,
          detail: t.images_submitted ? `${n(t.images_submitted)} images submitted` : "Needs image counts in the export",
          missing: t.images_submitted === null ? "Image fields in the export" : undefined,
        }),
      },
    ],
  },

  // ── Experience ────────────────────────────────────────────────────────────
  {
    id: "equity",
    name: "Reach and equity",
    question: "Are we only serving the digitally confident?",
    claim: "The service reached the over-70s and non-Icelandic speakers in proportion to the population it serves.",
    category: "experience",
    benefit: "Answers the fairness question before a regulator or a journalist asks it.",
    horizon: "now",
    effort: "medium",
    sources: ["medalia"],
    rationale:
      "The standing criticism of digital health is that it quietly serves the people who needed it least, and a service that widens a gap while reporting excellent satisfaction is a real risk rather than a theoretical one. Three shares, compared with the local population, answer it. If the answer is uncomfortable, you would far rather find out in month three and do something about it than be told in a meeting in month twelve.",
    caveat:
      "Shares against a small population are noisy, and a gap is a prompt to look rather than proof of exclusion. Keep it as bands — never store or report age or language at the individual level.",
    protocol: [
      { text: "Ask Medalia for age bands and language as SHARES, never as records", detail: "A percentage band is not personal data. A date of birth at a small station is.", timeCritical: true },
      { text: "Get the local population profile from Statistics Iceland for comparison" },
      { text: "Review quarterly and act on any persistent gap", detail: "Finding a gap and doing nothing is worse than not measuring — it is now documented." },
    ],
    fields: [
      { key: "reach_under40_pct", label: "Under 40", unit: "percent", nullable: true, source: "medalia" },
      { key: "reach_over70_pct", label: "Over 70", unit: "percent", nullable: true, source: "medalia" },
      { key: "reach_other_language_pct", label: "Other than Icelandic", unit: "percent", nullable: true, source: "medalia" },
    ],
    documents: [
      { id: "population-profile", name: "Local population profile", why: "The comparison baseline from Statistics Iceland. Without it the shares mean nothing." },
    ],
    metrics: [
      {
        id: "older", name: "Reached over-70s", headline: true,
        why: "The standing criticism of digital health, answered with evidence rather than assurance.",
        compute: ({ t }) => ({
          value: p(t.reach_over70_pct),
          detail: t.reach_other_language_pct !== null
            ? `${t.reach_other_language_pct}% used a language other than Icelandic`
            : "Compare against the local population profile",
          missing: t.reach_over70_pct === null ? "Age bands in the export" : undefined,
        }),
      },
      {
        id: "language", name: "Other than Icelandic",
        why: "Language is the other axis where a remote service can quietly exclude people.",
        compute: ({ t }) => ({
          value: p(t.reach_other_language_pct),
          detail: "Share of cases, against the local population",
          missing: t.reach_other_language_pct === null ? "Language share in the export" : undefined,
        }),
      },
    ],
  },

  // ── Safety ────────────────────────────────────────────────────────────────
  {
    id: "diagnostic-concordance",
    name: "Diagnostic concordance",
    question: "When a case was later seen in person, was the remote assessment right?",
    claim: "The remote working diagnosis agreed with the in-person assessment in X% of cases that were later examined.",
    category: "safety",
    benefit: "The strongest clinical validation available, and the one that gets published.",
    horizon: "later",
    effort: "high",
    requires: ["revisits"],
    sources: ["institution", "study"],
    rationale:
      "Every other safety measure here is indirect: no incidents, few returns, the screen fired. This is the only one that checks the clinical judgement itself against a reference standard. It is also the module that turns a service evaluation into something publishable, and the one a clinical audience will find most persuasive.",
    caveat:
      "Only cases referred onward and then examined can be checked, which is a biased sample by construction — the easy cases never appear in it. That bias has to be stated in the same breath as the result, every time. High effort, and it needs the data agreement in place first.",
    protocol: [
      { text: "Agree a definition of agreement with a clinician", detail: "Same condition, or same management? These give different numbers and the choice must be made before seeing any." },
      { text: "Have the institution match referred cases to their in-person assessment", detail: "Their side, aggregate counts back. Same arrangement as return visits." },
      { text: "Report the selection bias alongside the figure, always", detail: "Only referred cases can be checked, so the easy ones are absent by construction." },
    ],
    fields: [
      { key: "concordance_checked", label: "Cases checked against in-person assessment", nullable: true, source: "institution" },
      { key: "concordance_agreed", label: "of which agreed", nullable: true, source: "institution" },
    ],
    documents: [
      { id: "concordance-protocol", name: "Concordance protocol", why: "The agreed definition of agreement, written before any case was reviewed.", required: true },
    ],
    metrics: [
      {
        id: "concordance", name: "Diagnostic agreement", headline: true,
        why: "The only measure here that checks the clinical judgement against a reference standard.",
        compute: ({ t }) => ({
          value: t.concordance_checked && t.concordance_agreed !== null
            ? p(pct(t.concordance_agreed, t.concordance_checked))
            : null,
          detail: t.concordance_checked
            ? `${n(t.concordance_agreed ?? 0)} of ${n(t.concordance_checked)} checked — referred cases only, so the easy ones are absent`
            : "Needs matched in-person assessments from the institution",
          missing: t.concordance_checked === null ? "Matching run at the institution" : undefined,
          assumption: "Selection bias by construction: only cases referred onward can be checked. State this with the figure every time.",
        }),
      },
    ],
  },

  {
    id: "follow-up",
    name: "Follow-up adherence",
    question: "Did patients actually do what was advised?",
    claim: "X% confirmed they followed the advice given, so resolution reflects care received rather than care offered.",
    category: "safety",
    benefit: "Closes the gap between advice given and care actually received.",
    horizon: "later",
    effort: "medium",
    requires: ["patient-survey"],
    sources: ["survey"],
    rationale:
      "A case closed as resolved means advice was given, not that it was followed. If adherence turns out to be low, the resolution rate is measuring something narrower than it appears — and that is worth knowing before the figure is defended in public. It also tells you whether written advice delivered remotely lands as well as advice given face to face, which is a real open question.",
    caveat:
      "Self-reported adherence is systematically over-reported. It is useful for comparison between case types and over time, not as an absolute.",
    protocol: [
      { text: "Add an adherence question to the follow-up survey" },
      { text: "Break it down by case type", detail: "The interesting finding will be that some case types travel badly, not the overall figure." },
    ],
    fields: [
      { key: "followup_contacted", label: "Patients asked about adherence", nullable: true, source: "survey" },
      { key: "followup_adhered", label: "of whom followed the advice", nullable: true, source: "survey" },
    ],
    documents: [],
    metrics: [
      {
        id: "adherence", name: "Followed the advice", headline: true,
        why: "Resolution means advice was given. This is whether it was taken.",
        compute: ({ t }) => ({
          value: t.followup_contacted && t.followup_adhered !== null
            ? p(pct(t.followup_adhered, t.followup_contacted))
            : null,
          detail: t.followup_contacted ? `${n(t.followup_contacted)} patients asked` : "Needs an adherence question in the survey",
          missing: t.followup_contacted === null ? "Survey question" : undefined,
          assumption: "Self-reported, and systematically over-reported. Useful as a comparison, not as an absolute.",
        }),
      },
    ],
  },
];
