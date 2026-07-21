// Site settings — currently just the coming-soon gate.
//
// GET  — any active staff member reads the current gate state.
// POST — admin flips it. Writes go through the service role (the table blocks
//        client writes), then we clear this instance's cache so the change is
//        immediate here; other serverless instances pick it up within the
//        cache TTL (~30s).

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getCallerStaff, isAdmin } from "@/lib/admin-auth";
import { clearGateCache } from "@/lib/site-gate";

export const runtime = "nodejs";

async function readGate(): Promise<boolean> {
  const { data } = await supabaseAdmin
    .from("site_settings")
    .select("value")
    .eq("key", "gate")
    .maybeSingle();
  const raw = (data?.value as { coming_soon?: unknown } | undefined)?.coming_soon;
  // No row yet → fall back to the env default, same as the proxy.
  return typeof raw === "boolean" ? raw : process.env.COMING_SOON === "true";
}

export async function GET(req: Request) {
  const caller = await getCallerStaff(req);
  if (!caller) return NextResponse.json({ ok: false, error: "Not authenticated" }, { status: 401 });
  try {
    return NextResponse.json({ ok: true, coming_soon: await readGate() });
  } catch {
    // Table missing (migration not run) — report the env fallback.
    return NextResponse.json({ ok: true, coming_soon: process.env.COMING_SOON === "true", unavailable: true });
  }
}

export async function POST(req: Request) {
  const caller = await getCallerStaff(req);
  if (!isAdmin(caller)) {
    return NextResponse.json({ ok: false, error: "Admin role required" }, { status: 403 });
  }

  let body: { coming_soon?: unknown } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }
  if (typeof body.coming_soon !== "boolean") {
    return NextResponse.json({ ok: false, error: "coming_soon must be a boolean" }, { status: 400 });
  }

  const { error } = await supabaseAdmin
    .from("site_settings")
    .upsert(
      {
        key: "gate",
        value: { coming_soon: body.coming_soon },
        updated_at: new Date().toISOString(),
        updated_by: caller!.id,
      },
      { onConflict: "key" },
    );
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  clearGateCache();
  return NextResponse.json({ ok: true, coming_soon: body.coming_soon });
}
