// Public contact form intake (no auth). General, non-medical inquiries only.
// Writes to contact_messages via the service-role client (bypasses RLS).

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: Request) {
  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const name = String(body.name || "").trim();
  const email = String(body.email || "").trim().toLowerCase();
  const subject = String(body.subject || "").trim();
  const message = String(body.message || "").trim();

  if (!name) return NextResponse.json({ ok: false, error: "Nafn vantar" }, { status: 400 });
  if (!EMAIL_RE.test(email)) return NextResponse.json({ ok: false, error: "Ógilt netfang" }, { status: 400 });
  if (!message) return NextResponse.json({ ok: false, error: "Skilaboð vantar" }, { status: 400 });
  if (message.length > 5000) return NextResponse.json({ ok: false, error: "Skilaboð of löng" }, { status: 400 });

  const { error } = await supabaseAdmin.from("contact_messages").insert({
    name: name.slice(0, 200),
    email: email.slice(0, 200),
    subject: subject.slice(0, 300),
    message,
  });
  if (error) {
    return NextResponse.json({ ok: false, error: "Villa við að vista fyrirspurn" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
