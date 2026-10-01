// Vaktaplan mánaðarins á PDF — til að prenta og hengja á birtingarpóstinn.
//
// Tvennt í skjalinu:
//   1. „Vaktirnar þínar“ — aðeins vaktir viðtakandans, í dagsröð.
//   2. „Vaktaplan mánaðarins“ — allir dagar og allir læknar, ein lína á dag.
//
// Helvetica/WinAnsi nær yfir íslensku stafina (þ æ ö á é í ó ú ý ð); stafir
// utan CP1252 eru skipt út svo drawText geti ekki kastað. Sama aðferð og í
// src/lib/contract-pdf.ts.

import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import { translator, type Lang } from "./i18n/core";
import { dayLabelL, holidayL, monthLabelL, weekdayShortL, weekdayOfDate } from "./i18n/format";
import { shiftPdf } from "./i18n/messages/shift-pdf";
import { datesInMonth, hhmm, holidayName, type HsuShift, type HsuShiftType } from "./types";

export interface ShiftPdfInput {
  month: string;
  lang: Lang;
  /** Viðtakandinn — vaktir hans eru taldar fyrst. Sleppt: aðeins mánaðarplanið. */
  doctor?: { id: string; name: string };
  shifts: HsuShift[];
  types: HsuShiftType[];
  doctors: { id: string; name: string }[];
  /** Hvenær planið var birt (fótur skjalsins). */
  publishedAt?: string | null;
}

const CP1252_HIGH = new Set([
  0x20ac, 0x201a, 0x0192, 0x201e, 0x2026, 0x2020, 0x2021, 0x02c6, 0x2030, 0x0160,
  0x2039, 0x0152, 0x017d, 0x2018, 0x2019, 0x201c, 0x201d, 0x2022, 0x2013, 0x2014,
  0x02dc, 0x2122, 0x0161, 0x203a, 0x0153, 0x017e, 0x0178,
]);
function safe(s: string): string {
  let out = "";
  for (const ch of (s || "").normalize("NFC")) {
    const c = ch.codePointAt(0)!;
    out += c <= 0xff || CP1252_HIGH.has(c) ? ch : "-";
  }
  return out;
}

/** Fornafn + fyrsti stafur eftirnafns: „Áslaug D.“ — nöfnin verða að komast í dálk. */
function shortName(name: string): string {
  const parts = safe(name).trim().split(/\s+/);
  if (parts.length < 2) return parts[0] ?? "";
  return `${parts[0]} ${parts[1][0]}.`;
}

const INK = rgb(0.06, 0.09, 0.16);
const MUTED = rgb(0.42, 0.47, 0.55);
const RULE = rgb(0.85, 0.88, 0.92);
const BAND = rgb(0.95, 0.965, 0.98);
const BRAND = rgb(0.11, 0.31, 0.57);

