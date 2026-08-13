// Duplicate a survey (admin only). Copies content + questions, never responses.

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getCallerStaff, isAdmin } from "@/lib/admin-auth";

export const runtime = "nodejs";

// Columns that must NOT carry over to the copy.
const SKIP = new Set(["id", "slug", "title", "status", "created_by", "created_at", "updated_at"]);

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const caller = await getCallerStaff(req);
  if (!isAdmin(caller)) return NextResponse.json({ ok: false, error: "Admin role required" }, { status: 403 });
  const { id } = await ctx.params;

  const { data: source } = await supabaseAdmin.from("surveys").select("*").eq("id", id).maybeSingle();
  if (!source) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });

  const base = String(source.slug || "konnun").replace(/-afrit(-\d+)?$/, "");
  const { data: taken } = await supabaseAdmin.from("surveys").select("slug").like("slug", `${base}-afrit%`);
  const used = new Set((taken || []).map((r: { slug: string }) => r.slug));
  let slug = `${base}-afrit`;
  for (let n = 2; used.has(slug); n++) slug = `${base}-afrit-${n}`;

  const copy: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(source)) if (!SKIP.has(k)) copy[k] = v;

  const { data, error } = await supabaseAdmin
    .from("surveys")
    .insert({
      ...copy,
      slug,
      title: `${source.title} (afrit)`,
      status: "draft",
      created_by: caller!.id,
    })
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
