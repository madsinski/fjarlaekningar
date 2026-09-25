// Renders a Medalia questionnaire JSON into a copy-paste build sheet (.docx).
// Usage: npm i --no-save docx && node docs/medalia/render-docx.js <in.json> <out.docx> "<title>"
const fs = require("fs");
const {
  Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow,
  TableCell, WidthType, ShadingType, BorderStyle, LevelFormat, AlignmentType,
  PageBreak, Footer, PageNumber,
} = require("docx");

const [, , src, dst, title] = process.argv;
const q = JSON.parse(fs.readFileSync(src, "utf8"));

const CTRL = "http://hl7.org/fhir/StructureDefinition/questionnaire-itemControl";
const ENTRY = "http://hl7.org/fhir/StructureDefinition/entryFormat";
const UNIT = "http://hl7.org/fhir/StructureDefinition/questionnaire-unit";
const NEW_PAGES = new Set(["p-hentar"]);

const ext = (it, url) => (it.extension || []).find((e) => e.url === url);
const controlOf = (it) => {
  const e = ext(it, CTRL);
  return e ? e.valueCodeableConcept.coding[0].code : null;
};

function kind(it) {
  const t = it.type, c = controlOf(it);
  if (t === "display") return "Skýringartexti (display)";
  if (t === "boolean") return "Gátreitur — já/nei (boolean)";
  if (t === "choice") {
    if (it.repeats) return "Fjölval — gátreitir (choice, repeats)";
    if (c === "drop-down") return "Fellilisti (choice, drop-down)";
    return "Einn valkostur — radio (choice)";
  }
  if (t === "string") return "Stuttur texti — ein lína (string)";
  if (t === "text") return "Langur texti — textareitur (text)";
  if (t === "integer") return "Tala 0–10 — hnappar (integer)";
  if (t === "quantity") {
    const u = ext(it, UNIT);
    return `Tala með einingu — ${u ? u.valueCoding.display : "?"} (quantity)`;
  }
  if (t === "attachment") return "Viðhengi — mynd (attachment)";
  return t;
}

// linkId -> {code: display} so conditions read "scope-gate = Nei (no)"
const optionLabels = {};
(function walk(items) {
  for (const it of items || []) {
    if (it.answerOption) {
      optionLabels[it.linkId] = Object.fromEntries(
        it.answerOption.map((o) => [o.valueCoding.code, o.valueCoding.display]));
    }
    walk(it.item);
  }
})(q.item);

function conditionRuns(it) {
  const ew = it.enableWhen || [];
  if (!ew.length) return null;
  const join = it.enableBehavior === "any" ? " EÐA " : " OG ";
  const runs = [];
  ew.forEach((e, i) => {
    if (i) runs.push(new TextRun({ text: join, bold: true }));
    const label = (optionLabels[e.question] || {})[e.answerCoding.code] || "";
    runs.push(new TextRun({ text: e.question, font: "Consolas" }));
    runs.push(new TextRun({ text: " = " }));
    runs.push(new TextRun({ text: `„${label}“`, bold: true }));
    runs.push(new TextRun({ text: ` (${e.answerCoding.code})`, font: "Consolas", color: "666666" }));
  });
  return runs;
}

// ---------------------------------------------------------------- helpers
const BLUE = "1F4E79", NEW = "C55A11", GREY = "F2F2F2", AMBER = "FFF2CC";
const border = { style: BorderStyle.SINGLE, size: 4, color: "BFBFBF" };
const borders = { top: border, bottom: border, left: border, right: border };
const P = (runs, opts = {}) => new Paragraph({ children: Array.isArray(runs) ? runs : [runs], ...opts });
const T = (text, o = {}) => new TextRun({ text, ...o });

// Split patient-facing text on newlines; "• " lines become real bullets.
function textBlock(text, shade) {
  const out = [];
  for (const line of text.split("\n")) {
    if (!line.trim()) continue;
    if (line.startsWith("• ")) {
      out.push(new Paragraph({ numbering: { reference: "bullets", level: 0 },
        shading: shade, children: [T(line.slice(2))] }));
    } else {
      out.push(new Paragraph({ shading: shade, spacing: { after: 80 }, children: [T(line)] }));
    }
  }
  return out;
}

