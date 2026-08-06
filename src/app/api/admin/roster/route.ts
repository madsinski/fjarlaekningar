// Roster overview for a given month: doctors + settings + that month's shifts.
// Any active staff may read (the future doctor portal reuses this).

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getCallerStaff } from "@/lib/admin-auth";
import { monthKey, shiftMonth } from "@/lib/roster";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const caller = await getCallerStaff(req);
  if (!caller) return NextResponse.json({ ok: false, error: "Not authenticated" }, { status: 401 });

  const month = new URL(req.url).searchParams.get("month") || monthKey(new Date());
  const first = `${month}-01`;
  const next = `${shiftMonth(month, 1)}-01`;

  const [doctors, settings, shifts] = await Promise.all([
    supabaseAdmin.from("roster_doctors").select("*").order("active", { ascending: false }).order("name"),
    supabaseAdmin.from("roster_settings").select("per_patient_salary, currency").eq("id", 1).maybeSingle(),
    supabaseAdmin
      .from("roster_shifts")
      .select("*")
      .gte("shift_date", first)
      .lt("shift_date", next)
      .order("shift_date")
      .order("starts"),
  ]);

  return NextResponse.json({
    ok: true,
    month,
    doctors: doctors.data ?? [],
    settings: settings.data ?? { per_patient_salary: 3000, currency: "kr." },
    shifts: shifts.data ?? [],
  });
}
