// Snið 3 — „Djarft": blað sem á að vera gaman að hengja upp.
//
// HUGMYNDIN: augað á að fara á þrjá staði í réttri röð.
//   1. STÓRA TALAN — hve margar vaktir þú átt í mánuðinum, í þínum lit.
//   2. TAKTBORÐINN — 31 strik yfir blaðið; þínir dagar rísa upp í þínum lit,
//      hinir eru daufir. Þú sérð álagið í mánuðinum í einni svipan.
//   3. NETIÐ — smáatriðin, viljandi hljóðlát: engir rammar, aðeins hárfínar
//      línur, og aðeins ÞÍNAR vaktir bera lit. Aðrir læknar eru draugagráir.
//
// Dökki flöturinn er aðeins efst (fjórðungur blaðsins) — heilt svart blað er
// fallegt á skjá en vont í prentara.

import { PDFDocument, StandardFonts, rgb, type PDFPage } from "pdf-lib";
import { monthLabelL, weekdayShortL } from "../i18n/format";
import { clip, initials, prepare, roundRect, safe, stamp, type Entry, type ShiftPdfInput } from "./shared";

const NIGHT = rgb(0.043, 0.082, 0.165);     // djúpur næturblár
const NIGHT_SOFT = rgb(0.129, 0.184, 0.286);
const PAPER = rgb(1, 1, 1);
const GHOST = rgb(0.682, 0.718, 0.776);     // aðrir læknar — draugagráir
const HAIR = rgb(0.902, 0.922, 0.945);
const DIM = rgb(0.451, 0.502, 0.580);
const OPENC = rgb(0.847, 0.420, 0.388);