function optionsTable(options) {
  const W = [2200, 6826];
  const cell = (text, w, o = {}) => new TableCell({
    borders, width: { size: w, type: WidthType.DXA },
    shading: o.head ? { fill: GREY, type: ShadingType.CLEAR } : undefined,
    margins: { top: 60, bottom: 60, left: 120, right: 120 },
    children: [P(T(text, { bold: !!o.head, font: o.mono ? "Consolas" : undefined }))],
  });
  return new Table({
    width: { size: 9026, type: WidthType.DXA }, columnWidths: W,
    rows: [
      new TableRow({ tableHeader: true, children: [cell("Kóði", W[0], { head: true }), cell("Texti sem sjúklingur sér", W[1], { head: true })] }),
      ...options.map((o) => new TableRow({ children: [
        cell(o.valueCoding.code, W[0], { mono: true }), cell(o.valueCoding.display, W[1])] })),
    ],
  });
}

function pageGateSummary() {
  const W = [900, 3800, 4326];
  const cell = (runs, w, head) => new TableCell({
    borders, width: { size: w, type: WidthType.DXA },
    shading: head ? { fill: GREY, type: ShadingType.CLEAR } : undefined,
    margins: { top: 60, bottom: 60, left: 120, right: 120 },
    children: [P(runs)],
  });
  const rows = q.item.map((pg, i) => {
    const isNew = NEW_PAGES.has(pg.linkId);
    return new TableRow({ children: [
      cell([T(String(i + 1))], W[0]),
      cell([T(pg.text, { bold: isNew }), ...(isNew ? [T("  NÝTT", { bold: true, color: NEW })] : [])], W[1]),
      cell(conditionRuns(pg) || [T("Alltaf sýnd")], W[2]),
    ] });
  });
  return new Table({
    width: { size: 9026, type: WidthType.DXA }, columnWidths: W,
    rows: [new TableRow({ tableHeader: true, children: [
      cell([T("Síða", { bold: true })], W[0], true),
      cell([T("Heiti", { bold: true })], W[1], true),
      cell([T("Birtist ef", { bold: true })], W[2], true)] }), ...rows],
  });
}

// ---------------------------------------------------------------- document
const body = [];
body.push(P(T(title, { bold: true, size: 40, color: BLUE }), { spacing: { after: 120 } }));
body.push(P(T(`${q.title} · name: ${q.name}`, { color: "666666" }), { spacing: { after: 240 } }));

body.push(new Paragraph({ heading: HeadingLevel.HEADING_2, children: [T("Hvernig á að nota þetta skjal")] }));
for (const line of [
  "Farðu í gegnum skjalið í röð og búðu til hverja síðu og spurningu eins og hér stendur. Textinn í gráu reitunum er nákvæmlega sá texti sem á að líma inn.",
  "linkId er auðkenni spurningarinnar. Sláðu það inn nákvæmlega eins og hér stendur. Öll skilyrði vísa í þessi auðkenni og einn stafur skiptir máli.",
  "„Birtist ef“ þýðir að atriðið er falið þar til skilyrðið er uppfyllt. Atriði án þeirrar línu eru alltaf sýnileg.",
  "SKYLDA þýðir að ekki er hægt að halda áfram án svars.",
  "Í valmöguleikatöflum er kóðinn gildið sem skilyrðin vísa í. Ef Medalia leyfir aðeins texta, láttu skilyrðið vísa í textann í staðinn.",
  "Hjálpartexti birtist undir spurningunni. Skýring í reit er grái textinn inni í auða reitnum.",
]) body.push(new Paragraph({ numbering: { reference: "bullets", level: 0 }, children: [T(line)] }));

if (q.item.some((p) => NEW_PAGES.has(p.linkId))) {
  body.push(new Paragraph({ heading: HeadingLevel.HEADING_2, children: [T("Nýtt: skimun fyrir erindi utan umfangs")] }));
  body.push(P([T("Síðan „Hentar erindið fjarþjónustu?“ kemur strax á eftir öryggisskimuninni. "),
    T("Svari sjúklingur „Já“ fær hann skýringu og leiðbeiningar um hvert hann á að leita, og "),
    T("allar síður þar á eftir eru faldar", { bold: true }),
    T(". Til að það virki þarf að setja skilyrðið scope-gate = „Nei“ á síðurnar sem merktar eru þannig í töflunni hér fyrir neðan. "),
    T("Síður sem þegar hanga á spurningunni um eðli erindisins hverfa sjálfkrafa.")], { spacing: { after: 200 } }));
}

