// A staff member updates THEIR OWN email signature (matched by their email).
// Any active staff member — scoped to their own row.

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getCallerStaff } from "@/lib/admin-auth";

export const runtime = "nodejs";

export async function PUT(req: Request) {
  const caller = await getCallerStaff(req);
  if (!caller) return NextResponse.json({ ok: false, error: "Not authenticated" }, { status: 401 });

  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString(), updated_by: caller.id };
  for (const f of ["name", "title", "phone"] as const) {
    if (typeof body[f] === "string") patch[f] = (body[f] as string).slice(0, 200);
  }

  const { data: existing } = await supabaseAdmin
    .from("email_signatures")
    .select("key")
    .eq("email", caller.email)
    .maybeSingle();

  if (existing) {
    const { data, error } = await supabaseAdmin
      .from("email_signatures")
      .update(patch)
      .eq("key", existing.key)
      .select("key, name, title, phone, email")
      .maybeSingle();
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, signature: data });
  }

  const key = `${caller.email.split("@")[0].replace(/[^a-z0-9]/gi, "").toLowerCase().slice(0, 18)}-${caller.id.slice(0, 6)}`;
  const { data, error } = await supabaseAdmin
    .from("email_signatures")
    .insert({ key, email: caller.email, name: (patch.name as string) ?? caller.name, title: (patch.title as string) ?? "", phone: (patch.phone as string) ?? "" })
    .select("key, name, title, phone, email")
    .maybeSingle();
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, signature: data });
}
