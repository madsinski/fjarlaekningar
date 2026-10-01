// Cron einu sinni á dag (vercel.json): áminning um það sem er ógert fyrir
// skilafrest mánaðarins — tölvupóstur, SMS og tilkynning í kerfinu.
// Sjá src/lib/hsu/tasks.ts.
//
// ?dry=1 skoðar stöðuna án þess að senda eða skrifa (fyrir yfirlækni/prófun).
// ?today=2026-10-18 prófar tiltekinn dag.

import { NextResponse } from "next/server";
import { runTaskReminders } from "@/lib/hsu/tasks";
import { originOf } from "@/lib/hsu/server";

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
  return NextResponse.json({ ok: true, ...run });
}
