// Update / delete a release (admin only).

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getCallerStaff, isAdmin } from "@/lib/admin-auth";

export const runtime = "nodejs";

const KINDS = ["feature", "fix", "security", "compliance"];

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

  const update: Record<string, unknown> = {};
  if (typeof body.version === "string" && body.version.trim()) update.version = body.version.trim();
  if (typeof body.title === "string" && body.title.trim()) update.title = body.title.trim();
  if (typeof body.notes === "string") update.notes = body.notes;
  if (typeof body.released_on === "string" && body.released_on.trim()) update.released_on = body.released_on.trim();
  if (typeof body.kind === "string") {
    if (!KINDS.includes(body.kind)) return NextResponse.json({ ok: false, error: "Invalid kind" }, { status: 400 });
    update.kind = body.kind;
  }
  if (Object.keys(update).length === 0) {
    return NextResponse.json({ ok: false, error: "Ekkert til að uppfæra" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin.from("releases").update(update).eq("id", id).select().single();
  if (error || !data) return NextResponse.json({ ok: false, error: error?.message || "Villa" }, { status: 500 });
  return NextResponse.json({ ok: true, release: data });
}

export async function DELETE(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const caller = await getCallerStaff(req);
  if (!isAdmin(caller)) return NextResponse.json({ ok: false, error: "Admin role required" }, { status: 403 });
  const { id } = await ctx.params;
  const { error } = await supabaseAdmin.from("releases").delete().eq("id", id);
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
