// Update roster settings (per-patient salary). Admin only.

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getCallerStaff, isAdmin } from "@/lib/admin-auth";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const caller = await getCallerStaff(req);
  if (!isAdmin(caller)) return NextResponse.json({ ok: false, error: "Admin role required" }, { status: 403 });
  const { data } = await supabaseAdmin
    .from("roster_settings")
    .select("per_patient_salary, currency")
    .eq("id", 1)
    .maybeSingle();
  return NextResponse.json({ ok: true, settings: data ?? { per_patient_salary: 0, currency: "kr." } });
}

export async function PATCH(req: Request) {
  const caller = await getCallerStaff(req);
  if (!isAdmin(caller)) {
    return NextResponse.json({ ok: false, error: "Admin role required" }, { status: 403 });
  }
  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const update: Record<string, unknown> = {};
  if (body.per_patient_salary !== undefined) {
    const n = Number(body.per_patient_salary);
    if (Number.isFinite(n) && n >= 0) update.per_patient_salary = Math.floor(n);
  }
  if (typeof body.currency === "string" && body.currency.trim()) update.currency = body.currency.trim().slice(0, 8);
  if (Object.keys(update).length === 0) return NextResponse.json({ ok: true });

  const { data, error } = await supabaseAdmin
    .from("roster_settings")
    .update(update)
    .eq("id", 1)
    .select("per_patient_salary, currency")
    .maybeSingle();
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, settings: data });
}
