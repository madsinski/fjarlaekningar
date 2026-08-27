// Samstilling vakta við Google-dagatal læknisins.
//
// Þetta er SÁTTAAÐFERÐ (reconcile), ekki atburðastraumur: hvert kall ber saman
// vaktir læknisins og það sem við höfum þegar skrifað, og lagfærir muninn.
// Það þýðir að misheppnað kall lagar sig sjálft næst þegar eitthvað breytist —
// öfugt við "sendu breytinguna einu sinni", þar sem eitt týnt kall skilur
// dagatalið eftir rangt þar til einhver tekur eftir því.
//
// Auðkenni atburðar er leitt af auðkenni vaktarinnar, svo skrifin eru hugröng:
// sama vakt tvisvar verður einn atburður, aldrei tveir.

import { createHash } from "node:crypto";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { shiftEventTitle, hhmm } from "@/lib/roster";
import * as G from "@/lib/google-calendar";

/** Hversu langt aftur við hreinsum. Eldri atburðir eru saga og fá að standa. */
const WINDOW_BACK_DAYS = 30;

export interface GoogleSyncRow {
  doctor_id: string;
  google_email: string | null;
  refresh_token: string | null;
  access_token: string | null;
  access_expires_at: string | null;
  calendar_id: string | null;
  enabled: boolean;
  connected_at: string | null;
  last_sync_at: string | null;
  last_error: string | null;
  last_error_at: string | null;
}

interface ShiftRow {
  id: string;
  shift_date: string;
  starts: string;
  ends: string;
  note: string;
  status: string;
}

export const eventIdFor = (shiftId: string) => shiftId.replace(/-/g, "");

function nextDate(date: string): string {
  const [y, m, d] = date.split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + 1));
  return t.toISOString().slice(0, 10);
}

function windowStart(): string {
  const t = new Date();
  t.setUTCDate(t.getUTCDate() - WINDOW_BACK_DAYS);
  return t.toISOString().slice(0, 10);
}

/** Everything that would change the event. Unchanged hash = no API call. */
function hashOf(s: ShiftRow): string {
  return createHash("sha256")
    .update([s.shift_date, s.starts, s.ends, s.note, s.status].join("|"))
    .digest("hex")
    .slice(0, 16);
}

function eventBody(s: ShiftRow) {
  const note = (s.note || "").trim();
  return {
    summary: shiftEventTitle(s.starts, s.ends),
    description: `Vakt hjá Fjarlækningum ${hhmm(s.starts)}–${hhmm(s.ends)}.${note ? `\n\n${note}` : ""}`,
    // All-day. A twelve-hour timed block hides the rest of the day; the hours
    // are in the title instead.
    start: { date: s.shift_date },
    end: { date: nextDate(s.shift_date) },
    transparency: "transparent",
    // The doctor already knows their roster — an alert per shift is noise.
    reminders: { useDefault: false },
    extendedProperties: { private: { fjShift: s.id } },
  };
}

export async function getSync(doctorId: string): Promise<GoogleSyncRow | null> {
  const { data } = await supabaseAdmin
    .from("roster_google_sync")
    .select("*")
    .eq("doctor_id", doctorId)
    .maybeSingle();
  return (data as GoogleSyncRow) ?? null;
}

async function noteError(doctorId: string, message: string, clearToken = false) {
  await supabaseAdmin
    .from("roster_google_sync")
    .update({
      last_error: message.slice(0, 500),
      last_error_at: new Date().toISOString(),
      ...(clearToken ? { refresh_token: null, access_token: null, access_expires_at: null } : {}),
    })
    .eq("doctor_id", doctorId);
}

/**
 * A usable access token, refreshing when the stored one is spent.
 *
 * A minute of slack on expiry: a token that dies mid-request is a failure that
 * looks exactly like a revoked connection, and is far more annoying to chase.
 */
export async function accessTokenFor(row: GoogleSyncRow): Promise<string> {
  const fresh =
    row.access_token &&
    row.access_expires_at &&
    new Date(row.access_expires_at).getTime() - 60_000 > Date.now();
  if (fresh) return row.access_token!;
  if (!row.refresh_token) throw new Error("Tenging við Google er ekki virk.");

  try {
    const t = await G.refreshAccessToken(row.refresh_token);
    const expires = new Date(Date.now() + (t.expires_in ?? 3600) * 1000).toISOString();
    await supabaseAdmin
      .from("roster_google_sync")
      .update({ access_token: t.access_token, access_expires_at: expires, last_error: null, last_error_at: null })
      .eq("doctor_id", row.doctor_id);
    return t.access_token;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    // invalid_grant means the doctor withdrew access at Google's end (or the
    // token expired after long disuse). Nothing here can recover it, so drop
    // the dead token and let the UI ask them to reconnect.
    const revoked = /invalid_grant/i.test(msg);
    await noteError(
      row.doctor_id,
      revoked ? "Aðgangur að Google-dagatali var afturkallaður. Tengdu aftur." : `Google: ${msg}`,
      revoked,
    );
    throw e;
  }
}

