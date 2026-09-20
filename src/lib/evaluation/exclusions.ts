// Who was turned away, where, and why.
//
// The original model had one figure for referral, which quietly merged two
// things that are not alike:
//
//   CLINICAL REFERRAL — the patient needs something we do not offer. A skin
//   lesion that wants a dermatologist. This is the service working correctly
//   and is not a safety signal at all.
//
//   EXCLUSION ON A RED FLAG — the patient should not have been here. Pregnant,
//   under eighteen, acute symptoms, needs examining, outside scope. This IS a
//   safety signal, and merging it into referral makes it disappear.
//
// And there are two gates where it happens:
//
//   GATED       the questionnaire stopped them before a clinician saw it —
//               systematic, identical every time, cheap.
//   BY CLINICIAN a doctor read it and turned them away — expensive, and each
//               one is a case the questionnaire should arguably have caught.
//
// Read together the two gates answer the question a clinical audience actually
// asks: does the screen work, and what gets past it? A rising share caught by
// the doctor rather than the form means the form needs tightening. A very low
// total at either gate means either the scope is being communicated well
// upstream, or nobody is checking — and you cannot tell which without the
// reason breakdown.
//
// The reasons below are not invented. They are the exclusion rules the service
// already applies in `src/lib/vinnustod/triage.ts`, so the categories match the
// clinical logic rather than sitting beside it.

export type Gate = "form" | "clinician";

export const GATES: { id: Gate; name: string; note: string }[] = [
  {
    id: "form",
    name: "Stopped by the questionnaire",
    note:
      "Systematic and identical every time. This is the evidence that the safety net works — and the only answer to \"who decides the patient is suitable?\" when two of the four entry routes are not clinical staff.",
  },
  {
    id: "clinician",
    name: "Turned away by the doctor",
    note:
      "Got past the form and a clinician stopped it. Expensive — the patient has already waited — and every one is arguably a case the questionnaire should have caught.",
  },
];

export type ExclusionReason = {
  id: string;
  name: string;
  /** Which gate would normally catch it. Used to flag the ones leaking. */
  expected: Gate;
  note: string;
};

/** Derived from the service's own exclusion rules. Keep the ids stable — they
 *  are the key the export is matched on. */
export const EXCLUSION_REASONS: ExclusionReason[] = [
  {
    id: "acute",
    name: "Acute or serious symptoms",
    expected: "form",
    note: "The one that matters. Anything caught here by a clinician rather than the form is a near miss of the screen.",
  },
  {
    id: "needs-exam",
    name: "Needs physical examination",
    expected: "form",
    note: "The commonest legitimate exclusion, and the boundary of what remote care can do.",
  },
  {
    id: "needs-tests",
    name: "Needs bloods or imaging",
    expected: "form",
    note: "Distinct from examination: sometimes solvable by ordering the test rather than refusing the case.",
  },
  {
    id: "under-18",
    name: "Under 18",
    expected: "form",
    note: "A hard rule, so anything reaching a clinician means the form is not asking or the answer was wrong.",
  },
  {
    id: "pregnancy",
    name: "Pregnancy",
    expected: "form",
    note: "Excluding for some case types only, which makes it easy to get wrong in the form logic.",
  },
  {
    id: "for-another",
    name: "Case on behalf of another person",
    expected: "form",
    note: "Identity and consent, not clinical risk — but it invalidates the record either way.",
  },
  {
    id: "medication-excluded",
    name: "Medication not renewed remotely",
    expected: "form",
    note: "A fixed list. If these reach a clinician the list is not wired into the form.",
  },
  {
    id: "out-of-scope",
    name: "Outside the service's scope",
    expected: "clinician",
    note: "Expected here: judging whether a presentation fits eleven case types is exactly what a clinician is for.",
  },
  {
    id: "insufficient-info",
    name: "Not enough information",
    expected: "clinician",
    note: "A rising share suggests the questionnaire is not asking enough, and each one costs the patient a round trip.",
  },
  {
    id: "duplicate",
    name: "Duplicate or already in hand",
    expected: "clinician",
    note: "Administrative rather than clinical. Worth separating so it does not inflate the safety figures.",
  },
  { id: "other", name: "Other", expected: "clinician", note: "Keep small. A large 'other' means the list needs a new category." },
];

export const REASON_BY_ID = Object.fromEntries(EXCLUSION_REASONS.map((r) => [r.id, r])) as Record<string, ExclusionReason>;

/** One row of the reasons file: station × month × gate × reason. */
export type ExclusionRow = { gate: Gate; reason: string; count: number };

export type ExclusionSummary = {
  form: number;
  clinician: number;
  total: number;
  byReason: { reason: ExclusionReason; form: number; clinician: number; total: number }[];
  /** Reasons the form was expected to catch but a clinician did. Each one is a
   *  gap in the questionnaire logic, and the most actionable output here. */
  leaks: { reason: ExclusionReason; count: number }[];
};

