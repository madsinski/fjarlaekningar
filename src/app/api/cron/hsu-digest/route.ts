// Cron á 5 mín. fresti (vercel.json): samantektarpóstur til lækna um
// breytingar á vaktaplani. Sjá src/lib/hsu/digest.ts.

import { NextResponse } from "next/server";
import { runShiftDigest } from "@/lib/hsu/digest";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  return NextResponse.json({ ok: true, ...(await runShiftDigest()) });
}