body.push(new Paragraph({ heading: HeadingLevel.HEADING_2, children: [T("Yfirlit: síður og greining")] }));
body.push(pageGateSummary());

q.item.forEach((pg, pi) => {
  const isNew = NEW_PAGES.has(pg.linkId);
  body.push(new Paragraph({ children: [new PageBreak()] }));
  body.push(new Paragraph({ heading: HeadingLevel.HEADING_1, children: [
    T(`Síða ${pi + 1} · ${pg.text}`), ...(isNew ? [T("  NÝTT", { color: NEW })] : [])] }));
  body.push(P([T("linkId síðu: ", { bold: true }), T(pg.linkId, { font: "Consolas" })]));
  const pc = conditionRuns(pg);
  body.push(P(pc ? [T("Öll síðan birtist ef: ", { bold: true }), ...pc] : [T("Sýnd öllum.", { bold: true })],
    { spacing: { after: 200 }, shading: pc ? { fill: AMBER, type: ShadingType.CLEAR } : undefined }));

  (pg.item || []).forEach((it, qi) => {
    body.push(new Paragraph({ heading: HeadingLevel.HEADING_3, keepNext: true, children: [
      T(`${pi + 1}.${qi + 1} · `), T(it.linkId, { font: "Consolas" })] }));
    const meta = [T(kind(it), { italics: true })];
    if (it.required) meta.push(T("  ·  SKYLDA", { bold: true, color: "C00000" }));
    body.push(P(meta, { keepNext: true }));

    const shade = { fill: GREY, type: ShadingType.CLEAR };
    if (it.type !== "display") body.push(P(T("Spurning:", { bold: true }), { keepNext: true }));
    body.push(...textBlock(it.text, shade));

    const cc = conditionRuns(it);
    if (cc) body.push(P([T("Birtist ef: ", { bold: true }), ...cc],
      { shading: { fill: AMBER, type: ShadingType.CLEAR }, spacing: { before: 80 } }));

    if (it.answerOption) { body.push(P(T(""))); body.push(optionsTable(it.answerOption)); }

    const ef = ext(it, ENTRY);
    if (ef) body.push(P([T("Skýring í reit: ", { italics: true, bold: true }), T(ef.valueString, { italics: true })], { spacing: { before: 80 } }));
    for (const child of it.item || []) {
      if (controlOf(child) === "help")
        body.push(P([T("Hjálpartexti: ", { italics: true, bold: true }), T(child.text, { italics: true })], { spacing: { before: 80 } }));
    }
    body.push(P(T(""), { spacing: { after: 120 } }));
  });
});

const doc = new Document({
  styles: {
    default: { document: { run: { font: "Calibri", size: 22 } } },
    paragraphStyles: [
      { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 32, bold: true, color: BLUE }, paragraph: { spacing: { before: 120, after: 120 }, outlineLevel: 0 } },
      { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 26, bold: true, color: BLUE }, paragraph: { spacing: { before: 240, after: 120 }, outlineLevel: 1 } },
      { id: "Heading3", name: "Heading 3", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 22, bold: true }, paragraph: { spacing: { before: 200, after: 60 }, outlineLevel: 2 } },
    ],
  },
  numbering: { config: [{ reference: "bullets", levels: [{ level: 0, format: LevelFormat.BULLET, text: "•",
    alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 540, hanging: 270 } } } }] }] },
  sections: [{
    properties: { page: { size: { width: 11906, height: 16838 },
      margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } } },
    footers: { default: new Footer({ children: [P([T(`${q.name} · bls. `), new TextRun({ children: [PageNumber.CURRENT] })],
      { alignment: AlignmentType.RIGHT })] }) },
    children: body,
  }],
});

Packer.toBuffer(doc).then((buf) => { fs.writeFileSync(dst, buf); console.log("wrote", dst); });
