// Station onboarding state — one JSONB row in `site_settings`.
//
// GET  — admin reads the current state (seeded with HSU on first run).
// POST — admin replaces it. Writes go through the service role, because the
//        table blocks client writes; the browser never touches it directly.

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getCallerStaff, isAdmin } from "@/lib/admin-auth";
import { mergeOnboarding, type OnboardingState } from "@/lib/station-onboarding";

export const runtime = "nodejs";

const KEY = "station_onboarding";

export async function GET(req: Request) {
  const caller = await getCallerStaff(req);
  if (!isAdmin(caller)) return NextResponse.json({ ok: false, error: "Admin role required" }, { status: 403 });
  try {
    const { data } = await supabaseAdmin
      .from("site_settings")
      .select("value")
      .eq("key", KEY)
      .maybeSingle();
    return NextResponse.json({ ok: true, state: mergeOnboarding(data?.value) });
  } catch {
    // Table missing (migration not run) — hand back the seeded default so the
    // page still renders and explains itself.
    return NextResponse.json({ ok: true, state: mergeOnboarding(null), unavailable: true });
  }
}

export async function POST(req: Request) {
  const caller = await getCallerStaff(req);
  if (!isAdmin(caller)) return NextResponse.json({ ok: false, error: "Admin role required" }, { status: 403 });

  const body = (await req.json().catch(() => ({}))) as { state?: unknown };
  const state: OnboardingState = mergeOnboarding(body.state);

  const { error } = await supabaseAdmin
    .from("site_settings")
    .upsert({ key: KEY, value: state, updated_by: caller!.id }, { onConflict: "key" });

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, state });
}
