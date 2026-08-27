// Jöfn skipting vakta. POST previews a plan; POST with apply:true writes it.
//
// Preview and apply run the SAME function over the SAME data, so what is
// approved on screen is what lands in the table.

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getCallerStaff, isAdmin } from "@/lib/admin-auth";
import { planAssignments, type AssignDoctor, type AssignShift } from "@/lib/roster-assign";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const caller = await getCallerStaff(req);
  if (!isAdmin(caller)) return NextResponse.json({ ok: false, error: "Admin role required" }, { status: 403 });

  let body: Record<string, unknown> = {};
  try { body = await req.json(); } catch {
    return NextResponse.json({ ok: false, error: "Ógild gögn" }, { status: 400 });
  }
  // Direct bulk assignment: a set of shifts handed to one doctor. No planning —
  // this is the "tick five boxes, pick a name" path, and second-guessing it
  // with the fairness rules would be surprising.
  if (Array.isArray(body.shiftIds) && body.shiftIds.length) {
    const ids = (body.shiftIds as unknown[]).map(String).filter(Boolean);
    const doctorId = body.doctorId ? String(body.doctorId) : null;
    const { error } = await supabaseAdmin
      .from("roster_shifts")
      .update({ doctor_id: doctorId, updated_at: new Date().toISOString() })
      .in("id", ids);
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, applied: ids.length, bulk: true });
  }

  const month = String(body.month || "");
  if (!/^\d{4}-\d{2}$/.test(month)) {
    return NextResponse.json({ ok: false, error: "Ógildur mánuður" }, { status: 400 });
  }
  const mode = body.mode === "all" ? "all" : "empty";
  const doctorIds = Array.isArray(body.doctorIds) ? body.doctorIds.map(String) : undefined;

  const [{ data: doctors }, { data: shifts }] = await Promise.all([
    supabaseAdmin
      .from("roster_doctors")
      .select("id, name, active, max_shifts_per_month, allowed_weekdays")
      .eq("active", true),
    supabaseAdmin
      .from("roster_shifts")
      .select("id, shift_date, doctor_id")
      .gte("shift_date", `${month}-01`)
      .lte("shift_date", `${month}-31`)
      .order("shift_date"),
  ]);

  const plan = planAssignments(
    (shifts ?? []) as AssignShift[],
    (doctors ?? []) as AssignDoctor[],
    { mode, doctorIds },
  );

  if (body.apply !== true) {
    return NextResponse.json({ ok: true, plan, applied: 0, preview: true });
  }

  // One update per shift. A month is at most a few dozen rows, and doing them
  // individually means a single bad row cannot take the whole month with it.
  let applied = 0;
  const failed: string[] = [];
  for (const [shiftId, doctorId] of Object.entries(plan.assignments)) {
    const { error } = await supabaseAdmin
      .from("roster_shifts")
      .update({ doctor_id: doctorId, updated_at: new Date().toISOString() })
      .eq("id", shiftId);
    if (error) failed.push(shiftId); else applied += 1;
  }

  return NextResponse.json({ ok: true, plan, applied, failed, preview: false });
}
