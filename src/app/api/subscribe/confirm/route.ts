// Public double opt-in confirmation (no auth — the token IS the credential).
//
// Linked from the confirmation email. Sets confirmed_at, which is what makes an
// address an active subscriber. Idempotent: confirming twice is fine. GET only,
// so a plain link click works even with JS disabled; redirects to a friendly
// landing page either way.

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const token = (new URL(req.url).searchParams.get("token") || "").trim();
  const dest = new URL("/stadfesting", req.url);

  if (!token || token.length < 16) {
    dest.searchParams.set("done", "0");
    return NextResponse.redirect(dest);
  }

  const { data: row } = await supabaseAdmin
    .from("subscribers")
    .select("id, confirmed_at")
    .eq("confirm_token", token)
    .maybeSingle();

  if (!row) {
    dest.searchParams.set("done", "0");
    return NextResponse.redirect(dest);
  }

  // Only stamp confirmed_at once; re-clicks are treated as success.
  if (!row.confirmed_at) {
    await supabaseAdmin
      .from("subscribers")
      .update({ confirmed_at: new Date().toISOString(), unsubscribed_at: null })
      .eq("id", row.id);
  }

  dest.searchParams.set("done", "1");
  return NextResponse.redirect(dest);
}
