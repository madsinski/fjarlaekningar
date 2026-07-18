// Create a survey (admin only).

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
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const title = String(body.title || "").trim();
  const slug = String(body.slug || "").trim() || slugify(title) || `konnun-${Date.now()}`;
  if (!title) return NextResponse.json({ ok: false, error: "Titill vantar" }, { status: 400 });

  const { data, error } = await supabaseAdmin
    .from("surveys")
    .insert({ slug, title, created_by: caller!.id })
    .select()
    .single();

  if (error || !data) {
    const dup = error?.code === "23505";
    return NextResponse.json(
      { ok: false, error: dup ? "Slóð er þegar í notkun" : error?.message || "Villa" },
      { status: dup ? 409 : 500 },
    );
  }
  return NextResponse.json({ ok: true, survey: data });
}
