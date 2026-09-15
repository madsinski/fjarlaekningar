// Staða Google-tengingar læknis HSU, kveikja/slökkva og aftengja.

import { after } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { hsuSync } from "@/lib/hsu/calendar";
import * as G from "@/lib/google-calendar";
import { json, readJson, requireDoctor } from "@/lib/hsu/server";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const auth = await requireDoctor(req);
  if ("res" in auth) return auth.res;
  const row = await hsuSync.getSync(auth.doctor.id);
  return json({
    ok: true,
    configured: G.googleConfigured(),
    connected: Boolean(row?.refresh_token && row?.calendar_id),
    email: row?.google_email ?? null,
    enabled: row?.enabled ?? true,
    lastSyncAt: row?.last_sync_at ?? null,
    lastError: row?.last_error ?? null,
    calendarName: hsuSync.calendarName,
  });
}

export async function PATCH(req: Request) {
  const auth = await requireDoctor(req);
  if ("res" in auth) return auth.res;
  const enabled = Boolean((await readJson(req)).enabled);
  await supabaseAdmin.from("hsu_google_sync").update({ enabled }).eq("doctor_id", auth.doctor.id);
  after(async () => {
    // Slökkt: dagatalið tæmt frekar en að frysta gamalt vaktaplan í því.
    if (enabled) await hsuSync.syncDoctor(auth.doctor.id);
    else await hsuSync.purgeEvents(auth.doctor.id).catch(() => {});
  });
  return json({ ok: true, enabled });
}

export async function DELETE(req: Request) {
  const auth = await requireDoctor(req);
  if ("res" in auth) return auth.res;
  await hsuSync.disconnect(auth.doctor.id);
  return json({ ok: true });
}
