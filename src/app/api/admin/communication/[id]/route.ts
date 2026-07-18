// Triage a contact message: change status and/or staff notes (admin only).

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getCallerStaff, isAdmin } from "@/lib/admin-auth";

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
  if (body.status === "new" || body.status === "handled") {
    update.status = body.status;
    update.handled_by = body.status === "handled" ? caller!.id : null;
  }
  if (typeof body.staff_notes === "string") {
    update.staff_notes = body.staff_notes.slice(0, 5000);
  }
  if (Object.keys(update).length === 0) {
    return NextResponse.json({ ok: false, error: "Ekkert að uppfæra" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin.from("contact_messages").update(update).eq("id", id).select().single();
  if (error || !data) {
    return NextResponse.json({ ok: false, error: error?.message || "Villa" }, { status: 500 });
  }
  return NextResponse.json({ ok: true, message: data });
}
