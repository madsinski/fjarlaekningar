// Samstilling vakta við Google-dagatal — sameiginleg vél fyrir vaktakerfi
// Fjarlækninga og HSU.
//
// Þetta er SÁTTAAÐFERÐ (reconcile), ekki atburðastraumur: hvert kall ber saman
// vaktir læknisins og það sem við höfum þegar skrifað, og lagfærir muninn.
// Það þýðir að misheppnað kall lagar sig sjálft næst þegar eitthvað breytist —
// öfugt við "sendu breytinguna einu sinni", þar sem eitt týnt kall skilur
// dagatalið eftir rangt þar til einhver tekur eftir því.
//
// Auðkenni atburðar er leitt af auðkenni vaktarinnar, svo skrifin eru hugröng:
// sama vakt tvisvar verður einn atburður, aldrei tveir.
//
// Kerfin tvö eiga hvort sínar töflur (roster_* / hsu_*) og sitt dagatalsheiti;
// allt annað — lyklar, endurnýjun, villumeðhöndlun — er eitt og hið sama.

import { createHash } from "node:crypto";
import { supabaseAdmin } from "@/lib/supabase-admin";
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

export interface SyncShiftRow {
  id: string;
  shift_date: string;
  starts: string;
  ends: string;
  note: string;
  status: string;
  label?: string;
}

export interface CalendarSyncConfig {
  syncTable: string;
  eventsTable: string;
  shiftsTable: string;
  /** Dálkar sem sóttir eru úr vaktatöflunni. Verða að innihalda SyncShiftRow. */
  shiftColumns: string;
  /** Vaktir með þessa stöðu fara EKKI í dagatalið. */
  excludeStatuses: string[];
  /** Aukaskilyrði (dálkur = gildi), t.d. aðeins birtar vaktir. */
  requireEquals?: Record<string, string | boolean>;
  /** Dálkar sem verða að vera tómir (null), t.d. vakt sem bíður samþykkis. */
  requireNull?: string[];
  /** Heiti dagatalsins sem búið er til í reikningi læknisins. */
  calendarName: string;
  /** `lang` is the doctor's language when `languageOf` is configured, otherwise undefined. */
  eventBody: (s: SyncShiftRow, lang?: string) => { summary: string; description: string };
  /** Optional: the doctor's language, so event text follows it (a change rewrites the events). */
  languageOf?: (doctorId: string) => Promise<string>;
}

export interface SyncResult {
  skipped?: string;
  written?: number;
  removed?: number;
  error?: string;
}

export const eventIdFor = (shiftId: string) => shiftId.replace(/-/g, "");

function nextDate(date: string): string {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + 1)).toISOString().slice(0, 10);
}

function windowStart(): string {
  const t = new Date();
  t.setUTCDate(t.getUTCDate() - WINDOW_BACK_DAYS);
  return t.toISOString().slice(0, 10);
}

