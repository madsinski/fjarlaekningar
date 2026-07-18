// Public endpoint for client-side error reports. Best-effort: always returns
// {ok:true} so the browser reporter never surfaces its own failures. Writes via
// the service-role key (no anon insert policy on app_errors).

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as {
      message?: unknown;
      stack?: unknown;
      url?: unknown;
    };
    const message = String(body.message ?? "").slice(0, 4000).trim();
    if (message) {
      await supabaseAdmin.from("app_errors").insert({
        message,
        stack: body.stack ? String(body.stack).slice(0, 8000) : null,
        source: "client",
        url: body.url ? String(body.url).slice(0, 1000) : null,
        user_agent: req.headers.get("user-agent"),
      });
    }
  } catch {
    // ignore — best-effort logging
  }
  return NextResponse.json({ ok: true });
}
