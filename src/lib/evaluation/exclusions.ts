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
    name: "Stöðvað af spurningalistanum",
    note:
      "Kerfisbundið og eins í hvert sinn. Þetta sýnir að öryggisnetið virkar. Það er líka eina svarið við spurningunni „hver metur hvort sjúklingurinn á heima hér?“ þegar tvær af fjórum leiðum inn í þjónustuna liggja ekki í gegnum heilbrigðisstarfsfólk.",
  },
  {
    id: "clinician",
    name: "Vísað frá af lækni",
    note:
      "Komst í gegnum spurningalistann en læknir stöðvaði erindið. Þetta er dýrt, því sjúklingurinn hefur þegar beðið. Spurningalistinn hefði líklega átt að grípa hvert og eitt þessara erinda.",
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
    name: "Bráð eða alvarleg einkenni",
    expected: "form",
    note: "Þetta skiptir mestu. Ef læknir grípur erindið hér en ekki spurningalistinn er það næstum-atvik í skimuninni.",
  },
  {
    id: "needs-exam",
    name: "Þarf skoðun",
    expected: "form",
    note: "Algengasta réttmæta ástæðan fyrir frávísun. Hér liggja mörk þess sem fjarþjónusta getur gert.",
  },
  {
    id: "needs-tests",
    name: "Þarf blóðprufu eða myndgreiningu",
    expected: "form",
    note: "Ekki það sama og skoðun. Stundum má leysa þetta með því að panta rannsóknina í stað þess að vísa erindinu frá.",
  },
  {
    id: "under-18",
    name: "Yngri en 18 ára",
    expected: "form",
    note: "Föst regla. Ef slíkt erindi kemst til læknis spyr spurningalistinn ekki rétt eða svarið var rangt.",
  },
  {
    id: "pregnancy",
    name: "Þungun",
    expected: "form",
    note: "Útilokar aðeins sumar tegundir erinda. Því er auðvelt að gera villu í rökum spurningalistans.",
  },
  {
    id: "for-another",
    name: "Erindi fyrir hönd annars",
    expected: "form",
    note: "Snýst um auðkenni og samþykki, ekki klíníska áhættu. En skráningin verður ógild hvort sem er.",
  },
  {
    id: "medication-excluded",
    name: "Lyf sem er ekki endurnýjað í fjarþjónustu",
    expected: "form",
    note: "Fastur listi. Ef slík erindi komast til læknis er listinn ekki tengdur spurningalistanum.",
  },
  {
    id: "out-of-scope",
    name: "Utan við verksvið þjónustunnar",
    expected: "clinician",
    note: "Eðlilegt er að læknir grípi þetta. Að meta hvort vandinn passar í einn af ellefu erindaflokkum er einmitt hlutverk læknis.",
  },
  {
    id: "insufficient-info",
    name: "Ónógar upplýsingar",
    expected: "clinician",
    note: "Hækkandi hlutfall bendir til að spurningalistinn spyrji ekki nóg. Hvert slíkt erindi kostar sjúklinginn aukaferð.",
  },
  {
    id: "duplicate",
    name: "Tvískráð eða þegar í vinnslu",
    expected: "clinician",
    note: "Stjórnsýslulegt, ekki klínískt. Rétt að telja þetta sér svo það blási ekki upp öryggistölurnar.",
  },
  { id: "other", name: "Annað", expected: "clinician", note: "Á að vera lítið. Ef „annað“ er stórt vantar nýjan flokk í listann." },
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
  { name: "station", description: "Heilsugæslustöð, rituð eins og stofnunin ritar hana." },
  { name: "month", description: "áááá-mm." },
  { name: "gate", description: "form (spurningalistinn stöðvaði erindið) eða clinician (læknir vísaði því frá)." },
  { name: "reason", description: `Eitt af: ${EXCLUSION_REASONS.map((r) => r.id).join(", ")}.` },
  { name: "count", description: "Fjöldi í þeim mánuði, við þetta skref, af þessari ástæðu." },
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
  if (!lines.length) return { rows, issues: [{ line: 0, text: "Skráin er tóm." }] };

  const sep = (lines[0].match(/;/g) || []).length > (lines[0].match(/,/g) || []).length ? ";" : ",";
  const header = lines[0].split(sep).map((h) => h.trim().toLowerCase());
  const missing = REASON_COLUMNS.map((c) => c.name).filter((c) => !header.includes(c));
  if (missing.length) return { rows, issues: [{ line: 1, text: `Dálka vantar: ${missing.join(", ")}` }] };

  const at = (c: string) => header.indexOf(c);
  for (let i = 1; i < lines.length; i++) {
    const cells = lines[i].split(sep).map((c) => c.trim());
    const station = cells[at("station")] ?? "";
    const rawMonth = cells[at("month")] ?? "";
    const gate = (cells[at("gate")] ?? "").toLowerCase() as Gate;
    const reason = (cells[at("reason")] ?? "").toLowerCase();
    const count = Number(cells[at("count")] ?? "");

    if (!station) { issues.push({ line: i + 1, text: "Stöð vantar." }); continue; }
    const m = rawMonth.match(/^(\d{4})-(\d{2})/);
    if (!m || Number(m[2]) < 1 || Number(m[2]) > 12) {
      issues.push({ line: i + 1, text: `Ógildur mánuður „${rawMonth}“. Á að vera áááá-mm, með mánuð 01–12.` });
      continue;
    }
    if (gate !== "form" && gate !== "clinician") {
      issues.push({ line: i + 1, text: `gate á að vera „form“ eða „clinician“, en er „${cells[at("gate")]}“.` });
      continue;
    }
    if (!REASON_BY_ID[reason]) {
      issues.push({ line: i + 1, text: `Óþekkt ástæða „${reason}“. Leyfilegt: ${EXCLUSION_REASONS.map((r) => r.id).join(", ")}.` });
      continue;
    }
    if (!Number.isFinite(count)) { issues.push({ line: i + 1, text: `„${cells[at("count")]}“ er ekki tala.` }); continue; }

    rows.push({ station, month: `${m[1]}-${m[2]}-01`, gate, reason, count: Math.round(count) });
  }
  return { rows, issues };
}
