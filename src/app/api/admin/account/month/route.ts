// A month of the roster (all doctors) for the logged-in staff member's account
// page. Read-only; any active staff. Service-role, so it works under the
// admin read-lockdown RLS.

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

  const [shifts, doctors] = await Promise.all([
    supabaseAdmin
      .from("roster_shifts")
      .select("id, shift_date, starts, ends, doctor_id, status")
      .gte("shift_date", first)
      .lt("shift_date", next)
      .order("shift_date")
      .order("starts"),
    supabaseAdmin.from("roster_doctors").select("id, name, color"),
  ]);

  return NextResponse.json({ ok: true, month, shifts: shifts.data ?? [], doctors: doctors.data ?? [] });
}