export function summarise(rows: ExclusionRow[]): ExclusionSummary {
  const map = new Map<string, { form: number; clinician: number }>();
  for (const r of rows) {
    const cur = map.get(r.reason) ?? { form: 0, clinician: 0 };
    cur[r.gate] += r.count || 0;
    map.set(r.reason, cur);
  }

  const byReason = EXCLUSION_REASONS.map((reason) => {
    const c = map.get(reason.id) ?? { form: 0, clinician: 0 };
    return { reason, form: c.form, clinician: c.clinician, total: c.form + c.clinician };
  }).filter((r) => r.total > 0);

  const leaks = byReason
    .filter((r) => r.reason.expected === "form" && r.clinician > 0)
    .map((r) => ({ reason: r.reason, count: r.clinician }))
    .sort((a, b) => b.count - a.count);

  return {
    form: byReason.reduce((a, r) => a + r.form, 0),
    clinician: byReason.reduce((a, r) => a + r.clinician, 0),
    total: byReason.reduce((a, r) => a + r.total, 0),
    byReason: byReason.sort((a, b) => b.total - a.total),
    leaks,
  };
}

// ── The reasons file ────────────────────────────────────────────────────────
//
// A separate small CSV rather than columns on the main export. Putting eleven
// reasons across two gates into the monthly file would add twenty-two columns
// to every line; at its own grain it is at most a couple of hundred lines a
// month for the whole institution, and usually far fewer.

export const REASON_COLUMNS = [
  { name: "station", description: "Health centre, as the institution writes it." },
  { name: "month", description: "yyyy-mm." },
  { name: "gate", description: "form (questionnaire stopped them) or clinician (doctor turned them away)." },
  { name: "reason", description: `One of: ${EXCLUSION_REASONS.map((r) => r.id).join(", ")}.` },
  { name: "count", description: "How many, that month, at that gate, for that reason." },
];

export function reasonTemplate(): string {
  return (
    `${REASON_COLUMNS.map((c) => c.name).join(",")}\n` +
    `Vestmannaeyjar,2026-09,form,acute,3\n` +
    `Vestmannaeyjar,2026-09,clinician,out-of-scope,2\n`
  );
}

export type ReasonParse = {
  rows: { station: string; month: string; gate: Gate; reason: string; count: number }[];
  issues: { line: number; text: string }[];
};

export function parseReasons(text: string): ReasonParse {
  const issues: ReasonParse["issues"] = [];
  const rows: ReasonParse["rows"] = [];
  const lines = text.replace(/^﻿/, "").split(/\r?\n/).filter((l) => l.trim());
  if (!lines.length) return { rows, issues: [{ line: 0, text: "The file is empty." }] };

  const sep = (lines[0].match(/;/g) || []).length > (lines[0].match(/,/g) || []).length ? ";" : ",";
  const header = lines[0].split(sep).map((h) => h.trim().toLowerCase());
  const missing = REASON_COLUMNS.map((c) => c.name).filter((c) => !header.includes(c));
  if (missing.length) return { rows, issues: [{ line: 1, text: `Missing columns: ${missing.join(", ")}` }] };

  const at = (c: string) => header.indexOf(c);
  for (let i = 1; i < lines.length; i++) {
    const cells = lines[i].split(sep).map((c) => c.trim());
    const station = cells[at("station")] ?? "";
    const rawMonth = cells[at("month")] ?? "";
    const gate = (cells[at("gate")] ?? "").toLowerCase() as Gate;
    const reason = (cells[at("reason")] ?? "").toLowerCase();
    const count = Number(cells[at("count")] ?? "");

    if (!station) { issues.push({ line: i + 1, text: "Station missing." }); continue; }
    const m = rawMonth.match(/^(\d{4})-(\d{2})/);
    if (!m || Number(m[2]) < 1 || Number(m[2]) > 12) {
      issues.push({ line: i + 1, text: `Invalid month "${rawMonth}" — expected yyyy-mm with month 01–12.` });
      continue;
    }
    if (gate !== "form" && gate !== "clinician") {
      issues.push({ line: i + 1, text: `Gate must be "form" or "clinician", got "${cells[at("gate")]}".` });
      continue;
    }
    if (!REASON_BY_ID[reason]) {
      issues.push({ line: i + 1, text: `Unknown reason "${reason}". Allowed: ${EXCLUSION_REASONS.map((r) => r.id).join(", ")}.` });
      continue;
    }
    if (!Number.isFinite(count)) { issues.push({ line: i + 1, text: `"${cells[at("count")]}" is not a number.` }); continue; }

    rows.push({ station, month: `${m[1]}-${m[2]}-01`, gate, reason, count: Math.round(count) });
  }
  return { rows, issues };
}
