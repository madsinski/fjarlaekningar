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
    name: "Doctor handling time",
    question: "How long does a doctor spend on each case?",
    claim: "A case takes a median of M minutes of a doctor's time, measured rather than assumed.",
    category: "system",
    benefit: "Turns the cost of a case from a guess into a measured figure.",
    horizon: "now",
    effort: "medium",
    sources: ["internal", "medalia"],
    rationale:
      "An internal study, as the advisor put it. Everything about capacity and unit cost rests on this one number: a case that takes forty minutes of a doctor's time is a different service from one that takes eight. It is also what the next station will want to know before it asks how many doctors it needs.",
    caveat:
      "Time in the record is not the same as time spent — a doctor may have a record open while doing something else. Treat a system figure as an upper bound, and prefer the sampled one.",
    protocol: [
      { text: "Ask Medalia whether time per case can be exported", detail: "Active time if they hold it, elapsed time in the record if not — and label which." },
      { text: "Run the internal study: doctors note minutes per case for two weeks", detail: "Twenty cases each is enough for a median good enough to plan with. Once early, once around month nine." },
    ],
    fields: [{ key: "clinician_minutes_median", label: "Median doctor minutes per case", unit: "minutes", nullable: true, source: "internal" }],
    documents: [],
    metrics: [
      {
        id: "minutes_per_case", name: "Doctor minutes per case", headline: true,
        why: "The number under every capacity and cost claim you will make.",
        compute: ({ t }) => ({
          value: t.clinician_minutes_median === null ? null : `${t.clinician_minutes_median} min`,
          detail: t.clinician_minutes_median && t.cases_total
            ? `About ${Math.round((t.clinician_minutes_median * t.cases_total) / 60)} doctor hours over the period`
            : "Median across all cases",
          missing: t.clinician_minutes_median === null ? "Internal time study, or time in the export" : undefined,
        }),
      },
    ],
  },

  {
    id: "dna-avoidance",
    name: "Did-not-attend avoidance",
    question: "How much wasted capacity does this recover?",
    claim: "A remote case cannot be a no-show. At the institution's own DNA rate that is N appointments recovered.",
    category: "system",
    benefit: "Converts a structural advantage of remote care into a number.",
    horizon: "now",
    effort: "low",
    requires: ["code-volume"],
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
    category: "system",
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
    name: "Home tests",
    question: "Could the patient get hold of the test, and carry it out?",
    claim: "Home tests were used in N cases; X% found it easy to get the test and Y% easy to carry it out.",
    category: "patient",
    benefit: "Tells you whether the home tests work in the patient's hands, and where they fall down.",
    horizon: "now",
    effort: "low",
    requires: ["patient-survey"],
    sources: ["medalia", "survey"],
    rationale:
      "A home test only helps if the patient can get it and do it. The advisor asks both in the day-0 survey: how well did it go getting the test in hand, and how well did it go carrying it out. The two fail in different places — getting it is about stock and distribution at the station, doing it is about the instructions — so they are kept apart.",
    caveat:
      "Only the patients who used a test can answer, so the numbers are small. Treat the direction as reliable and the exact figure as soft.",
    protocol: [
      { text: "Record 'home test used' as a coded field in Medalia" },
      { text: "Ask the two test questions in the day-0 survey, only of those who used a test" },
      { text: "Reconcile against stock held at each site", link: { href: "/admin/onboarding", label: "Site rollout" } },
    ],
    fields: [
      { key: "home_tests_used", label: "Cases using a home test", nullable: true, source: "medalia" },
      { key: "survey_test_obtain_pct", label: "Easy to get the test", unit: "percent", nullable: true, source: "survey" },
      { key: "survey_test_perform_pct", label: "Easy to carry out the test", unit: "percent", nullable: true, source: "survey" },
    ],
    documents: [],
    metrics: [
      {
        id: "test_perform", name: "Easy to carry out", headline: true,
        why: "A test the patient cannot do is no test at all.",
        compute: ({ t }) => ({
          value: p(t.survey_test_perform_pct),
          detail: t.home_tests_used ? `${n(t.home_tests_used)} cases used a home test` : "Of those who used a test",
          missing: t.survey_test_perform_pct === null ? "Day-0 survey" : undefined,
          status: t.survey_test_perform_pct === null ? undefined : t.survey_test_perform_pct >= 80 ? "good" : "fair",
        }),
      },
      {
        id: "test_obtain", name: "Easy to get",
        why: "Stock and distribution at the station.",
        compute: ({ t }) => ({ value: p(t.survey_test_obtain_pct), detail: "Of those who used a test", missing: t.survey_test_obtain_pct === null ? "Day-0 survey" : undefined }),
      },
    ],
  },

  {
    id: "image-quality",
    name: "Image adequacy",
    question: "Can patients actually take a usable photograph?",
    claim: "X% of submitted images were adequate to reach a decision without a second request.",
    category: "patient",
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
    category: "patient",
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
    name: "Correct diagnosis",
    question: "For those who sought care elsewhere within 7 days, was the diagnosis right?",
    claim: "Of N patients whose records were reviewed after a return within 7 days, the remote diagnosis held in X%.",
    category: "safety",
    benefit: "The most direct check on the clinical judgement itself.",
    horizon: "now",
    effort: "high",
    requires: ["revisits"],
    sources: ["survey", "institution"],
    rationale:
      "Every other safety measure here is indirect: no incidents, few returns, the screen fired. This one checks the diagnosis against what was found when the patient was seen again. The advisor asks it both ways: the day-7 survey asks whether the patient was given a different diagnosis elsewhere, and the same manual review of HSU records that counts the 7-day returns records whether the diagnosis held.",
    caveat:
      "Only patients who were seen again can be checked, which is a biased sample by construction — the cases that went well never appear in it. That bias has to be stated in the same breath as the result, every time.",
    protocol: [
      { text: "Agree what counts as the diagnosis holding, with a clinician", detail: "Same condition, or same management? These give different numbers, and the choice must be made before any record is reviewed." },
      { text: "Record it in the same HSU review as the 7-day returns", detail: "HSU's side, counts back. One review, two answers." },
      { text: "Ask in the day-7 survey whether a different diagnosis was given elsewhere" },
      { text: "Report the selection bias alongside the figure, always" },
    ],
    fields: [
      { key: "survey_other_diagnosis_pct", label: "Given a different diagnosis elsewhere (survey)", unit: "percent", nullable: true, source: "survey" },
      { key: "concordance_checked", label: "Returns reviewed for the diagnosis", nullable: true, source: "institution" },
      { key: "concordance_agreed", label: "of which the diagnosis held", nullable: true, source: "institution" },
    ],
    documents: [
      { id: "concordance-protocol", name: "Review protocol", why: "The agreed definition of a correct diagnosis, written before any record was reviewed.", required: true },
    ],
    metrics: [
      {
        id: "concordance", name: "Diagnosis held", headline: true,
        why: "The only measure here that checks the clinical judgement against what was found later.",
        compute: ({ t }) => ({
          value: t.concordance_checked && t.concordance_agreed !== null
            ? p(pct(t.concordance_agreed, t.concordance_checked))
            : null,
          detail: t.concordance_checked
            ? `${n(t.concordance_agreed ?? 0)} of ${n(t.concordance_checked)} reviewed — only those seen again can be checked`
            : "Needs the review of HSU records",
          missing: t.concordance_checked === null ? "Review at HSU" : undefined,
          assumption: "Selection bias by construction: only patients who were seen again can be checked. State this with the figure every time.",
        }),
      },
      {
        id: "other_diagnosis", name: "Told something different elsewhere",
        why: "The patient's side, including care outside HSU.",
        compute: ({ t }) => ({
          value: p(t.survey_other_diagnosis_pct),
          detail: "Of day-7 respondents",
          missing: t.survey_other_diagnosis_pct === null ? "Day-7 survey" : undefined,
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
