// Create a research note. Collaborative: any active staff member (not just
// admins) may create research notes.

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getCallerStaff } from "@/lib/admin-auth";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const caller = await getCallerStaff(req);
  if (!caller) {
    return NextResponse.json({ ok: false, error: "Not authenticated" }, { status: 401 });
  }

  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const title = String(body.title || "").trim();
  const category = String(body.category || "general").trim() || "general";
  if (!title) return NextResponse.json({ ok: false, error: "Titill vantar" }, { status: 400 });

  const { data, error } = await supabaseAdmin
    .from("research_notes")
    .insert({ title, category, created_by: caller.id })
    .select()
    .single();

  if (error || !data) {
    return NextResponse.json({ ok: false, error: error?.message || "Villa" }, { status: 500 });
  }
  return NextResponse.json({ ok: true, note: data });
}
