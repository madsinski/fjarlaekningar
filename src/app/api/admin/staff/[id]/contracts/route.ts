// Create an e-sign contract for a staff member, or list their contracts. Admin only.

import { NextResponse } from "next/server";
import { randomBytes, createHash } from "node:crypto";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getCallerStaff, isAdmin } from "@/lib/admin-auth";

export const runtime = "nodejs";

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const caller = await getCallerStaff(req);
  if (!isAdmin(caller)) return NextResponse.json({ ok: false, error: "Admin role required" }, { status: 403 });
  const { id } = await ctx.params;
  const { data, error } = await supabaseAdmin
    .from("staff_contracts")
    .select("id, title, status, signatory_name, signed_at, created_at")
    .eq("staff_id", id)
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, contracts: data ?? [] });
}

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const caller = await getCallerStaff(req);
  if (!isAdmin(caller)) return NextResponse.json({ ok: false, error: "Admin role required" }, { status: 403 });
  const { id } = await ctx.params;

  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }
  const title = String(body.title || "").trim() || "Ráðningarsamningur";
  const text = String(body.body || "").trim();
  if (text.length < 20) return NextResponse.json({ ok: false, error: "Samningstexti vantar" }, { status: 400 });

  const { data, error } = await supabaseAdmin
    .from("staff_contracts")
    .insert({
      staff_id: id,
      token: randomBytes(24).toString("hex"),
      title,
      body: text,
      terms_hash: createHash("sha256").update(text).digest("hex"),
      created_by: caller!.id,
    })
    .select("id, title, status, created_at")
    .single();
  if (error || !data) return NextResponse.json({ ok: false, error: error?.message || "Villa" }, { status: 500 });
  return NextResponse.json({ ok: true, contract: data }, { status: 201 });
}
