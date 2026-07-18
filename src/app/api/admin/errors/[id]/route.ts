// Update (status) / delete an error row (admin only).

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getCallerStaff, isAdmin } from "@/lib/admin-auth";

export const runtime = "nodejs";

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const caller = await getCallerStaff(req);
  if (!isAdmin(caller)) return NextResponse.json({ ok: false, error: "Admin role required" }, { status: 403 });
  const { id } = await ctx.params;

  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  if (body.status !== "new" && body.status !== "resolved") {
    return NextResponse.json({ ok: false, error: "Invalid status" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("app_errors")
    .update({ status: body.status })
    .eq("id", id)
    .select()
    .single();
  if (error || !data) return NextResponse.json({ ok: false, error: error?.message || "Villa" }, { status: 500 });
  return NextResponse.json({ ok: true, error_row: data });
}

export async function DELETE(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const caller = await getCallerStaff(req);
  if (!isAdmin(caller)) return NextResponse.json({ ok: false, error: "Admin role required" }, { status: 403 });
  const { id } = await ctx.params;
  const { error } = await supabaseAdmin.from("app_errors").delete().eq("id", id);
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
