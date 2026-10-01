// Snið 1 — „Dagatal": hreint og hlutlaust dagatalsblað á einni síðu.
// Vika í hverri röð, dagur tvískiptur (dagvinna að ofan, forvakt/bakvakt að
// neðan), eigin vaktir í lit læknisins og aðrir gráir.

import { PDFDocument, StandardFonts, type PDFPage } from "pdf-lib";
import { monthLabelL, weekdayShortL } from "../i18n/format";
import {
  BAND_WEEKEND, FAINT, GREY, HSU, INK, OUTSIDE, RED, RULE, WHITE,
  clip, prepare, safe, stamp, type Entry, type ShiftPdfInput,
} from "./shared";

export async function renderClassic(i: ShiftPdfInput): Promise<Uint8Array> {
  const { t, weeks, mineColor, ownCount, legend, multiDay, multiEve } = prepare(i);
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);

  const W = 841.89, H = 595.28, M = 26;
  const page: PDFPage = doc.addPage([W, H]);
  const monthLabel = monthLabelL(i.month, i.lang);

  // ── Haus ──
  let y = H - M;
  const title = i.doctor ? t("mine.title", { name: safe(i.doctor.name) }) : t("all.title");
  page.drawText(safe(title), { x: M, y: y - 14, size: 14, font: bold, color: INK });
  const right = safe(monthLabel);
  page.drawText(right, { x: W - M - bold.widthOfTextAtSize(right, 14), y: y - 14, size: 14, font: bold, color: HSU });
  y -= 22;
  page.drawLine({ start: { x: M, y }, end: { x: W - M, y }, thickness: 1.2, color: HSU });
  y -= 14;

  // ── Vikudagahaus (mánudagur fyrstur) ──
  const colW = (W - M * 2) / 7;
  for (let c = 0; c < 7; c++) {
    const label = safe(weekdayShortL((c + 1) % 7, i.lang));
    page.drawText(label, { x: M + c * colW + (colW - bold.widthOfTextAtSize(label, 9)) / 2, y: y - 9, size: 9, font: bold, color: GREY });
  }
  y -= 13;

  // ── Netið ──
  const footH = i.doctor ? 42 : 32;
  const gridTop = y;
  const rowH = (gridTop - M - footH) / weeks.length;
  const LINE = 7.6, SZ = 6.6;

  weeks.forEach((week, w) => {
    week.forEach((cell, c) => {
      const x = M + c * colW;
      const top = gridTop - w * rowH;
      if (!cell.date) {
        page.drawRectangle({ x, y: top - rowH, width: colW, height: rowH, color: OUTSIDE, borderColor: RULE, borderWidth: 0.6 });
        return;
      }
      const marked = cell.weekend || Boolean(cell.holiday);
      page.drawRectangle({ x, y: top - rowH, width: colW, height: rowH, color: marked ? BAND_WEEKEND : WHITE, borderColor: RULE, borderWidth: 0.6 });
      page.drawText(String(cell.dayNo), { x: x + 4, y: top - 10.5, size: 9, font: bold, color: marked ? HSU : INK });
      if (cell.holiday) {
        const w0 = bold.widthOfTextAtSize(String(cell.dayNo), 9) + 7;
        page.drawText(clip(safe(cell.holiday), font, 5.8, colW - w0 - 5), { x: x + w0, y: top - 10, size: 5.8, font, color: HSU });
      }

      const bodyTop = top - 13;
      const bodyH = rowH - 15;
      const mid = bodyTop - bodyH * 0.42;
      page.drawLine({ start: { x: x + 3, y: mid }, end: { x: x + colW - 3, y: mid }, thickness: 0.4, color: RULE });

      const drawPart = (list: Entry[], from: number, to: number, multi: boolean) => {
        const room = Math.max(0, Math.floor((from - to) / LINE));
        const show = list.slice(0, room);
        let ly = from;
        for (const e of show) {
          ly -= LINE;
          const tag = [multi ? e.short : "", e.time].filter(Boolean).join(" ");
          const f = e.own ? bold : font;
          const color = e.own ? mineColor : e.open ? RED : GREY;
          if (e.own) page.drawRectangle({ x: x + 2.5, y: ly - 1.4, width: colW - 5, height: LINE - 0.6, color: mineColor, opacity: 0.13 });
          let tx = x + 4.5;
          if (tag) {
            page.drawText(tag, { x: tx, y: ly + 0.4, size: 5.6, font, color: e.own ? mineColor : FAINT });
            tx += font.widthOfTextAtSize(tag, 5.6) + 3;
          }
          page.drawText(clip(e.who, f, SZ, x + colW - 4 - tx), { x: tx, y: ly, size: SZ, font: f, color });
        }
        if (list.length > show.length) {
          page.drawText(`+${list.length - show.length}`, { x: x + colW - 14, y: to + 1.5, size: 5.4, font, color: FAINT });
        }
      };
      drawPart(cell.day, bodyTop, mid + 1, multiDay);
      drawPart(cell.eve, mid - 1.5, bodyTop - bodyH, multiEve);
    });
  });

  // ── Fótur ──
  let fy = M + footH - 12;
  if (i.doctor) {
    page.drawRectangle({ x: M, y: fy - 1.5, width: 16, height: 7.5, color: mineColor, opacity: 0.13 });
    page.drawRectangle({ x: M, y: fy - 1.5, width: 16, height: 7.5, borderColor: mineColor, borderWidth: 0.6 });
    page.drawText(safe(`${t("all.youMark")} — ${t.n("mine.count", ownCount)}`), { x: M + 21, y: fy, size: 7.4, font: bold, color: mineColor });
    fy -= 11;
  }
  const legendText = legend.map((l) => `${l.short} = ${l.name} ${l.time}`).join("   ·   ");
  page.drawText(clip(safe(legendText), font, 6.6, W - M * 2), { x: M, y: fy, size: 6.6, font, color: GREY });
  fy -= 10;
  page.drawText(clip(safe(t("parts")), font, 6.6, W - M * 2 - 190), { x: M, y: fy, size: 6.6, font, color: FAINT });
  const foot = safe(t("foot", { month: monthLabel, at: stamp(i, i.lang) }));
  page.drawText(foot, { x: W - M - font.widthOfTextAtSize(foot, 6.6), y: fy, size: 6.6, font, color: FAINT });

  return doc.save();
}