async function writeEvent(
  token: string,
  calendarId: string,
  shift: ShiftRow,
  believedToExist: boolean,
): Promise<void> {
  const body = eventBody(shift);
  const id = eventIdFor(shift.id);

  if (believedToExist) {
    try {
      await G.patchEvent(token, calendarId, id, body);
      return;
    } catch (e) {
      // Doctor deleted it by hand — put it back.
      if (!(e instanceof G.GoogleApiError && e.isGone)) throw e;
    }
    await G.insertEvent(token, calendarId, { id, ...body });
    return;
  }

  try {
    await G.insertEvent(token, calendarId, { id, ...body });
  } catch (e) {
    // 409: the id is taken, usually by an event we deleted recently — Google
    // holds on to those ids for a while. Revive it rather than inventing a
    // second id, which would leave the doctor with a duplicate.
    if (e instanceof G.GoogleApiError && e.status === 409) {
      await G.patchEvent(token, calendarId, id, { ...body, status: "confirmed" });
      return;
    }
    throw e;
  }
}

export interface SyncResult {
  skipped?: string;
  written?: number;
  removed?: number;
  error?: string;
}

/**
 * Bring one doctor's Google calendar in line with their roster.
 *
 * Never throws: a calendar that will not sync must not take an admin action
 * down with it. Failures are recorded on the row and shown to the doctor.
 */
export async function syncDoctor(doctorId: string): Promise<SyncResult> {
  if (!G.googleConfigured()) return { skipped: "google-not-configured" };
  const row = await getSync(doctorId);
  if (!row || !row.refresh_token || !row.calendar_id) return { skipped: "not-connected" };
  if (!row.enabled) return { skipped: "disabled" };

  try {
    const token = await accessTokenFor(row);
    const from = windowStart();

    const [{ data: shiftData }, { data: mapData }] = await Promise.all([
      supabaseAdmin
        .from("roster_shifts")
        .select("id, shift_date, starts, ends, note, status")
        .eq("doctor_id", doctorId)
        .neq("status", "open")
        .gte("shift_date", from),
      supabaseAdmin
        .from("roster_google_events")
        .select("shift_id, shift_date, calendar_id, synced_hash")
        .eq("doctor_id", doctorId)
        .gte("shift_date", from),
    ]);

    const shifts = (shiftData ?? []) as ShiftRow[];
    const mapped = (mapData ?? []) as {
      shift_id: string; shift_date: string; calendar_id: string; synced_hash: string;
    }[];
    const have = new Map(mapped.map((m) => [m.shift_id, m]));
    const wanted = new Set(shifts.map((s) => s.id));

    let written = 0, removed = 0;

    for (const s of shifts) {
      const h = hashOf(s);
      const m = have.get(s.id);
      // Same content, same calendar: nothing to say to Google.
      if (m && m.synced_hash === h && m.calendar_id === row.calendar_id) continue;
      await writeEvent(token, row.calendar_id, s, Boolean(m) && m!.calendar_id === row.calendar_id);
      await supabaseAdmin.from("roster_google_events").upsert(
        {
          doctor_id: doctorId,
          shift_id: s.id,
          shift_date: s.shift_date,
          calendar_id: row.calendar_id,
          synced_hash: h,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "doctor_id,shift_id" },
      );
      written++;
    }

    // Shifts this doctor no longer holds — reassigned, put on the market, or
    // deleted outright. The mapping row outlives the shift precisely so this
    // can still find them.
    for (const m of mapped) {
      if (wanted.has(m.shift_id)) continue;
      await G.deleteEvent(token, m.calendar_id, eventIdFor(m.shift_id));
      await supabaseAdmin
        .from("roster_google_events")
        .delete()
        .eq("doctor_id", doctorId)
        .eq("shift_id", m.shift_id);
      removed++;
    }

    await supabaseAdmin
      .from("roster_google_sync")
      .update({ last_sync_at: new Date().toISOString(), last_error: null, last_error_at: null })
      .eq("doctor_id", doctorId);

    return { written, removed };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await noteError(doctorId, msg);
    return { error: msg };
  }
}

/** Sync several doctors, ignoring nulls and duplicates. */
export async function syncDoctors(ids: (string | null | undefined)[]): Promise<void> {
  const unique = [...new Set(ids.filter((x): x is string => Boolean(x)))];
  await Promise.all(unique.map((id) => syncDoctor(id)));
}

/** Everyone currently connected — for bulk roster changes. */
export async function syncAllConnected(): Promise<void> {
  if (!G.googleConfigured()) return;
  const { data } = await supabaseAdmin
    .from("roster_google_sync")
    .select("doctor_id")
    .eq("enabled", true)
    .not("refresh_token", "is", null);
  await syncDoctors((data ?? []).map((r: { doctor_id: string }) => r.doctor_id));
}

/** Remove every event we wrote, leaving the (empty) calendar in place. */
export async function purgeEvents(doctorId: string): Promise<void> {
  const row = await getSync(doctorId);
  if (!row?.refresh_token || !row.calendar_id) return;
  const token = await accessTokenFor(row);
  const { data } = await supabaseAdmin
    .from("roster_google_events")
    .select("shift_id, calendar_id")
    .eq("doctor_id", doctorId);
  for (const m of (data ?? []) as { shift_id: string; calendar_id: string }[]) {
    await G.deleteEvent(token, m.calendar_id, eventIdFor(m.shift_id)).catch(() => {});
  }
  await supabaseAdmin.from("roster_google_events").delete().eq("doctor_id", doctorId);
}