export function createCalendarSync(cfg: CalendarSyncConfig) {
  /** Everything that would change the event. Unchanged hash = no API call. */
  function hashOf(s: SyncShiftRow, lang?: string): string {
    return createHash("sha256")
      .update([s.shift_date, s.starts, s.ends, s.note, s.status, s.label ?? "", ...(lang ? [lang] : [])].join("|"))
      .digest("hex")
      .slice(0, 16);
  }

  function fullBody(s: SyncShiftRow, lang?: string) {
    const { summary, description } = cfg.eventBody(s, lang);
    return {
      summary,
      description,
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

  async function getSync(doctorId: string): Promise<GoogleSyncRow | null> {
    const { data } = await supabaseAdmin.from(cfg.syncTable).select("*").eq("doctor_id", doctorId).maybeSingle();
    return (data as GoogleSyncRow) ?? null;
  }

  async function noteError(doctorId: string, message: string, clearToken = false) {
    await supabaseAdmin
      .from(cfg.syncTable)
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
  async function accessTokenFor(row: GoogleSyncRow): Promise<string> {
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
        .from(cfg.syncTable)
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

  async function writeEvent(token: string, calendarId: string, shift: SyncShiftRow, believedToExist: boolean, lang?: string): Promise<void> {
    const body = fullBody(shift, lang);
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

  /**
   * Bring one doctor's Google calendar in line with their roster.
   *
   * Never throws: a calendar that will not sync must not take an admin action
   * down with it. Failures are recorded on the row and shown to the doctor.
   */
  async function syncDoctor(doctorId: string): Promise<SyncResult> {
    if (!G.googleConfigured()) return { skipped: "google-not-configured" };
    const row = await getSync(doctorId);
    if (!row || !row.refresh_token || !row.calendar_id) return { skipped: "not-connected" };
    if (!row.enabled) return { skipped: "disabled" };

    try {
      const token = await accessTokenFor(row);
      const from = windowStart();
      const lang = cfg.languageOf ? await cfg.languageOf(doctorId) : undefined;

      let shiftQuery = supabaseAdmin
        .from(cfg.shiftsTable)
        .select(cfg.shiftColumns)
        .eq("doctor_id", doctorId)
        .gte("shift_date", from);
      for (const st of cfg.excludeStatuses) shiftQuery = shiftQuery.neq("status", st);
      for (const [col, val] of Object.entries(cfg.requireEquals ?? {})) shiftQuery = shiftQuery.eq(col, val);
      for (const col of cfg.requireNull ?? []) shiftQuery = shiftQuery.is(col, null);

      const [{ data: shiftData, error: shiftErr }, { data: mapData, error: mapErr }] = await Promise.all([
        shiftQuery,
        supabaseAdmin
          .from(cfg.eventsTable)
          .select("shift_id, shift_date, calendar_id, synced_hash")
          .eq("doctor_id", doctorId)
          .gte("shift_date", from),
      ]);
      // A failed read must not look like "no shifts" — that would delete every
      // event in the doctor's calendar.
      if (shiftErr || mapErr) throw new Error((shiftErr || mapErr)!.message);

      const shifts = (shiftData ?? []) as unknown as SyncShiftRow[];
      const mapped = (mapData ?? []) as { shift_id: string; shift_date: string; calendar_id: string; synced_hash: string }[];
      const have = new Map(mapped.map((m) => [m.shift_id, m]));
      const wanted = new Set(shifts.map((s) => s.id));

      let written = 0, removed = 0;

      for (const s of shifts) {
        const h = hashOf(s, lang);
        const m = have.get(s.id);
        // Same content, same calendar: nothing to say to Google.
        if (m && m.synced_hash === h && m.calendar_id === row.calendar_id) continue;
        await writeEvent(token, row.calendar_id, s, Boolean(m) && m!.calendar_id === row.calendar_id, lang);
        await supabaseAdmin.from(cfg.eventsTable).upsert(
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
        await supabaseAdmin.from(cfg.eventsTable).delete().eq("doctor_id", doctorId).eq("shift_id", m.shift_id);
        removed++;
      }

      await supabaseAdmin
        .from(cfg.syncTable)
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
  async function syncDoctors(ids: (string | null | undefined)[]): Promise<void> {
    const unique = [...new Set(ids.filter((x): x is string => Boolean(x)))];
    await Promise.all(unique.map((id) => syncDoctor(id)));
  }

  /** Everyone currently connected — for bulk roster changes. */
  async function syncAllConnected(): Promise<void> {
    if (!G.googleConfigured()) return;
    const { data } = await supabaseAdmin
      .from(cfg.syncTable)
      .select("doctor_id")
      .eq("enabled", true)
      .not("refresh_token", "is", null);
    await syncDoctors((data ?? []).map((r: { doctor_id: string }) => r.doctor_id));
  }

  /** Remove every event we wrote, leaving the (empty) calendar in place. */
  async function purgeEvents(doctorId: string): Promise<void> {
    const row = await getSync(doctorId);
    if (!row?.refresh_token || !row.calendar_id) return;
    const token = await accessTokenFor(row);
    const { data } = await supabaseAdmin.from(cfg.eventsTable).select("shift_id, calendar_id").eq("doctor_id", doctorId);
    for (const m of (data ?? []) as { shift_id: string; calendar_id: string }[]) {
      await G.deleteEvent(token, m.calendar_id, eventIdFor(m.shift_id)).catch(() => {});
    }
    await supabaseAdmin.from(cfg.eventsTable).delete().eq("doctor_id", doctorId);
  }

  /** Aftengja: eyða dagatalinu sem við bjuggum til og gleyma lyklinum. */
  async function disconnect(doctorId: string): Promise<void> {
    const row = await getSync(doctorId);
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
    await supabaseAdmin.from(cfg.eventsTable).delete().eq("doctor_id", doctorId);
    await supabaseAdmin.from(cfg.syncTable).delete().eq("doctor_id", doctorId);
  }

  /** Eftir samþykki hjá Google: vista lykla og búa til (eða endurnýta) dagatal. */
  async function completeConnect(doctorId: string, code: string): Promise<"connected" | "norefresh"> {
    const tok = await G.exchangeCode(code);
    const who = G.readIdToken(tok.id_token);

    // Google issues a refresh token only on first consent for a given client.
    // prompt=consent should always get us one — but if it does not, keep the
    // one already stored rather than overwriting it with null and silently
    // killing a working connection.
    const existing = await supabaseAdmin
      .from(cfg.syncTable)
      .select("refresh_token, calendar_id")
      .eq("doctor_id", doctorId)
      .maybeSingle();
    const refresh = tok.refresh_token || existing.data?.refresh_token || null;
    if (!refresh) return "norefresh";

    // Reuse the calendar if it is still there; the doctor may have deleted it
    // at Google's end, in which case make a new one.
    let calendarId = existing.data?.calendar_id ?? null;
    if (calendarId) {
      const still = await G.getCalendar(tok.access_token, calendarId).catch(() => null);
      if (!still) calendarId = null;
    }
    if (!calendarId) calendarId = await G.createCalendar(tok.access_token, cfg.calendarName);

    await supabaseAdmin.from(cfg.syncTable).upsert(
      {
        doctor_id: doctorId,
        google_sub: who.sub ?? null,
        google_email: who.email ?? null,
        refresh_token: refresh,
        access_token: tok.access_token,
        access_expires_at: new Date(Date.now() + (tok.expires_in ?? 3600) * 1000).toISOString(),
        calendar_id: calendarId,
        enabled: true,
        connected_at: new Date().toISOString(),
        last_error: null,
        last_error_at: null,
      },
      { onConflict: "doctor_id" },
    );
    return "connected";
  }

  async function recordConnectError(doctorId: string, msg: string) {
    try {
      await supabaseAdmin.from(cfg.syncTable).upsert(
        { doctor_id: doctorId, last_error: msg.slice(0, 500), last_error_at: new Date().toISOString() },
        { onConflict: "doctor_id" },
      );
    } catch { /* recording the failure must not become a second failure */ }
  }

  return {
    calendarName: cfg.calendarName,
    getSync, accessTokenFor, syncDoctor, syncDoctors, syncAllConnected, purgeEvents,
    disconnect, completeConnect, recordConnectError,
  };
}
