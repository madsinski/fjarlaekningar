// Google skilar lækninum hingað eftir samþykkt.
//
// Hér er kóðanum skipt út fyrir lykla, dagatal búið til í reikningi læknisins
// og vaktirnar skrifaðar inn. Slóðin verður að vera skráð stafrétt sem
// "Authorized redirect URI" á OAuth-biðlaranum hjá Google.

import { NextResponse, after } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { syncDoctor } from "@/lib/roster-google-sync";
import * as G from "@/lib/google-calendar";

export const runtime = "nodejs";

function back(req: Request, path: string, params: Record<string, string>) {
  const url = new URL(path || "/", new URL(req.url).origin);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  return NextResponse.redirect(url);
}

export async function GET(req: Request) {
  const q = new URL(req.url).searchParams;
  const state = G.verifyState(q.get("state") ?? "");

  // A bad state means the round trip was tampered with or simply took too long.
  // There is no trustworthy page to send them back to, so land on the front page.
  if (!state) return back(req, "/", { google: "state" });

  const { data: doctor } = await supabaseAdmin
    .from("roster_doctors")
    .select("id, access_token")
    .eq("id", state.doctorId)
    .maybeSingle();
  if (!doctor) return back(req, "/", { google: "notfound" });

  const home = state.returnTo || `/vaktir/${doctor.access_token}`;

  // The doctor pressed "cancel" on Google's consent screen.
  if (q.get("error")) return back(req, home, { google: "cancelled" });

  const code = q.get("code");
  if (!code) return back(req, home, { google: "nocode" });

  try {
    const tok = await G.exchangeCode(code);
    const who = G.readIdToken(tok.id_token);

    // Google issues a refresh token only on first consent for a given client.
    // prompt=consent should always get us one — but if it does not, keep the
    // one already stored rather than overwriting it with null and silently
    // killing a working connection.
    const existing = await supabaseAdmin
      .from("roster_google_sync")
      .select("refresh_token, calendar_id")
      .eq("doctor_id", doctor.id)
      .maybeSingle();
    const refresh = tok.refresh_token || existing.data?.refresh_token || null;
    if (!refresh) return back(req, home, { google: "norefresh" });

    // Reuse the calendar if it is still there; the doctor may have deleted it
    // at Google's end, in which case make a new one.
    let calendarId = existing.data?.calendar_id ?? null;
    if (calendarId) {
      const still = await G.getCalendar(tok.access_token, calendarId).catch(() => null);
      if (!still) calendarId = null;
    }
    if (!calendarId) calendarId = await G.createCalendar(tok.access_token);

    await supabaseAdmin.from("roster_google_sync").upsert(
      {
        doctor_id: doctor.id,
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

    // The calendar the doctor is about to look at should already have their
    // shifts in it, so fill it before they get back — but after the redirect,
    // so they are not staring at a blank tab while we talk to Google.
    after(async () => { await syncDoctor(doctor.id); });

    return back(req, home, { google: "connected" });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    try {
      await supabaseAdmin.from("roster_google_sync").upsert(
        { doctor_id: doctor.id, last_error: msg.slice(0, 500), last_error_at: new Date().toISOString() },
        { onConflict: "doctor_id" },
      );
    } catch { /* recording the failure must not become a second failure */ }
    return back(req, home, { google: "error" });
  }
}
