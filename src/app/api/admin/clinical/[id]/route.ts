// Read a clinical protocol + its full change log, and save a new version.
//
// Every PATCH that changes the algorithm/title/summary/status/risk_class is a
// controlled change: it REQUIRES a change_type + change summary, bumps the
// version, and appends an immutable snapshot to clinical_protocol_changes.

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getCallerStaff } from "@/lib/admin-auth";

export const runtime = "nodejs";

const CHANGE_TYPES = ["algorithm_change", "clarification", "correction", "retired", "reactivated"];
const STATUSES = ["draft", "active", "retired"];
const RISK = ["unclassified", "I", "IIa", "IIb", "III"];

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const caller = await getCallerStaff(req);
  if (!caller) return NextResponse.json({ ok: false, error: "Not authenticated" }, { status: 401 });
  const { id } = await ctx.params;
  const { data: protocol } = await supabaseAdmin.from("clinical_protocols").select("*").eq("id", id).maybeSingle();
  if (!protocol) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  const { data: changes } = await supabaseAdmin
    .from("clinical_protocol_changes")
    .select("version, change_type, summary, rationale, changed_by_name, created_at")
    .eq("protocol_id", id)
    .order("version", { ascending: false });
  return NextResponse.json({ ok: true, protocol, changes: changes || [] });
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const caller = await getCallerStaff(req);
  if (!caller) return NextResponse.json({ ok: false, error: "Not authenticated" }, { status: 401 });
  const { id } = await ctx.params;

  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const changeType = String(body.change_type || "");
  const changeSummary = String(body.change_summary || "").trim();
  const rationale = String(body.rationale || "").trim() || null;
  if (!CHANGE_TYPES.includes(changeType)) {
    return NextResponse.json({ ok: false, error: "Veldu tegund breytingar" }, { status: 400 });
  }
  if (!changeSummary) {
    return NextResponse.json({ ok: false, error: "Lýsing á breytingu er skylda (audit)" }, { status: 400 });
  }

  const { data: current } = await supabaseAdmin.from("clinical_protocols").select("*").eq("id", id).maybeSingle();
  if (!current) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });

  const nextVersion = (current.version as number) + 1;
  const update: Record<string, unknown> = { version: nextVersion, updated_by: caller.id };
  if (typeof body.title === "string" && body.title.trim()) update.title = body.title.trim();
  if (typeof body.summary === "string") update.summary = body.summary;
  if (typeof body.algorithm === "string") update.algorithm = body.algorithm;
  if (typeof body.status === "string") {
    if (!STATUSES.includes(body.status)) return NextResponse.json({ ok: false, error: "Invalid status" }, { status: 400 });
    update.status = body.status;
  }
  if (typeof body.risk_class === "string") {
    if (!RISK.includes(body.risk_class)) return NextResponse.json({ ok: false, error: "Invalid risk class" }, { status: 400 });
    update.risk_class = body.risk_class;
  }

  const { data: updated, error: updErr } = await supabaseAdmin
    .from("clinical_protocols")
    .update(update)
    .eq("id", id)
    .select()
    .single();
  if (updErr || !updated) return NextResponse.json({ ok: false, error: updErr?.message || "Villa" }, { status: 500 });

  const { error: logErr } = await supabaseAdmin.from("clinical_protocol_changes").insert({
    protocol_id: id,
    version: nextVersion,
    change_type: changeType,
    summary: changeSummary,
    rationale,
    algorithm_snapshot: String(updated.algorithm ?? ""),
    title_snapshot: String(updated.title ?? ""),
    changed_by: caller.id,
    changed_by_name: caller.name,
  });
  if (logErr) return NextResponse.json({ ok: false, error: logErr.message }, { status: 500 });

  return NextResponse.json({ ok: true, protocol: updated });
}
