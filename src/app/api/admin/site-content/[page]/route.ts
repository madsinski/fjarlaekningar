// Website CMS content for one page.
//   GET  — any active staff: returns { draft, published, updated_at, published_at }.
//   PUT  — admin only: replaces `draft` (autosave), upserts the row.

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getCallerStaff, isAdmin } from "@/lib/admin-auth";

export const runtime = "nodejs";

export async function GET(req: Request, ctx: { params: Promise<{ page: string }> }) {
  const caller = await getCallerStaff(req);
  if (!caller) return NextResponse.json({ ok: false, error: "Not authenticated" }, { status: 401 });
  const { page } = await ctx.params;

  const { data } = await supabaseAdmin
    .from("site_content")
    .select("page, draft, published, updated_at, published_at")
    .eq("page", page)
    .maybeSingle();

  return NextResponse.json({
    ok: true,
    content: data ?? { page, draft: {}, published: null, updated_at: null, published_at: null },
  });
}

export async function PUT(req: Request, ctx: { params: Promise<{ page: string }> }) {
  const caller = await getCallerStaff(req);
  if (!isAdmin(caller)) {
    return NextResponse.json({ ok: false, error: "Admin role required" }, { status: 403 });
  }
  const { page } = await ctx.params;

  let body: { draft?: unknown } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }
  if (typeof body.draft !== "object" || body.draft === null) {
    return NextResponse.json({ ok: false, error: "draft must be an object" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("site_content")
    .upsert(
      { page, draft: body.draft, updated_at: new Date().toISOString(), updated_by: caller!.id },
      { onConflict: "page" },
    )
    .select("page, draft, published, updated_at, published_at")
    .single();

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, content: data });
}
