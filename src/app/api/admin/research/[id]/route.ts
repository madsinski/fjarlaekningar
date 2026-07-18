// Read / update / delete a research note. Collaborative: any active staff.

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getCallerStaff } from "@/lib/admin-auth";

export const runtime = "nodejs";

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const caller = await getCallerStaff(req);
  if (!caller) return NextResponse.json({ ok: false, error: "Not authenticated" }, { status: 401 });
  const { id } = await ctx.params;
  const { data } = await supabaseAdmin.from("research_notes").select("*").eq("id", id).maybeSingle();
  if (!data) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true, note: data });
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const caller = await getCallerStaff(req);
  if (!caller) return NextResponse.json({ ok: false, error: "Not authenticated" }, { status: 401 });
  const { id } = await ctx.params;

  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const update: Record<string, unknown> = {};
  if (typeof body.title === "string" && body.title.trim()) update.title = body.title.trim();
  if (typeof body.category === "string") update.category = body.category.trim() || "general";
  if (typeof body.body === "string") update.body = body.body;
  if (typeof body.source_url === "string") update.source_url = body.source_url.trim() || null;

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ ok: false, error: "Ekkert til að vista" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin.from("research_notes").update(update).eq("id", id).select().single();
  if (error || !data) return NextResponse.json({ ok: false, error: error?.message || "Villa" }, { status: 500 });
  return NextResponse.json({ ok: true, note: data });
}

export async function DELETE(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const caller = await getCallerStaff(req);
  if (!caller) return NextResponse.json({ ok: false, error: "Not authenticated" }, { status: 401 });
  const { id } = await ctx.params;
  const { error } = await supabaseAdmin.from("research_notes").delete().eq("id", id);
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
