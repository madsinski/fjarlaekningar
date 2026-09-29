// Renders almenn-svarsnidmat.json into a copy-paste sheet for Medalia (.docx).
// Usage: node render-docx.js <in.json> <out.docx>   (needs the `docx` package)
const fs = require("fs");
const {
  Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow,
  TableCell, WidthType, ShadingType, BorderStyle, LevelFormat, PageBreak,
  Footer, PageNumber, AlignmentType,
} = require("docx");

const [, , src, dst] = process.argv;
const { common: C, templates: T } = JSON.parse(fs.readFileSync(src, "utf8"));

const FONT = "Calibri";
const GREY = "6B7280";
const p = (text, o = {}) =>
  new Paragraph({ spacing: { after: 120 }, ...o.para, children: [new TextRun({ text, font: FONT, size: 22, ...o.run })] });
const bullet = (text) =>
  new Paragraph({ numbering: { reference: "dot", level: 0 }, spacing: { after: 60 }, children: [new TextRun({ text, font: FONT, size: 22 })] });
const h = (text, level = HeadingLevel.HEADING_2) => new Paragraph({ heading: level, spacing: { before: 240, after: 120 }, children: [new TextRun({ text, font: FONT })] });
const sub = (text) => p(text, { run: { bold: true, size: 24 }, para: { spacing: { before: 200, after: 80 } } });
const note = (text) => p(text, { run: { italics: true, color: GREY, size: 20 } });

const none = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
function infoTable(t) {
  const row = (label, lines, fill) =>
    new TableRow({
      children: [
        new TableCell({ width: { size: 2200, type: WidthType.DXA }, shading: { type: ShadingType.CLEAR, fill: "EEF2F7" },
          children: [p(label, { run: { bold: true } })] }),
        new TableCell({ width: { size: 7200, type: WidthType.DXA }, shading: fill ? { type: ShadingType.CLEAR, fill } : undefined,
          children: lines.map((l) => p(l)) }),
      ],
    });
  return new Table({
    width: { size: 9400, type: WidthType.DXA },
    rows: [
      row("Nafn sniðmáts", [t.name]),
      row("ICD-10", [`${t.icd} — ${t.icd_name}`]),
      row("Tillaga að lyfseðli", t.rx),
      row("Fyrir lækni (ekki sent)", t.notes, "FFF7E6"),
    ],
  });
}

function greeting() {
  return [
    note("Kveðja — sömu blokkir og í núverandi sniðmáti:"),
    note("Falið (aðeins breytur): Skjólstæðingur → gender"),
    note("Skilyrt, sýna ef kyn equals „Karl“:  Sæll Skjólstæðingur → firstName,"),
    note("Skilyrt, sýna ef kyn equals „Kona“:  Sæl Skjólstæðingur → firstName,"),
  ];
}

const children = [
  new Paragraph({ heading: HeadingLevel.TITLE, children: [new TextRun({ text: "Svarsniðmát — almenn fjarþjónusta", font: FONT })] }),
  p("Fimmtán algeng vandamál sem falla ekki undir hina erindaflokkana. Hvert sniðmát er á sinni síðu: fyrst upplýsingar fyrir lækninn (nafn, ICD-10, tillaga að lyfseðli, hvenær sniðmátið á ekki við), síðan svartextinn sem fer til sjúklingsins."),
  p("Tillögur að lyfseðlum eru leiðbeinandi. Læknirinn staðfestir lyf, styrkleika, skammta og frábendingar í Sérlyfjaskrá og aðlagar að sjúklingnum hverju sinni. Kaflarnir „Versnun á einkennum“ og „Hafa samband“ eru eins í öllum sniðmátum; aðeins viðvörunarmerkin efst í versnunarkaflanum eru sértæk."),
  p("Ábending: bættu við þriðju skilyrtu kveðjunni, „Góðan dag Skjólstæðingur → firstName,“, sem birtist ef kyn er hvorki „Karl“ né „Kona“ eða vantar, svo enginn fái svar án kveðju.", { run: { italics: true } }),
];

T.forEach((t, i) => {
  children.push(new Paragraph({ children: [new PageBreak()] }));
  children.push(h(`${i + 1}. ${t.name}`, HeadingLevel.HEADING_1));
  children.push(infoTable(t));
  children.push(h("Svartexti — afrita í Medalia"));
  children.push(...greeting());
  children.push(p(t.mat));
  children.push(p(C.med_lead));
  t.med.forEach((m) => children.push(bullet(m)));
  if (t.rx_sent) children.push(p(C.rx_sent));
  children.push(sub("Versnun á einkennum"));
  children.push(p(t.versnun_lead));
  t.versnun.forEach((v) => children.push(bullet(v)));
  if (t.bratt) children.push(p(t.bratt, { run: { bold: true } }));
  children.push(p(C.versnun_std));
  children.push(sub("Almennar ráðleggingar"));
  t.rad.forEach((r) => children.push(bullet(r)));
  children.push(sub("Hafa samband"));
  C.hafa_samband.forEach((x) => children.push(p(x)));
  children.push(p(C.kvedja));
});

const doc = new Document({
  numbering: { config: [{ reference: "dot", levels: [{ level: 0, format: LevelFormat.BULLET, text: "•", alignment: AlignmentType.LEFT,
    style: { paragraph: { indent: { left: 360, hanging: 260 } } } }] }] },
  sections: [{
    properties: { page: { margin: { top: 1000, bottom: 1000, left: 1100, right: 1100 } } },
    footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER,
      children: [new TextRun({ children: ["Svarsniðmát — almenn fjarþjónusta · bls. ", PageNumber.CURRENT], font: FONT, size: 18, color: GREY })] })] }) },
    children,
  }],
});
Packer.toBuffer(doc).then((b) => { fs.writeFileSync(dst, b); console.log("wrote " + dst); });
