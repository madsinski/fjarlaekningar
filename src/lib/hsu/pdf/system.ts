// Snið 2 — „Vaktakerfi": blaðið lítur út eins og mánaðarplanið á skjánum.
//
// Sömu einingar og í viðmótinu (src/app/hsu/stjorn): hvít rúnnuð spjöld með
// slate-ramma, dagsetning í HSU-bláu, merking vaktategundar til vinstri og
// „pilla" með nafni til hægri — fyllt fyrir eigin vaktir, ljósgrá fyrir aðra og
// rauð strikuð „vantar" þegar enginn er á vaktinni.

import { PDFDocument, StandardFonts, type Color, type PDFFont, type PDFPage } from "pdf-lib";
import { monthLabelL, weekdayShortL } from "../i18n/format";
import {
  HSU, INK, RED, SLATE50, SLATE100, SLATE200, SLATE400, SLATE500, SLATE700, WHITE,
  clip, initials, prepare, roundRect, safe, stamp, type Entry, type ShiftPdfInput,
} from "./shared";

export async function renderSystem(i: ShiftPdfInput): Promise<Uint8Array> {
  const { t, weeks, mineColor, ownCount, legend, multiDay, multiEve } = prepare(i);
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);

  const W = 841.89, H = 595.28, M = 24;
  const page: PDFPage = doc.addPage([W, H]);
  page.drawRectangle({ x: 0, y: 0, width: W, height: H, color: SLATE50 });
  const monthLabel = monthLabelL(i.month, i.lang);

  // ── Haus: eins og efsta stikan í kerfinu ──
  let y = H - M;
  const unit = safe(i.unitName || t("unit"));
  page.drawText(unit, { x: M, y: y - 13, size: 13, font: bold, color: INK });
  page.drawText(safe(t("eyebrow")), { x: M, y: y - 23, size: 7, font: bold, color: SLATE400 });

  // Mánuðurinn til hægri, og merki læknisins eins og í notendahnappinum.
  const mLabel = safe(monthLabel);
  const mW = bold.widthOfTextAtSize(mLabel, 14);
  page.drawText(mLabel, { x: W - M - mW, y: y - 14, size: 14, font: bold, color: HSU });
  if (!i.doctor) {
    // Hlutlaust mánaðarblað: titillinn segir hvað skjalið er.
    const lbl = safe(t("all.title"));
    page.drawText(lbl, { x: W - M - font.widthOfTextAtSize(lbl, 8.5), y: y - 30.5, size: 8.5, font, color: SLATE500 });
  } else {
    const nm = safe(i.doctor.name);
    const nmW = font.widthOfTextAtSize(nm, 8.5);
    const chipW = nmW + 30;
    roundRect(page, { x: W - M - chipW, y: y - 36, w: chipW, h: 16, r: 8, color: WHITE, border: SLATE200 });
    page.drawCircle({ x: W - M - chipW + 10, y: y - 28, size: 6.5, color: mineColor });
    const ini = initials(i.doctor.name);
    page.drawText(ini, { x: W - M - chipW + 10 - bold.widthOfTextAtSize(ini, 5.6) / 2, y: y - 30, size: 5.6, font: bold, color: WHITE });
    page.drawText(nm, { x: W - M - chipW + 20, y: y - 30.5, size: 8.5, font, color: SLATE700 });
  }
  y -= 42;

  // ── Vikudagahaus ──
  const colW = (W - M * 2) / 7;
  for (let c = 0; c < 7; c++) {
    const label = safe(weekdayShortL((c + 1) % 7, i.lang)).toUpperCase();
    page.drawText(label, { x: M + c * colW + (colW - bold.widthOfTextAtSize(label, 7.5)) / 2, y: y - 7.5, size: 7.5, font: bold, color: SLATE400 });
  }
  y -= 13;

  // ── Netið: eitt spjald á dag, 4 pt bil á milli ──
  const footH = 40;
  const gridTop = y;
  const rowH = (gridTop - M - footH) / weeks.length;
  const GAP = 3.5;
  const cardW = colW - GAP, cardH = rowH - GAP;

  const LBL = 17;      // breidd merkingardálks (FM / FV1 / BV1)
  const ROW = 12.5;    // hæð einnar raðar í spjaldinu

  weeks.forEach((week, w) => {
    week.forEach((cell, c) => {
      const x = M + c * colW + GAP / 2;
      const top = gridTop - w * rowH - GAP / 2;
      if (!cell.date) return; // dagar utan mánaðar eru auðir — eins og á skjánum

      const marked = cell.weekend || Boolean(cell.holiday);
      roundRect(page, { x, y: top - cardH, w: cardW, h: cardH, r: 9, color: marked ? SLATE50 : WHITE, border: SLATE200 });

      // Dagsetning efst til vinstri.
      page.drawText(String(cell.dayNo), { x: x + 7, y: top - 13, size: 9.5, font: bold, color: HSU });
      if (cell.holiday) {
        const w0 = bold.widthOfTextAtSize(String(cell.dayNo), 9.5) + 11;
        page.drawText(clip(safe(cell.holiday), font, 5.6, cardW - w0 - 6), { x: x + w0, y: top - 12.5, size: 5.6, font, color: SLATE400 });
      }

      // Raðir: dagvinna efst, svo strikuð lína, svo forvakt/bakvakt.
      let ry = top - 17;
      const drawRow = (e: Entry, multi: boolean) => {
        const cy = ry - ROW + 2.5;
        if (multi || e.short) {
          page.drawText(safe(e.short), { x: x + 7, y: cy + 2.2, size: 5.8, font: bold, color: SLATE400 });
        }
        const px = x + 7 + LBL;
        const pw = cardW - 14 - LBL;
        const label = e.open ? safe(t("vantar")) : e.who;
        if (e.open) {
          // Strikuð rauð pilla — eins og tómt hólf í vaktaplaninu.
          roundRect(page, { x: px, y: cy, w: pw, h: 10.5, r: 5, border: RED, borderWidth: 0.7, dash: [2, 1.6] });
          const lw = bold.widthOfTextAtSize(label, 6.2);
          page.drawText(label, { x: px + (pw - lw) / 2, y: cy + 3, size: 6.2, font: bold, color: RED });
        } else {
          // Blað eins læknis: hans vaktir í hans lit, aðrir hógværir og gráir.
          // Blað ritarans (enginn tiltekinn læknir): HVER læknir í sínum lit,
          // eins og á skjánum — þá les maður planið í fljótu bragði.
          const colored = i.doctor ? e.own : true;
          const fill = colored ? (e.own ? mineColor : e.color) : SLATE100;
          roundRect(page, { x: px, y: cy, w: pw, h: 10.5, r: 5, color: fill, border: colored ? undefined : SLATE200 });
          const txt = clip(e.who, bold, 6.4, pw - 8);
          const lw = bold.widthOfTextAtSize(txt, 6.4);
          page.drawText(txt, { x: px + (pw - lw) / 2, y: cy + 3, size: 6.4, font: bold, color: colored ? WHITE : SLATE700 });
        }
        if (e.time) page.drawText(safe(e.time), { x: px + pw - font.widthOfTextAtSize(safe(e.time), 4.6) - 3, y: cy + 11.5, size: 4.6, font, color: SLATE400 });
        ry -= ROW;
      };

      // Dagvinna: fleiri en ein pilla á sömu röð ef pláss leyfir (eins og FM-hólfin).
      const room = Math.max(0, Math.floor((ry - (top - cardH + 4)) / ROW));
      const dayShow = cell.day.slice(0, Math.max(0, Math.min(cell.day.length, room - cell.eve.length)));
      for (const e of dayShow) drawRow(e, multiDay);
      if (dayShow.length) {
        page.drawLine({ start: { x: x + 7, y: ry + 1 }, end: { x: x + cardW - 7, y: ry + 1 }, thickness: 0.5, color: SLATE200, dashArray: [1.6, 1.6] });
        ry -= 2.5;
      }
      const eveShow = cell.eve.slice(0, Math.max(0, Math.floor((ry - (top - cardH + 4)) / ROW)));
      for (const e of eveShow) drawRow(e, multiEve);
      const hidden = cell.day.length - dayShow.length + (cell.eve.length - eveShow.length);
      if (hidden > 0) page.drawText(`+${hidden}`, { x: x + cardW - 16, y: top - cardH + 4, size: 5.4, font, color: SLATE400 });
    });
  });

  // ── Fótur: skýringar eins og undir vaktaplaninu ──
  let fx = M;
  const fy = M + 16;
  const dot = (color: Color, label: string, f: PDFFont = font) => {
    page.drawCircle({ x: fx + 3, y: fy + 2.5, size: 3, color });
    page.drawText(safe(label), { x: fx + 9, y: fy, size: 6.8, font: f, color: SLATE500 });
    fx += 9 + f.widthOfTextAtSize(safe(label), 6.8) + 14;
  };
  if (i.doctor) {
    dot(mineColor, `${t("all.youMark")} — ${t.n("mine.count", ownCount)}`, bold);
    dot(SLATE100, t("others"));
  }
  // „vantar" fær strikaðan hring svo hann líkist tómu hólfi.
  page.drawCircle({ x: fx + 3, y: fy + 2.5, size: 3, borderColor: RED, borderWidth: 0.7, borderDashArray: [1.4, 1.2] });
  page.drawText(safe(t("vantar")), { x: fx + 9, y: fy, size: 6.8, font, color: SLATE500 });
  fx += 9 + font.widthOfTextAtSize(safe(t("vantar")), 6.8) + 14;

  const legendText = legend.map((l) => `${l.short} = ${l.name} ${l.time}`).join("   ·   ");
  page.drawText(clip(safe(legendText), font, 6.4, W - M - fx - 10), { x: fx, y: fy, size: 6.4, font, color: SLATE400 });

  const foot = safe(t("foot", { month: monthLabel, at: stamp(i, i.lang) }));
  page.drawText(foot, { x: W - M - font.widthOfTextAtSize(foot, 6.2), y: M + 4, size: 6.2, font, color: SLATE400 });
  page.drawText(safe(t("parts")), { x: M, y: M + 4, size: 6.2, font, color: SLATE400 });

  return doc.save();
}
