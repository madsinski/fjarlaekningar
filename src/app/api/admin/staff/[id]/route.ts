// Update a staff member: roles, active flag, and details (name, email, phone,
// title). Admin only. Changing the email also changes the login (Supabase Auth)
// and requires an MFA-verified session.
// Members can hold several roles (e.g. admin + doctor). The primary `role`
// column is derived from the set by priority so RLS is_admin_staff() keeps
// working.

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { callerAal, getCallerStaff, isAdmin } from "@/lib/admin-auth";

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
  if (typeof body.name === "string") {
    const name = body.name.trim().slice(0, 120);
    if (!name) return NextResponse.json({ ok: false, error: "Nafn má ekki vera autt" }, { status: 400 });
    update.name = name;
  }

  const { data: before } = await supabaseAdmin.from("staff").select("id, name, email").eq("id", id).maybeSingle();
  if (!before) return NextResponse.json({ ok: false, error: "Starfsmaður fannst ekki" }, { status: 404 });

  let newEmail: string | null = null;
  if (typeof body.email === "string" && body.email.trim().toLowerCase() !== String(before.email).toLowerCase()) {
    newEmail = body.email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
      return NextResponse.json({ ok: false, error: "Ógilt netfang" }, { status: 400 });
    }
    if (callerAal(req) !== "aal2") {
      return NextResponse.json({ ok: false, error: "Breyting á netfangi krefst tveggja þrepa auðkenningar" }, { status: 403 });
    }
    const { data: taken } = await supabaseAdmin.from("staff").select("id").ilike("email", newEmail).neq("id", id).maybeSingle();
    if (taken) return NextResponse.json({ ok: false, error: "Annar starfsmaður er með þetta netfang" }, { status: 409 });
    // Innskráningin fylgir: nýja netfangið er strax staðfest.
    const { error: authErr } = await supabaseAdmin.auth.admin.updateUserById(id, { email: newEmail, email_confirm: true });
    if (authErr) return NextResponse.json({ ok: false, error: `Ekki tókst að breyta innskráningu: ${authErr.message}` }, { status: 400 });
    update.email = newEmail;
  }
  if (Object.keys(update).length === 0) return NextResponse.json({ ok: true });

  const { data, error } = await supabaseAdmin
    .from("staff")
    .update(update)
    .eq("id", id)
    .select("id, name, email, phone, role, roles, title, active, invited, onboarded_at, created_at")
    .maybeSingle();
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  // Tengd vaktaskrá fylgir nafni og netfangi.
  const rosterPatch: Record<string, unknown> = {};
  if (update.name) rosterPatch.name = update.name;
  if (newEmail) rosterPatch.email = newEmail;
  if (Object.keys(rosterPatch).length) await supabaseAdmin.from("roster_doctors").update(rosterPatch).eq("staff_id", id);
  // Stjórnandi vinnustöðvar skráður með netfangi — listinn fylgir breytingunni.
  if (newEmail) {
    const { data: row } = await supabaseAdmin.from("gatt_settings").select("value").eq("key", "vs_admin_emails").maybeSingle();
    const list = Array.isArray(row?.value) ? (row!.value as string[]) : [];
    const old = String(before.email).toLowerCase();
    if (list.map((e) => e.toLowerCase()).includes(old)) {
      await supabaseAdmin.from("gatt_settings").update({ value: list.map((e) => (e.toLowerCase() === old ? newEmail : e)) }).eq("key", "vs_admin_emails");
    }
  }
  return NextResponse.json({ ok: true, staff: data });
}

/**
 * Remove a staff member entirely. Admin only.
 *
 * staff.id is the auth user's id (`references auth.users(id) on delete
 * cascade`), so the delete is issued against the auth user and the staff row
 * follows. Their own records follow too — staff_documents, staff_contracts and
 * staff_billing all cascade — while authorship elsewhere is `on delete set
 * null`, so decks, legal pages and protocols they touched survive with an
 * empty author rather than disappearing.
 *
 * That cascade is the reason the UI pushes deactivation first: a signed
 * employment contract is usually the last thing you want to destroy when
 * somebody leaves. Deleting is for a row created in error.
 */
export async function DELETE(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const caller = await getCallerStaff(req);
  if (!isAdmin(caller)) {
    return NextResponse.json({ ok: false, error: "Admin role required" }, { status: 403 });
  }
  const { id } = await ctx.params;

  if (caller!.id === id) {
    return NextResponse.json({ ok: false, error: "Þú getur ekki eytt eigin aðgangi." }, { status: 400 });
  }

  const { data: target } = await supabaseAdmin
    .from("staff")
    .select("id, name, email, role, roles, active")
    .eq("id", id)
    .maybeSingle();
  if (!target) {
    return NextResponse.json({ ok: false, error: "Starfsmaður fannst ekki." }, { status: 404 });
  }

  // Never leave the account without an administrator.
  const targetRoles: string[] = Array.isArray(target.roles) && target.roles.length ? (target.roles as string[]) : [target.role];
  if (targetRoles.includes("admin")) {
    const { data: admins } = await supabaseAdmin
      .from("staff")
      .select("id, role, roles")
      .eq("active", true);
    const others = (admins ?? []).filter((a) => {
      if (a.id === id) return false;
      const rs: string[] = Array.isArray(a.roles) && a.roles.length ? (a.roles as string[]) : [a.role];
      return rs.includes("admin");
    });
    if (others.length === 0) {
      return NextResponse.json({ ok: false, error: "Ekki hægt að eyða síðasta stjórnandanum." }, { status: 400 });
    }
  }

  // Deleting the auth user cascades the staff row and everything hanging off it.
  const { error: authErr } = await supabaseAdmin.auth.admin.deleteUser(id);
  if (authErr) {
    // No auth user (e.g. an invite that never completed) — drop the staff row
    // directly so the list does not keep a member nobody can remove.
    const { error: rowErr } = await supabaseAdmin.from("staff").delete().eq("id", id);
    if (rowErr) return NextResponse.json({ ok: false, error: rowErr.message }, { status: 500 });
  }

  // Belt and braces: the cascade should already have taken it.
  const { data: still } = await supabaseAdmin.from("staff").select("id").eq("id", id).maybeSingle();
  if (still) {
    const { error: rowErr } = await supabaseAdmin.from("staff").delete().eq("id", id);
    if (rowErr) return NextResponse.json({ ok: false, error: rowErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, deleted: { id, name: target.name, email: target.email } });
}
