// Public intake for GDPR data-subject requests. Unauthenticated: anyone may
// submit a request about their own personal data. Writes via the service-role
// key (RLS blocks anon writes). No auth required.

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";

const TYPES = ["access", "rectification", "erasure", "restriction", "portability", "objection", "other"];

export async function POST(req: Request) {
  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const request_type = String(body.request_type || "");
  const full_name = String(body.full_name || "").trim();
  const email = String(body.email || "").trim().toLowerCase();
  const details = String(body.details || "").trim();

  if (!TYPES.includes(request_type)) {
    return NextResponse.json({ ok: false, error: "Ógild tegund beiðni" }, { status: 400 });
  }
  if (!full_name) return NextResponse.json({ ok: false, error: "Nafn vantar" }, { status: 400 });
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return NextResponse.json({ ok: false, error: "Ógilt netfang" }, { status: 400 });
  }

  const { error } = await supabaseAdmin.from("data_requests").insert({
    request_type,
    full_name,
    email,
    details,
  });

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
