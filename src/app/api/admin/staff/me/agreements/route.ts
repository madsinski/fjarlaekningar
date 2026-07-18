// Record the signed-in staff member's acceptance of onboarding agreements,
// then — if every required agreement's current version is now accepted —
// stamp staff.onboarded_at so the admin layout lets them in.

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { isFullyOnboarded } from "@/lib/staff-agreements";

export const runtime = "nodejs";

interface Body {
  accept?: { key: string; version: string }[];
}

export async function POST(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ ok: false, error: "Not authenticated" }, { status: 401 });
  }
  const token = authHeader.slice("Bearer ".length);
  const { data: userData, error: userErr } = await supabaseAdmin.auth.getUser(token);
  if (userErr || !userData.user?.id) {
    return NextResponse.json({ ok: false, error: "Invalid session" }, { status: 401 });
  }
  const staffId = userData.user.id;

  // Only actual staff may record acceptances.
  const { data: staffRow } = await supabaseAdmin
    .from("staff")
    .select("id, active")
    .eq("id", staffId)
    .maybeSingle();
  if (!staffRow || !staffRow.active) {
    return NextResponse.json({ ok: false, error: "Not an active staff member" }, { status: 403 });
  }

  let body: Body = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }
  const accept = Array.isArray(body.accept) ? body.accept : [];
  if (accept.length === 0) {
    return NextResponse.json({ ok: false, error: "Nothing to accept" }, { status: 400 });
  }

  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null;
  const userAgent = req.headers.get("user-agent") || null;

  const rows = accept
    .filter((a) => a && typeof a.key === "string" && typeof a.version === "string")
    .map((a) => ({
      staff_id: staffId,
      agreement_key: a.key,
      version: a.version,
      ip,
      user_agent: userAgent,
    }));

  const { error: insErr } = await supabaseAdmin
    .from("staff_agreement_acceptances")
    .upsert(rows, { onConflict: "staff_id,agreement_key,version" });
  if (insErr) {
    return NextResponse.json({ ok: false, error: insErr.message }, { status: 500 });
  }

  // Re-read all acceptances and decide whether onboarding is complete.
  const { data: allAccepted } = await supabaseAdmin
    .from("staff_agreement_acceptances")
    .select("agreement_key, version")
    .eq("staff_id", staffId);

  const fullyOnboarded = isFullyOnboarded(allAccepted || []);
  if (fullyOnboarded) {
    await supabaseAdmin
      .from("staff")
      .update({ onboarded_at: new Date().toISOString() })
      .eq("id", staffId);
  }

  return NextResponse.json({ ok: true, onboarded: fullyOnboarded });
}