export async function buildShiftPdf(i: ShiftPdfInput): Promise<Uint8Array> {
  const t = translator(shiftPdf, i.lang);
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);

  // A4 á langsnið fyrir mánaðartöfluna; fyrsta síðan er líka langsnið svo
  // skjalið sé eitt samfellt prentverk.
  const W = 841.89, H = 595.28, M = 40;
  let page: PDFPage = doc.addPage([W, H]);
  let y = H - M;

  const monthLabel = monthLabelL(i.month, i.lang);
  const nameOf = new Map(i.doctors.map((d) => [d.id, d.name]));
  const typeOf = new Map(i.types.map((x) => [x.id, x]));
  const dates = datesInMonth(i.month);

  const newPage = () => { page = doc.addPage([W, H]); y = H - M; };
  const ensure = (h: number) => { if (y - h < M + 24) { newPage(); return true; } return false; };
  const text = (s: string, x: number, size: number, f: PDFFont = font, color = INK) =>
    page.drawText(safe(s), { x, y: y - size, size, font: f, color });

  const heading = (title: string, sub?: string) => {
    text(title, M, 16, bold, INK);
    if (sub) {
      const w = bold.widthOfTextAtSize(safe(title), 16);
      text(sub, M + w + 10, 10.5, font, MUTED);
    }
    y -= 26;
    page.drawLine({ start: { x: M, y: y + 6 }, end: { x: W - M, y: y + 6 }, thickness: 1.2, color: BRAND });
    y -= 10;
  };

  // ── 1. Vaktirnar þínar ────────────────────────────────────────────────────
  const mine = i.doctor
    ? i.shifts.filter((s) => s.doctor_id === i.doctor!.id).sort((a, b) => a.shift_date.localeCompare(b.shift_date) || a.starts.localeCompare(b.starts))
    : [];

  if (i.doctor) {
    heading(t("mine.title", { name: safe(i.doctor.name) }), monthLabel);
    if (!mine.length) {
      text(t("mine.none", { month: monthLabel }), M, 11, font, MUTED);
      y -= 24;
    } else {
      const cols = [M, M + 150, M + 330, M + 470, M + 600];
      const labels = [t("col.day"), t("col.shift"), t("col.time"), t("col.with"), t("col.note")];
      const row = (vals: string[], f: PDFFont, color = INK) => {
        vals.forEach((v, n) => {
          const maxW = (cols[n + 1] ?? W - M) - cols[n] - 8;
          page.drawText(clip(safe(v), f, 10, maxW), { x: cols[n], y: y - 10, size: 10, font: f, color });
        });
      };
      row(labels, bold, MUTED);
      y -= 16;
      page.drawLine({ start: { x: M, y: y + 4 }, end: { x: W - M, y: y + 4 }, thickness: 0.8, color: RULE });
      y -= 6;
      let shaded = false;
      for (const s of mine) {
        if (ensure(20)) { row(labels, bold, MUTED); y -= 20; }
        shaded = !shaded;
        if (shaded) page.drawRectangle({ x: M - 4, y: y - 14, width: W - M * 2 + 8, height: 18, color: BAND });
        const ty = s.shift_type_id ? typeOf.get(s.shift_type_id) : undefined;
        const hol = holidayL(holidayName(s.shift_date), i.lang);
        const day = `${weekdayShortL(weekdayOfDate(s.shift_date), i.lang)} ${dayLabelL(s.shift_date, i.lang)}`;
        // Hverjir eru á sömu vakt sama dag (t.d. tveir á flýtimóttöku, bakvakt á bak við forvakt).
        const with_ = i.shifts
          .filter((o) => o.shift_date === s.shift_date && o.doctor_id && o.doctor_id !== i.doctor!.id && o.id !== s.id)
          .map((o) => `${shortName(nameOf.get(o.doctor_id!) ?? "")} (${(o.shift_type_id ? typeOf.get(o.shift_type_id)?.short : "") || "?"})`)
          .join(", ");
        row([
          hol ? `${day} — ${hol}` : day,
          ty ? `${ty.name} (${ty.short})` : s.label || t("shift.extra"),
          `${hhmm(s.starts)}–${hhmm(s.ends)}`,
          with_,
          s.note ?? "",
        ], font);
        y -= 18;
      }
      y -= 6;
      text(t.n("mine.count", mine.length), M, 10, bold, BRAND);
      y -= 22;
    }
  }

  // ── 2. Vaktaplan mánaðarins ───────────────────────────────────────────────
  // Dálkur á hverja vaktategund sem er notuð í mánuðinum, í þeirra röð.
  const used = i.types
    .filter((ty) => i.shifts.some((s) => s.shift_type_id === ty.id))
    .sort((a, b) => (a.period === b.period ? 0 : a.period === "day" ? -1 : 1) || a.sort - b.sort || a.short.localeCompare(b.short));
  const extras = i.shifts.filter((s) => !s.shift_type_id);

  if (i.doctor) newPage();
  heading(t("all.title"), monthLabel);

  const dayW = 112;
  const colW = Math.max(60, Math.floor((W - M * 2 - dayW - (extras.length ? 90 : 0)) / Math.max(1, used.length)));
  const xOf = (n: number) => M + dayW + n * colW;
  const header = () => {
    text(t("col.day"), M, 9.5, bold, MUTED);
    used.forEach((ty, n) => page.drawText(safe(ty.short), { x: xOf(n), y: y - 9.5, size: 9.5, font: bold, color: MUTED }));
    if (extras.length) page.drawText(safe(t("col.extra")), { x: xOf(used.length), y: y - 9.5, size: 9.5, font: bold, color: MUTED });
    y -= 15;
    page.drawLine({ start: { x: M, y: y + 4 }, end: { x: W - M, y: y + 4 }, thickness: 0.8, color: RULE });
    y -= 4;
  };
  header();

  const cell = (v: string, x: number, maxW: number, f: PDFFont, color = INK) => {
    const s = clip(safe(v), f, 8.6, maxW);
    if (s) page.drawText(s, { x, y: y - 10, size: 8.6, font: f, color });
  };

  for (const date of dates) {
    const wd = weekdayOfDate(date);
    const hol = holidayL(holidayName(date), i.lang);
    const weekend = wd === 0 || wd === 6;
    const onDay = i.shifts.filter((s) => s.shift_date === date);
    // Hæð línunnar fer eftir flestu sem þarf að stafla í einn dálk.
    const stack = Math.max(1, ...used.map((ty) => onDay.filter((s) => s.shift_type_id === ty.id).length), extras.filter((s) => s.shift_date === date).length || 1);
    const h = 4 + stack * 11;
    if (ensure(h + 6)) header();
    if (weekend || hol) page.drawRectangle({ x: M - 4, y: y - h + 6, width: W - M * 2 + 8, height: h, color: BAND });
    const dayTxt = `${weekdayShortL(wd, i.lang)} ${date.slice(8)}. ${hol ? `• ${hol}` : ""}`.trim();
    cell(dayTxt, M, dayW - 6, weekend || hol ? bold : font, weekend || hol ? BRAND : INK);
    used.forEach((ty, n) => {
      const list = onDay.filter((s) => s.shift_type_id === ty.id).sort((a, b) => (a.slot_index ?? 0) - (b.slot_index ?? 0) || a.starts.localeCompare(b.starts));
      list.forEach((s, k) => {
        const who = s.doctor_id ? shortName(nameOf.get(s.doctor_id) ?? "") : t("all.open");
        const mineMark = i.doctor && s.doctor_id === i.doctor.id;
        const saveY = y; y -= k * 11;
        cell(mineMark ? `> ${who}` : who, xOf(n), colW - 6, mineMark ? bold : font, s.doctor_id ? (mineMark ? BRAND : INK) : MUTED);
        y = saveY;
      });
    });
    const ex = extras.filter((s) => s.shift_date === date);
    ex.forEach((s, k) => {
      const saveY = y; y -= k * 11;
      cell(`${s.label || t("shift.extra")}: ${s.doctor_id ? shortName(nameOf.get(s.doctor_id) ?? "") : t("all.open")}`, xOf(used.length), 86, font);
      y = saveY;
    });
    y -= h;
  }

  // Skýringar: vaktategundirnar skrifaðar út, og örin fyrir eigin vaktir.
  y -= 8;
  if (ensure(40)) { /* ný síða fyrir skýringarnar */ }
  page.drawLine({ start: { x: M, y: y + 8 }, end: { x: W - M, y: y + 8 }, thickness: 0.8, color: RULE });
  const legend = used.map((ty) => `${ty.short} = ${ty.name} ${hhmm(ty.starts)}–${hhmm(ty.ends)}`).join("   ");
  for (const line of wrapTo(legend, font, 8.4, W - M * 2)) { text(line, M, 8.4, font, MUTED); y -= 11; }
  if (i.doctor) { text(t("all.youMark"), M, 8.4, font, MUTED); y -= 11; }

  // Fótur á allar síður.
  const pages = doc.getPages();
  const foot = t("foot", {
    month: monthLabel,
    at: i.publishedAt ? new Date(i.publishedAt).toLocaleString(i.lang === "is" ? "is-IS" : "en-GB", { timeZone: "Atlantic/Reykjavik", dateStyle: "short", timeStyle: "short" }) : "",
  });
  pages.forEach((p, n) => {
    p.drawText(safe(foot), { x: M, y: 22, size: 8, font, color: MUTED });
    const label = t("page", { n: String(n + 1), of: String(pages.length) });
    p.drawText(safe(label), { x: W - M - font.widthOfTextAtSize(safe(label), 8), y: 22, size: 8, font, color: MUTED });
  });

  return doc.save();
}

/** Klippa texta við orðaskil og setja úrfellingarmerki — aldrei inni í sviga. */
function clip(s: string, f: PDFFont, size: number, maxW: number): string {
  if (!s || f.widthOfTextAtSize(s, size) <= maxW) return s;
  let out = s;
  while (out && f.widthOfTextAtSize(`${out}…`, size) > maxW) {
    const cut = Math.max(out.lastIndexOf(", "), out.lastIndexOf(" "));
    out = cut > 0 ? out.slice(0, cut) : out.slice(0, -1);
  }
  return out ? `${out.replace(/[,\s]+$/, "")}…` : "";
}

function wrapTo(s: string, f: PDFFont, size: number, maxW: number): string[] {
  const out: string[] = [];
  let line = "";
  for (const word of safe(s).split(/\s+/)) {
    const next = line ? `${line} ${word}` : word;
    if (f.widthOfTextAtSize(next, size) > maxW && line) { out.push(line); line = word; }
    else line = next;
  }
  if (line) out.push(line);
  return out;
}

/** Skráarnafn viðhengisins: vaktir-2026-10.pdf */
export const shiftPdfName = (month: string) => `vaktir-${month}.pdf`;
