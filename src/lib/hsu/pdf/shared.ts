// Sameiginlegt fyrir prentsniðin þrjú (classic / system / bold).
//
// Hér er ALLT sem er óháð útliti: hvað er á hverjum degi, hvernig nöfn eru stytt,
// litir, textaklipping og rúnnaðir fletir. Hvert snið sér aðeins um teikninguna.

import { rgb, type Color, type PDFFont, type PDFPage } from "pdf-lib";
import { translator, type Lang } from "../i18n/core";
import { holidayL, weekdayOfDate } from "../i18n/format";
import { shiftPdf } from "../i18n/messages/shift-pdf";
import { datesInMonth, hhmm, holidayName, type HsuShift, type HsuShiftType } from "../types";

/** Prentsnið vaktaplansins. Yfirlæknir velur sjálfgefna sniðið í Stillingum. */
export const PDF_STYLES = ["classic", "system", "bold"] as const;
export type PdfStyle = (typeof PDF_STYLES)[number];
export const DEFAULT_PDF_STYLE: PdfStyle = "system";
export const isPdfStyle = (v: unknown): v is PdfStyle => typeof v === "string" && (PDF_STYLES as readonly string[]).includes(v);

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
  /** Heiti stöðvarinnar í hausnum (hsu_settings.unit_name). */
  unitName?: string;
  style?: PdfStyle;
}

// ── Stafir ──────────────────────────────────────────────────────────────────
// Helvetica/WinAnsi nær yfir íslensku stafina (þ æ ö á é í ó ú ý ð); stöfum
// utan CP1252 er skipt út svo drawText geti ekki kastað.

const CP1252_HIGH = new Set([
  0x20ac, 0x201a, 0x0192, 0x201e, 0x2026, 0x2020, 0x2021, 0x02c6, 0x2030, 0x0160,
  0x2039, 0x0152, 0x017d, 0x2018, 0x2019, 0x201c, 0x201d, 0x2022, 0x2013, 0x2014,
  0x02dc, 0x2122, 0x0161, 0x203a, 0x0153, 0x017e, 0x0178,
]);
export function safe(s: string): string {
  let out = "";
  for (const ch of (s || "").normalize("NFC")) {
    const c = ch.codePointAt(0)!;
    out += c <= 0xff || CP1252_HIGH.has(c) ? ch : "-";
  }
  return out;
}

/** Klippa texta við orðaskil og setja úrfellingarmerki. */
export function clip(s: string, f: PDFFont, size: number, maxW: number): string {
  if (!s || f.widthOfTextAtSize(s, size) <= maxW) return s;
  let out = s;
  while (out && f.widthOfTextAtSize(`${out}…`, size) > maxW) {
    const cut = Math.max(out.lastIndexOf(", "), out.lastIndexOf(" "));
    out = cut > 0 ? out.slice(0, cut) : out.slice(0, -1);
  }
  return out ? `${out.replace(/[,\s]+$/, "")}…` : "";
}

/** Fornafn + n fyrstu stafir eftirnafns: „Áslaug B." */
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
export function shortNames(doctors: ShiftPdfDoctor[]): Map<string, string> {
  const out = new Map<string, string>(doctors.map((d) => [d.id, shortName(d.name)]));
  for (let keep = 2; keep <= 14; keep++) {
    const groups = new Map<string, string[]>();
    for (const [id, s] of out) (groups.get(s) ?? groups.set(s, []).get(s)!).push(id);
    const clash = [...groups.values()].filter((ids) => ids.length > 1);
    if (!clash.length) break;
    for (const ids of clash) {
      for (const id of ids) out.set(id, shortName(doctors.find((x) => x.id === id)!.name, keep));
    }
  }
  return out;
}

/** Upphafsstafir í hringmerki: „Mads Christian Aanesen" → „MA". */
export function initials(name: string): string {
  const p = safe(name).trim().split(/\s+/).filter(Boolean);
  if (!p.length) return "?";
  return (p[0][0] + (p.length > 1 ? p[p.length - 1][0] : "")).toUpperCase();
}

// ── Litir ───────────────────────────────────────────────────────────────────

/** #1d4f91 → rgb(). Ógilt eða ósett: grunnlitur kerfisins. */
export function hex(c: string | undefined, fallback: Color): Color {
  const m = /^#?([0-9a-f]{6})$/i.exec((c ?? "").trim());
  if (!m) return fallback;
  const n = parseInt(m[1], 16);
  return rgb(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255);
}

