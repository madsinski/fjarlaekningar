// Public one-click unsubscribe (no auth — the token IS the credential).
//
// Linked from the footer of every marketing email. Idempotent: unsubscribing
// twice is fine. Accepts POST (from the /afskra page) and GET (so a plain link
// click works even if JS is blocked in the mail client's browser).

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";

async function unsubscribe(token: string): Promise<{ ok: boolean; error?: string }> {
  if (!token || token.length < 16) return { ok: false, error: "Ógildur hlekkur" };

  const { data, error } = await supabaseAdmin
    .from("subscribers")
    .update({ unsubscribed_at: new Date().toISOString() })
    .eq("unsubscribe_token", token)
    .select("id")
    .maybeSingle();

  if (error) return { ok: false, error: "Villa kom upp" };
  if (!data) return { ok: false, error: "Hlekkurinn fannst ekki" };
  return { ok: true };
}

export async function POST(req: Request) {
  let token = "";
  try {
    token = String(((await req.json()) as { token?: unknown })?.token || "").trim();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }
  const res = await unsubscribe(token);
  return NextResponse.json(res, { status: res.ok ? 200 : 400 });
}

export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get("token") || "";
  const res = await unsubscribe(token.trim());
  // Send link-clickers to the friendly confirmation page either way.
  const url = new URL("/afskra", req.url);
  url.searchParams.set("token", token);
  url.searchParams.set("done", res.ok ? "1" : "0");
  return NextResponse.redirect(url);
}
