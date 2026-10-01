// Vaktaplan mánaðarins á EINNI SÍÐU, eins og dagatalsblað — til að prenta og
// hengja á birtingarpóstinn.
//
//   • vika í hverri röð, mánudagur fyrstur
//   • hver dagur tvískiptur: EFRI hlutinn er dagvinna (flýtimóttaka),
//     NEÐRI hlutinn er forvakt/bakvakt
//   • vaktir viðtakandans eru í HANS lit, feitar og með ljósum fleti
//   • aðrir læknar eru gráir og hógværir — þeir eiga ekki að stela myndinni
//
// Helvetica/WinAnsi nær yfir íslensku stafina (þ æ ö á é í ó ú ý ð); stöfum
// utan CP1252 er skipt út svo drawText geti ekki kastað. Sama aðferð og í
// src/lib/contract-pdf.ts.

import { PDFDocument, StandardFonts, rgb, type Color, type PDFFont, type PDFPage } from "pdf-lib";
import { translator, type Lang } from "./i18n/core";
import { dayLabelL, holidayL, monthLabelL, weekdayShortL, weekdayOfDate } from "./i18n/format";
import { shiftPdf } from "./i18n/messages/shift-pdf";
import { datesInMonth, hhmm, holidayName, type HsuShift, type HsuShiftType } from "./types";

export interface ShiftPdfDoctor {
  id: string;
  name: string;
  /** Litur læknisins í kerfinu (#rrggbb) — notaður á hans eigin vaktir. */
  color?: string;
}

export interface ShiftPdfInput {
  month: string;
  lang: Lang;
  /** Viðtakandinn: hans vaktir eru dregnar fram. Sleppt: hlutlaust mánaðarblað. */
  doctor?: ShiftPdfDoctor;
  shifts: HsuShift[];
  types: HsuShiftType[];
  doctors: ShiftPdfDoctor[];
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

/** Fornafn + n fyrstu stafir eftirnafns: „Áslaug D." — nafnið verður að komast í hólfið. */
function shortName(name: string, keep = 1): string {
  const parts = safe(name).trim().split(/\s+/);
  if (parts.length < 2) return parts[0] ?? "";
  // Síðasta nafnið er kenni-/eftirnafnið: „Mads Christian Aanesen" → „Mads A."
  return `${parts[0]} ${parts[parts.length - 1].slice(0, keep)}.`;
}

/**
 * Stytt nöfn sem eru ÖLL ólík. Á listanum eru tveir Áslaugar, og „Áslaug B."
 * og „Áslaug H." nægja þeim — en færu tveir að heita sama stutta nafninu er
 * eftirnafn ÞEIRRA lengt (og aðeins þeirra) þar til þau skiljast að.
 */
function shortNames(doctors: ShiftPdfDoctor[]): Map<string, string> {
  const out = new Map<string, string>(doctors.map((d) => [d.id, shortName(d.name)]));
  for (let keep = 2; keep <= 14; keep++) {
    const groups = new Map<string, string[]>();
    for (const [id, s] of out) (groups.get(s) ?? groups.set(s, []).get(s)!).push(id);
    const clash = [...groups.values()].filter((ids) => ids.length > 1);
    if (!clash.length) break;
    for (const ids of clash) {
      for (const id of ids) {
        const d = doctors.find((x) => x.id === id)!;
        out.set(id, shortName(d.name, keep));
      }
    }
  }
  return out;
}

/** #1d4f91 → rgb(). Ógilt eða ósett: grunnlitur kerfisins. */
function hex(c: string | undefined, fallback: Color): Color {
  const m = /^#?([0-9a-f]{6})$/i.exec((c ?? "").trim());
  if (!m) return fallback;
  const n = parseInt(m[1], 16);
  return rgb(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255);
}

const INK = rgb(0.06, 0.09, 0.16);
const GREY = rgb(0.52, 0.56, 0.62);
const FAINT = rgb(0.74, 0.77, 0.81);
const RULE = rgb(0.84, 0.87, 0.91);
const BAND = rgb(0.96, 0.97, 0.985);
const OUTSIDE = rgb(0.975, 0.98, 0.985);
const BRAND = rgb(0.11, 0.31, 0.57);
const OPEN = rgb(0.72, 0.25, 0.25);

/** Klippa texta við orðaskil og setja úrfellingarmerki. */
function clip(s: string, f: PDFFont, size: number, maxW: number): string {
  if (!s || f.widthOfTextAtSize(s, size) <= maxW) return s;
  let out = s;
  while (out && f.widthOfTextAtSize(`${out}…`, size) > maxW) {
    const cut = Math.max(out.lastIndexOf(", "), out.lastIndexOf(" "));
    out = cut > 0 ? out.slice(0, cut) : out.slice(0, -1);
  }
  return out ? `${out.replace(/[,\s]+$/, "")}…` : "";
}

/** Mánudagur = 0 … sunnudagur = 6. */
const mondayIndex = (date: string) => (weekdayOfDate(date) + 6) % 7;

interface Entry {
  own: boolean;
  /** Stuttur kóði vaktategundar — sýndur þegar fleiri en ein tegund er í hlutanum. */
  short: string;
  /** Tími, aðeins þegar vaktinni hefur verið skipt (hálfur dagur). */
  time: string;
  who: string;
  open: boolean;
}

export async function buildShiftPdf(i: ShiftPdfInput): Promise<Uint8Array> {
  const t = translator(shiftPdf, i.lang);
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);

