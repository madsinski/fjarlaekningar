// Google skilar lækninum hingað eftir samþykkt.
//
// Hér er kóðanum skipt út fyrir lykla, dagatal búið til í reikningi læknisins
// og vaktirnar skrifaðar inn. Slóðin verður að vera skráð stafrétt sem
// "Authorized redirect URI" á OAuth-biðlaranum hjá Google.
//
// Tvö vaktakerfi deila þessari slóð — Fjarlækningar og HSU. Undirritað state
// segir hvort á við; sjá CalendarSystem í google-calendar.ts.

import { NextResponse, after } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import * as FJ from "@/lib/roster-google-sync";
import { hsuSync } from "@/lib/hsu/calendar";
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

  let home: string;
  let engine: typeof hsuSync;
  if (state.system === "hsu") {
    const { data: doctor } = await supabaseAdmin.from("hsu_doctors").select("id").eq("id", state.doctorId).maybeSingle();
    if (!doctor) return back(req, "/hsu", { google: "notfound" });
    home = state.returnTo || "/hsu/min-sida";
    engine = hsuSync;
  } else {
    const { data: doctor } = await supabaseAdmin
      .from("roster_doctors")
      .select("id, access_token")
      .eq("id", state.doctorId)
      .maybeSingle();
    if (!doctor) return back(req, "/", { google: "notfound" });
    home = state.returnTo || `/vaktir/${doctor.access_token}`;
    engine = { ...FJ, calendarName: G.CALENDAR_NAME };
  }

  // The doctor pressed "cancel" on Google's consent screen.
  if (q.get("error")) return back(req, home, { google: "cancelled" });

  const code = q.get("code");
  if (!code) return back(req, home, { google: "nocode" });

  try {
    const outcome = await engine.completeConnect(state.doctorId, code);
    if (outcome === "norefresh") return back(req, home, { google: "norefresh" });

    // The calendar the doctor is about to look at should already have their
    // shifts in it, so fill it before they get back — but after the redirect,
    // so they are not staring at a blank tab while we talk to Google.
    after(async () => { await engine.syncDoctor(state.doctorId); });

    return back(req, home, { google: "connected" });
  } catch (e) {
    await engine.recordConnectError(state.doctorId, e instanceof Error ? e.message : String(e));
    return back(req, home, { google: "error" });
  }
}
