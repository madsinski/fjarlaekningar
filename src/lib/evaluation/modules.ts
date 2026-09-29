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
import { EXTRA_MODULES } from "./modules-extra";
import { DESIGN_MODULE } from "./design";
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
    category: "system",
    lead: true,
    core: true,
    effort: "low",
    sources: ["medalia"],
    benefit:
      "Tells you, case type by case type, whether the service does what it claims.",
    horizon: "now",
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
        id: "referral_mix", name: "Sent on to someone else",
        why: "Referring is not failure — it is the service knowing where its limits are. Read it next to how many were turned away, because only that part is a safety signal.",
        compute: ({ t }) => ({
          value: n(t.cases_referred),
          detail: `${n(Math.max(0, t.cases_referred - t.excluded_by_doctor))} passed on to someone who could help, ${n(t.excluded_by_doctor)} turned away as unsuitable`,
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
    name: "Patient waiting time",
    question: "How long do patients wait for an answer — and do we keep the two-hour promise?",
    claim: "Median response was T minutes and 95% were answered within P — against a promise of two hours.",
    category: "system",
    core: true,
    effort: "low",
    sources: ["medalia"],
    benefit:
      "Turns the two-hour promise into a number you can put on a slide.",
    horizon: "now",
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
    lead: true,
    core: true,
    effort: "low",
    sources: ["survey"],
    benefit:
      "Lets you say 'no serious incidents' and be believed.",
    horizon: "now",
    rationale:
      "A gate rather than a scale: an excellent resolution rate alongside one serious incident is a failed project, and no good number elsewhere offsets it. Note that zero is only believable if it is visible that somebody was counting — which is why deviations and near misses sit beside it rather than hidden.",
    caveat:
      "A single site of four thousand people will never have the numbers to say anything about rare events. Say that yourself, on the first slide, before someone in the audience says it for you.",
    protocol: [
      { text: "Put a deviation form into service", detail: "One form is enough. But 'no serious incidents' is only credible if a system existed that would have caught one.", timeCritical: true },
      { text: "Agree with HSU what counts as an incident, and how it is recorded", detail: "One written definition both organisations use, so an incident at the health centre and one in the remote service are counted the same way.", timeCritical: true },
      { text: "Give patients and HSU staff a way to report an incident", detail: "A route for each — a patient should not have to go through the service they are reporting, and HSU staff need one that does not depend on us.", timeCritical: true },
      { text: "Agree who reviews deviations and how often" },
      { text: "Agree the escalation route with the institution's clinical lead" },
    ],
    fields: [
      { key: "deviations", label: "Deviations logged", source: "survey" },
      { key: "near_misses", label: "of which near misses", source: "survey" },
      { key: "serious_incidents", label: "Serious incidents", source: "survey" },
    ],
    documents: [
      { id: "incident-procedure", name: "Incident procedure", why: "What counts as an incident, how patients and HSU staff report one, who reviews it, how it is escalated and closed.", required: true },
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
    category: "system",
    effort: "medium",
    sources: ["medalia"],
    benefit:
      "Makes your numbers comparable with national primary care instead of self-referential.",
    horizon: "now",
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
    category: "system",
    effort: "low",
    sources: ["medalia"],
    benefit:
      "Tells you which case types to build next, from evidence rather than hunch.",
    horizon: "now",
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
    category: "system",
    effort: "low",
    sources: ["internal"],
    benefit:
      "Catches a miscount before it reaches a report.",
    // Checks whether our own numbers are right rather than measuring the
    // service, so it stays off the outcome dashboard like the study design.
    meta: true,
    horizon: "now",
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
    question: "How many are turned away, at which gate, and for what?",
    claim: "N patients were excluded on a red flag — M by the questionnaire and K by a clinician — and here is the reason for every one.",
    category: "safety",
    benefit:
      "Answers 'who decides the patient is suitable?' with evidence, and shows exactly what is getting past the form.",
    horizon: "now",
    effort: "medium",
    sources: ["medalia"],
    rationale:
      "This question is asked hard at any clinical meeting, because patients arrive by four routes and two of them — reception and records staff — are not clinical. You cannot answer 'an experienced nurse judged it', because that is not true for most arrivals. You do not need to: a systematic screen applied identically every time beats human judgement that varies by shift. But that answer stands or falls on being able to show the stop rate. Two gates matter and they say different things. The questionnaire is cheap and consistent. A clinician turning someone away is expensive — the patient has already waited — and each one is arguably a case the form should have caught. The split, and the reason behind each, is the most actionable safety output in the whole programme.",
    caveat:
      "Only counts those who entered. Anyone a nurse or receptionist turned away before they reached the portal is invisible here and always will be — four entry routes and nobody counts the door. And a low total can mean the scope is well communicated upstream or that nobody is checking; the reason breakdown is what distinguishes them.",
    protocol: [
      {
        text: "Confirm Medalia records stopped questionnaires at all, and that they reach the export",
        detail:
          "The most urgent question to put to Medalia. If stops are not recorded, this is the fix that has to happen before counting starts — it cannot be reconstructed later.",
        timeCritical: true,
      },
      {
        text: "Separate turning away from referring onward in the clinician's outcome field",
        detail:
          "A patient who needs a dermatologist is the service working correctly. A patient who was pregnant, under 18 or acutely unwell should not have been here. Recorded as one figure, the safety signal disappears into the referral count.",
        timeCritical: true,
      },
      {
        text: "Use the fixed reason list at both gates",
        detail:
          "Eleven categories, taken from the service's own triage rules so they match the clinical logic. Free text here means reading a thousand records at the end of the period.",
        timeCritical: true,
      },
      {
        text: "Review the leaks every month",
        detail:
          "A reason the form was meant to catch but a clinician caught instead is a gap in the questionnaire logic. That monthly list is the entire value of this module — fix the form and the next month's leak list is shorter.",
      },
    ],
    fields: [
      { key: "screening_stops", label: "Stopped by questionnaire", source: "medalia" },
      { key: "excluded_by_doctor", label: "Turned away by a doctor", help: "Unsuitable on a red flag — not referred onward as normal care.", source: "medalia" },
    ],
    documents: [
      { id: "screen-spec", name: "Screening logic", why: "Which red flags stop a patient and why. This is the document that answers 'who decides they are suitable?'", required: true },
    ],
    metrics: [
      {
        id: "excluded_total", name: "Turned away on a red flag", headline: true,
        why: "The combined catch across both gates. Without the split below it is just a number; with it, it is evidence the screen works.",
        compute: ({ t }) => {
          const entered = t.cases_total + t.screening_stops;
          const total = t.screening_stops + t.excluded_by_doctor;
          return {
            value: entered ? `${n(total)}` : null,
            detail: entered
              ? `${p(pct(total, entered))} of ${n(entered)} who entered — ${n(t.screening_stops)} by the form, ${n(t.excluded_by_doctor)} by a doctor`
              : "Needs entries and exclusions in the export",
            missing: entered ? undefined : "Stopped forms and doctor exclusions in the export",
          };
        },
      },
      {
        id: "stop_rate", name: "Caught by the questionnaire",
        why: "The only evidence the safety net works. Without it, 'the questionnaire screens them' is an assertion.",
        compute: ({ t }) => ({
          value: p(pct(t.screening_stops, t.cases_total + t.screening_stops)),
          detail: `${n(t.screening_stops)} stopped before reaching a clinician — systematic, identical every time`,
          missing: t.screening_stops || t.cases_total ? undefined : "Stopped forms in the export",
        }),
      },
      {
        id: "clinician_rate", name: "Caught by a doctor instead",
        why: "Expensive — the patient has already waited — and every one is arguably a case the form should have caught. Rising share means tighten the form.",
        compute: ({ t }) => {
          const total = t.screening_stops + t.excluded_by_doctor;
          return {
            value: total ? p(pct(t.excluded_by_doctor, total)) : null,
            detail: total ? `${n(t.excluded_by_doctor)} of ${n(total)} exclusions reached a clinician first` : "No exclusions recorded",
            status: !total ? undefined : pct(t.excluded_by_doctor, total)! <= 25 ? "good" : "fair",
          };
        },
      },
      {
        id: "leaks", name: "Gaps in the form",
        why: "Reasons the questionnaire was meant to catch but a clinician did. This monthly list is the entire point of the module — each entry is a fix.",
        compute: ({ t }) => ({
          value: t.exclusions.leaks.length ? n(t.exclusions.leaks.reduce((a, l) => a + l.count, 0)) : t.exclusions.total ? "0" : null,
          detail: t.exclusions.leaks.length
            ? t.exclusions.leaks.slice(0, 3).map((l) => `${l.reason.name} (${l.count})`).join(", ")
            : t.exclusions.total
            ? "Nothing the form should have caught got past it"
            : "Needs the reasons file",
          missing: t.exclusions.total ? undefined : "Exclusion reasons file",
          status: !t.exclusions.total ? undefined : t.exclusions.leaks.length ? "fair" : "good",
        }),
      },
      {
        id: "clinical_referral", name: "Referred onward as normal care",
        why: "The rest of the referrals — the service working correctly. Kept apart so it does not inflate the safety figures.",
        compute: ({ t }) => ({
          value: n(Math.max(0, t.cases_referred - t.excluded_by_doctor)),
          detail: `Of ${n(t.cases_referred)} referrals, ${n(t.excluded_by_doctor)} were exclusions rather than onward care`,
        }),
      },
      {
        id: "urgent", name: "Acute cases that got past the form",
        why: "The sharpest safety signal we have: someone acutely unwell answered the questionnaire, it let them through, and a doctor had to catch it. Comes from the reasons file rather than the monthly export, which is better — it is coded as a reason rather than a bare flag.",
        compute: ({ t }) => {
          const acute = t.exclusions.byReason.find((r) => r.reason.id === "acute");
          return {
            value: acute ? n(acute.clinician) : t.exclusions.total ? "0" : null,
            detail: acute
              ? `${n(acute.form)} stopped by the form, ${n(acute.clinician)} reached a doctor first`
              : t.exclusions.total
              ? "No acute cases got past the questionnaire"
              : "Comes from the exclusion reasons file",
            missing: t.exclusions.total ? undefined : "Exclusion reasons file",
            status: !t.exclusions.total ? undefined : acute?.clinician ? "fair" : "good",
          };
        },
      },
    ],
  },

  {
    id: "stewardship",
    name: "Prescribing and antibiotic use",
    question: "Is antibiotic prescribing comparable to the traditional service?",
    claim: "Antibiotics were prescribed in X% of cases, against Y% at HSU for the same diagnosis codes.",
    category: "safety",
    effort: "medium",
    requires: ["code-volume"],
    sources: ["medalia", "institution"],
    benefit:
      "Answers the prescription-pipeline objection with HSU's own figures as the comparator.",
    horizon: "now",
    rationale:
      "The first attack on any remote service will always be that it is a prescription pipeline wearing a white coat. The advisor's answer is a baseline from the traditional service: how often HSU prescribes antibiotics for the same diagnosis codes. If the remote rate stands up against that, the discussion is finished before it starts.",
    caveat:
      "The comparison only holds for like-for-like cases, so it is made within the agreed code set and broken down by case type where the numbers allow. Agree the comparator before seeing our own numbers, not after.",
    protocol: [
      { text: "Record prescriptions and antibiotics as coded fields per case in Medalia", timeCritical: true },
      { text: "Ask for antibiotic prescribing in the same codes in the Saga export", detail: "The same code-days as the diagnosis-code count, with the number where an antibiotic was prescribed. Baseline and pilot months alike." },
      { text: "Break the rate down by case type, not just overall" },
    ],
    fields: [
      { key: "prescriptions", label: "Cases with a prescription", source: "medalia" },
      { key: "antibiotics", label: "of which antibiotics", source: "medalia" },
      { key: "institution_antibiotics", label: "HSU code-days with an antibiotic (Saga)", help: "In the agreed code set, same counting rule as the diagnosis codes.", nullable: true, source: "institution" },
    ],
    documents: [
      { id: "comparator", name: "Comparator definition", why: "How the HSU comparison figure is drawn from Saga, agreed before our own numbers were known.", required: true },
    ],
    metrics: [
      {
        id: "abx", name: "Antibiotic rate", headline: true,
        why: "The predictable attack, answered with HSU's own figures.",
        compute: ({ t }) => {
          const hsu = t.institution_antibiotics !== null && t.institution_contacts ? pct(t.institution_antibiotics, t.institution_contacts) : null;
          const ours = pct(t.antibiotics, t.cases_resolved);
          return {
            value: p(ours),
            detail: `${n(t.antibiotics)} of ${n(t.cases_resolved)} resolved cases${hsu !== null ? ` · HSU ${hsu}% in the same codes` : ""}`,
            missing: t.cases_resolved ? undefined : "Medalia export",
            status: ours === null || hsu === null ? undefined : ours <= hsu ? "good" : ours <= hsu + 5 ? "fair" : "poor",
          };
        },
      },
      {
        id: "rx", name: "Any prescription",
        why: "Wider than antibiotics.",
        compute: ({ t }) => ({
          value: p(pct(t.prescriptions, t.cases_resolved)),
          detail: `${n(t.prescriptions)} of ${n(t.cases_resolved)} resolved cases`,
        }),
      },
    ],
  },

  {
    id: "adverse-reactions",
    name: "Serious adverse drug reactions",
    question: "Did anyone have a serious reaction or allergy to a medicine we prescribed?",
    claim: "N serious adverse reactions or allergies among M patients given a prescription, each one reviewed.",
    category: "safety",
    effort: "low",
    requires: ["patient-survey"],
    sources: ["survey"],
    benefit:
      "Shows prescribing without an examination is not causing harm.",
    horizon: "now",
    rationale:
      "Prescribing remotely means prescribing without examining, so the advisor asks directly about harm from the medicine itself. The day-7 survey catches what the patient noticed; the incident route catches what HSU staff saw. Each case is reviewed as an incident, so the count and the review happen together.",
    caveat:
      "Rare events at a single site. Zero is the expected answer and says little on its own — what makes it credible is that both the survey question and the reporting route existed and were used.",
    protocol: [
      { text: "Ask in the day-7 survey about serious reactions or allergy to a prescribed medicine", timeCritical: true },
      { text: "Route every reported reaction through the incident procedure", detail: "Reviewed by a doctor, recorded with the medicine and the outcome." },
    ],
    fields: [
      { key: "adverse_drug_reactions", label: "Serious adverse reactions or allergy", help: "From the day-7 survey and incident reports, counted once per patient.", nullable: true, source: "survey" },
    ],
    documents: [],
    metrics: [
      {
        id: "adr", name: "Serious drug reactions", headline: true,
        why: "Harm from the treatment itself — the direct safety question about remote prescribing.",
        compute: ({ t }) => ({
          value: t.adverse_drug_reactions === null ? null : n(t.adverse_drug_reactions),
          detail: `Among ${n(t.prescriptions)} cases with a prescription`,
          missing: t.adverse_drug_reactions === null ? "Day-7 survey and incident reports" : undefined,
          status: t.adverse_drug_reactions === null ? undefined : t.adverse_drug_reactions === 0 ? "good" : "poor",
        }),
      },
    ],
  },

  {
    id: "decision-tree",
    name: "Decision-tree agreement",
    question: "Does the doctor confirm the decision tree's outcome, or change it?",
    claim: "Doctors confirmed the decision tree's outcome in X% of cases, and every change fed back into the clinical protocol.",
    category: "safety",
    effort: "low",
    sources: ["medalia"],
    benefit:
      "Shows how far the decision trees can be trusted, and where they need changing.",
    horizon: "now",
    rationale:
      "Each case type runs through a decision tree before a doctor sees it. Recording whether the doctor confirms its outcome or changes it is almost free, and it is the most direct check on the algorithm itself. A tree the doctors keep overriding for the same reason is a tree to fix — and the fix goes through the clinical change log, so the evidence and the change sit together.",
    caveat:
      "A high agreement rate can also mean doctors accept the suggestion without looking hard. Read it next to the 7-day returns and the incident log, which catch the cases where agreeing was wrong.",
    protocol: [
      { text: "Make 'confirmed / changed' a coded field on every case in Medalia", timeCritical: true },
      { text: "Record a reason category when the doctor changes the outcome" },
      { text: "Review the changes monthly and record any tree change in the clinical log", link: { href: "/admin/clinical", label: "Clinical protocols" } },
    ],
    fields: [
      { key: "tree_cases", label: "Cases with a decision-tree outcome", nullable: true, source: "medalia" },
      { key: "tree_overridden", label: "of which the doctor changed it", nullable: true, source: "medalia" },
    ],
    documents: [],
    metrics: [
      {
        id: "tree_agree", name: "Doctor confirmed the tree", headline: true,
        why: "The direct check on the algorithm. Falling agreement on one case type is a tree to fix.",
        compute: ({ t }) => ({
          value: t.tree_cases ? p(pct(t.tree_cases - (t.tree_overridden ?? 0), t.tree_cases)) : null,
          detail: t.tree_cases ? `${n(t.tree_overridden ?? 0)} of ${n(t.tree_cases)} changed by the doctor` : "Needs the confirmed/changed field in Medalia",
          missing: t.tree_cases ? undefined : "Confirmed/changed field in the export",
          status: !t.tree_cases ? undefined : pct(t.tree_cases - (t.tree_overridden ?? 0), t.tree_cases)! >= 90 ? "good" : "fair",
        }),
      },
    ],
  },

  {
    id: "revisits",
    name: "Sought care again within 7 days",
    question: "Did the patient have to seek health care again for the same problem?",
    claim: "X% said they sought other care within 7 days, and the review of HSU's records found N returns for the same problem.",
    category: "safety",
    effort: "high",
    sources: ["survey", "institution"],
    benefit:
      "Shows the problems stayed solved, not merely closed — asked of the patient and checked in HSU's records.",
    horizon: "now",
    rationale:
      "The best safety measure there is for a service like this: it catches the cases that looked resolved and were not. The advisor asks it two ways, and they check each other. A: the day-7 survey asks whether the patient had to go to the emergency department, a hospital or the health centre. B: hard numbers — HSU finds the patients who had a contact in Saga within 7 days of a Fjarlækningar case and reviews those records by hand, expected to be 50–100 people. The survey is cheap and covers everyone who answers; the review is small and certain.",
    caveat:
      "Only contacts at HSU are visible in Saga — a patient who went to Landspítali or a private clinic appears only in the survey. The survey in turn only hears from those who answer. Report both, side by side, and say which is which.",
    protocol: [
      { text: "Put the 7-day question in the day-7 survey", detail: "Emergency department, hospital or health centre — fixed options, plus 'no'.", timeCritical: true },
      {
        text: "Agree that HSU runs the linkage and the review on its own side",
        detail: "HSU matches the Fjarlækningar case list against contacts in Saga within 7 days and reviews the records by hand. Only the counts come back. No identifiable linkage leaves HSU, and the project stays quality assurance. How HSU receives the case list is part of the data agreement.",
        timeCritical: true,
      },
      { text: "Agree the definition before the review: same patient, same problem, within 7 days of the case", detail: "Decided before anyone looks at a record." },
      { text: "Run the review at 6 and 12 months" },
    ],
    fields: [
      { key: "survey_sought_care_7d_pct", label: "Sought other care within 7 days (survey)", unit: "percent", nullable: true, source: "survey" },
      { key: "revisits_7d", label: "Patients with an HSU contact within 7 days (Saga)", nullable: true, source: "institution" },
      { key: "revisits_related", label: "of which about the same problem (manual review)", nullable: true, source: "institution" },
    ],
    documents: [
      { id: "data-agreement", name: "Data-sharing agreement", why: "The written arrangement under which HSU runs the linkage and review and shares the counts. Without it this module cannot run lawfully as quality assurance.", required: true },
    ],
    metrics: [
      {
        id: "revisit_rate", name: "Returned for the same problem", headline: true,
        why: "The hard number, from HSU's own records. The one a clinical audience will ask for first.",
        compute: ({ t }) => ({
          value: t.revisits_related === null ? null : p(pct(t.revisits_related, t.cases_resolved)),
          detail: t.revisits_related === null
            ? "HSU reviews the records and shares the count only"
            : `${n(t.revisits_related)} of ${n(t.cases_resolved)} resolved cases${t.revisits_7d !== null ? ` · ${n(t.revisits_7d)} had any HSU contact within 7 days` : ""}`,
          missing: t.revisits_related === null ? "Review at HSU" : undefined,
          status: t.revisits_related === null || !t.cases_resolved ? undefined : pct(t.revisits_related, t.cases_resolved)! <= 5 ? "good" : pct(t.revisits_related, t.cases_resolved)! <= 10 ? "fair" : "poor",
        }),
      },
      {
        id: "sought_7d", name: "Said they sought care again",
        why: "The patient's side of the same question, including care outside HSU that Saga cannot see.",
        compute: ({ t }) => ({
          value: p(t.survey_sought_care_7d_pct),
          detail: t.survey_7d_responses ? `Of ${n(t.survey_7d_responses)} day-7 responses` : "Asked in the day-7 survey",
          missing: t.survey_sought_care_7d_pct === null ? "Day-7 survey" : undefined,
        }),
      },
    ],
  },

  // ── Workload ──────────────────────────────────────────────────────────────
  {
    id: "code-volume",
    name: "Diagnosis codes at HSU",
    question: "Do fewer of these problems reach HSU than its own trend predicts?",
    claim: "HSU recorded N diagnosis codes a month in these problems during the pilot, against M expected from its own three-year trend.",
    category: "system",
    effort: "high",
    requires: ["case-mix"],
    sources: ["institution", "medalia"],
    benefit:
      "The hard-number test of whether the service takes work off HSU, from HSU's own records.",
    horizon: "now",
    rationale:
      "The advisor's main health-system measure. Count the diagnosis codes in the agreed code set in Saga for the three years before go-live, then for the first year alongside the cases in Medalia. If the service is taking the work, HSU's count should fall below where its own trend was heading. Three years of baseline answers the question of how growth between years is judged: the trend is taken from the baseline itself, so the pilot is compared with where HSU was already heading rather than with a flat line. The data are HSU's own, from their own system, which is why nobody argues with them.",
    caveat:
      "A fall is consistent with the service taking the work, but it is not proof on its own: staffing changes at HSU, an epidemic season or a change in coding habits can all move the count. Uptake also depends on people knowing the service exists, so read it next to case volume. A station that is not live yet, counted the same way, is the control that rules most of this out.",
    protocol: [
      { text: "Agree the code set with the medical advisor", detail: "The case-mix module holds it. It is the join key between Saga and Medalia — without it there is nothing to count.", timeCritical: true },
      {
        text: "Request 36 months of baseline from Saga, month by month, per station",
        detail: "Each diagnosis code in the set counted once per patient per day. The date is needed to apply that rule and to see several codes inside one visit — HSU applies it in Saga and sends monthly counts, so no dates or ID numbers leave HSU. Monthly, never an annual total: a total cannot be un-aggregated and the trend needs the months.",
        timeCritical: true,
      },
      { text: "Get the same count for every pilot month, with the same rule" },
      { text: "Enter the baseline months as well as the pilot months", detail: "They are the comparison. A pre-go-live month carries the HSU count and nothing else." },
      { text: "Decide how awareness of the service is followed", detail: "The advisor notes that it matters whether people know about the service. At minimum, read the count next to case volume and any publicity dates." },
    ],
    fields: [
      { key: "institution_contacts", label: "HSU diagnosis codes in the agreed set (Saga)", help: "Each code counted once per patient per day. Enter the baseline months too.", nullable: true, source: "institution" },
    ],
    documents: [
      { id: "baseline", name: "Saga baseline request", why: "36 months of monthly counts in the agreed codes, per station, with the counting rule written in. Time-critical — this gets harder to obtain every month.", required: true },
    ],
    metrics: [
      {
        id: "vs_trend", name: "HSU codes against trend", headline: true,
        why: "The hard-number answer to whether the service takes work off the health centre.",
        compute: ({ codes }) => {
          const c = codes;
          if (!c || c.pilotPerMonth === null || c.expectedPerMonth === null) {
            return {
              value: null,
              detail: !c || !c.baselineMonths ? "Needs the Saga baseline" : "Needs HSU counts for the pilot months",
              missing: !c || !c.baselineMonths ? "Saga baseline" : "Saga counts after go-live",
            };
          }
          const change = c.expectedPerMonth ? Math.round(((c.pilotPerMonth - c.expectedPerMonth) / c.expectedPerMonth) * 100) : 0;
          return {
            value: `${change > 0 ? "+" : ""}${change}%`,
            detail: `${n(c.pilotPerMonth)} a month over ${c.pilotMonths} pilot months, against ${n(c.expectedPerMonth)} expected`,
            status: change <= -5 ? "good" : change <= 5 ? "fair" : "poor",
            assumption: `Expected = the last baseline year's monthly average${c.trendPerYear !== null ? `, grown by the baseline's average year-on-year change (${Math.round(c.trendPerYear * 100)}%)` : ""}. Uncontrolled single-site comparison until a pre-live station is counted the same way.`,
          };
        },
      },
      {
        id: "baseline_years", name: "Baseline by year",
        why: "How the count was already moving before the service started — the answer to how growth between years is judged.",
        compute: ({ codes }) => ({
          value: codes?.baselinePerMonth != null ? `${n(codes.baselinePerMonth)}/mo` : null,
          detail: codes?.baselineYears.length
            ? `Yearly totals, oldest first: ${codes.baselineYears.map(n).join(" → ")}`
            : `${codes?.baselineMonths ?? 0} baseline months entered — a trend needs at least two full years`,
          missing: codes?.baselineMonths ? undefined : "Saga baseline",
        }),
      },
      {
        id: "share", name: "Share handled remotely",
        why: "Of all the cases in these codes during the pilot, the part we took.",
        compute: ({ codes }) => {
          const c = codes;
          const flow = c && c.pilotPerMonth !== null && c.remotePerMonth !== null ? c.pilotPerMonth + c.remotePerMonth : null;
          return {
            value: flow ? p(pct(c!.remotePerMonth!, flow)) : null,
            detail: flow ? `${n(c!.remotePerMonth!)} of ${n(Math.round(flow * 10) / 10)} a month` : "Needs Saga counts and our case volume for the same months",
            missing: flow ? undefined : "Saga counts after go-live",
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
    category: "system",
    effort: "high",
    sources: ["study", "derived"],
    benefit:
      "Tells you whether you are removing work or just moving it — while you can still fix it.",
    horizon: "now",
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
    category: "system",
    effort: "low",
    sources: ["medalia"],
    benefit:
      "Shows the service standing on its own as direct arrivals grow.",
    horizon: "now",
    rationale:
      "A patient who arrives directly costs the health centre zero minutes. That makes the entry mix a workload measure rather than a marketing one, and a rising direct share is the story itself: the service standing on its own. It also fixes the weighting for the time study, which should only cover cases that pass through staff.",
    caveat:
      "It tells you nothing about the people who never arrived. That is the denominator's job, not this module's.",
    protocol: [
      { text: "Give each route its own portal link", detail: "At minimum one link people use themselves and one the health centre hands out. No question for the patient, nothing anyone has to remember — the route records itself. One change in code: the portal URL is hard-coded in six places.", timeCritical: true },
      { text: "Confirm with Medalia that the route reaches the export", detail: "Separate portal slugs or a query parameter, whichever they prefer." },
      { text: "Link the routes to each partner's service URL", link: { href: "/admin/stofnanir", label: "Partner institutions" } },
    ],
    fields: [
      { key: "entry_direct", label: "Came directly", source: "medalia" },
      { key: "entry_via_staff", label: "Sent by health centre staff", help: "Nurse, reception or records — the export cannot separate them.", source: "medalia" },
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
    name: "Locum spend it competes with",
    question: "What is the health centre currently paying to cover this work?",
    claim: "Locum and temporary cover spend before and after, against the cases we took off them.",
    category: "system",
    effort: "medium",
    sources: ["institution"],
    benefit:
      "Puts a cost per case against the locum spend it displaces.",
    horizon: "later",
    rationale:
      "Locum and temporary cover is the budget line we are actually competing with, and the one a buyer looks at first. Note what this does NOT do: it cannot give a cost per case, because that needs our own cost per case as well and we do not collect it here. Put the two side by side and let the reader do the division — a cost-per-case figure we produced ourselves would be argued with anyway.",
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
    name: "Service and follow-up survey",
    question: "Does the service work for the patient?",
    claim: "X% were satisfied with the service, Y% said a week later that the problem had been properly resolved, and Z% would use it again.",
    category: "patient",
    effort: "medium",
    sources: ["survey"],
    benefit:
      "The patient's own verdict, asked twice: straight after the case and a week later.",
    lead: true,
    horizon: "now",
    rationale:
      "The medical advisor's simplest route to the patient's view: a short survey sent automatically after every case. Asking twice separates the experience from the outcome. Straight after, people can rate the service; a week later they can say whether the problem actually went away and whether they had to go somewhere else with it. Keep both waves short — beyond a handful of questions the response rate collapses and you have nothing.",
    caveat:
      "Response rates on post-consultation surveys are low and skew positive, and the day-7 wave will be smaller than day 0. Report each wave's response rate next to its result, always.",
    protocol: [
      {
        text: "Freeze the two questionnaires",
        detail:
          "Day 0: how satisfied were you, would you use the service again for a similar problem, what would you most likely have done without it, and — if a home test was used — how easy it was to get and to carry out. Day 7: was the problem properly resolved, did you have to seek other health care for it within 7 days and where, were you given a different diagnosis there, and did you have a serious reaction or allergy to a medicine you were prescribed.",
        timeCritical: true,
        link: { href: "/admin/surveys", label: "Surveys" },
      },
      { text: "Send both automatically at fixed points", detail: "Day 0 when the case closes, day 7 a week later. Individual links per patient, never an open survey link. The same points throughout, or the series is worthless." },
      { text: "Do not change the wording mid-period", detail: "Comparability between the 6- and 12-month reports is half the value." },
      { text: "Count sent and answered separately for each wave" },
    ],
    fields: [
      { key: "survey_sent", label: "Day-0 surveys sent", source: "survey" },
      { key: "survey_responses", label: "Day-0 responses", source: "survey" },
      { key: "survey_satisfied_pct", label: "Satisfied with the service", unit: "percent", nullable: true, source: "survey" },
      { key: "survey_reuse_pct", label: "Would use it again for a similar problem", unit: "percent", nullable: true, source: "survey" },
      { key: "survey_7d_sent", label: "Day-7 surveys sent", source: "survey" },
      { key: "survey_7d_responses", label: "Day-7 responses", source: "survey" },
      { key: "survey_resolved_pct", label: "Problem properly resolved (day 7)", unit: "percent", nullable: true, source: "survey" },
    ],
    documents: [
      { id: "instrument", name: "Survey instrument", why: "The exact wording of both waves, frozen. Changing it mid-period breaks the series.", required: true },
    ],
    metrics: [
      {
        id: "satisfied", name: "Satisfied with the service", headline: true,
        why: "The patient's first verdict, asked the day the case closed.",
        compute: ({ t }) => ({
          value: p(t.survey_satisfied_pct),
          detail: t.survey_responses
            ? `From ${n(t.survey_responses)} day-0 responses${t.survey_sent ? ` (${pct(t.survey_responses, t.survey_sent)}% response rate)` : ""}`
            : "No responses yet",
          missing: t.survey_satisfied_pct === null ? "Day-0 survey" : undefined,
          status: t.survey_satisfied_pct === null ? undefined : t.survey_satisfied_pct >= 85 ? "good" : t.survey_satisfied_pct >= 70 ? "fair" : "poor",
        }),
      },
      {
        id: "resolved_7d", name: "Resolved, a week later",
        why: "The outcome as the patient sees it, once there has been time for the problem to come back.",
        compute: ({ t }) => ({
          value: p(t.survey_resolved_pct),
          detail: t.survey_7d_responses
            ? `From ${n(t.survey_7d_responses)} day-7 responses${t.survey_7d_sent ? ` (${pct(t.survey_7d_responses, t.survey_7d_sent)}% response rate)` : ""}`
            : "No day-7 responses yet",
          missing: t.survey_resolved_pct === null ? "Day-7 survey" : undefined,
          status: t.survey_resolved_pct === null ? undefined : t.survey_resolved_pct >= 80 ? "good" : t.survey_resolved_pct >= 65 ? "fair" : "poor",
        }),
      },
      {
        id: "reuse", name: "Would use it again",
        why: "The simplest trust measure, and the one that always ends up in the slides.",
        compute: ({ t }) => ({ value: p(t.survey_reuse_pct), detail: "For a similar problem, of those who responded on day 0", missing: t.survey_reuse_pct === null ? "Day-0 survey" : undefined }),
      },
    ],
  },

  {
    id: "access-gain",
    name: "Replacing care or creating demand",
    question: "What would the patient most likely have done if the service had not existed?",
    claim: "X% would otherwise have gone to the health centre or emergency care — care replaced — and Y% would have done nothing.",
    category: "patient",
    effort: "low",
    requires: ["patient-survey"],
    sources: ["survey"],
    benefit:
      "The first sign of whether the service replaces other care or creates new demand.",
    horizon: "now",
    rationale:
      "The question the advisor singled out. One survey question splits the patients in two, and the two halves mean different things for HSU. Those who would otherwise have gone to the health centre, the emergency department or out-of-hours are care replaced — that is the workload the service takes off HSU. Those who would have done nothing are new demand. That is access gained for the patient, but it does not relieve the health centre, and it must never be counted as if it did.",
    caveat:
      "Self-reported counterfactuals are what people say they would have done, not what they would have done. Label them as such every time and they hold up; present them as fact and they are the first thing torn down. The diagnosis-code comparison against the Saga baseline is the hard-number check on the same question.",
    protocol: [
      {
        text: "Use fixed answer options, including 'nothing'",
        detail: "Health centre, emergency department or out-of-hours, pharmacy, private clinic, nothing — I would have waited. Free text here cannot be counted. Worthless if it arrives halfway through the period.",
        timeCritical: true,
      },
      { text: "Label every counterfactual figure as self-reported, in the report template" },
    ],
    fields: [
      { key: "survey_substituted_pct", label: "Would otherwise have used other health care", help: "Health centre, emergency department, out-of-hours or another clinic.", unit: "percent", nullable: true, source: "survey" },
      { key: "survey_would_not_have_sought_pct", label: "Would otherwise have done nothing", unit: "percent", nullable: true, source: "survey" },
    ],
    documents: [],
    metrics: [
      {
        id: "substituted", name: "Care replaced", headline: true,
        why: "Would otherwise have used other health care. This half is the workload the service takes off HSU.",
        compute: ({ t }) => ({
          value: p(t.survey_substituted_pct),
          detail: "Self-reported — label it as such wherever it appears",
          missing: t.survey_substituted_pct === null ? "Day-0 survey" : undefined,
        }),
      },
      {
        id: "new_demand", name: "New demand",
        why: "Would otherwise have done nothing. Access gained for the patient, but no relief for the health centre — keep it apart.",
        compute: ({ t }) => ({
          value: p(t.survey_would_not_have_sought_pct),
          detail: "Self-reported",
          missing: t.survey_would_not_have_sought_pct === null ? "Day-0 survey" : undefined,
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
    benefit:
      "Proves you can actually run the service month after month.",
    lead: true,
    horizon: "now",
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
    benefit:
      "Shows a site learning to run the service without you.",
    horizon: "now",
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
    name: "HSU staff survey",
    question: "Are HSU staff satisfied, does it help them, and should it continue?",
    claim: "X% of HSU staff were satisfied, Y% said it helps them, and Z% want the service to continue.",
    category: "system",
    effort: "medium",
    sources: ["survey"],
    benefit:
      "Gives you the sentence a doctor at the next site will ask for.",
    horizon: "now",
    rationale:
      "The advisor's three questions for the people at the health centre, asked at the end of the period: are you satisfied, does it help, should it continue. They matter more than they appear to: a doctor at the next station does not ask management how it went — they ask the doctor here. Note that help and workload are not the same thing. Having an answer instead of saying 'I don't know' is real relief that keeps people in post, but it does not show up in minutes, and it must not be sold as workload relief.",
    caveat:
      "Small numbers of respondents at a single site. Treat it as testimony, not statistics, and report how many answered.",
    protocol: [
      { text: "Freeze the three questions and add one open one", detail: "Satisfied? Does it help you in your work? Should it continue? And: 'If this were taken away tomorrow, what would change?' — the answers to that are what you read out to the next station." },
      { text: "Send at the end of the period to everyone at HSU who routes or receives cases", detail: "Nurses, doctors and reception. Record the profession so the answers can be read separately." },
      { text: "Involve one of HSU's doctors in reviewing the safety figures", detail: "Whoever helped look at the data defends it later." },
    ],
    fields: [
      { key: "staff_satisfied_pct", label: "Staff satisfied", unit: "percent", nullable: true, source: "survey" },
      { key: "staff_helps_pct", label: "Staff say it helps", unit: "percent", nullable: true, source: "survey" },
      { key: "staff_continue_pct", label: "Staff want it to continue", unit: "percent", nullable: true, source: "survey" },
    ],
    documents: [
      { id: "staff-survey", name: "Staff survey", why: "The frozen wording of the end-of-period survey.", required: true },
    ],
    metrics: [
      {
        id: "continue", name: "Want it to continue", headline: true,
        why: "The verdict of the people who work with it every day.",
        compute: ({ t }) => ({
          value: p(t.staff_continue_pct),
          detail: "End-of-period survey of HSU staff",
          missing: t.staff_continue_pct === null ? "Staff survey" : undefined,
          status: t.staff_continue_pct === null ? undefined : t.staff_continue_pct >= 75 ? "good" : t.staff_continue_pct >= 50 ? "fair" : "poor",
        }),
      },
      {
        id: "helps", name: "Say it helps",
        why: "Help is not the same as workload relief — keep the two apart in the report.",
        compute: ({ t }) => ({ value: p(t.staff_helps_pct), detail: "Of HSU staff who responded", missing: t.staff_helps_pct === null ? "Staff survey" : undefined }),
      },
      {
        id: "staff_satisfied", name: "Satisfied",
        why: "The general verdict.",
        compute: ({ t }) => ({ value: p(t.staff_satisfied_pct), detail: "Of HSU staff who responded", missing: t.staff_satisfied_pct === null ? "Staff survey" : undefined }),
      },
    ],
  },
];

/** The catalogue, in offer order: the eighteen the pilot was designed around,
 *  then the second wave. Order inside a category is cheap-and-load-bearing
 *  first, which is also the order a reviewer should work down. */
export const ALL_MODULES: Module[] = [DESIGN_MODULE, ...MODULES, ...EXTRA_MODULES];

export const MODULE_BY_ID = new Map(ALL_MODULES.map((m) => [m.id, m]));
export const CORE_MODULE_IDS = ALL_MODULES.filter((m) => m.core).map((m) => m.id);
