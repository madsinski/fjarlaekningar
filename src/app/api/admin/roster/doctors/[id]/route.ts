// Update / delete a roster doctor. Admin only.

import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
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
  if (typeof body.name === "string" && body.name.trim()) update.name = body.name.trim();
  if (typeof body.email === "string") update.email = body.email.trim();
  if (typeof body.color === "string" && /^#[0-9a-fA-F]{6}$/.test(body.color)) update.color = body.color;
  if (typeof body.active === "boolean") update.active = body.active;
  // Generate an access token on demand (e.g. for doctors created before tokens
  // existed, or to revoke + reissue a personal link).
  if (body.regenerate_token === true) update.access_token = randomBytes(24).toString("hex");
  if (Object.keys(update).length === 0) return NextResponse.json({ ok: true });

  const { data, error } = await supabaseAdmin.from("roster_doctors").update(update).eq("id", id).select("*").maybeSingle();
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, doctor: data });
}

export async function DELETE(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const caller = await getCallerStaff(req);
  if (!isAdmin(caller)) {
    return NextResponse.json({ ok: false, error: "Admin role required" }, { status: 403 });
  }
  const { id } = await ctx.params;
  // Shifts keep their history: doctor_id is set null on delete (FK on delete set null).
  const { error } = await supabaseAdmin.from("roster_doctors").delete().eq("id", id);
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
