// Gögn fyrir "Mín síða" læknis. Server-only.

import { supabaseAdmin } from "@/lib/supabase-admin";
import { loadShiftTypes } from "./server";
import { monthKey, type HsuMonth, type HsuPreference, type HsuShift, type HsuShiftType, type HsuSwap } from "./types";

export interface Colleague { id: string; name: string; color: string; role: string; phone: string; email: string }

export interface PortalNotification {
  id: string;
  created_at: string;
  title: string;
  lines: string[];
  link: string;
  read_at: string | null;
}

export interface PortalData {
  me: { id: string; name: string; email: string; role: string; hasPin: boolean; mustChangePassword: boolean; hasCalendarToken: boolean; dayWeekdays: number[]; lang: string;
    /** Hvað notandinn hefur séð: {"tour:doctor": tími, …}. */
    onboarding: Record<string, string> };
  shiftTypes: HsuShiftType[];
  unitName: string;
  colleagues: Colleague[];
  myShifts: HsuShift[];
  months: HsuMonth[];
  prefs: HsuPreference[];
  swaps: HsuSwap[];
  /** Vaktir sem yfirlæknir biður lækninn að taka umfram hámark. */
  requests: (HsuShift & { requested_by: string })[];
  marketRequiresApproval: boolean;
  today: string;
  /** Tilkynningar um breytingar á vöktum læknisins — nýjustu fyrst. */
  notifications: PortalNotification[];
}

export async function loadPortal(doctorId: string): Promise<PortalData> {
  const types = await loadShiftTypes();
  const today = new Date().toISOString().slice(0, 10);
  const first = `${monthKey(new Date())}-01`;

  const [me, colleagues, myShifts, months, prefs, swaps, settings, requests, notifications] = await Promise.all([
    supabaseAdmin.from("hsu_doctors").select("id, name, email, role, pin_hash, must_change_password, calendar_token, day_weekdays, lang, onboarding").eq("id", doctorId).single(),
    supabaseAdmin.from("hsu_doctors").select("id, name, color, role, phone, email").eq("active", true).order("name"),
    supabaseAdmin.from("hsu_shifts").select("id, shift_date, shift_type_id, label, starts, ends, doctor_id, status, note, vinnustund_logged_at")
      .eq("doctor_id", doctorId).eq("published", true).is("confirm_status", null).gte("shift_date", first).order("shift_date").order("starts"),
    supabaseAdmin.from("hsu_months").select("month, status, prefs_deadline, note, published_at").gte("month", monthKey(new Date())).order("month"),
    supabaseAdmin.from("hsu_preferences").select("*").eq("doctor_id", doctorId).gte("month", monthKey(new Date())),
    supabaseAdmin.from("hsu_swaps")
      .select("id, shift_id, from_doctor, to_doctor, taken_by, note, status, created_at, shift:hsu_shifts!inner(shift_date, starts, ends, label, published, shift_type_id)")
      .in("status", ["pending", "awaiting_approval"])
      .gte("shift.shift_date", today)
      .eq("shift.published", true)
      .order("created_at"),
    supabaseAdmin.from("hsu_settings").select("unit_name, market_requires_approval").eq("id", 1).maybeSingle(),
    supabaseAdmin.from("hsu_shifts").select("id, shift_date, shift_type_id, label, starts, ends, doctor_id, status, note, confirm_status, requested_by")
      .eq("doctor_id", doctorId).eq("confirm_status", "requested").gte("shift_date", today).order("shift_date"),
    // Ólesnar allar, og lesnar síðustu 30 daga.
    supabaseAdmin.from("hsu_notifications").select("id, created_at, title, lines, link, read_at")
      .eq("doctor_id", doctorId)
      .or(`read_at.is.null,created_at.gte.${new Date(Date.now() - 30 * 86400_000).toISOString()}`)
      .order("created_at", { ascending: false }).limit(40),
  ]);

  for (const r of [me, colleagues, myShifts, months, prefs, swaps, requests, notifications]) {
    if (r.error) throw new Error(r.error.message);
  }

  return {
    me: {
      id: me.data!.id, name: me.data!.name, email: me.data!.email, role: me.data!.role,
      hasPin: Boolean(me.data!.pin_hash), mustChangePassword: me.data!.must_change_password,
      hasCalendarToken: Boolean(me.data!.calendar_token),
      dayWeekdays: Array.isArray(me.data!.day_weekdays) ? me.data!.day_weekdays.map(Number) : [],
      lang: me.data!.lang ?? "is",
      onboarding: (me.data!.onboarding ?? {}) as Record<string, string>,
    },
    shiftTypes: types,
    unitName: settings.data?.unit_name ?? "Heilsugæslan í Vestmannaeyjum",
    colleagues: (colleagues.data ?? []) as Colleague[],
    myShifts: (myShifts.data ?? []) as HsuShift[],
    months: (months.data ?? []) as HsuMonth[],
    prefs: (prefs.data ?? []) as HsuPreference[],
    swaps: (swaps.data ?? []) as unknown as HsuSwap[],
    requests: (requests.data ?? []) as PortalData["requests"],
    marketRequiresApproval: Boolean(settings.data?.market_requires_approval),
    today,
    notifications: (notifications.data ?? []) as PortalNotification[],
  };
}
