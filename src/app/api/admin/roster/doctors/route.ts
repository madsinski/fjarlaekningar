// Add a roster doctor. Admin only.

import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getCallerStaff, isAdmin } from "@/lib/admin-auth";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const caller = await getCallerStaff(req);
  if (!isAdmin(caller)) {
    return NextResponse.json({ ok: false, error: "Admin role required" }, { status: 403 });
  }
  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    /* empty */
  }
  const name = String(body.name || "").trim();
  if (!name) return NextResponse.json({ ok: false, error: "Nafn vantar" }, { status: 400 });

  const { data, error } = await supabaseAdmin
    .from("roster_doctors")
    .insert({
      name,
      email: String(body.email || "").trim(),
      color: /^#[0-9a-fA-F]{6}$/.test(String(body.color)) ? String(body.color) : "#00a8cc",
      access_token: randomBytes(24).toString("hex"),
    })
    .select("*")
    .single();

  if (error || !data) return NextResponse.json({ ok: false, error: error?.message || "Villa" }, { status: 500 });
  return NextResponse.json({ ok: true, doctor: data }, { status: 201 });
}
