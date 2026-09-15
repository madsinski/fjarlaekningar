// Samstilling vakta Fjarlækninga við Google-dagatal læknisins.
//
// Vélin sjálf er í calendar-sync.ts og er sameiginleg með vaktakerfi HSU; hér
// eru aðeins töflurnar og textinn sem eiga við Fjarlækningar.

import { createCalendarSync } from "@/lib/calendar-sync";
import { shiftEventTitle, hhmm } from "@/lib/roster";
import { CALENDAR_NAME } from "@/lib/google-calendar";

export { eventIdFor, type GoogleSyncRow, type SyncResult } from "@/lib/calendar-sync";

const sync = createCalendarSync({
  syncTable: "roster_google_sync",
  eventsTable: "roster_google_events",
  shiftsTable: "roster_shifts",
  shiftColumns: "id, shift_date, starts, ends, note, status",
  // On the market the shift is no longer theirs to plan around.
  excludeStatuses: ["open"],
  calendarName: CALENDAR_NAME,
  eventBody: (s) => {
    const note = (s.note || "").trim();
    return {
      summary: shiftEventTitle(s.starts, s.ends),
      description: `Vakt hjá Fjarlækningum ${hhmm(s.starts)}–${hhmm(s.ends)}.${note ? `\n\n${note}` : ""}`,
    };
  },
});

export const {
  getSync,
  accessTokenFor,
  syncDoctor,
  syncDoctors,
  syncAllConnected,
  purgeEvents,
  disconnect,
  completeConnect,
  recordConnectError,
} = sync;
