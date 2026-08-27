// Shared types + helpers for the doctor roster (vaktakerfi).

export interface RosterDoctor {
  id: string;
  name: string;
  email: string;
  color: string;
  active: boolean;
  staff_id: string | null;
  access_token?: string | null;
  created_at?: string;
  /** Staða Google-tengingar, sett saman í /api/admin/roster. Null = ótengt. */
  google?: { enabled: boolean; last_sync_at: string | null; last_error: string | null } | null;
  /** Vaktaóskir — sjá roster-preferences-schema.sql. */
  max_shifts_per_month?: number | null;
  /** 0=sun … 6=lau. Tómt = allir dagar. */
  allowed_weekdays?: number[] | null;
  shift_note?: string;
}

export type ShiftStatus = "assigned" | "open" | "swap";

export interface RosterShift {
  id: string;
  shift_date: string; // YYYY-MM-DD
  starts: string; // HH:MM(:SS)
  ends: string;
  doctor_id: string | null;
  status: ShiftStatus;
  patients_seen: number;
  note: string;
}

export interface RosterSettings {
  per_patient_salary: number;
  currency: string;
}

export type SwapStatus = "pending" | "accepted" | "declined" | "cancelled";

export interface RosterSwap {
  id: string;
  shift_id: string;
  from_doctor: string | null;
  to_doctor: string | null; // null = open on the market
  status: SwapStatus;
  shift?: { shift_date: string; starts: string; ends: string } | null;
}

/** Current month key in YYYY-MM (server-safe: derived from a passed Date). */
export function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/** All calendar dates (YYYY-MM-DD) in the given YYYY-MM month. */
export function datesInMonth(month: string): string[] {
  const [y, m] = month.split("-").map(Number);
  if (!y || !m) return [];
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return Array.from({ length: last }, (_, i) => `${month}-${String(i + 1).padStart(2, "0")}`);
}

/** Add/subtract months from a YYYY-MM key. */
export function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

/**
 * Half-open date range covering one month: shift_date >= first AND < next.
 *
 * Never build the upper bound as `${month}-31`. Postgres rejects "2026-09-31"
 * outright — it is not a date — so the query errors, and a caller that only
 * destructures `data` reads that as "no shifts" and carries on with an empty
 * list. That is how "Skipta jafnt" came to divide 0 shifts in September and how
 * an invoice for a 30-day month came to derive 0 patients: not a wrong answer
 * from a working query, but a failed query mistaken for an empty one.
 */
export function monthRange(month: string): { first: string; next: string } {
  return { first: `${month}-01`, next: `${shiftMonth(month, 1)}-01` };
}

const IS_MONTHS = [
  "janúar", "febrúar", "mars", "apríl", "maí", "júní",
  "júlí", "ágúst", "september", "október", "nóvember", "desember",
];
export function monthLabel(month: string): string {
  const [y, m] = month.split("-").map(Number);
  return `${IS_MONTHS[(m || 1) - 1]} ${y}`;
}

const IS_WEEKDAYS = ["Sun", "Mán", "Þri", "Mið", "Fim", "Fös", "Lau"];
export function weekdayShort(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  return IS_WEEKDAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
}

export function hhmm(t: string): string {
  return (t || "").slice(0, 5);
}

/** "10:00" → "10", but "10:30" stays "10:30". Whole hours are the normal case. */
function shortHour(t: string): string {
  const [h, m] = (t || "").split(":");
  return m && m !== "00" ? `${Number(h)}:${m}` : String(Number(h));
}

/**
 * Title of a shift as it appears in a calendar: "FL: 10-22".
 *
 * Shifts are written as ALL-DAY entries rather than a timed 10–22 block. A
 * twelve-hour busy block swallows the whole day column and makes the rest of
 * the calendar unreadable — and it is not true either: the doctor is on call
 * for that window, not in a meeting for it. The hours live in the title, where
 * they can be read at a glance without opening anything.
 */
export function shiftEventTitle(starts: string, ends: string): string {
  return `FL: ${shortHour(starts)}-${shortHour(ends)}`;
}

/** Icelandic króna formatting: 3000 → "3.000 kr." */
export function formatIsk(n: number, currency = "kr."): string {
  return `${Math.round(n).toLocaleString("de-DE")} ${currency}`;
}

export interface DoctorMonthTotal {
  doctor: RosterDoctor;
  daysWorked: number;
  patients: number;
  pay: number;
}

/** Per-doctor monthly totals (days worked, patients, pay). */
export function monthlyTotals(
  doctors: RosterDoctor[],
  shifts: RosterShift[],
  perPatientSalary: number,
): DoctorMonthTotal[] {
  return doctors
    .map((doctor) => {
      const own = shifts.filter((s) => s.doctor_id === doctor.id && s.status !== "open");
      const patients = own.reduce((sum, s) => sum + (s.patients_seen || 0), 0);
      return {
        doctor,
        daysWorked: own.length,
        patients,
        pay: patients * perPatientSalary,
      };
    })
    .filter((t) => t.daysWorked > 0 || t.patients > 0);
}