export async function renderBold(i: ShiftPdfInput): Promise<Uint8Array> {
  const { t, weeks, mineColor, ownCount, ownDays, legend, multiDay, multiEve, dates } = prepare(i);
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);

  const W = 841.89, H = 595.28, M = 34;
  const page: PDFPage = doc.addPage([W, H]);
  const monthLabel = monthLabelL(i.month, i.lang);
  const [monthWord, yearWord] = (() => {
    const p = safe(monthLabel).split(" ");
    return [p.slice(0, -1).join(" ").toUpperCase(), p[p.length - 1]];
  })();

  // ── 1. Dökki flöturinn ────────────────────────────────────────────────────
  const bandH = 168;
  page.drawRectangle({ x: 0, y: H - bandH, width: W, height: bandH, color: NIGHT });
  // Hógvær litaslikja í lit læknisins, hægra megin — gefur blaðinu eiganda.
  page.drawRectangle({ x: W * 0.62, y: H - bandH, width: W * 0.38, height: bandH, color: mineColor, opacity: 0.16 });

  page.drawText(safe(i.unitName || t("unit")).toUpperCase(), { x: M, y: H - M - 7, size: 7, font: bold, color: NIGHT_SOFT });
  page.drawText(safe(t("eyebrow")), { x: M + bold.widthOfTextAtSize(safe(i.unitName || t("unit")).toUpperCase(), 7) + 10, y: H - M - 7, size: 7, font: bold, color: mineColor });

  // Mánuðurinn í stóru — kjölfesta blaðsins.
  page.drawText(monthWord, { x: M, y: H - M - 52, size: 40, font: bold, color: PAPER });
  page.drawText(yearWord, { x: M + bold.widthOfTextAtSize(monthWord, 40) + 10, y: H - M - 52, size: 40, font, color: PAPER, opacity: 0.38 });

  // Stóra talan: fjöldi eigin vakta.
  if (i.doctor) {
    const n = String(ownCount);
    const nW = bold.widthOfTextAtSize(n, 54);
    page.drawText(n, { x: W - M - nW, y: H - M - 56, size: 54, font: bold, color: mineColor });
    const lines = [safe(i.doctor.name), safe(t.n("mine.count", ownCount))];
    lines.forEach((s, k) => {
      const w = (k === 0 ? bold : font).widthOfTextAtSize(s, k === 0 ? 10 : 8);
      page.drawText(s, { x: W - M - nW - 12 - w, y: H - M - 30 - k * 13, size: k === 0 ? 10 : 8, font: k === 0 ? bold : font, color: k === 0 ? PAPER : DIM });
    });
  } else {
    page.drawText(safe(t("all.title")), { x: W - M - bold.widthOfTextAtSize(safe(t("all.title")), 12), y: H - M - 34, size: 12, font: bold, color: PAPER });
  }

  // ── 2. Taktborðinn ────────────────────────────────────────────────────────
  const ribY = H - bandH + 30;
  const ribW = W - M * 2;
  const slot = ribW / dates.length;
  const perDay = new Map<number, number>();
  for (const d of ownDays) perDay.set(d, (perDay.get(d) ?? 0) + 1);
  page.drawText(safe(i.doctor ? t("rhythm") : t("eyebrow")), { x: M, y: ribY + 30, size: 7, font: bold, color: NIGHT_SOFT });
  for (let d = 1; d <= dates.length; d++) {
    const x = M + (d - 1) * slot;
    const n = perDay.get(d) ?? 0;
    const h = n ? 7 + n * 6 : 3;
    const col = n ? mineColor : PAPER;
    roundRect(page, { x: x + 0.8, y: ribY, w: Math.max(2.5, slot - 2.4), h, r: 1.4, color: col, opacity: n ? 1 : 0.16 });
    if (d === 1 || d % 7 === 0 || d === dates.length) {
      page.drawText(String(d), { x: x + 0.8, y: ribY - 9, size: 5.6, font, color: NIGHT_SOFT });
    }
  }

  // ── 3. Netið — hljóðlátt ──────────────────────────────────────────────────
  const colW = (W - M * 2) / 7;
  let y = H - bandH - 16;
  for (let c = 0; c < 7; c++) {
    const label = safe(weekdayShortL((c + 1) % 7, i.lang)).toUpperCase();
    page.drawText(label, { x: M + c * colW, y: y - 7, size: 6.6, font: bold, color: DIM });
  }
  y -= 12;
  page.drawLine({ start: { x: M, y }, end: { x: W - M, y }, thickness: 0.8, color: NIGHT, opacity: 0.8 });

  const footH = 30;
  const gridTop = y - 2;
  const rowH = (gridTop - M - footH) / weeks.length;
  const LINE = 7.4, SZ = 6.4;

  weeks.forEach((week, w) => {
    const top = gridTop - w * rowH;
    if (w > 0) page.drawLine({ start: { x: M, y: top }, end: { x: W - M, y: top }, thickness: 0.5, color: HAIR });
    week.forEach((cell, c) => {
      const x = M + c * colW;
      if (!cell.date) return;
      const hasOwn = [...cell.day, ...cell.eve].some((e) => e.own);

      // Dagur sem þú átt vakt á fær þunna lóðrétta stiku í þínum lit.
      if (hasOwn) {
        page.drawRectangle({ x: x - 3, y: top - rowH + 4, width: 1.8, height: rowH - 8, color: mineColor });
        page.drawRectangle({ x: x - 3, y: top - rowH + 4, width: colW - 2, height: rowH - 8, color: mineColor, opacity: 0.05 });
      }
      page.drawText(String(cell.dayNo), { x, y: top - 11, size: hasOwn ? 11 : 9.5, font: bold, color: hasOwn ? mineColor : cell.weekend || cell.holiday ? DIM : rgb(0.26, 0.31, 0.39) });
      if (cell.holiday) {
        page.drawText(clip(safe(cell.holiday), font, 5.4, colW - 26), { x: x + bold.widthOfTextAtSize(String(cell.dayNo), 10) + 5, y: top - 10.5, size: 5.4, font, color: OPENC });
      }

      let ly = top - 16;
      const drawPart = (list: Entry[], multi: boolean, limit: number) => {
        for (const e of list.slice(0, limit)) {
          ly -= LINE;
          const tag = [multi ? e.short : "", e.time].filter(Boolean).join(" ");
          if (e.own) {
            // Eigin vakt: fylltur reitur í þínum lit — eina litaða atriðið í netinu.
            const label = [tag, e.who].filter(Boolean).join(" · ");
            const tw = Math.min(colW - 10, bold.widthOfTextAtSize(label, SZ) + 9);
            roundRect(page, { x, y: ly - 1.8, w: tw, h: LINE - 0.4, r: 3, color: mineColor });
            page.drawText(clip(label, bold, SZ, tw - 8), { x: x + 4.5, y: ly, size: SZ, font: bold, color: PAPER });
          } else {
            let tx = x;
            if (tag) {
              page.drawText(tag, { x: tx, y: ly + 0.3, size: 5.2, font, color: HAIR });
              tx += font.widthOfTextAtSize(tag, 5.2) + 3;
            }
            page.drawText(clip(e.who, font, SZ, x + colW - 8 - tx), { x: tx, y: ly, size: SZ, font, color: e.open ? OPENC : GHOST });
          }
        }
      };
      const room = Math.max(0, Math.floor((ly - (top - rowH + 3)) / LINE));
      const dayLimit = Math.max(0, Math.min(cell.day.length, room - cell.eve.length));
      drawPart(cell.day, multiDay, dayLimit);
      if (dayLimit && cell.eve.length) {
        page.drawLine({ start: { x, y: ly - 1.5 }, end: { x: x + colW * 0.42, y: ly - 1.5 }, thickness: 0.4, color: HAIR });
        ly -= 3;
      }
      drawPart(cell.eve, multiEve, Math.max(0, Math.floor((ly - (top - rowH + 3)) / LINE)));
    });
  });

  // ── Fótur ─────────────────────────────────────────────────────────────────
  const fy = M - 8;
  let fx = M;
  if (i.doctor) {
    roundRect(page, { x: fx, y: fy - 1, w: 14, h: 8, r: 3, color: mineColor });
    page.drawText(safe(t("all.youMark")), { x: fx + 19, y: fy, size: 6.6, font: bold, color: NIGHT });
    fx += 19 + bold.widthOfTextAtSize(safe(t("all.youMark")), 6.6) + 14;
    page.drawText(safe(t("others")), { x: fx, y: fy, size: 6.6, font, color: GHOST });
    fx += font.widthOfTextAtSize(safe(t("others")), 6.6) + 14;
  }
  const legendText = legend.map((l) => `${l.short} ${l.name} ${l.time}`).join("   ·   ");
  page.drawText(clip(safe(legendText), font, 6.2, W - M - fx - 150), { x: fx, y: fy, size: 6.2, font, color: DIM });
  const foot = safe(t("foot", { month: monthLabel, at: stamp(i, i.lang) }));
  page.drawText(foot, { x: W - M - font.widthOfTextAtSize(foot, 6.2), y: fy, size: 6.2, font, color: DIM });

  // Merki læknisins neðst til hægri í hausnum — lítið en persónulegt.
  if (i.doctor) {
    const ini = initials(i.doctor.name);
    page.drawCircle({ x: W - M - 8, y: H - M - 9, size: 9, color: mineColor });
    page.drawText(ini, { x: W - M - 8 - bold.widthOfTextAtSize(ini, 7.5) / 2, y: H - M - 11.5, size: 7.5, font: bold, color: PAPER });
  }

  return doc.save();
}
