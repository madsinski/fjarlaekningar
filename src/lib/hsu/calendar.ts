// Dagatalssamstilling HSU: Google (push) og .ics-áskrift (Apple/Outlook).

import { createCalendarSync } from "@/lib/calendar-sync";
import { hhmm } from "@/lib/roster";

export const HSU_CALENDAR_NAME = "HSU — vaktir";

/** "BV 08-08" — tegund og tímar lesast í titlinum án þess að opna atburðinn. */
export function hsuEventTitle(label: string, starts: string, ends: string): string {
  const short = (t: string) => {
    const [h, m] = (t || "").split(":");
    return m && m !== "00" ? `${h}:${m}` : h;
  };
  return `HSU ${label ? `${label} ` : ""}${short(starts)}-${short(ends)}`;
}

export function hsuEventDescription(s: { label?: string; starts: string; ends: string; note: string; status: string }): string {
  const note = (s.note || "").trim();
  const market = s.status === "open" ? "\n\nÞessi vakt er á vaktamarkaði en er þín þar til annar læknir tekur hana." : "";
  return `${s.label || "Vakt"} hjá Heilsugæslunni í Vestmannaeyjum, ${hhmm(s.starts)}–${hhmm(s.ends)}.${market}${note ? `\n\n${note}` : ""}`;
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
  calendarName: HSU_CALENDAR_NAME,
  eventBody: (s) => ({
    summary: hsuEventTitle(s.label ?? "", s.starts, s.ends),
    description: hsuEventDescription({ ...s, label: s.label }),
  }),
});
