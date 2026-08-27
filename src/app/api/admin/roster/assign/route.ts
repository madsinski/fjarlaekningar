// Jöfn skipting vakta. POST previews a plan; POST with apply:true writes it.
//
// Preview and apply run the SAME function over the SAME data, so what is
// approved on screen is what lands in the table.

import { NextResponse, after } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { syncDoctors, syncAllConnected } from "@/lib/roster-google-sync";
import { getCallerStaff, isAdmin } from "@/lib/admin-auth";
import { planAssignments, type AssignDoctor, type AssignShift } from "@/lib/roster-assign";
import { monthRange } from "@/lib/roster";

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
    // Who is losing these shifts, so they leave those calendars too.
    const { data: prev } = await supabaseAdmin
      .from("roster_shifts").select("doctor_id").in("id", ids);

    const { error } = await supabaseAdmin
      .from("roster_shifts")
      .update({ doctor_id: doctorId, updated_at: new Date().toISOString() })
      .in("id", ids);
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

    const touched = [doctorId, ...(prev ?? []).map((r: { doctor_id: string | null }) => r.doctor_id)];
    after(async () => { await syncDoctors(touched); });

    return NextResponse.json({ ok: true, applied: ids.length, bulk: true });
  }

  const month = String(body.month || "");
  if (!/^\d{4}-\d{2}$/.test(month)) {
    return NextResponse.json({ ok: false, error: "Ógildur mánuður" }, { status: 400 });
  }
  const mode = body.mode === "all" ? "all" : "empty";
  const doctorIds = Array.isArray(body.doctorIds) ? body.doctorIds.map(String) : undefined;

  const { first, next } = monthRange(month);
  const [{ data: doctors, error: docErr }, { data: shifts, error: shiftErr }, { data: away }] = await Promise.all([
    supabaseAdmin
      .from("roster_doctors")
      .select("id, name, active, max_shifts_per_month, allowed_weekdays, preferred_run_length")
      .eq("active", true),
    supabaseAdmin
      .from("roster_shifts")
      .select("id, shift_date, doctor_id")
      .gte("shift_date", first)
      .lt("shift_date", next)
      .order("shift_date"),
    // Holidays overlapping this month. A period counts if it starts before the
    // month ends and ends on or after it begins — the two-sided test, since a
    // holiday spanning the whole month contains neither of its edges.
    supabaseAdmin
      .from("roster_doctor_absences")
      .select("doctor_id, starts_on, ends_on")
      .lt("starts_on", next)
      .gte("ends_on", first),
  ]);
  // Say so rather than planning over an empty list. A failed read used to look
  // exactly like a month with nothing in it: "0 vaktir fá lækni", no error.
  if (docErr || shiftErr) {
    return NextResponse.json({ ok: false, error: (docErr ?? shiftErr)!.message }, { status: 500 });
  }

  const awayBy = new Map<string, { starts_on: string; ends_on: string }[]>();
  for (const a of (away ?? []) as { doctor_id: string; starts_on: string; ends_on: string }[]) {
    awayBy.set(a.doctor_id, [...(awayBy.get(a.doctor_id) ?? []), { starts_on: a.starts_on, ends_on: a.ends_on }]);
  }

  const plan = planAssignments(
    (shifts ?? []) as AssignShift[],
    ((doctors ?? []) as AssignDoctor[]).map((d) => ({ ...d, absences: awayBy.get(d.id) ?? [] })),
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

  // A whole month redistributed touches almost everyone, and "all" mode can move
  // shifts off doctors who appear nowhere in the new plan. Reconciling everyone
  // connected is both simpler and more correct than tracking who was affected.
  after(async () => { await syncAllConnected(); });

  return NextResponse.json({ ok: true, plan, applied, failed, preview: false });
}
