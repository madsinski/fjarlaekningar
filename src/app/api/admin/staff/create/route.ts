// Create a new staff member with auth.users.id == staff.id from the start,
// then send them an invite email so they set their own password.
//
// Caller must be an active admin. Adapted from lifeline-website's staff/create
// route, minus the clients-table cleanup (this project has no clients table).

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";

const VALID_ROLES = ["admin", "member", "doctor", "nurse", "psychologist", "lawyer"] as const;
type Role = (typeof VALID_ROLES)[number];

interface CreateBody {
  name?: string;
  email?: string;
  phone?: string;
  role?: string;
  title?: string;
  send_invite?: boolean;
}

const ORIGIN = process.env.NEXT_PUBLIC_SITE_URL || "https://www.fjarlaekningar.is";

export async function POST(req: Request) {
  let body: CreateBody = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const name = (body.name || "").trim();
  const email = (body.email || "").trim().toLowerCase();
  const phone = (body.phone || "").trim();
  const title = (body.title || "").trim();
  const role = body.role as Role | undefined;
  const sendInvite = body.send_invite !== false; // default true

  if (!name || !email) {
    return NextResponse.json({ ok: false, error: "Name and email required" }, { status: 400 });
  }
  if (!role || !(VALID_ROLES as readonly string[]).includes(role)) {
    return NextResponse.json({ ok: false, error: "Invalid role" }, { status: 400 });
  }

  // ── Verify caller is an active admin ──────────────────────────────────────
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ ok: false, error: "Not authenticated" }, { status: 401 });
  }
  const token = authHeader.slice("Bearer ".length);
  const { data: callerData, error: callerErr } = await supabaseAdmin.auth.getUser(token);
  if (callerErr || !callerData.user?.id) {
    return NextResponse.json({ ok: false, error: "Invalid session" }, { status: 401 });
  }
  const { data: callerStaff } = await supabaseAdmin
    .from("staff")
    .select("role, active")
    .eq("id", callerData.user.id)
    .maybeSingle();
  if (!callerStaff || !callerStaff.active || callerStaff.role !== "admin") {
    return NextResponse.json({ ok: false, error: "Admin role required" }, { status: 403 });
  }

  // ── Reuse an existing auth user if one already has this email ─────────────
  let authUserId: string | null = null;
  let authCreated = false;
  try {
    const { data: list } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 200 });
    const existing = list?.users?.find((u) => (u.email || "").toLowerCase() === email);
    if (existing) authUserId = existing.id;
  } catch {
    /* fall through to create/invite */
  }

  if (!authUserId) {
    const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceKey || !supabaseUrl) {
      return NextResponse.json(
        { ok: false, error: "Server misconfigured: missing Supabase service credentials" },
        { status: 500 },
      );
    }
    const headers: Record<string, string> = {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      "Content-Type": "application/json",
    };

    if (sendInvite) {
      const url = `${supabaseUrl}/auth/v1/invite?redirect_to=${encodeURIComponent(`${ORIGIN}/admin/login`)}`;
      const res = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify({ email, data: { name, role } }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok || !j?.id) {
        return NextResponse.json(
          { ok: false, error: `Could not invite user: ${j?.msg || j?.error || j?.message || `HTTP ${res.status}`}` },
          { status: 500 },
        );
      }
      authUserId = j.id as string;
      authCreated = true;
    } else {
      const url = `${supabaseUrl}/auth/v1/admin/users`;
      const res = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify({ email, email_confirm: true, user_metadata: { name, role } }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok || !j?.id) {
        return NextResponse.json(
          { ok: false, error: `Could not create user: ${j?.msg || j?.error || j?.message || `HTTP ${res.status}`}` },
          { status: 500 },
        );
      }
      authUserId = j.id as string;
      authCreated = true;
    }
  }

  // ── Upsert the staff row with id == auth user id ──────────────────────────
  const { data: staffRow, error: insErr } = await supabaseAdmin
    .from("staff")
    .upsert(
      {
        id: authUserId,
        name,
        email,
        phone: phone || null,
        title: title || null,
        role,
        active: true,
        invited: sendInvite,
      },
      { onConflict: "id" },
    )
    .select()
    .single();

  if (insErr || !staffRow) {
    if (authCreated && authUserId) {
      try {
        await supabaseAdmin.auth.admin.deleteUser(authUserId);
      } catch {}
    }
    return NextResponse.json(
      { ok: false, error: `Could not create staff row: ${insErr?.message}` },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    staff: staffRow,
    invite_sent: sendInvite,
    auth_user_created: authCreated,
  });
}
