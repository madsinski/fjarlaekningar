// Read / autosave / delete one campaign. Read: any active staff. Writes: admin.

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getCallerStaff, isAdmin } from "@/lib/admin-auth";

export const runtime = "nodejs";

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const caller = await getCallerStaff(req);
  if (!caller) return NextResponse.json({ ok: false, error: "Not authenticated" }, { status: 401 });
  const { id } = await ctx.params;

  const { data } = await supabaseAdmin
    .from("outreach_campaigns")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!data) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true, campaign: data });
}

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

  const { data: current } = await supabaseAdmin
    .from("outreach_campaigns")
    .select("status")
    .eq("id", id)
    .maybeSingle();
  if (!current) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  // A sent campaign is a record of what went out — don't let it be rewritten.
  if (current.status === "sent") {
    return NextResponse.json({ ok: false, error: "Herferð sem hefur verið send er læst" }, { status: 409 });
  }

  const patch: Record<string, unknown> = {};
  if (typeof body.subject === "string") patch.subject = body.subject.slice(0, 300);
  if (typeof body.preheader === "string") patch.preheader = body.preheader.slice(0, 300);
  if (typeof body.body === "string") patch.body = body.body;
  if (Object.keys(patch).length === 0) return NextResponse.json({ ok: true });

  const { data, error } = await supabaseAdmin
    .from("outreach_campaigns")
    .update(patch)
    .eq("id", id)
    .select("id, subject, preheader, status, updated_at")
    .maybeSingle();

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, campaign: data });
}

export async function DELETE(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const caller = await getCallerStaff(req);
  if (!isAdmin(caller)) {
    return NextResponse.json({ ok: false, error: "Admin role required" }, { status: 403 });
  }
  const { id } = await ctx.params;
  const { error } = await supabaseAdmin.from("outreach_campaigns").delete().eq("id", id);
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
