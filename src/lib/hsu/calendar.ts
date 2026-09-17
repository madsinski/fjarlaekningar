// Dagatalssamstilling HSU: Google (push) og .ics-áskrift (Apple/Outlook).

import { createCalendarSync } from "@/lib/calendar-sync";
import { hhmm } from "@/lib/roster";
import { isLang, translator, type Lang } from "./i18n/core";
import { doctorLang } from "./i18n/server";
import { notifyMsgs } from "./i18n/messages/notify";

export const HSU_CALENDAR_NAME = "HSU — vaktir";

/** "BV 08-08" — tegund og tímar lesast í titlinum án þess að opna atburðinn. */
export function hsuEventTitle(label: string, starts: string, ends: string): string {
  const short = (t: string) => {
    const [h, m] = (t || "").split(":");
    return m && m !== "00" ? `${h}:${m}` : h;
  };
  return `HSU ${label ? `${label} ` : ""}${short(starts)}-${short(ends)}`;
}

/**
 * Lýsing atburðar á tungumáli læknisins — bæði í Google-samstillingu
 * (languageOf) og .ics-áskrift.
 */
export function hsuEventDescription(s: { label?: string; starts: string; ends: string; note: string; status: string }, lang: Lang = "is"): string {
  const t = translator(notifyMsgs, lang);
  const note = (s.note || "").trim();
  const market = s.status === "open" ? `\n\n${t("calendar.onMarket")}` : "";
  return `${t("calendar.description", { label: s.label || t("calendar.shift"), from: hhmm(s.starts), to: hhmm(s.ends) })}${market}${note ? `\n\n${note}` : ""}`;
}

export const hsuSync = createCalendarSync({
  syncTable: "hsu_google_sync",
  eventsTable: "hsu_google_events",
  shiftsTable: "hsu_shifts",
  shiftColumns: "id, shift_date, starts, ends, note, status, label",
  // Vakt á markaði er enn á ábyrgð læknisins þar til einhver tekur hana, svo
  // hún situr áfram í dagatalinu. Hún hverfur þegar hún skiptir um hendur.
  excludeStatuses: [],
  requireEquals: { published: true },
  // Beiðni umfram hámark er ekki vakt fyrr en læknirinn hefur samþykkt hana.
  requireNull: ["confirm_status"],
  calendarName: HSU_CALENDAR_NAME,
  languageOf: (doctorId) => doctorLang(doctorId),
  eventBody: (s, lang) => ({
    summary: hsuEventTitle(s.label ?? "", s.starts, s.ends),
    description: hsuEventDescription({ ...s, label: s.label }, isLang(lang) ? lang : "is"),
  }),
});
