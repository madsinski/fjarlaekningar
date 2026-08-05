// Public newsletter signup (no auth) — DOUBLE OPT-IN.
//
// Writes to `subscribers` via the service-role client (the table blocks client
// writes). A signup creates (or reactivates) a PENDING row (confirmed_at = null)
// and emails a confirmation link; the address only becomes an active subscriber
// once /api/subscribe/confirm is hit with the matching confirm_token.
//
// Deliberately does NOT reveal whether an address was already on the list — an
// enumeration oracle would leak who has signed up, so the response shape is
// identical for new, pending, and already-confirmed addresses.

import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { sendEmail, renderConfirmationEmail, confirmationPlainText } from "@/lib/email";
import { PUBLIC_SITE_URL } from "@/lib/public-site";

export const runtime = "nodejs";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const token = () => randomBytes(24).toString("hex");
const confirmUrl = (t: string) =>
  `${PUBLIC_SITE_URL}/api/subscribe/confirm?token=${encodeURIComponent(t)}`;

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

  const { data: existing } = await supabaseAdmin
    .from("subscribers")
    .select("id, confirmed_at, unsubscribed_at, confirm_token")
    .eq("email", email)
    .maybeSingle();

  // Already an active subscriber → do nothing (don't re-send, don't leak).
  if (existing?.confirmed_at && !existing.unsubscribed_at) {
    return NextResponse.json({ ok: true });
  }

  const confirmToken = existing?.confirm_token || token();
  const cleanName = name ? name.slice(0, 200) : null;

  if (existing) {
    // Pending or previously unsubscribed → reset to pending and re-confirm.
    const { error } = await supabaseAdmin
      .from("subscribers")
      .update({ name: cleanName, confirm_token: confirmToken, confirmed_at: null, unsubscribed_at: null })
      .eq("id", existing.id);
    if (error) {
      return NextResponse.json({ ok: false, error: "Ekki tókst að skrá netfangið" }, { status: 500 });
    }
  } else {
    const { error } = await supabaseAdmin.from("subscribers").insert({
      email,
      name: cleanName,
      source: "website",
      unsubscribe_token: token(),
      confirm_token: confirmToken,
      confirmed_at: null,
      unsubscribed_at: null,
    });
    if (error) {
      return NextResponse.json({ ok: false, error: "Ekki tókst að skrá netfangið" }, { status: 500 });
    }
  }

  // Send the confirmation email. If it fails we still report success (the row
  // exists as pending); the failure is logged for debugging.
  const res = await sendEmail({
    to: email,
    subject: "Staðfestu áskrift að fréttabréfi Fjarlækninga",
    html: renderConfirmationEmail(confirmUrl(confirmToken)),
    text: confirmationPlainText(confirmUrl(confirmToken)),
  });
  if (!res.ok) console.error("[subscribe] confirmation email failed:", res.error);

  return NextResponse.json({ ok: true });
}
