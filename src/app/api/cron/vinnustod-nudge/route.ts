// Cron á 5 mín. fresti (vercel.json): SMS til stjórnanda um spurningar sem
// enginn hefur opnað. Sjá src/lib/vinnustod/nudge.ts.

import { NextResponse } from "next/server";
import { runNudge } from "@/lib/vinnustod/nudge";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  const result = await runNudge();
  return NextResponse.json({ ok: true, ...result });
}
