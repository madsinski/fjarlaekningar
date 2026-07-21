// Subscriber list for /admin/outreach. Any active staff may read.

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getCallerStaff } from "@/lib/admin-auth";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const caller = await getCallerStaff(req);
  if (!caller) return NextResponse.json({ ok: false, error: "Not authenticated" }, { status: 401 });

  const { data, error } = await supabaseAdmin
    .from("subscribers")
    .select("id, email, name, source, unsubscribed_at, created_at")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  const subscribers = data ?? [];
  return NextResponse.json({
    ok: true,
    subscribers,
    active: subscribers.filter((s) => !s.unsubscribed_at).length,
  });
}
