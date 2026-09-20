// The monthly Medalia export — the format, and the way from file to figures.
//
// ── Why a summary rather than a case list ──────────────────────────────────
// The file that comes into this system contains no personal data and cannot,
// because it is already counted: every line is a NUMBER, not a person. No
// national ID, no date, no free text, no age band, no sex. That is design
// rather than caution — the dashboard needs counts and counts are all it is
// given, so there is no question about what happens if someone gains access.
//
// ── Grain ──────────────────────────────────────────────────────────────────
// One line per STATION × MONTH × CASE TYPE. It is the finest grain that is
// still entirely non-identifying, and it delivers both things in one file:
// the per-case-type breakdown and the station totals. Nine stations by
// thirteen case types is 117 lines a month for the whole of HSU.
//
// Coarser — one line per station — saves nothing and destroys the breakdown.
// Finer — one line per case — is personal data and does not belong here.
//
// ── What is NOT in this file ───────────────────────────────────────────────
// A yearly deeper analysis (code distribution, cross-tabs, age effects) needs
// one line per case. That is a separate matter and never enters this system.
// Note that a hashed patient key does not make such a file anonymous:
// pseudonymisation is not anonymisation, and a key that lets you recognise the
// same person again is personal data however well it is hashed.

import { erindi } from "@/erindi";
import { emptyMonth, type CaseCounts, type MonthRow } from "./totals";

export type Column = { name: string; description: string; numeric?: boolean; optional?: boolean };

/** The specification, exactly as it should arrive. This is the document that
 *  goes to Medalia — not a description of it, but the list itself. */
export const COLUMNS: Column[] = [
  { name: "station", description: "Which health centre. Written the way the institution writes it — \"Vestmannaeyjar\", \"Vík í Mýrdal\"." },
  { name: "month", description: "Which month, as yyyy-mm. Never an exact date: a date at a station of four thousand people can identify someone, a month cannot." },
  { name: "case_type", description: "Which of the case types this row is about, using the short name from the list at the bottom of this page." },
  { name: "cases_total", description: "How many patients came to us with this kind of problem that month.", numeric: true },
  { name: "cases_resolved", description: "How many were dealt with completely, without sending the patient anywhere else.", numeric: true },
  { name: "cases_referred", description: "How many were sent on to someone else. Two different things end up here — a patient who genuinely needed a specialist, and a patient who should never have used the service at all. The next column separates them.", numeric: true },
  {
    name: "excluded_by_doctor",
    description:
      "Of those referred, how many were TURNED AWAY rather than passed on. Turned away means the doctor decided the service could not safely handle it — acutely unwell, needs examining, under 18, pregnant, outside what we offer. Only this subset is a safety figure; the rest is the service working normally.",
    numeric: true,
  },
  { name: "cases_repeat", description: "Patients who came back that month with the same problem again. A high number means the first answer did not hold.", numeric: true },
  {
    name: "screening_stops",
    description:
      "How many were stopped by the questionnaire itself before any doctor saw them — the built-in red flags firing. This is the single most important safety number we have, because two of the four ways patients reach us do not involve clinical staff at all. If Medalia does not currently record this, that is the most urgent thing to fix.",
    numeric: true,
  },
  { name: "prescriptions", description: "How many of these cases ended with a prescription of any kind.", numeric: true },
  {
    name: "antibiotics",
    description:
      "Of those, how many were antibiotics. Expect to be asked about this by every doctor you present to — the standing suspicion about remote services is that they hand out antibiotics too easily, and this is the number that settles it either way.",
    numeric: true,
  },
  {
    name: "codes_outside_set",
    description:
      "An early warning that the service is drifting. You agree in advance which diagnosis codes each case type should normally produce — say three to five ICD-10 codes for \"cold, cough and sore throat\". This counts the cases that came out as something else entirely. A few is normal. A rising number means patients are bringing problems the case type was never designed for, and you want to know that long before anyone notices in the clinic.",
    numeric: true,
  },
  {
    name: "response_median_min",
    description:
      "The typical wait, in minutes. Half of patients waited less than this, half waited more. Use the middle value rather than the average, because one case that sat overnight would drag an average up and make a good month look bad.",
    numeric: true,
    optional: true,
  },
  {
    name: "response_p95_min",
    description:
      "The bad end of the wait, in minutes. If this reads 95, then 95 out of every 100 patients got an answer within 95 minutes and only the slowest 5 waited longer. It is here because the typical wait can look excellent while a handful of patients wait many hours — and those are the ones who complain, and the ones the two-hour promise is actually tested on.",
    numeric: true,
    optional: true,
  },
  {
    name: "entry_direct",
    description:
      "How many patients came straight to the service themselves. These cost the health centre nothing at all — no phone call, no explaining, no one routing them — so a growing share here is the clearest sign the service is standing on its own.",
    numeric: true,
    optional: true,
  },
  {
    name: "entry_nurse_other",
    description:
      "How many were sent to us by someone at the health centre — a nurse, a receptionist or records staff. These do cost the health centre time, which is why they are counted apart from the ones who came directly.",
    numeric: true,
    optional: true,
  },
];

