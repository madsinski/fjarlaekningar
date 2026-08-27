// Move one invoice along: issued → approved → paid (or void).
// The contractor issues; the admin only ever confirms what happens next.

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getCallerStaff, isAdmin } from "@/lib/admin-auth";

export const runtime = "nodejs";

const NEXT: Record<string, string[]> = {
  issued: ["approved", "void"],
  approved: ["paid", "void"],
  paid: [],
  void: [],
  draft: [],
};

export async function PUT(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const caller = await getCallerStaff(req);
  if (!isAdmin(caller)) return NextResponse.json({ ok: false, error: "Admin role required" }, { status: 403 });
  const { id } = await ctx.params;

  let body: Record<string, unknown> = {};
  try { body = await req.json(); } catch {
    return NextResponse.json({ ok: false, error: "Ógild gögn" }, { status: 400 });
  }
  const status = String(body.status || "");

  const { data: current } = await supabaseAdmin
    .from("contractor_invoices").select("status").eq("id", id).maybeSingle();
  if (!current) return NextResponse.json({ ok: false, error: "Reikningur fannst ekki" }, { status: 404 });

  // Statuses only move forward. Marking a paid invoice unpaid would rewrite a
  // record of something that already happened.
  if (!NEXT[current.status]?.includes(status)) {
    return NextResponse.json(
      { ok: false, error: `Staðan „${current.status}“ verður ekki „${status}“.` }, { status: 400 },
    );
  }

  const now = new Date().toISOString();
  const patch: Record<string, unknown> = { status, updated_at: now };
  if (status === "approved") patch.approved_at = now;
  if (status === "paid") patch.paid_at = now;
  if (typeof body.note === "string") patch.note = body.note.trim();

  const { data, error } = await supabaseAdmin
    .from("contractor_invoices").update(patch).eq("id", id).select("*").single();
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, invoice: data });
}