/** Litir viðmótsins (sjá src/app/hsu/layout.tsx og Tailwind-slate). */
export const HSU = rgb(0.114, 0.310, 0.569);        // #1d4f91
export const HSU_DARK = rgb(0.086, 0.239, 0.439);   // #163d70
export const HSU_SOFT = rgb(0.910, 0.933, 0.969);   // #e8eef7
export const INK = rgb(0.059, 0.090, 0.165);        // slate-900
export const SLATE700 = rgb(0.200, 0.255, 0.333);
export const SLATE500 = rgb(0.392, 0.455, 0.545);
export const SLATE400 = rgb(0.580, 0.639, 0.722);
export const SLATE300 = rgb(0.796, 0.835, 0.882);
export const SLATE200 = rgb(0.886, 0.910, 0.941);
export const SLATE100 = rgb(0.945, 0.961, 0.976);
export const SLATE50 = rgb(0.973, 0.980, 0.988);
export const RED = rgb(0.773, 0.149, 0.149);        // vantar
export const WHITE = rgb(1, 1, 1);

/** Tónar „Dagatals"-sniðsins (classic) — haldið óbreyttum frá fyrri útgáfu. */
export const GREY = rgb(0.52, 0.56, 0.62);
export const FAINT = rgb(0.74, 0.77, 0.81);
export const RULE = rgb(0.84, 0.87, 0.91);
export const BAND_WEEKEND = rgb(0.96, 0.97, 0.985);
export const OUTSIDE = rgb(0.975, 0.98, 0.985);

// ── Rúnnaðir fletir ─────────────────────────────────────────────────────────

/** Rúnnaður ferhyrningur. pdf-lib hefur ekkert slíkt, svo SVG-leið er farin. */
export function roundRect(
  page: PDFPage,
  o: { x: number; y: number; w: number; h: number; r?: number; color?: Color; border?: Color; borderWidth?: number; dash?: number[]; opacity?: number },
) {
  const r = Math.min(o.r ?? 4, o.w / 2, o.h / 2);
  // SVG teiknar niður á við frá (x, y) — y er efri brúnin.
  const d = `M ${r} 0 H ${o.w - r} A ${r} ${r} 0 0 1 ${o.w} ${r} V ${o.h - r} A ${r} ${r} 0 0 1 ${o.w - r} ${o.h} H ${r} A ${r} ${r} 0 0 1 0 ${o.h - r} V ${r} A ${r} ${r} 0 0 1 ${r} 0 Z`;
  page.drawSvgPath(d, {
    x: o.x, y: o.y + o.h, scale: 1,
    color: o.color, borderColor: o.border, borderWidth: o.borderWidth ?? (o.border ? 0.7 : 0),
    borderDashArray: o.dash, opacity: o.opacity, borderOpacity: o.opacity,
  });
}

// ── Dagurinn ────────────────────────────────────────────────────────────────

export interface Entry {
  own: boolean;
  /** Stuttur kóði vaktategundar (FM, FV1 …). */
  short: string;
  /** Tími, aðeins þegar vaktinni hefur verið skipt (hálfur dagur). */
  time: string;
  who: string;
  /** Fullt nafn — notað þar sem pláss leyfir. */
  full: string;
  open: boolean;
  color: Color;
}

export interface Cell {
  date: string | null;
  dayNo: number;
  holiday: string | null;
  weekend: boolean;
  /** Dagvinna (flýtimóttaka). */
  day: Entry[];
  /** Forvakt og bakvakt. */
  eve: Entry[];
}

export interface Prepared {
  t: ReturnType<typeof translator<typeof shiftPdf.is>>;
  weeks: Cell[][];
  mineColor: Color;
  ownCount: number;
  /** Dagsetningar viðtakandans (1–31) — fyrir borða og samantektir. */
  ownDays: number[];
  legend: { short: string; name: string; time: string; color: Color; day: boolean }[];
  /** Hvort fleiri en ein tegund er í hvorum hluta — þá þarf kóðann með. */
  multiDay: boolean;
  multiEve: boolean;
  dates: string[];
}

/** Mánudagur = 0 … sunnudagur = 6. */
export const mondayIndex = (date: string) => (weekdayOfDate(date) + 6) % 7;

/**
 * Allt sem sniðin þrjú þurfa: vikur, dagar, færslur í réttri röð og skýringar.
 * Forvakt er sett ofan við bakvakt — forvaktin er sú sem gildir, bakvaktin bakland.
 */
