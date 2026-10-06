// Cron einu sinni á dag (vercel.json): áminning um það sem er ógert fyrir
// skilafrest mánaðarins — tölvupóstur, SMS og tilkynning í kerfinu.
// Sjá src/lib/hsu/tasks.ts.
//
// Um leið er dagatal allra tengdra lækna samstillt. Vaktir samstillast þegar
// þær breytast, en DAGVINNAN rúllar fram í tímann af sjálfu sér (sex mánaða
// gluggi) — án daglegrar keyrslu myndi hún aldrei ná lengra en síðasta breyting.
//
// ?dry=1 skoðar stöðuna án þess að senda eða skrifa (fyrir yfirlækni/prófun).
// ?today=2026-10-18 prófar tiltekinn dag.
// ?sync=0 sleppir dagatalssamstillingunni.

import { NextResponse } from "next/server";
import { runTaskReminders } from "@/lib/hsu/tasks";
import { originOf } from "@/lib/hsu/server";
import { hsuSync } from "@/lib/hsu/calendar";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  const u = new URL(req.url);
  const today = u.searchParams.get("today");
  const run = await runTaskReminders({
    origin: originOf(req),
    today: today && DATE_RE.test(today) ? today : undefined,
    dryRun: u.searchParams.get("dry") === "1",
  });
  // Þurrkeyrsla á ekki að snerta dagatöl.
  let calendars: "synced" | "skipped" = "skipped";
  if (u.searchParams.get("dry") !== "1" && u.searchParams.get("sync") !== "0") {
    await hsuSync.syncAllConnected().catch(() => { /* dagatal má ekki fella áminningarnar */ });
    calendars = "synced";
  }
  return NextResponse.json({ ok: true, calendars, ...run });
}
