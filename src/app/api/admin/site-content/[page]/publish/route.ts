// Publish a page: copy `draft` → `published`. Admin only. Until this runs, the
// public site keeps rendering the previously-published content.

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getCallerStaff, isAdmin } from "@/lib/admin-auth";

export const runtime = "nodejs";

export async function POST(req: Request, ctx: { params: Promise<{ page: string }> }) {
  const caller = await getCallerStaff(req);
  if (!isAdmin(caller)) {
    return NextResponse.json({ ok: false, error: "Admin role required" }, { status: 403 });
  }
  const { page } = await ctx.params;

  const { data: row } = await supabaseAdmin.from("site_content").select("draft").eq("page", page).maybeSingle();
  if (!row) return NextResponse.json({ ok: false, error: "Ekkert efni til að birta" }, { status: 404 });

  const { data, error } = await supabaseAdmin
    .from("site_content")
    .update({ published: row.draft, published_at: new Date().toISOString(), updated_by: caller!.id })
    .eq("page", page)
    .select("page, published_at")
    .single();

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, published_at: data.published_at });
}
