// Doctor registers how many patients they saw on one of THEIR shifts.
// Token-gated (the unguessable token in the URL is the credential) — no login.

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";

export async function POST(req: Request, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params;
  if (!token || token.length < 16) return NextResponse.json({ ok: false, error: "Ógildur hlekkur" }, { status: 400 });

  const { data: doctor } = await supabaseAdmin
    .from("roster_doctors")
    .select("id")
    .eq("access_token", token)
    .maybeSingle();
  if (!doctor) return NextResponse.json({ ok: false, error: "Læknir fannst ekki" }, { status: 404 });

  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }
  const shiftId = String(body.shift_id || "");
  const n = Number(body.patients_seen);
  if (!shiftId || !Number.isFinite(n) || n < 0) {
    return NextResponse.json({ ok: false, error: "Ógild gögn" }, { status: 400 });
  }

  // Only the doctor's own shift may be updated.
  const { data: shift } = await supabaseAdmin
    .from("roster_shifts")
    .select("id, doctor_id")
    .eq("id", shiftId)
    .maybeSingle();
  if (!shift || shift.doctor_id !== doctor.id) {
    return NextResponse.json({ ok: false, error: "Vaktin tilheyrir þér ekki" }, { status: 403 });
  }

  const { error } = await supabaseAdmin
    .from("roster_shifts")
    .update({ patients_seen: Math.floor(n) })
    .eq("id", shiftId);
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
