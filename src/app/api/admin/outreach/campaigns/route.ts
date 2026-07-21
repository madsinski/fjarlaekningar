// Campaign list + create. Read: any active staff. Create: admin.

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getCallerStaff, isAdmin } from "@/lib/admin-auth";

export const runtime = "nodejs";

const COLS = "id, subject, preheader, status, sent_at, sent_count, created_at, updated_at";

export async function GET(req: Request) {
  const caller = await getCallerStaff(req);
  if (!caller) return NextResponse.json({ ok: false, error: "Not authenticated" }, { status: 401 });

  const { data, error } = await supabaseAdmin
    .from("outreach_campaigns")
    .select(COLS)
    .order("updated_at", { ascending: false });

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, campaigns: data ?? [] });
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
    /* an empty body is fine — we create a blank draft */
  }

  const subject = String(body.subject || "").trim() || "Nýtt fréttabréf";

  const { data, error } = await supabaseAdmin
    .from("outreach_campaigns")
    .insert({ subject, created_by: caller!.id })
    .select(COLS)
    .single();

  if (error || !data) {
    return NextResponse.json({ ok: false, error: error?.message || "Villa" }, { status: 500 });
  }
  return NextResponse.json({ ok: true, campaign: data }, { status: 201 });
}