export const REQUIRED_COLUMNS = COLUMNS.filter((c) => !c.optional).map((c) => c.name);
const NUMERIC = new Set(COLUMNS.filter((c) => c.numeric).map((c) => c.name));
const VALID_TYPES = new Set(erindi.map((e) => e.slug));

/** Header plus one example line — the file that goes to Medalia. */
export function template(): string {
  const head = COLUMNS.map((c) => c.name).join(",");
  const example = COLUMNS.map((c) =>
    c.name === "station" ? "Vestmannaeyjar" : c.name === "month" ? "2026-09" : c.name === "case_type" ? "kvef-hosti-halsbolga" : "0",
  ).join(",");
  return `${head}\n${example}\n`;
}

export type ImportIssue = { line: number; text: string };
export type ImportResult = { months: MonthRow[]; issues: ImportIssue[]; linesRead: number };

/** Splits a CSV line honouring quotes. Icelandic Excel often writes
 *  semicolons, so both separators are accepted. */
function split(line: string, sep: string): string[] {
  const out: string[] = [];
  let cur = "", quoted = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (quoted && line[i + 1] === '"') { cur += '"'; i++; }
      else quoted = !quoted;
    } else if (c === sep && !quoted) { out.push(cur); cur = ""; }
    else cur += c;
  }
  out.push(cur);
  return out.map((s) => s.trim());
}

function toNumber(raw: string): number | null {
  const s = raw.trim().replace(/\./g, "").replace(",", ".");
  if (!s) return null;
  const v = Number(s);
  return Number.isFinite(v) ? Math.round(v) : null;
}

/**
 * Reads an export and returns one row per station and month, with the case
 * types folded into `cases_by_type`.
 *
 * Response time is WEIGHTED by case count rather than summed — medians do not
 * add, and one quiet case type must not drag the whole figure.
 */
