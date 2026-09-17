// Dagsetningar, stöður og heiti eftir tungumáli. Í stað monthLabel/dayLabel/
// MONTH_STATUS_IS o.s.frv. í types.ts þegar texti birtist notanda.

import { LANG_LOCALE, translator, type Lang } from "./core";
import { HOLIDAY_NAMES, common } from "./messages/common";
import type { DayPart, HsuRole, MonthStatus, PrefStatus, ShiftKind, ShiftPeriod } from "../types";

const tc = (lang: Lang) => translator(common, lang);

function ymd(date: string): [number, number, number] {
  const [y, m, d] = date.split("-").map(Number);
  return [y, m, d];
}

/** "2026-10" → "október 2026" / "October 2026" */
export function monthLabelL(month: string, lang: Lang): string {
  const [y, m] = month.split("-").map(Number);
  const t = tc(lang);
  return t("date.monthYear", { m: t.dyn(`month.${m || 1}`), y });
}

/** "2026-10-05" → "5. okt." / "5 Oct" */
export function dayLabelL(date: string, lang: Lang): string {
  const [, m, d] = ymd(date);
  const t = tc(lang);
  return t("date.dayMonth", { d, m: t.dyn(`monthShort.${m}`) });
}

export function weekdayOfDate(date: string): number {
  const [y, m, d] = ymd(date);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

/** 0=sun … 6=lau → "Mán" / "Mon" */
export function weekdayShortL(day: number, lang: Lang): string {
  return tc(lang).dyn(`weekday.${day}`);
}
export function weekdayLongL(day: number, lang: Lang): string {
  return tc(lang).dyn(`weekdayLong.${day}`);
}
/** "2026-10-05" → "Mán" / "Mon" */
export function weekdayShortOf(date: string, lang: Lang): string {
  return weekdayShortL(weekdayOfDate(date), lang);
}

export const monthStatusL = (s: MonthStatus | "none", lang: Lang) => tc(lang).dyn(`monthStatus.${s}`);
export const prefStatusL = (s: PrefStatus | "none", lang: Lang) => tc(lang).dyn(`prefStatus.${s}`);
export const roleL = (r: HsuRole, lang: Lang) => tc(lang).dyn(`role.${r}`);
export const shiftKindL = (k: ShiftKind, lang: Lang) => tc(lang).dyn(`shiftKind.${k}`);
export const shiftPeriodL = (p: ShiftPeriod, lang: Lang) => tc(lang).dyn(`shiftPeriod.${p}`);
export const dayPartL = (p: DayPart, lang: Lang) => tc(lang).dyn(`dayPart.${p}`);
export const dayPartShortL = (p: DayPart, lang: Lang) => tc(lang).dyn(`dayPartShort.${p}`);

export function holidayL(isName: string | null, lang: Lang): string | null {
  if (!isName || lang === "is") return isName;
  return HOLIDAY_NAMES[isName]?.[lang] ?? isName;
}

export function timeAgoL(iso: string | null, lang: Lang): string {
  const t = tc(lang);
  if (!iso) return t("ago.never");
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return t("ago.now");
  if (mins < 60) return t("ago.min", { n: mins });
  const h = Math.floor(mins / 60);
  if (h < 24) return t("ago.hour", { n: h });
  return t("ago.day", { n: Math.floor(h / 24) });
}

/** Dagsetning og tími á tungumáli notandans (Intl). */
export function dateTimeL(iso: string, lang: Lang, opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }): string {
  return new Date(iso).toLocaleString(LANG_LOCALE[lang], { timeZone: "Atlantic/Reykjavik", ...opts });
}

/** Fyrsti stafur hástafur, eftir reglum tungumálsins. */
export function capFirstL(s: string, lang: Lang): string {
  return s ? s[0].toLocaleUpperCase(LANG_LOCALE[lang]) + s.slice(1) : s;
}
