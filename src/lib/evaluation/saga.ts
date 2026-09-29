// Saga (HSU's record system) CSV → monthly diagnosis-code counts.
//
// The baseline for the whole study: diagnosis codes in the agreed set for the
// three years before go-live, and the same count through the pilot. One file
// can cover both; the evaluation splits it at the go-live date.
//
// Parsed entirely in the browser. The file may hold ID numbers and dates —
// that is what the counting rule needs — but only monthly counts per station
// leave the machine. Re-importing the same file, or a longer one, rewrites
// the same months with the same numbers.
//
// Counting rule (the medical advisor's): each diagnosis code is counted once
// per patient per day. Several codes in one visit count separately. Without a
// patient column the rule cannot be applied here, so every line counts once
// and the result says so — HSU may already have applied it at their end.

export type SagaConfig = {
  /** ICD-10 codes or prefixes. "J02" covers J02.0–J02.9. Empty = keep all. */
  codeSet: string[];
  /** Used when the file has no station column. */
  defaultStation: string;
  stations: string[];
};

export type SagaMonth = { station: string; month: string; codes: number; antibiotics: number | null };

export type SagaResult = {
  months: SagaMonth[];
  columns: { date: string; code: string; patient?: string; station?: string; antibiotic?: string };
  stats: {
    lines: number;
    counted: number;
    outsideSet: number;
    duplicates: number;
    badDates: number;
    unknownStations: string[];
    first: string | null;
    last: string | null;
    ruleApplied: boolean;
  };
  error?: string;
};

const HEADERS = {
  date: ["dagsetning", "dags", "dags.", "dagur", "komudagur", "date", "visit_date", "dagsetning komu"],
  code: ["greiningarkóði", "greiningarkodi", "greining", "kóði", "kodi", "icd10", "icd-10", "icd", "diagnosis", "code", "sjúkdómsgreining"],
  patient: ["sjúklingur", "sjuklingur", "auðkenni", "audkenni", "gerviauðkenni", "kennitala", "kt", "patient", "patient_id", "id"],
  station: ["stöð", "stod", "starfsstöð", "starfsstod", "eining", "station", "heilsugæslustöð"],
  antibiotic: ["atc", "atc-kóði", "atc_kodi", "lyf", "sýklalyf", "syklalyf", "antibiotic", "antibiotics"],
};

const norm = (s: string) => s.trim().toLowerCase().replace(/^﻿/, "").replace(/^"|"$/g, "");

/** Splits one CSV line, honouring quotes. Saga exports use ; in Iceland. */
function split(line: string, sep: string): string[] {
  const out: string[] = [];
  let cur = "", q = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') { if (q && line[i + 1] === '"') { cur += '"'; i++; } else q = !q; }
    else if (c === sep && !q) { out.push(cur); cur = ""; }
    else cur += c;
  }
  out.push(cur);
  return out.map((x) => x.trim());
}

/** dd.mm.yyyy, d.m.yyyy, yyyy-mm-dd, dd/mm/yyyy, with or without a time. */
export function parseDate(raw: string): string | null {
  const s = raw.trim().split(/[ T]/)[0];
  let m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(s);
  if (m) return iso(+m[1], +m[2], +m[3]);
  m = /^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/.exec(s);
  if (m) return iso(+m[3], +m[2], +m[1]);
  return null;
}
const iso = (y: number, mo: number, d: number) =>
  mo >= 1 && mo <= 12 && d >= 1 && d <= 31 && y > 1990 && y < 2100
    ? `${y}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")}`
    : null;

/** "J02.9", "j029", "J02" → "J02.9" / "J029" normalised to upper case without dot. */
export const icd = (s: string) => s.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");

export function inCodeSet(code: string, set: string[]): boolean {
  if (!set.length) return true;
  const c = icd(code);
  return set.some((p) => p && c.startsWith(icd(p)));
}

