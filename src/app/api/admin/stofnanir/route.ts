// Partner-institution pages: create. Admin only.
// (The list is read directly via RLS by the browser client on the admin page.)

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getCallerStaff, isAdmin } from "@/lib/admin-auth";

export const runtime = "nodejs";

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export async function POST(req: Request) {
  const caller = await getCallerStaff(req);
  if (!isAdmin(caller)) {
    return NextResponse.json({ ok: false, error: "Admin role required" }, { status: 403 });
  }

  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    /* empty body → blank partner */
  }

  const name = String(body.name || "").trim() || "Ný stofnun";
  const shortName = String(body.short_name || "").trim();
  const slug = String(body.slug || "").trim() || slugify(name) || `stofnun-${Date.now()}`;

  const { data, error } = await supabaseAdmin
    .from("partner_pages")
    .insert({ slug, name, short_name: shortName, created_by: caller!.id })
    .select("id, slug, name, status, updated_at")
    .single();

  if (error?.code === "23505") {
    return NextResponse.json({ ok: false, error: "Slóð er þegar í notkun" }, { status: 409 });
  }
  if (error || !data) {
    return NextResponse.json({ ok: false, error: error?.message || "Villa" }, { status: 500 });
  }
  return NextResponse.json({ ok: true, partner: data }, { status: 201 });
}
