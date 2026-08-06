// Update a staff member's roles (and active flag). Admin only.
// Members can hold several roles (e.g. admin + doctor). The primary `role`
// column is derived from the set by priority so RLS is_admin_staff() keeps
// working.

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getCallerStaff, isAdmin } from "@/lib/admin-auth";

export const runtime = "nodejs";

const ALLOWED = ["admin", "lawyer", "doctor", "nurse", "psychologist", "member"] as const;
const PRIORITY = ALLOWED; // highest → lowest for picking the primary role

function primaryRole(roles: string[]): string {
  for (const r of PRIORITY) if (roles.includes(r)) return r;
  return "member";
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const caller = await getCallerStaff(req);
  if (!isAdmin(caller)) {
    return NextResponse.json({ ok: false, error: "Admin role required" }, { status: 403 });
  }
  const { id } = await ctx.params;
  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const update: Record<string, unknown> = {};
  if (Array.isArray(body.roles)) {
    let roles = [...new Set((body.roles as unknown[]).map(String).filter((r) => (ALLOWED as readonly string[]).includes(r)))];
    if (roles.length === 0) roles = ["member"];
    // Don't let an admin strip their own admin access and lock themselves out.
    if (caller!.id === id && !roles.includes("admin")) {
      return NextResponse.json({ ok: false, error: "Þú getur ekki fjarlægt eigin stjórnandaaðgang" }, { status: 400 });
    }
    update.roles = roles;
    update.role = primaryRole(roles);
  }
  if (typeof body.active === "boolean") update.active = body.active;
  if (typeof body.phone === "string") update.phone = body.phone.trim() || null;
  if (typeof body.title === "string") update.title = body.title.trim() || null;
  if (Object.keys(update).length === 0) return NextResponse.json({ ok: true });

  const { data, error } = await supabaseAdmin
    .from("staff")
    .update(update)
    .eq("id", id)
    .select("id, name, email, phone, role, roles, title, active, invited, onboarded_at, created_at")
    .maybeSingle();
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, staff: data });
}
