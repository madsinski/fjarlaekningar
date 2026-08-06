// Roster overview for a given month: doctors (derived from staff with the
// 'doctor' role) + settings + that month's shifts + pending swaps.
// Any active staff may read.

import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getCallerStaff, isAdmin } from "@/lib/admin-auth";
import { monthKey, shiftMonth } from "@/lib/roster";

export const runtime = "nodejs";

const PALETTE = ["#00a8cc", "#cf147b", "#0488a4", "#7c3aed", "#059669", "#d97706", "#2563eb", "#db2777"];

// Doctors are staff members with the 'doctor' role. Each gets a roster profile
// (roster_doctors) holding a colour + personal access token; shifts reference
// that profile id. Ensure a profile exists for every doctor-staff.
async function syncDoctors() {
  const { data: staffDoctors } = await supabaseAdmin
    .from("staff")
    .select("id, name, email, active")
    .contains("roles", ["doctor"]);
  const staff = staffDoctors ?? [];
  const staffIds = staff.map((s) => s.id);
  if (!staffIds.length) return [];

  const { data: existing } = await supabaseAdmin.from("roster_doctors").select("*").in("staff_id", staffIds);
  const have = new Set((existing ?? []).map((p) => p.staff_id));
  const missing = staff.filter((s) => !have.has(s.id));
  if (missing.length) {
    const rows = missing.map((s, i) => ({
      staff_id: s.id,
      name: s.name,
      email: s.email || "",
      color: PALETTE[((existing?.length ?? 0) + i) % PALETTE.length],
      access_token: randomBytes(24).toString("hex"),
    }));
    // Plain insert (not upsert): the staff_id unique index is partial, which
    // ON CONFLICT can't infer. `missing` is already the set without a profile.
    await supabaseAdmin.from("roster_doctors").insert(rows);
  }

  const { data: profiles } = await supabaseAdmin.from("roster_doctors").select("*").in("staff_id", staffIds);
  const byStaff = new Map(staff.map((s) => [s.id, s]));
  return (profiles ?? [])
    .map((p) => {
      const s = byStaff.get(p.staff_id);
      return { ...p, name: s?.name ?? p.name, email: s?.email ?? p.email, active: s?.active ?? true };
    })
    .sort((a, b) => a.name.localeCompare(b.name, "is"));
}

export async function GET(req: Request) {
  const caller = await getCallerStaff(req);
  if (!isAdmin(caller)) return NextResponse.json({ ok: false, error: "Admin role required" }, { status: 403 });

  const month = new URL(req.url).searchParams.get("month") || monthKey(new Date());
  const first = `${month}-01`;
  const next = `${shiftMonth(month, 1)}-01`;

  const doctors = await syncDoctors();

  const [settings, shifts, swaps] = await Promise.all([
    supabaseAdmin.from("roster_settings").select("per_patient_salary, currency").eq("id", 1).maybeSingle(),
    supabaseAdmin
      .from("roster_shifts")
      .select("*")
      .gte("shift_date", first)
      .lt("shift_date", next)
      .order("shift_date")
      .order("starts"),
    supabaseAdmin
      .from("roster_swaps")
      .select("id, shift_id, from_doctor, to_doctor, status, shift:roster_shifts(shift_date, starts, ends)")
      .eq("status", "pending"),
  ]);

  return NextResponse.json({
    ok: true,
    month,
    doctors,
    settings: settings.data ?? { per_patient_salary: 3000, currency: "kr." },
    shifts: shifts.data ?? [],
    swaps: swaps.data ?? [],
  });
}