  // A4 á langsnið — eitt blað, eins og dagatalsblað.
  const W = 841.89, H = 595.28, M = 26;
  const page: PDFPage = doc.addPage([W, H]);

  const mineColor = hex(i.doctor?.color, BRAND);
  const monthLabel = monthLabelL(i.month, i.lang);
  const nameOf = shortNames(i.doctors);
  const typeOf = new Map(i.types.map((x) => [x.id, x]));
  const dates = datesInMonth(i.month);

  // ── Hvað fer í hvorn hluta dagsins ────────────────────────────────────────
  const isDay = (s: HsuShift) => {
    const ty = s.shift_type_id ? typeOf.get(s.shift_type_id) : undefined;
    // Aukavakt án tegundar: dagvakt ef hún hefst fyrir kl. 15.
    return ty ? ty.period === "day" : s.starts.slice(0, 5) < "15:00";
  };
  const usedDay = new Set<string>(), usedEve = new Set<string>();
  for (const s of i.shifts) {
    const ty = s.shift_type_id ? typeOf.get(s.shift_type_id) : undefined;
    (isDay(s) ? usedDay : usedEve).add(ty?.short ?? "");
  }

  const entryOf = (s: HsuShift, multi: boolean): Entry => {
    const ty = s.shift_type_id ? typeOf.get(s.shift_type_id) : undefined;
    // Vakt sem hefur verið tekin í tvennt fær tímann með — annars er hann óþarfi.
    const split = Boolean(ty && (hhmm(s.starts) !== hhmm(ty.starts) || hhmm(s.ends) !== hhmm(ty.ends)));
    return {
      own: Boolean(i.doctor && s.doctor_id === i.doctor.id),
      short: multi ? (ty?.short ?? "") : "",
      time: split ? `${hhmm(s.starts)}–${hhmm(s.ends)}` : "",
      who: s.doctor_id ? (nameOf.get(s.doctor_id) ?? "") : t("all.open"),
      open: !s.doctor_id,
    };
  };
  // Forvakt fyrst, svo bakvakt — forvaktin er sú sem gildir, bakvaktin bakland.
  const KIND_ORDER = { forvakt: 0, other: 1, bakvakt: 2 } as const;
  const rank = (s: HsuShift) => {
    const ty = s.shift_type_id ? typeOf.get(s.shift_type_id) : undefined;
    return [ty ? KIND_ORDER[ty.kind] : 1, ty?.sort ?? 0, ty?.short ?? ""] as const;
  };
  const sortShifts = (a: HsuShift, b: HsuShift) => {
    const [ka, sa, ha] = rank(a), [kb, sb, hb] = rank(b);
    return ka - kb || sa - sb || ha.localeCompare(hb)
      || (a.slot_index ?? 0) - (b.slot_index ?? 0)
      || a.starts.localeCompare(b.starts);
  };

  // ── Haus ──────────────────────────────────────────────────────────────────
  let y = H - M;
  const title = i.doctor ? t("mine.title", { name: safe(i.doctor.name) }) : t("all.title");
  page.drawText(safe(title), { x: M, y: y - 14, size: 14, font: bold, color: INK });
  const right = safe(monthLabel);
  page.drawText(right, { x: W - M - bold.widthOfTextAtSize(right, 14), y: y - 14, size: 14, font: bold, color: BRAND });
  y -= 22;
  page.drawLine({ start: { x: M, y }, end: { x: W - M, y }, thickness: 1.2, color: BRAND });
  y -= 14;

  // ── Vikudagahaus (mánudagur fyrstur) ──────────────────────────────────────
  const colW = (W - M * 2) / 7;
  for (let c = 0; c < 7; c++) {
    // weekdayShortL: 0=sun … 6=lau.
    const label = safe(weekdayShortL((c + 1) % 7, i.lang));
    page.drawText(label, { x: M + c * colW + (colW - bold.widthOfTextAtSize(label, 9)) / 2, y: y - 9, size: 9, font: bold, color: GREY });
  }
  y -= 13;

  // ── Netið: vika í hverri röð ──────────────────────────────────────────────
  const offset = mondayIndex(dates[0]);
  const weeks = Math.ceil((offset + dates.length) / 7);
  const footH = i.doctor ? 42 : 32;
  const gridTop = y;
  const rowH = (gridTop - M - footH) / weeks;

  const byDate = new Map<string, HsuShift[]>();
  for (const s of i.shifts) (byDate.get(s.shift_date) ?? byDate.set(s.shift_date, []).get(s.shift_date)!).push(s);

