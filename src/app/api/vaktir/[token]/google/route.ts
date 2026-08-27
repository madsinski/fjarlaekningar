// Staða Google-tengingar læknisins, og aftenging.
// Token-gated eins og aðrar /vaktir-leiðir: hlekkurinn sjálfur er auðkennið.

import { NextResponse } from "next/server";
import { after } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getSync, syncDoctor, purgeEvents, accessTokenFor } from "@/lib/roster-google-sync";
import * as G from "@/lib/google-calendar";

export const runtime = "nodejs";

async function doctorFor(token: string) {
  if (!token || token.length < 16) return null;
  const { data } = await supabaseAdmin
    .from("roster_doctors")
    .select("id, name")
    .eq("access_token", token)
    .maybeSingle();
  return data as { id: string; name: string } | null;
}

export async function GET(_req: Request, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params;
  const doctor = await doctorFor(token);
  if (!doctor) return NextResponse.json({ ok: false, error: "Læknir fannst ekki" }, { status: 404 });

  const row = await getSync(doctor.id);
  return NextResponse.json({
    ok: true,
    configured: G.googleConfigured(),
    connected: Boolean(row?.refresh_token && row?.calendar_id),
    email: row?.google_email ?? null,
    enabled: row?.enabled ?? true,
    lastSyncAt: row?.last_sync_at ?? null,
    lastError: row?.last_error ?? null,
    calendarName: G.CALENDAR_NAME,
  });
}

/** Kveikja/slökkva á samstillingu án þess að aftengja reikninginn. */
export async function PATCH(req: Request, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params;
  const doctor = await doctorFor(token);
  if (!doctor) return NextResponse.json({ ok: false, error: "Læknir fannst ekki" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const enabled = Boolean(body.enabled);

  await supabaseAdmin.from("roster_google_sync").update({ enabled }).eq("doctor_id", doctor.id);

  after(async () => {
    // Turning sync off empties the calendar rather than freezing yesterday's
    // roster in it — a stale calendar that looks live is worse than an empty one.
    if (enabled) await syncDoctor(doctor.id);
    else await purgeEvents(doctor.id).catch(() => {});
  });

  return NextResponse.json({ ok: true, enabled });
}

/** Aftengja: eyða dagatalinu sem við bjuggum til og gleyma lyklinum. */
export async function DELETE(_req: Request, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params;
  const doctor = await doctorFor(token);
  if (!doctor) return NextResponse.json({ ok: false, error: "Læknir fannst ekki" }, { status: 404 });

  const row = await getSync(doctor.id);
  if (row?.refresh_token) {
    // Best effort. If Google says no we still forget the token at our end —
    // leaving a live refresh token in the database because a cleanup call
    // failed is the worse of the two outcomes.
    try {
      const access = await accessTokenFor(row);
      if (row.calendar_id) await G.deleteCalendar(access, row.calendar_id);
    } catch { /* ignore */ }
    await G.revokeToken(row.refresh_token);
  }

  await supabaseAdmin.from("roster_google_events").delete().eq("doctor_id", doctor.id);
  await supabaseAdmin.from("roster_google_sync").delete().eq("doctor_id", doctor.id);

  return NextResponse.json({ ok: true });
}
