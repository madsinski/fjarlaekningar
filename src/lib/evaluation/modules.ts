// The module catalogue.
//
// Each entry is one decision a medical advisor can make on its own merits, and
// it carries everything that decision needs: the question, the claim it earns,
// how to run it, what it costs, what it cannot show, and what must exist on
// paper first.
//
// Three are marked `core` — resolution, incidents and response time. Without
// them there is no evaluation, only anecdote.
//
// Order here is the order they are offered. Cheap and load-bearing first.

import type { Module } from "./types";
import { pct } from "./totals";

const n = (v: number) => v.toLocaleString("en-GB");
const p = (v: number | null) => (v === null ? null : `${v}%`);

export const MODULES: Module[] = [
  // ── Effectiveness ─────────────────────────────────────────────────────────
  {
    id: "resolution",
    name: "Case resolution",
    question: "Do these cases actually get resolved remotely?",
    claim: "X% of cases were resolved entirely in the remote service, and we can show it case type by case type.",
    category: "effectiveness",
    core: true,
    effort: "low",
    sources: ["medalia"],
    rationale:
      "The base claim. Everything else is either a gate on it or a consequence of it. The aim is not the highest possible number — eleven green ticks above 95% convinces nobody. A table where nine types are strong, two are marginal and you can say what you changed is far more credible and shows an organisation that learns.",
    caveat:
      "A rate without volume means nothing: 95% of twenty cases is not a result. Always read it next to the case count.",
    protocol: [
      { text: "Write down and freeze what 'resolved' means", detail: "Resolved, referred onward, stopped by screening. It must mean exactly the same thing in month one and month twelve — changing definitions mid-stream kills more quality projects than anything else.", timeCritical: true },
      { text: "Make outcome a mandatory coded field in Medalia", detail: "If outcome sits in free text in the doctor's letter, no export saves you and you will be reading a thousand notes at the end.", timeCritical: true },
      { text: "Agree the monthly export and check the processing agreement covers it" },
      { text: "Import the first month and check resolved + referred equals the total", detail: "The importer flags the gap. A mismatch usually means the outcome field is not mandatory yet." },
    ],
    fields: [
      { key: "cases_total", label: "Cases received", source: "medalia" },
      { key: "cases_resolved", label: "Resolved remotely", source: "medalia" },
      { key: "cases_referred", label: "Referred onward", source: "medalia" },
      { key: "referred_primary_care", label: "→ primary care", source: "medalia" },
      { key: "referred_specialist", label: "→ specialist", source: "medalia" },
      { key: "referred_other", label: "→ other", source: "medalia" },
      { key: "cases_repeat", label: "Repeat cases", help: "Same patient, same problem, again.", source: "medalia" },
    ],
    documents: [
      { id: "definitions", name: "Frozen definitions", why: "The one page that says what resolved, referred and stopped mean. Everything downstream depends on it not moving.", required: true },
    ],
    metrics: [
      {
        id: "resolution_rate", name: "Resolved remotely", headline: true,
        why: "The base claim. Read it next to the case count — a high rate on small volume is not a finding.",
        compute: ({ t }) => ({
          value: p(pct(t.cases_resolved, t.cases_total)),
          detail: `${n(t.cases_resolved)} of ${n(t.cases_total)} cases closed without referral`,
          missing: t.cases_total ? undefined : "Medalia export",
          status: !t.cases_total ? undefined : pct(t.cases_resolved, t.cases_total)! >= 80 ? "good" : pct(t.cases_resolved, t.cases_total)! >= 60 ? "fair" : "poor",
        }),
      },
      {
        id: "volume", name: "Cases received",
        why: "The denominator for everything above. Small numbers are honest limitations, not failures — but they have to be visible.",
        compute: ({ t }) => ({ value: n(t.cases_total), detail: `Across ${t.months} ${t.months === 1 ? "month" : "months"}` }),
      },
      {
        id: "referral_mix", name: "Where referrals went",
        why: "Referral is not failure. Where it goes is what tells you whether the scope is right.",
        compute: ({ t }) => ({
          value: n(t.cases_referred),
          detail: `Primary care ${t.referred_primary_care} · specialist ${t.referred_specialist} · other ${t.referred_other}`,
        }),
      },
      {
        id: "repeat", name: "Repeat cases",
        why: "A resolution that does not hold is not a resolution.",
        compute: ({ t }) => ({ value: n(t.cases_repeat), detail: "Same patient, same problem, within the period" }),
      },
    ],
  },

  {
    id: "response-time",
    name: "Response time",
    question: "Do we keep the two-hour promise?",
    claim: "Median response was T minutes and 95% were answered within P — against a promise of two hours.",
    category: "experience",
    core: true,
    effort: "low",
    sources: ["medalia"],
    rationale:
      "The promise that gets tested out loud at every single meeting. It comes free from timestamps already in Medalia, which makes it the strongest single figure in the set for the least work.",
    caveat:
      "It measures our part only. What the patient experiences is the whole wait, which the access module covers.",
    protocol: [
      { text: "Confirm Medalia can export response time as a DURATION in minutes", detail: "Never as a timestamp. A timestamp plus a small station is identifying; a duration is not." },
      { text: "Agree the clock: submission to first clinician response" },
    ],
    fields: [
      { key: "response_median_min", label: "Median response", unit: "minutes", nullable: true, source: "medalia" },
      { key: "response_p95_min", label: "95th percentile", unit: "minutes", nullable: true, source: "medalia" },
    ],
    documents: [],
    metrics: [
      {
        id: "response", name: "Median response", headline: true,
        why: "The promise, tested. Cheap to produce and hard to argue with.",
        compute: ({ t, a }) => ({
          value: t.response_median_min === null ? null : `${t.response_median_min} min`,
          detail: t.response_p95_min !== null
            ? `95% answered within ${t.response_p95_min} min — promise is ${a.responseTargetMinutes} min`
            : `Promise is ${a.responseTargetMinutes} min`,
          missing: t.response_median_min === null ? "Medalia export" : undefined,
          status: t.response_median_min === null ? undefined
            : t.response_median_min <= a.responseTargetMinutes / 2 ? "good"
            : t.response_median_min <= a.responseTargetMinutes ? "fair" : "poor",
        }),
      },
    ],
  },

  {
    id: "incidents",
    name: "Incident reporting",
    question: "Is anyone being harmed?",
    claim: "No serious incidents, N deviations logged and closed — and here is the system that would have caught one.",
    category: "safety",
    core: true,
    effort: "low",
    sources: ["survey"],
    rationale:
      "A gate rather than a scale: an excellent resolution rate alongside one serious incident is a failed project, and no good number elsewhere offsets it. Note that zero is only believable if it is visible that somebody was counting — which is why deviations and near misses sit beside it rather than hidden.",
    caveat:
      "A single site of four thousand people will never have the numbers to say anything about rare events. Say that yourself, on the first slide, before someone in the audience says it for you.",
    protocol: [
      { text: "Put a deviation form into service", detail: "One form is enough. But 'no serious incidents' is only credible if a system existed that would have caught one.", timeCritical: true },
      { text: "Agree who reviews deviations and how often" },
      { text: "Agree the escalation route with the institution's clinical lead" },
    ],
    fields: [
      { key: "deviations", label: "Deviations logged", source: "survey" },
      { key: "near_misses", label: "of which near misses", source: "survey" },
      { key: "serious_incidents", label: "Serious incidents", source: "survey" },
    ],
    documents: [
      { id: "incident-procedure", name: "Incident procedure", why: "What counts as a deviation, who reviews it, how it is escalated and closed.", required: true },
    ],
    metrics: [
      {
        id: "serious", name: "Serious incidents", headline: true,
        why: "The gate. Zero is only credible next to evidence that counting took place.",
        compute: ({ t }) => ({
          value: n(t.serious_incidents),
          detail: `${n(t.deviations)} deviations logged, ${n(t.near_misses)} of them near misses`,
          status: t.serious_incidents > 0 ? "poor" : t.deviations > 0 ? "good" : "fair",
        }),
      },
    ],
  },

  {
    id: "case-mix",
    name: "Case mix and diagnostic codes",
    question: "Which of the eleven case types actually work, and are we staying inside our scope?",
    claim: "Here is the resolution rate for every case type, coded, and comparable with national primary-care statistics.",
    category: "effectiveness",
    effort: "medium",
    sources: ["medalia"],
    rationale:
      "Underrated, and the single highest-value item in the whole programme. Not because of the coding itself but because of comparability: without codes our numbers are self-referential — '400 cases' means nothing to a listener. With ICD-10 codes you can set them against the national contact register and say what share of the expected volume for a population this size you handled. That is a completely different claim, and the codes are the join key to the institution's denominator.",
    caveat:
      "The aggregate resolution rate hides it when three case types carry the other eight. That is exactly why this module exists — and expect some of the eleven to come out badly. That is a result, not a mistake.",
    protocol: [
      { text: "Agree 3–5 ICD-10 codes for each of the eleven case types", detail: "With a clinician. Keep the set tight and written down — drift outside it later becomes an independent signal that the scope is moving.", timeCritical: true },
      { text: "Check whether Medalia also supports ICPC-2", detail: "The international primary-care classification. If it is available it makes comparison beyond Iceland possible." },
      { text: "Make the diagnostic code a mandatory field", timeCritical: true },
      { text: "Ensure referred and stopped cases also get a code", detail: "Otherwise the denominator disappears again." },
    ],
    fields: [{ key: "codes_outside_set", label: "Cases outside the agreed code set", source: "medalia" }],
    documents: [
      { id: "code-sets", name: "Agreed code sets", why: "Three to five ICD-10 codes per case type, signed off by a clinician. This is the join key to the institution's denominator — the highest-priority document in the programme.", required: true },
    ],
    metrics: [
      {
        id: "scope_drift", name: "Outside code set", headline: true,
        why: "The first sign that scope is drifting, long before anyone notices in the clinic.",
        compute: ({ t }) => ({
          value: n(t.codes_outside_set),
          detail: t.cases_total ? `${pct(t.codes_outside_set, t.cases_total)}% of all cases` : "No cases yet",
          status: !t.cases_total ? undefined : pct(t.codes_outside_set, t.cases_total)! <= 5 ? "good" : "fair",
        }),
      },
    ],
  },

  {
    id: "scope-discovery",
    name: "Scope discovery",
    question: "What are people bringing that we cannot yet handle?",
    claim: "We started with eleven case types. The data told us what the next three should be.",
    category: "effectiveness",
    effort: "low",
    sources: ["medalia"],
    rationale:
      "The catch-all category is where case types twelve, thirteen and fourteen are hiding. Low effort — the volume is small enough to categorise by hand once a month — and it produces the slide that sells itself, because it shows a service that grows with the institution rather than a frozen product.",
    caveat:
      "Categorising free text is judgement. Treat the output as a direction to investigate, never as a published figure.",
    protocol: [
      { text: "Each month, review the general cases that were not resolved" },
      { text: "Group them by what the request actually was", detail: "By hand. The volume allows it, and an AI suggestion is fine here because being wrong is cheap and nothing is published." },
      { text: "Every quarter, check whether a group is big enough to become its own case type" },
    ],
    fields: [
      { key: "general_total", label: "General cases", source: "medalia" },
      { key: "general_resolved", label: "of which resolved", source: "medalia" },
    ],
    documents: [],
    metrics: [
      {
        id: "unresolved_general", name: "Unresolved general cases", headline: true,
        why: "The roadmap to the next case types, and the slide that sells itself.",
        compute: ({ t }) => ({
          value: t.general_total ? n(t.general_total - t.general_resolved) : null,
          detail: t.general_total ? `of ${n(t.general_total)} general cases` : "No general cases recorded",
          missing: t.general_total ? undefined : "Medalia export",
        }),
      },
    ],
  },

  {
    id: "cross-count",
    name: "Independent count check",
    question: "Are our case numbers actually right?",
    claim: "Two independent counters agree within X%, so the case volume is not an artefact of one system.",
    category: "effectiveness",
    effort: "low",
    sources: ["internal"],
    rationale:
      "Doctors already log patients seen against their own shifts in the rota. That is a second counter on the same thing Medalia counts, from a different system and a different person — and two independent counters that agree are far stronger than one that cannot be checked. If they diverge, one of them is wrong and you need to know before the figure reaches a report.",
    caveat:
      "It only works if doctors keep filling the field in. Coverage lapses show up here as a sudden zero, which is itself worth watching.",
    protocol: [
      { text: "Ask doctors to log patients seen on every shift", detail: "A small discipline on the rota that pays for itself the first time somebody questions the case volume.", link: { href: "/admin/roster", label: "Rota" } },
      { text: "Compare against the Medalia case count each month" },
      { text: "Investigate any gap above 10% before the figure goes into a report" },
    ],
    fields: [],
    documents: [],
    metrics: [
      {
        id: "cross_check", name: "Logged by doctors", headline: true,
        why: "An independent check on the case volume. Divergence means one counter is wrong.",
        compute: ({ t, roster }) => ({
          value: roster.patientsLogged ? n(roster.patientsLogged) : null,
          detail: roster.patientsLogged && t.cases_total
            ? `Medalia counts ${n(t.cases_total)} — ${Math.abs(Math.round(((roster.patientsLogged - t.cases_total) / t.cases_total) * 100))}% apart`
            : "Doctors log patients seen against their own shifts",
          missing: roster.patientsLogged ? undefined : "Doctors logging patients per shift",
          status: roster.patientsLogged && t.cases_total
            ? (Math.abs(roster.patientsLogged - t.cases_total) / t.cases_total <= 0.1 ? "good" : "fair")
            : undefined,
        }),
      },
    ],
  },

  // ── Safety ────────────────────────────────────────────────────────────────
  {
    id: "screening",
    name: "Red-flag screening",
    question: "Who decides a patient is suitable, and does the screen work?",
    claim: "Nobody screens patients clinically beforehand — deliberately. The questionnaire does, identically, every time, and here is its stop rate.",
    category: "safety",
    effort: "medium",
    sources: ["medalia"],
    rationale:
      "This question will be asked hard at any clinical meeting, because patients arrive through four routes and two of them — reception and records staff — are not clinicians. You cannot answer 'an experienced nurse judged it', because that is not true for most arrivals. But you do not need to: a systematic screen applied identically every time beats human judgement that varies by shift and by day. That answer is stronger — and it stands or falls entirely on being able to show the stop rate.",
    caveat:
      "It only proves the screen fired, not that it fired correctly. Pair it with the urgent-referral count, which is the near miss of the same screen.",
    protocol: [
      { text: "Confirm Medalia records stopped questionnaires at all, and that they reach the export", detail: "The most urgent question to put to Medalia. If stops are not recorded, this is the fix that has to happen before counting starts — it cannot be reconstructed later.", timeCritical: true },
      { text: "Agree a fixed list of stop reasons", detail: "About ten categories. Free text here means reading a thousand records at the end of the period." },
      { text: "Separate urgent escalation after the screen from ordinary referral", detail: "A patient who passed the questionnaire and then had to be sent to emergency care is a near miss of the screen, not a referral. Counted together, the sharpest safety signal you own disappears." },
    ],
    fields: [
      { key: "screening_stops", label: "Stopped by questionnaire", source: "medalia" },
      { key: "referred_urgent", label: "Urgent escalation after screening", help: "Emergency care or 112 after the patient passed the questionnaire.", source: "medalia" },
    ],
    documents: [
      { id: "screen-spec", name: "Screening logic", why: "Which red flags stop a patient and why. This is the document that answers 'who decides they are suitable?'", required: true },
    ],
    metrics: [
      {
        id: "stop_rate", name: "Stopped by questionnaire", headline: true,
        why: "The only evidence that the safety net works. Without it, 'the questionnaire screens them' is an assertion.",
        compute: ({ t }) => ({
          value: p(pct(t.screening_stops, t.cases_total + t.screening_stops)),
          detail: `${n(t.screening_stops)} stopped before reaching a clinician`,
          missing: t.screening_stops || t.cases_total ? undefined : "Stopped forms in the export",
        }),
      },
      {
        id: "urgent", name: "Urgent after screening",
        why: "A near miss of the screen itself, and the sharpest safety signal in our own data.",
        compute: ({ t }) => ({
          value: n(t.referred_urgent),
          detail: "Sent to emergency care or 112 after passing the questionnaire",
          status: t.referred_urgent === 0 ? "good" : "fair",
        }),
      },
    ],
  },

  {
    id: "stewardship",
    name: "Prescribing and stewardship",
    question: "Is this a prescription pipeline in disguise?",
    claim: "Antibiotic prescribing was comparable to or lower than local primary care, by case type.",
    category: "safety",
    effort: "medium",
    sources: ["medalia", "institution"],
    rationale:
      "The first attack on any remote service will always be that it is a prescription pipeline wearing a white coat. If you arrive with stewardship figures that stand up against local primary care, that discussion is finished before it starts. Arrive without them and somebody else runs it.",
    caveat:
      "The comparison only means something against a like-for-like comparator. Agree the source of the comparison figures in advance, not after seeing your own.",
    protocol: [
      { text: "Record prescriptions and antibiotics as coded fields per case", timeCritical: true },
      { text: "Agree the comparator with the institution", detail: "Their own prescribing in the same codes, or national figures. Decide before you see your own numbers." },
      { text: "Break the rate down by case type, not just overall" },
    ],
    fields: [
      { key: "prescriptions", label: "Cases with a prescription", source: "medalia" },
      { key: "antibiotics", label: "of which antibiotics", source: "medalia" },
    ],
    documents: [
      { id: "comparator", name: "Comparator source", why: "Where the primary-care comparison figures come from, agreed before our own numbers were known.", required: true },
    ],
    metrics: [
      {
        id: "abx", name: "Antibiotic rate", headline: true,
        why: "The predictable attack, answered in advance.",
        compute: ({ t }) => ({
          value: p(pct(t.antibiotics, t.cases_resolved)),
          detail: `${n(t.antibiotics)} of ${n(t.cases_resolved)} resolved cases`,
          missing: t.cases_resolved ? undefined : "Medalia export",
        }),
      },
      {
        id: "rx", name: "Any prescription",
        why: "Wider than antibiotics, and the comparison primary care already holds for itself.",
        compute: ({ t }) => ({
          value: p(pct(t.prescriptions, t.cases_resolved)),
          detail: `${n(t.prescriptions)} of ${n(t.cases_resolved)} resolved cases`,
        }),
      },
    ],
  },

  {
    id: "revisits",
    name: "Return visits within 7 days",
    question: "Did the problem actually stay solved?",
    claim: "R% returned to primary care within seven days — the strongest safety measure available.",
    category: "safety",
    effort: "high",
    sources: ["institution"],
    rationale:
      "The best safety measure there is for a service like this: it catches the cases that looked resolved and were not. Nothing else in the set covers that.",
    caveat:
      "It requires linking two patient records, which is research processing and does not pass as quality assurance. The way through is for the institution to run the query at their end and hand over the count only — then each party works in its own data and nothing crosses but a number. Build it that way from the start or it will not happen at all.",
    protocol: [
      { text: "Agree that the institution runs the query at their end", detail: "They query, they count, they send the number. No identifiable linkage takes place and the project stays quality assurance.", timeCritical: true },
      { text: "Agree the definition: same patient, related presentation, within 7 days" },
      { text: "Put the arrangement in writing as part of the data agreement" },
    ],
    fields: [{ key: "revisits_7d", label: "Return visits within 7 days", nullable: true, source: "institution" }],
    documents: [
      { id: "data-agreement", name: "Data-sharing agreement", why: "The written arrangement under which the institution runs the query and shares the count. Without it this module cannot run lawfully as quality assurance.", required: true },
    ],
    metrics: [
      {
        id: "revisit_rate", name: "Return within 7 days", headline: true,
        why: "The best safety measure available, and the one a clinical audience will ask for first.",
        compute: ({ t }) => ({
          value: t.revisits_7d === null ? null : p(pct(t.revisits_7d, t.cases_resolved)),
          detail: t.revisits_7d === null
            ? "The institution runs the query and shares the count only"
            : `${n(t.revisits_7d)} returns from ${n(t.cases_resolved)} resolved cases`,
          missing: t.revisits_7d === null ? "Query run at the institution" : undefined,
        }),
      },
    ],
  },

  // ── Workload ──────────────────────────────────────────────────────────────
  {
    id: "denominator",
    name: "Share of contact volume",
    question: "Of all the cases like this the health centre sees, how many do we take?",
    claim: "We handled X% of all contacts in these diagnostic codes at this site.",
    category: "workload",
    effort: "medium",
    requires: ["case-mix"],
    sources: ["institution"],
    rationale:
      "The figure that makes every other figure comparable. The denominator is not in our systems and never will be — patients reach us through four different routes, so we cannot count what did not arrive. It is in the institution's contact register, joined by diagnostic code. That is better than anything we could have counted ourselves: their data, their system, nationally standardised. Nobody argues with a contact register; everybody argues with a number we produced.",
    caveat:
      "Depends entirely on the code sets being agreed first. Without them there is nothing to join on.",
    protocol: [
      { text: "Request 12 months of baseline contacts in the agreed codes, per station", detail: "Without a before figure, the after figure is just a figure. You get this while goodwill is fresh and the project is exciting — a year from now, when somebody is asking what it costs, you will not get it as easily.", timeCritical: true },
      { text: "Agree monthly delivery of the same figures going forward" },
      { text: "Pull national rates per code from the Directorate of Health", detail: "Gives the expected volume for a population this size without having to ask anyone." },
    ],
    fields: [{ key: "institution_contacts", label: "Institution contacts in the same codes", nullable: true, source: "institution" }],
    documents: [
      { id: "baseline", name: "Baseline data request", why: "Twelve months of contacts in the agreed codes, per station, before we started. Time-critical — this gets harder to obtain every month.", required: true },
    ],
    metrics: [
      {
        id: "share", name: "Share of contact volume", headline: true,
        why: "Makes every other figure comparable. The denominator comes from the institution, which is exactly why nobody disputes it.",
        compute: ({ t }) => {
          const flow = t.institution_contacts !== null ? t.institution_contacts + t.cases_total : null;
          return {
            value: flow ? p(pct(t.cases_total, flow)) : null,
            detail: flow === null
              ? "Requires the contact figure from the institution"
              : `${n(t.cases_total)} of ${n(flow)} contacts in the same diagnostic codes`,
            missing: flow === null ? "Contact figures from the institution" : undefined,
          };
        },
      },
    ],
  },

  {
    id: "time-study",
    name: "Staff time and motion",
    question: "Does this remove work, or just move it?",
    claim: "Each case routed to us saved the health centre N minutes net, measured twice.",
    category: "workload",
    effort: "high",
    sources: ["study", "derived"],
    rationale:
      "The real risk in the whole project, and the one nothing else can see. The nurse now has to assess whether the case fits, explain a service the patient has never heard of, send a link, and take the patient back if anything went wrong. It is entirely possible that each case costs the health centre more minutes than it saves — the service would look excellent on every patient measure and still be adding to the load it was meant to relieve. That is the commonest finding in remote-care research, and it is invisible in every figure that starts after the patient reaches Medalia.",
    caveat:
      "Measure it at the start, not the end. A study that begins after people have got used to the service no longer measures what it was meant to measure — and an early result gives you nine months to fix what it shows, instead of a verdict you can do nothing about.",
    protocol: [
      { text: "Two weeks, now: minutes per case routed to us versus a comparable case handled in house", detail: "About 40 cases in each arm is enough to see whether the number is positive or negative. Two weeks of mild inconvenience for the answer to the most important question in the project.", timeCritical: true },
      { text: "Cover only cases that pass through institution staff", detail: "Direct arrivals cost nothing and do not belong in the net calculation." },
      { text: "Record the result as the assumption behind workload relief" },
      { text: "Repeat around month nine", detail: "Two measurements give a trend. One gives a claim nobody can check." },
    ],
    fields: [],
    documents: [
      { id: "study-protocol", name: "Study protocol", why: "How minutes are counted, by whom, over which cases. Needed for the result to mean anything.", required: true },
      { id: "study-results", name: "Study results", why: "The measured figure that replaces the default assumption.", required: true },
    ],
    metrics: [
      {
        id: "relief", name: "Workload relief", headline: true,
        why: "The figure that pays. Institutions are not shopping for better care — they are shopping for a way to staff the rota.",
        compute: ({ t, a }) => {
          const net = a.minutesSaved - a.minutesSpent;
          const hours = (t.cases_resolved * net) / 60;
          const days = a.hoursPerClinicDay > 0 ? hours / a.hoursPerClinicDay : 0;
          return {
            value: t.cases_resolved ? `${n(Math.round(hours))} h` : null,
            detail: t.cases_resolved
              ? `About ${days.toFixed(1)} clinic days — ${(days / Math.max(t.months, 1)).toFixed(1)} per month`
              : "Requires resolved cases",
            missing: t.cases_resolved ? undefined : "Medalia export",
            assumption: a.studyDone
              ? `Net ${net} min per case (${a.minutesSaved} saved − ${a.minutesSpent} spent), from the time study.`
              : `ESTIMATE: ${a.minutesSaved} min per case with no measured cost against it. This is a gross figure until the time study has run — do not put it in a presentation before then.`,
            status: a.studyDone ? undefined : "fair",
          };
        },
      },
    ],
  },

  {
    id: "entry-routes",
    name: "Entry route attribution",
    question: "How do patients actually reach us, and is that changing?",
    claim: "Direct arrivals grew from X% to Y% — the service became self-sufficient and the load on staff fell with it.",
    category: "workload",
    effort: "low",
    sources: ["medalia"],
    rationale:
      "A patient who arrives directly costs the health centre zero minutes. That makes the entry mix a workload measure rather than a marketing one, and a rising direct share is the story itself: the service standing on its own. It also fixes the weighting for the time study, which should only cover cases that pass through staff.",
    caveat:
      "It tells you nothing about the people who never arrived. That is the denominator's job, not this module's.",
    protocol: [
      { text: "Give each route its own portal link", detail: "Direct, nurse, reception, records. No question for the patient, no recall bias, nothing anyone can forget — the route records itself. One change in code: the portal URL is hard-coded in six places.", timeCritical: true },
      { text: "Confirm with Medalia that the route reaches the export", detail: "Separate portal slugs or a query parameter, whichever they prefer." },
      { text: "Link the routes to each partner's service URL", link: { href: "/admin/stofnanir", label: "Partner institutions" } },
    ],
    fields: [
      { key: "entry_direct", label: "Direct", source: "medalia" },
      { key: "entry_nurse", label: "Via nurse", source: "medalia" },
      { key: "entry_reception", label: "Via reception", source: "medalia" },
      { key: "entry_records", label: "Via records staff", source: "medalia" },
      { key: "entry_other", label: "Other / unknown", source: "medalia" },
    ],
    documents: [],
    metrics: [
      {
        id: "direct_share", name: "Arrived directly", headline: true,
        why: "Zero minutes of institution time. A rising share is the service becoming self-sufficient.",
        compute: ({ t }) => ({
          value: p(pct(t.entry.direct, t.entry.total)),
          detail: `${n(t.entry.direct)} of ${n(t.entry.total)} arrivals`,
          missing: t.entry.total ? undefined : "Per-route portal links",
        }),
      },
    ],
  },

  {
    id: "economics",
    name: "Cost per resolved case",
    question: "What does this cost compared with what it replaces?",
    claim: "Cost per resolved case against the locum spend it displaces.",
    category: "workload",
    effort: "medium",
    sources: ["institution"],
    rationale:
      "Locum and temporary cover is the budget line we are actually competing with, and it is the line a procurement evaluator will look at first.",
    caveat:
      "Never present displacement as fact. Self-reported counterfactuals and cost avoidance are the first things a sceptical reader pulls apart — label them as estimates and they survive.",
    protocol: [
      { text: "Request locum spend, call volume and opening hours for the 12 months before", timeCritical: true },
      { text: "Agree monthly delivery of the same figures" },
      { text: "Present cost per case, not total savings" },
    ],
    fields: [
      { key: "locum_cost_isk", label: "Locum cost", unit: "isk", nullable: true, source: "institution" },
      { key: "institution_calls", label: "Calls to the institution", nullable: true, source: "institution" },
    ],
    documents: [
      { id: "finance-baseline", name: "Finance baseline", why: "Locum spend and call volume for the period before, from the institution.", required: true },
    ],
    metrics: [
      {
        id: "locum", name: "Locum cost", headline: true,
        why: "The budget line we are competing with.",
        compute: ({ t }) => ({
          value: t.locum_cost_isk === null ? null : `${n(Math.round(t.locum_cost_isk / 1000))}k ISK`,
          detail: "Requires the same figures for the preceding period to mean anything",
          missing: t.locum_cost_isk === null ? "Finance figures from the institution" : undefined,
        }),
      },
    ],
  },

  // ── Experience ────────────────────────────────────────────────────────────
  {
    id: "patient-survey",
    name: "Patient-reported experience",
    question: "Was this easy to use?",
    claim: "X% said the process was simple and Y% would use it again.",
    category: "experience",
    effort: "medium",
    sources: ["survey"],
    rationale:
      "Effort is a better-validated instrument than general satisfaction and it is more interesting to a buyer — nobody purchases on 'people found it fine'. Keep it to three questions; beyond that the response rate collapses and you have nothing.",
    caveat:
      "Response rates on post-consultation surveys are low and skew positive. Report the response rate next to the result, always.",
    protocol: [
      { text: "Freeze a three-question survey", detail: "Effort, would-use-again, and the counterfactual. More than three and the response rate collapses.", timeCritical: true, link: { href: "/admin/surveys", label: "Surveys" } },
      { text: "Send automatically at a fixed point after the case", detail: "The same point throughout, or the series is worthless." },
      { text: "Do not change the wording mid-period", detail: "Comparability between quarters is half the value." },
    ],
    fields: [
      { key: "survey_sent", label: "Surveys sent", source: "survey" },
      { key: "survey_responses", label: "Responses", source: "survey" },
      { key: "survey_easy_pct", label: "Said it was simple", unit: "percent", nullable: true, source: "survey" },
      { key: "survey_reuse_pct", label: "Would use again", unit: "percent", nullable: true, source: "survey" },
    ],
    documents: [
      { id: "instrument", name: "Survey instrument", why: "The exact wording, frozen. Changing it mid-period breaks the series.", required: true },
    ],
    metrics: [
      {
        id: "ease", name: "Said it was simple", headline: true,
        why: "Effort is better validated than satisfaction and more interesting to a buyer.",
        compute: ({ t }) => ({
          value: p(t.survey_easy_pct),
          detail: t.survey_responses
            ? `From ${n(t.survey_responses)} responses${t.survey_sent ? ` (${pct(t.survey_responses, t.survey_sent)}% response rate)` : ""}`
            : "No responses yet",
          missing: t.survey_easy_pct === null ? "Patient survey" : undefined,
          status: t.survey_easy_pct === null ? undefined : t.survey_easy_pct >= 85 ? "good" : t.survey_easy_pct >= 70 ? "fair" : "poor",
        }),
      },
      {
        id: "reuse", name: "Would use again",
        why: "The simplest trust measure, and the one that always ends up in the slides.",
        compute: ({ t }) => ({ value: p(t.survey_reuse_pct), detail: "Of those who responded", missing: t.survey_reuse_pct === null ? "Patient survey" : undefined }),
      },
    ],
  },

  {
    id: "access-gain",
    name: "Access gain and counterfactual",
    question: "Did this reach people who would otherwise have gone without?",
    claim: "Y% said they would otherwise have left the problem alone — and the wait they actually experienced fell from days to hours.",
    category: "experience",
    effort: "low",
    requires: ["patient-survey"],
    sources: ["survey"],
    rationale:
      "Two things that cost one extra question each and that almost nobody measures. 'Where would you have gone otherwise?' is the cheapest possible route to the displacement figure, and institutions understand displacement. Make 'nowhere — I would have left it' a fixed option: those answers are pure access gain and the strongest argument the patient side has. Second, the time the patient actually experienced runs from their first attempt to get help, not from submission — it includes the phone queue and the days until an appointment, and that is where the real gain sits, not in our two hours.",
    caveat:
      "Self-reported counterfactuals are what people say they would have done, not what they would have done. Label them as such every time and they hold up; present them as fact and they are the first thing torn down.",
    protocol: [
      { text: "Add 'Where would you otherwise have gone?' with a fixed 'nowhere' option", detail: "Worthless if it arrives halfway through the period — put it in before counting starts.", timeCritical: true },
      { text: "Add 'When did you first try to get help with this?'" },
      { text: "Label every counterfactual figure as self-reported, in the report template" },
    ],
    fields: [
      { key: "survey_would_not_have_sought_pct", label: "Would otherwise have gone nowhere", unit: "percent", nullable: true, source: "survey" },
      { key: "time_to_resolution_median_h", label: "Time to resolution", help: "From the patient's first attempt to get help.", unit: "hours", nullable: true, source: "survey" },
      { key: "trips_avoided", label: "Trips avoided", nullable: true, source: "survey" },
    ],
    documents: [],
    metrics: [
      {
        id: "access", name: "Would otherwise have gone nowhere", headline: true,
        why: "Pure access gain, and the strongest argument on the patient side. Must be a fixed option, never free text.",
        compute: ({ t }) => ({
          value: p(t.survey_would_not_have_sought_pct),
          detail: "Self-reported — label it as such wherever it appears",
          missing: t.survey_would_not_have_sought_pct === null ? "Survey question" : undefined,
        }),
      },
      {
        id: "total_wait", name: "Time to resolution",
        why: "What the patient actually experienced, including the phone queue. Much larger than our response time and where the real gain sits.",
        compute: ({ t }) => ({
          value: t.time_to_resolution_median_h === null ? null : `${t.time_to_resolution_median_h} h`,
          detail: "From the patient's first attempt to get help",
          missing: t.time_to_resolution_median_h === null ? "Survey question" : undefined,
        }),
      },
      {
        id: "trips", name: "Trips avoided",
        why: "In an island community this is a concrete number that stays in people's heads.",
        compute: ({ t }) => ({
          value: t.trips_avoided === null ? null : n(t.trips_avoided),
          detail: "Self-reported",
          missing: t.trips_avoided === null ? "Survey question" : undefined,
        }),
      },
    ],
  },

  // ── Scalability ───────────────────────────────────────────────────────────
  {
    id: "staffing",
    name: "Service coverage",
    question: "Can we actually staff this, month after month?",
    claim: "The service was covered N% of opening hours across twelve months, with M doctors.",
    category: "scalability",
    effort: "low",
    sources: ["internal"],
    rationale:
      "A service nobody will staff does not transfer to the next site, however good the patient numbers are. This is what the next institution is really buying, and it comes free — the rota already holds it, so nothing has to be typed in.",
    caveat:
      "Staffing is service-wide, not per station: the same doctor covers every site, so these figures do not change when a station is selected. Say so on the page or somebody will read a station tab and believe otherwise.",
    protocol: [
      { text: "Keep the rota current — the figures come from it automatically", link: { href: "/admin/roster", label: "Rota" } },
      { text: "Record when a doctor leaves", detail: "The rota holds no leaving date, so turnover is the one figure here that is entered by hand." },
    ],
    fields: [
      { key: "doctors_left", label: "Doctors who left", source: "internal" },
      { key: "uptime_pct", label: "Uptime", unit: "percent", nullable: true, source: "internal" },
    ],
    documents: [],
    metrics: [
      {
        id: "coverage", name: "Shifts covered", headline: true,
        why: "What the next institution is really buying. Service-wide, not per station.",
        compute: ({ roster }) => ({
          value: roster.shifts ? p(pct(roster.covered, roster.shifts)) : null,
          detail: roster.shifts
            ? `${n(roster.covered)} of ${n(roster.shifts)} shifts · ${roster.doctors} doctors took a shift`
            : "No shifts in the period",
          missing: roster.shifts ? undefined : "Shifts recorded in the Rota",
          status: !roster.shifts ? undefined : pct(roster.covered, roster.shifts)! >= 98 ? "good" : pct(roster.covered, roster.shifts)! >= 90 ? "fair" : "poor",
        }),
      },
      {
        id: "turnover", name: "Doctor turnover",
        why: "A hard measure of transferability, not a soft one.",
        compute: ({ t, roster }) => ({
          value: roster.activeDoctors ? p(pct(t.doctors_left, roster.activeDoctors)) : null,
          detail: `${n(t.doctors_left)} left of ${n(roster.activeDoctors)} on the books`,
        }),
      },
      {
        id: "swaps", name: "Shift swaps",
        why: "Coverage that is only achieved through constant swapping is not coverage that moves to the next site.",
        compute: ({ roster }) => ({
          value: roster.shifts ? p(pct(roster.swaps, roster.shifts)) : null,
          detail: `${n(roster.swaps)} swaps across ${n(roster.shifts)} shifts`,
          status: !roster.shifts ? undefined : pct(roster.swaps, roster.shifts)! <= 10 ? "good" : "fair",
        }),
      },
    ],
  },

  {
    id: "self-sufficiency",
    name: "Site self-sufficiency",
    question: "Did the site stop needing us?",
    claim: "Support questions fell from N a week to M — the site became self-sufficient in under a quarter.",
    category: "scalability",
    effort: "low",
    sources: ["internal"],
    rationale:
      "A falling support load over the year is a direct measure that the site learned to run the service without us. That is precisely the story the next institution wants to hear, and unlike coverage it is genuinely per-station.",
    caveat:
      "A low number can also mean nobody is using the service. Read it next to case volume.",
    protocol: [
      { text: "Count questions from the site to us each month", link: { href: "/admin/vinnustod", label: "Workstation inbox" } },
      { text: "Note what the recurring ones are about — they are the gaps in the handover material" },
    ],
    fields: [{ key: "support_questions", label: "Support questions from the site", source: "internal" }],
    documents: [],
    metrics: [
      {
        id: "support", name: "Support questions", headline: true,
        why: "A falling curve is the clearest evidence of transferability there is.",
        compute: ({ t }) => ({
          value: n(t.support_questions),
          detail: `Across ${t.months} ${t.months === 1 ? "month" : "months"} — the trend is what matters, not the level`,
        }),
      },
    ],
  },

  {
    id: "staff-experience",
    name: "Institution staff acceptance",
    question: "Do the people at the site want to keep it?",
    claim: "Staff would not want the service withdrawn, and here is why in their own words.",
    category: "scalability",
    effort: "medium",
    sources: ["survey"],
    rationale:
      "Survey nurses and doctors separately. The doctors matter more than they appear to: a doctor at the next institution does not ask management how it went — they ask the doctor on site. Note also that convenience and workload are not the same thing. Having an answer instead of saying 'I don't know', not being the one who turns someone away empty-handed — that is real relief and it keeps people in post, but it does not show up in minutes. A service can improve convenience and increase workload at the same time, and staff will still want it. That is a good outcome, but it must not be sold as workload relief.",
    caveat:
      "Small numbers of respondents at a single site. Treat it as testimony, not statistics.",
    protocol: [
      { text: "Survey nurses and doctors separately, with different questions", timeCritical: true },
      { text: "Include: 'If this were taken away tomorrow, what would change?'", detail: "The answers to this are what you read out at a meeting with the next institution." },
      { text: "Involve one of the institution's doctors in reviewing the safety figures", detail: "Whoever helped look at the data defends it later." },
    ],
    fields: [
      { key: "staff_nurses_positive_pct", label: "Nurses positive", unit: "percent", nullable: true, source: "survey" },
      { key: "staff_doctors_positive_pct", label: "Institution doctors positive", unit: "percent", nullable: true, source: "survey" },
    ],
    documents: [
      { id: "staff-survey", name: "Staff survey", why: "Separate instruments for nurses and doctors.", required: true },
    ],
    metrics: [
      {
        id: "nurses", name: "Nurses positive", headline: true,
        why: "The people who carry the routing work day to day.",
        compute: ({ t }) => ({
          value: p(t.staff_nurses_positive_pct),
          detail: "Convenience and workload are different things — this measures the first",
          missing: t.staff_nurses_positive_pct === null ? "Staff survey" : undefined,
        }),
      },
      {
        id: "doctors", name: "Institution doctors positive",
        why: "They matter more than they appear to: a doctor at the next site asks the doctor here, not management.",
        compute: ({ t }) => ({
          value: p(t.staff_doctors_positive_pct),
          detail: "Surveyed separately from nurses, with different questions",
          missing: t.staff_doctors_positive_pct === null ? "Staff survey" : undefined,
        }),
      },
    ],
  },
];

export const MODULE_BY_ID = new Map(MODULES.map((m) => [m.id, m]));
export const CORE_MODULE_IDS = MODULES.filter((m) => m.core).map((m) => m.id);
