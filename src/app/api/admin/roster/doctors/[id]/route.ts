// Update / delete a roster doctor. Admin only.

import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getCallerStaff, isAdmin } from "@/lib/admin-auth";

export const runtime = "nodejs";

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
  if (typeof body.name === "string" && body.name.trim()) update.name = body.name.trim();
  if (typeof body.email === "string") update.email = body.email.trim();
  if (typeof body.color === "string" && /^#[0-9a-fA-F]{6}$/.test(body.color)) update.color = body.color;
  if (typeof body.active === "boolean") update.active = body.active;
  // Generate an access token on demand (e.g. for doctors created before tokens
  // existed, or to revoke + reissue a personal link).
  // Vaktaóskir. A cap of null means no cap; an empty weekday list means every
  // day — both are "no restriction", kept distinct from 0 so that "zero shifts"
  // stays sayable.
  if ("max_shifts_per_month" in body) {
    const n = Number(body.max_shifts_per_month);
    update.max_shifts_per_month =
      body.max_shifts_per_month === null || body.max_shifts_per_month === ""
        ? null
        : Number.isFinite(n) && n >= 0
          ? Math.floor(n)
          : null;
  }
  if (Array.isArray(body.allowed_weekdays)) {
    update.allowed_weekdays = [
      ...new Set(
        (body.allowed_weekdays as unknown[])
          .map(Number)
          .filter((n) => Number.isInteger(n) && n >= 0 && n <= 6),
      ),
    ].sort((a, b) => a - b);
  }
  if ("preferred_run_length" in body) {
    const n = Number(body.preferred_run_length);
    // Empty is "no preference"; anything else is clamped to the 1–10 the column
    // allows, so a stray value cannot fail the whole save.
    update.preferred_run_length =
      body.preferred_run_length === null || body.preferred_run_length === "" || !Number.isFinite(n)
        ? null
        : Math.min(10, Math.max(1, Math.floor(n)));
  }
  if (typeof body.shift_note === "string") update.shift_note = body.shift_note.trim().slice(0, 500);
  if ("max_shifts_per_month" in body || "allowed_weekdays" in body || "shift_note" in body
      || "preferred_run_length" in body) {
    update.prefs_updated_at = new Date().toISOString();
  }

  if (body.regenerate_token === true) update.access_token = randomBytes(24).toString("hex");
  if (Object.keys(update).length === 0) return NextResponse.json({ ok: true });

  const { data, error } = await supabaseAdmin.from("roster_doctors").update(update).eq("id", id).select("*").maybeSingle();
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, doctor: data });
}

export async function DELETE(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const caller = await getCallerStaff(req);
  if (!isAdmin(caller)) {
    return NextResponse.json({ ok: false, error: "Admin role required" }, { status: 403 });
  }
  const { id } = await ctx.params;
  // Shifts keep their history: doctor_id is set null on delete (FK on delete set null).
  const { error } = await supabaseAdmin.from("roster_doctors").delete().eq("id", id);
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