/** Station names are typed by hand in both systems. */
const fold = (s: string) =>
  s.toLowerCase().replace(/ð/g, "d").replace(/þ/g, "th").replace(/æ/g, "ae").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "");

/** Antibiotic column: an ATC code (J01…) or a yes/no flag. */
const isAntibiotic = (v: string) => {
  const s = v.trim().toUpperCase();
  return s.startsWith("J01") || ["JÁ", "JA", "YES", "1", "TRUE", "X"].includes(s);
};

export function parseSaga(text: string, cfg: SagaConfig): SagaResult {
  const empty = (error: string): SagaResult => ({
    months: [], columns: { date: "", code: "" },
    stats: { lines: 0, counted: 0, outsideSet: 0, duplicates: 0, badDates: 0, unknownStations: [], first: null, last: null, ruleApplied: false },
    error,
  });
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return empty("Skráin er tóm eða hefur enga hauslínu.");
  const sep = [";", ",", "\t"].sort((a, b) => lines[0].split(b).length - lines[0].split(a).length)[0];
  const header = split(lines[0], sep).map(norm);
  const find = (names: string[]) => header.findIndex((h) => names.includes(h));
  const col = {
    date: find(HEADERS.date), code: find(HEADERS.code), patient: find(HEADERS.patient),
    station: find(HEADERS.station), antibiotic: find(HEADERS.antibiotic),
  };
  if (col.date < 0 || col.code < 0) {
    return empty(`Fann ekki ${col.date < 0 ? "dagsetningu" : "greiningarkóða"} í hauslínunni. Dálkarnir heita: ${header.join(", ")}.`);
  }

  const stationBy = new Map(cfg.stations.map((s) => [fold(s), s]));
  const seen = new Set<string>();
  const counts = new Map<string, { codes: number; abx: number }>();
  const unknown = new Set<string>();
  let counted = 0, outside = 0, dup = 0, bad = 0;
  let first: string | null = null, last: string | null = null;

  for (let i = 1; i < lines.length; i++) {
    const cells = split(lines[i], sep);
    const date = parseDate(cells[col.date] ?? "");
    if (!date) { bad++; continue; }
    const code = cells[col.code] ?? "";
    if (!code.trim()) continue;
    if (!inCodeSet(code, cfg.codeSet)) { outside++; continue; }
    let station = cfg.defaultStation;
    if (col.station >= 0) {
      const raw = cells[col.station] ?? "";
      const known = stationBy.get(fold(raw));
      if (!known) { if (raw) unknown.add(raw); continue; }
      station = known;
    }
    if (col.patient >= 0) {
      const key = `${cells[col.patient]}|${date}|${icd(code)}`;
      if (seen.has(key)) { dup++; continue; }
      seen.add(key);
    }
    const k = `${station}|${date.slice(0, 7)}-01`;
    const c = counts.get(k) ?? { codes: 0, abx: 0 };
    c.codes++;
    if (col.antibiotic >= 0 && isAntibiotic(cells[col.antibiotic] ?? "")) c.abx++;
    counts.set(k, c);
    counted++;
    if (!first || date < first) first = date;
    if (!last || date > last) last = date;
  }

  return {
    months: [...counts.entries()].map(([k, c]) => {
      const [station, month] = k.split("|");
      return { station, month, codes: c.codes, antibiotics: col.antibiotic >= 0 ? c.abx : null };
    }).sort((a, b) => a.month.localeCompare(b.month)),
    columns: {
      date: header[col.date], code: header[col.code],
      patient: col.patient >= 0 ? header[col.patient] : undefined,
      station: col.station >= 0 ? header[col.station] : undefined,
      antibiotic: col.antibiotic >= 0 ? header[col.antibiotic] : undefined,
    },
    stats: {
      lines: lines.length - 1, counted, outsideSet: outside, duplicates: dup, badDates: bad,
      unknownStations: [...unknown].slice(0, 10), first, last, ruleApplied: col.patient >= 0,
    },
  };
}