export function prepare(i: ShiftPdfInput): Prepared {
  const t = translator(shiftPdf, i.lang);
  const nameOf = shortNames(i.doctors);
  const fullOf = new Map(i.doctors.map((d) => [d.id, safe(d.name)]));
  const colorOf = new Map(i.doctors.map((d) => [d.id, hex(d.color, HSU)]));
  const typeOf = new Map(i.types.map((x) => [x.id, x]));
  const dates = datesInMonth(i.month);
  const mineColor = hex(i.doctor?.color, HSU);

  const isDay = (s: HsuShift) => {
    const ty = s.shift_type_id ? typeOf.get(s.shift_type_id) : undefined;
    // Aukavakt án tegundar: dagvakt ef hún hefst fyrir kl. 15.
    return ty ? ty.period === "day" : s.starts.slice(0, 5) < "15:00";
  };
  const multi = { day: new Set<string>(), eve: new Set<string>() };
  for (const s of i.shifts) {
    const ty = s.shift_type_id ? typeOf.get(s.shift_type_id) : undefined;
    (isDay(s) ? multi.day : multi.eve).add(ty?.short ?? "");
  }

  const KIND_ORDER = { forvakt: 0, other: 1, bakvakt: 2 } as const;
  const rank = (s: HsuShift) => {
    const ty = s.shift_type_id ? typeOf.get(s.shift_type_id) : undefined;
    return [ty ? KIND_ORDER[ty.kind] : 1, ty?.sort ?? 0, ty?.short ?? ""] as const;
  };
  const sortShifts = (a: HsuShift, b: HsuShift) => {
    const [ka, sa, ha] = rank(a), [kb, sb, hb] = rank(b);
    return ka - kb || sa - sb || ha.localeCompare(hb)
      || (a.slot_index ?? 0) - (b.slot_index ?? 0) || a.starts.localeCompare(b.starts);
  };
  const entryOf = (s: HsuShift): Entry => {
    const ty = s.shift_type_id ? typeOf.get(s.shift_type_id) : undefined;
    // Vakt sem hefur verið tekin í tvennt fær tímann með — annars er hann óþarfi.
    const split = Boolean(ty && (hhmm(s.starts) !== hhmm(ty.starts) || hhmm(s.ends) !== hhmm(ty.ends)));
    return {
      own: Boolean(i.doctor && s.doctor_id === i.doctor.id),
      short: ty?.short ?? "",
      time: split ? `${hhmm(s.starts)}–${hhmm(s.ends)}` : "",
      who: s.doctor_id ? (nameOf.get(s.doctor_id) ?? "") : t("all.open"),
      full: s.doctor_id ? (fullOf.get(s.doctor_id) ?? "") : t("all.open"),
      open: !s.doctor_id,
      color: s.doctor_id ? (colorOf.get(s.doctor_id) ?? HSU) : RED,
    };
  };

  const byDate = new Map<string, HsuShift[]>();
  for (const s of i.shifts) (byDate.get(s.shift_date) ?? byDate.set(s.shift_date, []).get(s.shift_date)!).push(s);

  const offset = mondayIndex(dates[0]);
  const weekCount = Math.ceil((offset + dates.length) / 7);
  const weeks: Cell[][] = [];
  let ownCount = 0;
  const ownDays: number[] = [];
  for (let w = 0; w < weekCount; w++) {
    const row: Cell[] = [];
    for (let c = 0; c < 7; c++) {
      const dayNo = w * 7 + c - offset + 1;
      if (dayNo < 1 || dayNo > dates.length) {
        row.push({ date: null, dayNo: 0, holiday: null, weekend: c >= 5, day: [], eve: [] });
        continue;
      }
      const date = dates[dayNo - 1];
      const all = (byDate.get(date) ?? []).sort(sortShifts);
      const day = all.filter(isDay).map(entryOf);
      const eve = all.filter((s) => !isDay(s)).map(entryOf);
      const mineHere = [...day, ...eve].filter((e) => e.own).length;
      ownCount += mineHere;
      if (mineHere) ownDays.push(dayNo);
      row.push({ date, dayNo, holiday: holidayL(holidayName(date), i.lang), weekend: c >= 5, day, eve });
    }
    weeks.push(row);
  }

  const legend = i.types
    .filter((ty) => i.shifts.some((s) => s.shift_type_id === ty.id))
    .sort((a, b) => (a.period === b.period ? 0 : a.period === "day" ? -1 : 1) || a.sort - b.sort || a.short.localeCompare(b.short))
    .map((ty) => ({ short: ty.short, name: ty.name, time: `${hhmm(ty.starts)}–${hhmm(ty.ends)}`, color: hex(ty.color, HSU), day: ty.period === "day" }));

  return { t, weeks, mineColor, ownCount, ownDays, legend, multiDay: multi.day.size > 1, multiEve: multi.eve.size > 1, dates };
}

/** Hvenær skjalið var búið til / planið birt — fótur allra sniða. */
export function stamp(i: ShiftPdfInput, lang: Lang): string {
  const d = i.publishedAt ? new Date(i.publishedAt) : new Date();
  return d.toLocaleString(lang === "is" ? "is-IS" : "en-GB", { timeZone: "Atlantic/Reykjavik", dateStyle: "short", timeStyle: "short" });
}
