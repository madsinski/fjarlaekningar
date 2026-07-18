// Update a data request (admin only): change status and/or staff notes.
// Stamps handled_by; updated_at is maintained by the DB trigger.

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getCallerStaff, isAdmin } from "@/lib/admin-auth";

export const runtime = "nodejs";

const STATUSES = ["new", "in_progress", "completed", "rejected"];

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

  const update: Record<string, unknown> = { handled_by: caller!.id };
  if (typeof body.status === "string") {
    if (!STATUSES.includes(body.status)) {
      return NextResponse.json({ ok: false, error: "Invalid status" }, { status: 400 });
    }
    update.status = body.status;
  }
  if (typeof body.staff_notes === "string") {
    update.staff_notes = body.staff_notes;
  }

  const { data, error } = await supabaseAdmin
    .from("data_requests")
    .update(update)
    .eq("id", id)
    .select()
    .single();
  if (error || !data) {
    return NextResponse.json({ ok: false, error: error?.message || "Villa" }, { status: 500 });
  }
  return NextResponse.json({ ok: true, request: data });
}
