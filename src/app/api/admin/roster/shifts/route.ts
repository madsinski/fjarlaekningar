// Create a shift, or generate a full month of daily 10–22 shifts. Admin only.

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getCallerStaff, isAdmin } from "@/lib/admin-auth";
import { datesInMonth, shiftMonth } from "@/lib/roster";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const caller = await getCallerStaff(req);
  if (!isAdmin(caller)) {
    return NextResponse.json({ ok: false, error: "Admin role required" }, { status: 403 });
  }
  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    /* empty */
  }

  const starts = typeof body.starts === "string" ? body.starts : "10:00";
  const ends = typeof body.ends === "string" ? body.ends : "22:00";

  // ── Generate: one shift per day of the month that doesn't already have one ──
  if (body.action === "generate") {
    const month = String(body.month || "");
    const dates = datesInMonth(month);
    if (!dates.length) return NextResponse.json({ ok: false, error: "Ógildur mánuður" }, { status: 400 });

    const first = `${month}-01`;
    const next = `${shiftMonth(month, 1)}-01`;
    const { data: existing } = await supabaseAdmin
      .from("roster_shifts")
      .select("shift_date")
      .gte("shift_date", first)
      .lt("shift_date", next);
    const have = new Set((existing ?? []).map((r) => r.shift_date));

    const rows = dates.filter((d) => !have.has(d)).map((d) => ({ shift_date: d, starts, ends, status: "assigned" }));
    if (rows.length) {
      const { error } = await supabaseAdmin.from("roster_shifts").insert(rows);
      if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true, created: rows.length });
  }

  // ── Single shift ──
  const shift_date = String(body.shift_date || "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(shift_date)) {
    return NextResponse.json({ ok: false, error: "Dagsetningu vantar" }, { status: 400 });
  }
  const { data, error } = await supabaseAdmin
    .from("roster_shifts")
    .insert({ shift_date, starts, ends, doctor_id: (body.doctor_id as string) || null })
    .select("*")
    .single();
  if (error || !data) return NextResponse.json({ ok: false, error: error?.message || "Villa" }, { status: 500 });
  return NextResponse.json({ ok: true, shift: data }, { status: 201 });
}
