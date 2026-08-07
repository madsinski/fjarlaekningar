// Editable admin sidebar: label overrides + order. Stored in the site_settings
// key/value table under key 'admin_nav'. Any active staff may read (so custom
// labels show for everyone); only admins may change it.

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getCallerStaff, isAdmin } from "@/lib/admin-auth";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const caller = await getCallerStaff(req);
  if (!caller) return NextResponse.json({ ok: false, error: "Not authenticated" }, { status: 401 });
  const { data } = await supabaseAdmin.from("site_settings").select("value").eq("key", "admin_nav").maybeSingle();
  return NextResponse.json({ ok: true, config: data?.value ?? {} });
}

export async function PATCH(req: Request) {
  const caller = await getCallerStaff(req);
  if (!isAdmin(caller)) return NextResponse.json({ ok: false, error: "Admin role required" }, { status: 403 });

  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const config: { order?: string[]; labels?: Record<string, string> } = {};
  if (Array.isArray(body.order)) config.order = (body.order as unknown[]).map(String);
  if (body.labels && typeof body.labels === "object") {
    config.labels = Object.fromEntries(
      Object.entries(body.labels as Record<string, unknown>)
        .filter(([, v]) => typeof v === "string" && (v as string).trim())
        .map(([k, v]) => [k, (v as string).trim().slice(0, 60)]),
    );
  }

  const { error } = await supabaseAdmin
    .from("site_settings")
    .upsert({ key: "admin_nav", value: config }, { onConflict: "key" });
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, config });
}
