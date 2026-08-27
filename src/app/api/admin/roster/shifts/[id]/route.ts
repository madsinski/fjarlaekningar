// Update / delete a shift. Admin only.

import { NextResponse, after } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getCallerStaff, isAdmin } from "@/lib/admin-auth";
import { syncDoctors } from "@/lib/roster-google-sync";

export const runtime = "nodejs";

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const caller = await getCallerStaff(req);
  if (!isAdmin(caller)) {
    return NextResponse.json({ ok: false, error: "Admin role required" }, { status: 403 });
  }
  const { id } = await ctx.params;
  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const update: Record<string, unknown> = {};
  if ("doctor_id" in body) update.doctor_id = (body.doctor_id as string) || null;
  if (typeof body.starts === "string") update.starts = body.starts;
  if (typeof body.ends === "string") update.ends = body.ends;
  if (typeof body.note === "string") update.note = body.note;
  if (body.status === "assigned" || body.status === "open" || body.status === "swap") update.status = body.status;
  if (body.patients_seen !== undefined) {
    const n = Number(body.patients_seen);
    if (Number.isFinite(n) && n >= 0) update.patients_seen = Math.floor(n);
  }
  if (Object.keys(update).length === 0) return NextResponse.json({ ok: true });

  // Who held it before, so a reassignment can be taken out of the previous
  // doctor's calendar as well as put into the new one's.
  const { data: before } = await supabaseAdmin
    .from("roster_shifts").select("doctor_id").eq("id", id).maybeSingle();

  const { data, error } = await supabaseAdmin.from("roster_shifts").update(update).eq("id", id).select("*").maybeSingle();
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  // After the response: talking to Google must not slow down the admin's click.
  after(async () => { await syncDoctors([before?.doctor_id, data?.doctor_id]); });

  return NextResponse.json({ ok: true, shift: data });
}

export async function DELETE(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const caller = await getCallerStaff(req);
  if (!isAdmin(caller)) {
    return NextResponse.json({ ok: false, error: "Admin role required" }, { status: 403 });
  }
  const { id } = await ctx.params;
  const { data: before } = await supabaseAdmin
    .from("roster_shifts").select("doctor_id").eq("id", id).maybeSingle();

  const { error } = await supabaseAdmin.from("roster_shifts").delete().eq("id", id);
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  after(async () => { await syncDoctors([before?.doctor_id]); });

  return NextResponse.json({ ok: true });
}
