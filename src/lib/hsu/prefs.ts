// Hreinsun og vistun óska — sameiginlegt fyrir lækninn sjálfan og yfirlækni.
// Server-only.

import { supabaseAdmin } from "@/lib/supabase-admin";
import { datesInMonth, shiftMonth, type DayMark, type Mark, type HsuPreference, type PrefStatus } from "./types";

/** 0=sun … 6=lau. Tómt fylki = allir dagar. */
function cleanWeekdayList(v: unknown): number[] {
  if (!Array.isArray(v)) return [];
  return [...new Set(v.map(Number).filter((d) => Number.isInteger(d) && d >= 0 && d <= 6))].sort();
}

function cleanMarks<T extends string>(raw: unknown, allowed: Set<string>, values: readonly T[]): Record<string, T> {
  const out: Record<string, T> = {};
  if (!raw || typeof raw !== "object") return out;
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (allowed.has(k) && (values as readonly unknown[]).includes(v)) out[k] = v as T;
  }
  return out;
}

const WEEKDAYS = new Set(["0", "1", "2", "3", "4", "5", "6"]);

function cleanCount(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Math.floor(Number(v));
  return Number.isFinite(n) && n >= 0 && n <= 31 ? n : null;
}

export interface PrefInput {
  day_marks: Record<string, DayMark>;
  weekday_marks: Record<string, Mark>;
  evening_weekdays: number[];
  min_shifts: number | null;
  max_shifts: number | null;
  note: string;
}

export function sanitizePrefs(month: string, body: Record<string, unknown>): PrefInput | string {
  const p: PrefInput = {
    day_marks: cleanMarks<DayMark>(body.day_marks, new Set(datesInMonth(month)), ["off", "want", "ok"]),
    weekday_marks: cleanMarks<Mark>(body.weekday_marks, WEEKDAYS, ["off", "want"]),
    evening_weekdays: cleanWeekdayList(body.evening_weekdays),
    min_shifts: cleanCount(body.min_shifts),
    max_shifts: cleanCount(body.max_shifts),
    note: typeof body.note === "string" ? body.note.slice(0, 1000) : "",
  };
  if (p.min_shifts != null && p.max_shifts != null && p.min_shifts > p.max_shifts) {
    return "Lágmark getur ekki verið hærra en hámark.";
  }
  return p;
}

/**
 * Má læknirinn sjálfur breyta óskum fyrir þennan mánuð?
 * Opið meðan óskum er safnað; í yfirferð aðeins ef hann á eftir að senda eða
 * yfirlæknir bað um breytingar. Eftir að vaktaplan fer í smíði er lokað.
 */
export function doctorMayEdit(monthStatus: string | null, prefStatus: PrefStatus | null): boolean {
  if (!monthStatus || monthStatus === "collecting") return true;
  if (monthStatus === "review") return prefStatus !== "approved" && prefStatus !== "submitted";
  return false;
}

export async function savePrefs(opts: {
  doctorId: string;
  month: string;
  input: PrefInput;
  status: PrefStatus;
  enteredBy?: string;
}): Promise<HsuPreference> {
  const row: Record<string, unknown> = {
    doctor_id: opts.doctorId,
    month: opts.month,
    ...opts.input,
    status: opts.status,
  };
  if (opts.status === "submitted") row.submitted_at = new Date().toISOString();
  if (opts.status === "approved") row.reviewed_at = new Date().toISOString();
  if (opts.enteredBy !== undefined) row.entered_by = opts.enteredBy;
  const { data, error } = await supabaseAdmin
    .from("hsu_preferences")
    .upsert(row, { onConflict: "doctor_id,month" })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return data as HsuPreference;
}

/**
 * Sömu óskir fyrir næsta mánuð. Vikudagar, fjöldi og athugasemd flytjast;
 * ákveðnir dagar gera það ekki, því 3. október segir ekkert um nóvember.
 * Snertir ekki mánuð sem er kominn í vaktaplan eða óskir sem búið er að samþykkja.
 */
export async function copyToNextMonth(doctorId: string, month: string, input: PrefInput, status: PrefStatus, enteredBy?: string): Promise<string | null> {
  const next = shiftMonth(month, 1);
  const [{ data: m }, { data: existing }] = await Promise.all([
    supabaseAdmin.from("hsu_months").select("status").eq("month", next).maybeSingle(),
    supabaseAdmin.from("hsu_preferences").select("status, day_marks").eq("doctor_id", doctorId).eq("month", next).maybeSingle(),
  ]);
  if (m && (m.status === "planning" || m.status === "published")) return null;
  if (existing?.status === "approved") return null;
  await savePrefs({
    doctorId,
    month: next,
    input: { ...input, day_marks: (existing?.day_marks as Record<string, DayMark>) ?? {} },
    status,
    enteredBy,
  });
  return next;
}
