// Public newsletter signup (no auth).
//
// Writes to `subscribers` via the service-role client (the table blocks client
// writes). Deliberately does NOT reveal whether an address was already on the
// list — an enumeration oracle would leak who has signed up. Re-subscribing an
// address that previously opted out simply clears unsubscribed_at.

import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
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

  const email = String(body.email || "").trim().toLowerCase();
  const name = String(body.name || "").trim();

  if (!EMAIL_RE.test(email) || email.length > 200) {
    return NextResponse.json({ ok: false, error: "Ógilt netfang" }, { status: 400 });
  }

  const { error } = await supabaseAdmin.from("subscribers").upsert(
    {
      email,
      name: name ? name.slice(0, 200) : null,
      source: "website",
      unsubscribe_token: randomBytes(24).toString("hex"),
      unsubscribed_at: null,
    },
    { onConflict: "email", ignoreDuplicates: false },
  );

  if (error) {
    return NextResponse.json({ ok: false, error: "Ekki tókst að skrá netfangið" }, { status: 500 });
  }
  // Always the same response shape, regardless of whether this was new.
  return NextResponse.json({ ok: true });
}
