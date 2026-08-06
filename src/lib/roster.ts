// Shared types + helpers for the doctor roster (vaktakerfi).

export interface RosterDoctor {
  id: string;
  name: string;
  email: string;
  color: string;
  active: boolean;
  staff_id: string | null;
  created_at?: string;
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