export function parse(text: string, institution = "hsu"): ImportResult {
  const issues: ImportIssue[] = [];
  const lines = text.replace(/^﻿/, "").split(/\r?\n/).filter((l) => l.trim());
  if (!lines.length) return { months: [], issues: [{ line: 0, text: "The file is empty." }], linesRead: 0 };

  const sep = (lines[0].match(/;/g) || []).length > (lines[0].match(/,/g) || []).length ? ";" : ",";
  const header = split(lines[0], sep).map((h) => h.toLowerCase());

  const missing = REQUIRED_COLUMNS.filter((c) => !header.includes(c));
  if (missing.length) {
    return { months: [], linesRead: 0, issues: [{ line: 1, text: `Missing columns in the header: ${missing.join(", ")}` }] };
  }

  const at = (c: string) => header.indexOf(c);
  const medianAcc = new Map<string, [number, number]>();
  const p95Acc = new Map<string, [number, number]>();
  const out = new Map<string, MonthRow>();
  let read = 0;

  for (let i = 1; i < lines.length; i++) {
    const cells = split(lines[i], sep);
    const get = (c: string) => cells[at(c)] ?? "";

    const station = get("station");
    const rawMonth = get("month");
    const slug = get("case_type").toLowerCase();

    if (!station) { issues.push({ line: i + 1, text: "Station missing." }); continue; }
    // The month number is checked separately: "2026-13" matches the pattern but
    // is not a month, and if it got through, the insert would fail in the
    // database with an error nobody could trace back to a line in a file.
    const m = rawMonth.match(/^(\d{4})-(\d{2})/);
    if (!m || Number(m[2]) < 1 || Number(m[2]) > 12) {
      issues.push({ line: i + 1, text: `Invalid month "${rawMonth}" — expected yyyy-mm with month 01–12.` });
      continue;
    }
    const month = `${m[1]}-${m[2]}-01`;
    if (!VALID_TYPES.has(slug)) { issues.push({ line: i + 1, text: `Unknown case type "${slug}".` }); continue; }

    // A value that is not a number is an error, not a zero. A silent zero is
    // worse than a missing line, because it looks like a measurement.
    const nums: Record<string, number | null> = {};
    let bad = false;
    for (const c of NUMERIC) {
      const raw = get(c);
      if (!raw) { nums[c] = null; continue; }
      const v = toNumber(raw);
      if (v === null) { issues.push({ line: i + 1, text: `"${raw}" in column ${c} is not a number.` }); bad = true; break; }
      nums[c] = v;
    }
    if (bad) continue;

    const v = (c: string) => nums[c] ?? 0;
    const key = `${station}|${month}`;
    const row = out.get(key) ?? emptyMonth(institution, station, month);

    // The catch-all is measured separately as well as counted in the total.
    if (slug === "almenn-laeknisthjonusta") {
      row.general_total += v("cases_total");
      row.general_resolved += v("cases_resolved");
    }

    row.cases_total += v("cases_total");
    row.cases_resolved += v("cases_resolved");
    row.cases_referred += v("cases_referred");
    row.cases_repeat += v("cases_repeat");
    row.screening_stops += v("screening_stops");
    row.excluded_by_doctor += v("excluded_by_doctor");
    row.prescriptions += v("prescriptions");
    row.antibiotics += v("antibiotics");
    row.codes_outside_set += v("codes_outside_set");
    row.entry_direct += v("entry_direct");
    row.entry_via_staff += v("entry_nurse_other");

    const prev: CaseCounts = row.cases_by_type[slug] ?? { total: 0, resolved: 0, referred: 0 };
    row.cases_by_type[slug] = {
      total: prev.total + v("cases_total"),
      resolved: prev.resolved + v("cases_resolved"),
      referred: prev.referred + v("cases_referred"),
    };

    const weight = v("cases_total");
    if (nums["response_median_min"] !== null && weight) {
      const [s0, w0] = medianAcc.get(key) ?? [0, 0];
      medianAcc.set(key, [s0 + nums["response_median_min"]! * weight, w0 + weight]);
    }
    if (nums["response_p95_min"] !== null && weight) {
      const [s0, w0] = p95Acc.get(key) ?? [0, 0];
      p95Acc.set(key, [s0 + nums["response_p95_min"]! * weight, w0 + weight]);
    }

    if (!row.sources_present.includes("medalia")) row.sources_present.push("medalia");
    out.set(key, row);
    read++;
  }

  for (const [key, row] of out) {
    const med = medianAcc.get(key);
    if (med && med[1]) row.response_median_min = Math.round(med[0] / med[1]);
    const p95 = p95Acc.get(key);
    if (p95 && p95[1]) row.response_p95_min = Math.round(p95[0] / p95[1]);

    // Internal consistency: resolved + referred should account for the total.
    // Not an error that blocks the import, but it has to be visible — a gap
    // usually means the outcome field in Medalia is not mandatory yet, and
    // this arithmetic is the only defence against a broken export.
    const sum = row.cases_resolved + row.cases_referred;
    if (row.cases_total && sum !== row.cases_total) {
      issues.push({
        line: 0,
        text: `${row.station} ${row.month.slice(0, 7)}: resolved (${row.cases_resolved}) + referred (${row.cases_referred}) = ${sum}, but total cases is ${row.cases_total}. Gap of ${row.cases_total - sum} — probably cases with no recorded outcome.`,
      });
    }
  }

  return { months: [...out.values()], issues, linesRead: read };
}

/** Columns the import is allowed to write. Anything typed in by hand — the
 *  institution's figures, survey results — must survive a re-import of the
 *  same month, and the operator has no way of noticing if it does not. */
export const MEDALIA_COLUMNS: (keyof MonthRow | "institution" | "station" | "month" | "sources_present")[] = [
  "institution", "station", "month",
  "cases_total", "cases_resolved", "cases_referred", "cases_repeat",
  "codes_outside_set", "screening_stops", "excluded_by_doctor", "prescriptions", "antibiotics",
  "response_median_min", "response_p95_min", "cases_by_type",
  "entry_direct", "entry_via_staff",
  "general_total", "general_resolved", "sources_present",
];
