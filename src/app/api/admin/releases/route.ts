// Create a release / changelog entry (admin only).

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getCallerStaff, isAdmin } from "@/lib/admin-auth";

export const runtime = "nodejs";

const KINDS = ["feature", "fix", "security", "compliance"];

export async function POST(req: Request) {
  const caller = await getCallerStaff(req);
  if (!isAdmin(caller)) {
    return NextResponse.json({ ok: false, error: "Admin role required" }, { status: 403 });
  }

  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const version = String(body.version || "").trim();
  const title = String(body.title || "").trim();
  const notes = String(body.notes || "");
  const kind = String(body.kind || "feature");
  const releasedOn = String(body.released_on || "").trim();

  if (!version) return NextResponse.json({ ok: false, error: "Útgáfunúmer vantar" }, { status: 400 });
  if (!title) return NextResponse.json({ ok: false, error: "Titill vantar" }, { status: 400 });
  if (!KINDS.includes(kind)) return NextResponse.json({ ok: false, error: "Invalid kind" }, { status: 400 });

  const row: Record<string, unknown> = { version, title, notes, kind, created_by: caller!.id };
  if (releasedOn) row.released_on = releasedOn;

  const { data, error } = await supabaseAdmin.from("releases").insert(row).select().single();
  if (error || !data) {
    return NextResponse.json({ ok: false, error: error?.message || "Villa" }, { status: 500 });
  }
  return NextResponse.json({ ok: true, release: data });
}
