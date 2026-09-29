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
  { name: "station", description: "Hvaða heilsugæslustöð. Rituð eins og stofnunin ritar hana, t.d. „Vestmannaeyjar“ eða „Vík í Mýrdal“." },
  { name: "month", description: "Hvaða mánuður, á forminu áááá-mm. Aldrei nákvæm dagsetning. Á stöð með fjögur þúsund íbúa getur dagsetning bent á einstakling, mánuður ekki." },
  { name: "case_type", description: "Hvaða tegund erindis línan á við. Notaðu stutta heitið úr listanum neðst á síðunni." },
  { name: "cases_total", description: "Hve margir sjúklingar leituðu til okkar með þennan vanda í mánuðinum.", numeric: true },
  { name: "cases_resolved", description: "Hve mörg erindi voru afgreidd að fullu, án þess að vísa sjúklingnum annað.", numeric: true },
  { name: "cases_referred", description: "Hve mörgum var vísað áfram. Hér lenda tveir ólíkir hópar: sjúklingur sem þurfti í raun sérfræðing, og sjúklingur sem hefði aldrei átt að nota þjónustuna. Næsti dálkur skilur þá að.", numeric: true },
  {
    name: "excluded_by_doctor",
    description:
      "Af þeim sem var vísað áfram: hve mörgum var VÍSAÐ FRÁ, frekar en vísað áfram. Vísað frá þýðir að læknirinn mat að þjónustan gæti ekki sinnt erindinu á öruggan hátt. Dæmi: bráð veikindi, þörf á skoðun, yngri en 18 ára, þungun eða utan þess sem við bjóðum. Aðeins þessi hluti er öryggistala. Hitt er þjónustan að virka eðlilega.",
    numeric: true,
  },
  { name: "cases_repeat", description: "Sjúklingar sem komu aftur í sama mánuði með sama vanda. Há tala þýðir að fyrsta svarið dugði ekki.", numeric: true },
  {
    name: "screening_stops",
    description:
      "Hve mörg erindi spurningalistinn stöðvaði áður en læknir sá þau, þ.e. þegar innbyggðu rauðu flöggin gripu. Þetta er mikilvægasta öryggistalan sem við höfum. Tvær af fjórum leiðum sjúklinga til okkar fara ekki í gegnum heilbrigðisstarfsfólk. Ef Medalia skráir þetta ekki núna er brýnast að laga það.",
    numeric: true,
  },
  { name: "prescriptions", description: "Hve mörgum erindum lauk með lyfseðli af einhverju tagi.", numeric: true },
  {
    name: "antibiotics",
    description:
      "Af þeim: hve margir voru fyrir sýklalyf. Allir læknar sem þú kynnir fyrir munu spyrja um þetta. Algengur grunur um fjarþjónustu er að hún ávísi sýklalyfjum of auðveldlega. Þessi tala svarar því, í hvora áttina sem er.",
    numeric: true,
  },
  {
    name: "codes_outside_set",
    description:
      "Snemmbúin viðvörun um að þjónustan sé að reka af leið. Ákveðið er fyrir fram hvaða greiningarkóðar hver tegund erindis á venjulega að gefa, t.d. þrír til fimm ICD-10 kóðar fyrir „kvef, hósta og hálsbólgu“. Hér eru talin erindi sem enduðu með allt öðrum kóða. Nokkur eru eðlileg. Hækkandi tala þýðir að sjúklingar koma með vanda sem erindaflokkurinn var aldrei hannaður fyrir. Það viltu vita löngu áður en nokkur tekur eftir því á stöðinni.",
    numeric: true,
  },
  {
    name: "response_median_min",
    description:
      "Venjuleg bið, í mínútum (miðgildi). Helmingur sjúklinga beið skemur, helmingur lengur. Notaðu miðgildi en ekki meðaltal. Eitt erindi sem beið yfir nótt myndi hækka meðaltalið og láta góðan mánuð líta illa út.",
    numeric: true,
    optional: true,
  },
  {
    name: "response_p95_min",
    description:
      "Lengsta biðin, í mínútum (95. hundraðsmark). Ef talan er 95 fengu 95 af hverjum 100 sjúklingum svar innan 95 mínútna. Aðeins þau 5 hægustu biðu lengur. Talan er hér af því að venjuleg bið getur litið vel út þótt nokkrir sjúklingar bíði klukkustundum saman. Það eru þeir sem kvarta, og á þeim reynir loforðið um svar innan tveggja klukkustunda.",
    numeric: true,
    optional: true,
  },
  {
    name: "entry_direct",
    description:
      "Hve margir sjúklingar komu beint í þjónustuna sjálfir. Þeir kosta heilsugæsluna ekkert: ekkert símtal, engar útskýringar, enginn sem vísar þeim áfram. Vaxandi hlutfall hér er skýrasta merkið um að þjónustan standi á eigin fótum.",
    numeric: true,
    optional: true,
  },
  {
    name: "entry_nurse_other",
    description:
      "Hve mörgum starfsmaður heilsugæslunnar vísaði til okkar, t.d. hjúkrunarfræðingur, móttökuritari eða heilbrigðisritari. Þeir kosta heilsugæsluna tíma. Þess vegna eru þeir taldir sér, aðskildir frá þeim sem komu beint.",
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
  if (!lines.length) return { months: [], issues: [{ line: 0, text: "Skráin er tóm." }], linesRead: 0 };

  const sep = (lines[0].match(/;/g) || []).length > (lines[0].match(/,/g) || []).length ? ";" : ",";
  const header = split(lines[0], sep).map((h) => h.toLowerCase());

  const missing = REQUIRED_COLUMNS.filter((c) => !header.includes(c));
  if (missing.length) {
    return { months: [], linesRead: 0, issues: [{ line: 1, text: `Dálka vantar í hauslínuna: ${missing.join(", ")}` }] };
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

    if (!station) { issues.push({ line: i + 1, text: "Stöð vantar." }); continue; }
    // The month number is checked separately: "2026-13" matches the pattern but
    // is not a month, and if it got through, the insert would fail in the
    // database with an error nobody could trace back to a line in a file.
    const m = rawMonth.match(/^(\d{4})-(\d{2})/);
    if (!m || Number(m[2]) < 1 || Number(m[2]) > 12) {
      issues.push({ line: i + 1, text: `Ógildur mánuður „${rawMonth}“. Á að vera áááá-mm, með mánuð 01–12.` });
      continue;
    }
    const month = `${m[1]}-${m[2]}-01`;
    if (!VALID_TYPES.has(slug)) { issues.push({ line: i + 1, text: `Óþekkt tegund erindis „${slug}“.` }); continue; }

    // A value that is not a number is an error, not a zero. A silent zero is
    // worse than a missing line, because it looks like a measurement.
    const nums: Record<string, number | null> = {};
    let bad = false;
    for (const c of NUMERIC) {
      const raw = get(c);
      if (!raw) { nums[c] = null; continue; }
      const v = toNumber(raw);
      if (v === null) { issues.push({ line: i + 1, text: `„${raw}“ í dálkinum ${c} er ekki tala.` }); bad = true; break; }
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
        text: `${row.station} ${row.month.slice(0, 7)}: afgreidd (${row.cases_resolved}) + vísað áfram (${row.cases_referred}) = ${sum}, en erindi eru alls ${row.cases_total}. Munurinn er ${row.cases_total - sum}. Líklega erindi þar sem niðurstaða var ekki skráð.`,
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
  "tree_cases", "tree_overridden", "home_tests_used",
];

/** What the Saga import may write: the HSU diagnosis-code count and the
 *  antibiotic comparator. Nothing else on the row is touched. */
export const SAGA_COLUMNS: (keyof MonthRow | "institution" | "station" | "month")[] = [
  "institution", "station", "month", "institution_contacts", "institution_antibiotics",
];
