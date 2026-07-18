// Read / update (+publish) / delete a presentation (admin for writes).

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getCallerStaff, isAdmin } from "@/lib/admin-auth";

export const runtime = "nodejs";

const KINDS = ["kynning", "prentefni"];

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const caller = await getCallerStaff(req);
  if (!caller) return NextResponse.json({ ok: false, error: "Not authenticated" }, { status: 401 });
  const { id } = await ctx.params;
  const { data } = await supabaseAdmin.from("presentations").select("*").eq("id", id).maybeSingle();
  if (!data) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true, presentation: data });
}

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

  const update: Record<string, unknown> = { updated_by: caller!.id };
  if (typeof body.title === "string" && body.title.trim()) update.title = body.title.trim();
  if (typeof body.summary === "string") update.summary = body.summary;
  if (typeof body.body === "string") update.body = body.body;
  if (typeof body.external_url === "string") update.external_url = body.external_url.trim() || null;
  if (typeof body.kind === "string") {
    if (!KINDS.includes(body.kind)) return NextResponse.json({ ok: false, error: "Invalid kind" }, { status: 400 });
    update.kind = body.kind;
  }
  if (body.status === "published" || body.status === "draft") {
    update.status = body.status;
    update.published_at = body.status === "published" ? new Date().toISOString() : null;
  }

  const { data, error } = await supabaseAdmin.from("presentations").update(update).eq("id", id).select().single();
  if (error || !data) return NextResponse.json({ ok: false, error: error?.message || "Villa" }, { status: 500 });
  return NextResponse.json({ ok: true, presentation: data });
}

export async function DELETE(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const caller = await getCallerStaff(req);
  if (!isAdmin(caller)) return NextResponse.json({ ok: false, error: "Admin role required" }, { status: 403 });
  const { id } = await ctx.params;
  const { error } = await supabaseAdmin.from("presentations").delete().eq("id", id);
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