  const LINE = 7.6;  // línuhæð nafnalínu
  const SZ = 6.6;    // stærð nafnatexta
  let ownCount = 0;

  for (let w = 0; w < weeks; w++) {
    for (let c = 0; c < 7; c++) {
      const dayNo = w * 7 + c - offset + 1;
      const x = M + c * colW;
      const top = gridTop - w * rowH;

      if (dayNo < 1 || dayNo > dates.length) {
        page.drawRectangle({ x, y: top - rowH, width: colW, height: rowH, color: OUTSIDE, borderColor: RULE, borderWidth: 0.6 });
        continue;
      }
      const date = dates[dayNo - 1];
      const hol = holidayL(holidayName(date), i.lang);
      const weekend = c >= 5;
      page.drawRectangle({
        x, y: top - rowH, width: colW, height: rowH,
        color: weekend || hol ? BAND : rgb(1, 1, 1),
        borderColor: RULE, borderWidth: 0.6,
      });

      // Dagsetning og frídagsheiti.
      page.drawText(String(dayNo), { x: x + 4, y: top - 10.5, size: 9, font: bold, color: weekend || hol ? BRAND : INK });
      if (hol) {
        const w0 = bold.widthOfTextAtSize(String(dayNo), 9) + 7;
        page.drawText(clip(safe(hol), font, 5.8, colW - w0 - 5), { x: x + w0, y: top - 10, size: 5.8, font, color: BRAND });
      }

      const all = byDate.get(date) ?? [];
      const dayPart = all.filter(isDay).sort(sortShifts).map((s) => entryOf(s, usedDay.size > 1));
      const evePart = all.filter((s) => !isDay(s)).sort(sortShifts).map((s) => entryOf(s, usedEve.size > 1));
      ownCount += [...dayPart, ...evePart].filter((e) => e.own).length;

      // Tvískipting hólfsins: efri hlutinn dagvinna, neðri forvakt/bakvakt.
      const bodyTop = top - 13;
      const bodyH = rowH - 15;
      const mid = bodyTop - bodyH * 0.42;
      page.drawLine({ start: { x: x + 3, y: mid }, end: { x: x + colW - 3, y: mid }, thickness: 0.4, color: RULE });

      const drawPart = (list: Entry[], from: number, to: number) => {
        const room = Math.max(0, Math.floor((from - to) / LINE));
        const show = list.slice(0, room);
        let ly = from;
        for (const e of show) {
          ly -= LINE;
          const tag = [e.short, e.time].filter(Boolean).join(" ");
          const f = e.own ? bold : font;
          const color = e.own ? mineColor : e.open ? OPEN : GREY;
          // Ljós flötur í lit læknisins svo hans vakt sjáist í fljótu bragði.
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
      drawPart(dayPart, bodyTop, mid + 1);
      drawPart(evePart, mid - 1.5, bodyTop - bodyH);
    }
  }

  // ── Fótur: eigin litur, skýringar og dagsetning ───────────────────────────
  let fy = M + footH - 12;
  if (i.doctor) {
    page.drawRectangle({ x: M, y: fy - 1.5, width: 16, height: 7.5, color: mineColor, opacity: 0.13 });
    page.drawRectangle({ x: M, y: fy - 1.5, width: 16, height: 7.5, borderColor: mineColor, borderWidth: 0.6 });
    page.drawText(safe(`${t("all.youMark")} — ${t.n("mine.count", ownCount)}`), { x: M + 21, y: fy, size: 7.4, font: bold, color: mineColor });
    fy -= 11;
  }
  const legend = i.types
    .filter((ty) => i.shifts.some((s) => s.shift_type_id === ty.id))
    .sort((a, b) => (a.period === b.period ? 0 : a.period === "day" ? -1 : 1) || a.sort - b.sort || a.short.localeCompare(b.short))
    .map((ty) => `${ty.short} = ${ty.name} ${hhmm(ty.starts)}–${hhmm(ty.ends)}`)
    .join("   ·   ");
  page.drawText(clip(safe(legend), font, 6.6, W - M * 2), { x: M, y: fy, size: 6.6, font, color: GREY });
  fy -= 10;
  page.drawText(clip(safe(t("parts")), font, 6.6, W - M * 2 - 190), { x: M, y: fy, size: 6.6, font, color: FAINT });
  const foot = safe(t("foot", {
    month: monthLabel,
    at: i.publishedAt
      ? new Date(i.publishedAt).toLocaleString(i.lang === "is" ? "is-IS" : "en-GB", { timeZone: "Atlantic/Reykjavik", dateStyle: "short", timeStyle: "short" })
      : dayLabelL(new Date().toISOString().slice(0, 10), i.lang),
  }));
  page.drawText(foot, { x: W - M - font.widthOfTextAtSize(foot, 6.6), y: fy, size: 6.6, font, color: FAINT });

  return doc.save();
}

/** Skráarnafn viðhengisins: vaktir-2026-10.pdf */
export const shiftPdfName = (month: string) => `vaktir-${month}.pdf`;
