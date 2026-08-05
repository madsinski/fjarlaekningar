// Partner-institution page: read / update / delete.
// Read: any active staff. Writes: admin only.

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getCallerStaff, isAdmin } from "@/lib/admin-auth";

export const runtime = "nodejs";

const TEXT_FIELDS = [
  "name",
  "short_name",
  "logo_url",
  "eyebrow",
  "title",
  "intro",
  "region",
  "response_time",
  "hours",
  "service_url",
  "info_url",
  "pilot_tag",
  "safety_note",
] as const;

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const caller = await getCallerStaff(req);
  if (!caller) return NextResponse.json({ ok: false, error: "Not authenticated" }, { status: 401 });
  const { id } = await ctx.params;

  const { data } = await supabaseAdmin.from("partner_pages").select("*").eq("id", id).maybeSingle();
  if (!data) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true, partner: data });
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

  const update: Record<string, unknown> = {};
  for (const f of TEXT_FIELDS) {
    if (typeof body[f] === "string") update[f] = (body[f] as string).slice(0, 2000);
  }
  if (Array.isArray(body.erindi)) {
    update.erindi = (body.erindi as unknown[]).map((s) => String(s).slice(0, 200)).filter(Boolean);
  }
  if (typeof body.slug === "string" && body.slug.trim()) {
    update.slug = body.slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 80);
  }
  if (body.status === "draft" || body.status === "published") update.status = body.status;

  if (Object.keys(update).length === 0) return NextResponse.json({ ok: true });

  const { data, error } = await supabaseAdmin
    .from("partner_pages")
    .update(update)
    .eq("id", id)
    .select("*")
    .maybeSingle();

  if (error?.code === "23505") {
    return NextResponse.json({ ok: false, error: "Slóð er þegar í notkun" }, { status: 409 });
  }
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, partner: data });
}

export async function DELETE(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const caller = await getCallerStaff(req);
  if (!isAdmin(caller)) {
    return NextResponse.json({ ok: false, error: "Admin role required" }, { status: 403 });
  }
  const { id } = await ctx.params;
  const { error } = await supabaseAdmin.from("partner_pages").delete().eq("id", id);
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
