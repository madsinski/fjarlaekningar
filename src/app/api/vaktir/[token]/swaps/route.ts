// Doctor offers one of THEIR shifts — either on the market (to_doctor null) or
// to a specific doctor. Token-gated.

import { NextResponse, after } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { syncDoctors } from "@/lib/roster-google-sync";

export const runtime = "nodejs";

async function doctorFromToken(token: string) {
  const { data } = await supabaseAdmin.from("roster_doctors").select("id").eq("access_token", token).maybeSingle();
  return data;
}

export async function POST(req: Request, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params;
  const doctor = await doctorFromToken(token);
  if (!doctor) return NextResponse.json({ ok: false, error: "Læknir fannst ekki" }, { status: 404 });

  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }
  const shiftId = String(body.shift_id || "");
  const toDoctor = body.to_doctor ? String(body.to_doctor) : null;

  const { data: shift } = await supabaseAdmin.from("roster_shifts").select("id, doctor_id").eq("id", shiftId).maybeSingle();
  if (!shift || shift.doctor_id !== doctor.id) {
    return NextResponse.json({ ok: false, error: "Vaktin tilheyrir þér ekki" }, { status: 403 });
  }

  // One live offer per shift.
  await supabaseAdmin.from("roster_swaps").update({ status: "cancelled", resolved_at: new Date().toISOString() }).eq("shift_id", shiftId).eq("status", "pending");

  const { error } = await supabaseAdmin.from("roster_swaps").insert({
    shift_id: shiftId,
    from_doctor: doctor.id,
    to_doctor: toDoctor,
    status: "pending",
  });
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  await supabaseAdmin.from("roster_shifts").update({ status: toDoctor ? "swap" : "open" }).eq("id", shiftId);

  // On the market the shift is no longer theirs to plan around, so it comes out
  // of the calendar. A targeted offer stays until the other doctor accepts.
  after(async () => { await syncDoctors([doctor.id]); });

  return NextResponse.json({ ok: true });
}
