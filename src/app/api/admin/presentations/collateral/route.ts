import { NextRequest, NextResponse } from "next/server";
import { getCallerStaff, isAdmin } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase-admin";

// Editable content for the Fjarlækningar × HSU print collateral.
// Backed by supabase/presentations-studio-schema.sql (single row, id = 1).

// GET — return the stored content blob (any active staff). Empty `{}` when unset;
// the client merges it over DEFAULT_CONTENT.
export async function GET(req: NextRequest) {
  const caller = await getCallerStaff(req);
  if (!caller) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const { data, error } = await supabaseAdmin
    .from("presentation_collateral")
    .select("data, updated_at")
    .eq("id", 1)
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data: data?.data ?? {}, updated_at: data?.updated_at ?? null });
}

// PUT — replace the content blob (admin).
export async function PUT(req: NextRequest) {
  const caller = await getCallerStaff(req);
  if (!isAdmin(caller)) {
    return NextResponse.json({ error: "forbidden" }, { status: caller ? 403 : 401 });
  }

  let body: { data?: unknown };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "invalid_body" }, { status: 400 }); }
  if (!body.data || typeof body.data !== "object" || Array.isArray(body.data)) {
    return NextResponse.json({ error: "invalid_data" }, { status: 400 });
  }

  const { error } = await supabaseAdmin
    .from("presentation_collateral")
    .upsert({ id: 1, data: body.data, updated_by: caller!.id, updated_at: new Date().toISOString() }, { onConflict: "id" });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
