// Dagatalssamstilling HSU: Google (push) og .ics-áskrift (Apple/Outlook).

import { createHash } from "node:crypto";
import { createCalendarSync, type SyncShiftRow } from "@/lib/calendar-sync";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { hhmm } from "@/lib/roster";
import { isLang, translator, type Lang } from "./i18n/core";
import {
  datesInMonth, holidayName, isDayWorkKind, monthKey, shiftMonth, weekdayOf,
  type DayWork, type DayWorkKind,
} from "./types";
import { doctorLang } from "./i18n/server";
import { notifyMsgs } from "./i18n/messages/notify";
import { prefs as prefsMsgs } from "./i18n/messages/prefs";

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
  eventBody: (s, lang) => {
    const l = isLang(lang) ? lang : "is";
    // Dagvinnufærsla ber tegundarlykil ("fm"/"mottaka"/"deild") sem label.
    const label = isDayWorkKind(s.label) ? dayWorkLabel(s.label, l) : (s.label ?? "");
    return {
      summary: hsuEventTitle(label, s.starts, s.ends),
      description: hsuEventDescription({ ...s, label }, l),
    };
  },
  extraRows: (doctorId, from) => dayWorkRows(doctorId, from),
});

// ── Dagvinna læknisins í dagatalið ──────────────────────────────────────────
// Föst dagvinnuvika (hsu_doctors.day_work) er ekki vakt í vaktaplaninu, en
// læknirinn vill samt sjá hana í dagatalinu sínu. Hún er því þanin út í
// staka daga á sama glugga og vaktirnar.

/** Hve langt fram dagvinnan er sett í dagatalið. */
const DAY_WORK_MONTHS_AHEAD = 6;

/** Fast auðkenni fyrir sama dag — annars yrði atburðurinn endurskrifaður í hverri samstillingu. */
function dayWorkId(doctorId: string, date: string): string {
  const h = createHash("sha1").update(`hsu-daywork:${doctorId}:${date}`).digest("hex");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-5${h.slice(13, 16)}-8${h.slice(17, 20)}-${h.slice(20, 32)}`;
}

export const dayWorkLabel = (kind: DayWorkKind, lang: Lang = "is") =>
  translator(prefsMsgs, lang).dyn(`fm.kind.${kind}`);

/**
 * Dagvinnudagar læknisins sem dagatalsfærslur. Sleppt er:
 *   • almennum frídögum — þá er engin dagvinna,
 *   • dögum þar sem hann á þegar birta dagvakt, svo hún tvöfaldist ekki.
 */
export async function dayWorkRows(doctorId: string, from: string): Promise<SyncShiftRow[]> {
  const { data: doc } = await supabaseAdmin
    .from("hsu_doctors").select("day_work").eq("id", doctorId).maybeSingle();
  const work = (doc?.day_work ?? {}) as DayWork;
  if (!Object.keys(work).length) return [];

  const [{ data: types }, { data: existing }] = await Promise.all([
    supabaseAdmin.from("hsu_shift_types").select("starts, ends, period").eq("period", "day").limit(1),
    supabaseAdmin.from("hsu_shifts").select("shift_date").eq("doctor_id", doctorId).eq("published", true).gte("shift_date", from),
  ]);
  const starts = (types?.[0]?.starts as string) ?? "08:00:00";
  const ends = (types?.[0]?.ends as string) ?? "16:00:00";
  const taken = new Set((existing ?? []).map((r) => r.shift_date as string));

  const rows: SyncShiftRow[] = [];
  const first = monthKey(new Date(`${from}T00:00:00Z`));
  for (let i = 0; i <= DAY_WORK_MONTHS_AHEAD; i++) {
    for (const date of datesInMonth(shiftMonth(first, i))) {
      if (date < from) continue;
      const kind = work[String(weekdayOf(date))];
      if (!kind || holidayName(date) || taken.has(date)) continue;
      rows.push({ id: dayWorkId(doctorId, date), shift_date: date, starts, ends, note: "", status: "assigned", label: kind });
    }
  }
  return rows;
}
