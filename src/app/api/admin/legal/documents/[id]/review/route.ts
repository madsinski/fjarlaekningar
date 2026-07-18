// Legal document approval actions + review history (Fjarlækningar).
//   submit          → in_review
//   approve         → approved   (stamps approved_at/approved_by)
//   request_changes → changes_requested
//   reopen          → draft
//   comment         → no status change, just a history note
//
// Approval actions require admin or lawyer role; comments allowed by any
// active staff member.

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getCallerStaff } from "@/lib/admin-auth";

export const runtime = "nodejs";

const ACTIONS = ["submit", "approve", "request_changes", "reopen", "comment"] as const;
type Action = (typeof ACTIONS)[number];

const STATUS_FOR: Record<Exclude<Action, "comment">, string> = {
  submit: "in_review",
  approve: "approved",
  request_changes: "changes_requested",
  reopen: "draft",
};
const HISTORY_ACTION: Record<Action, string> = {
  submit: "submitted",
  approve: "approved",
  request_changes: "changes_requested",
  reopen: "reopened",
  comment: "comment",
};

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const caller = await getCallerStaff(req);
  if (!caller) return NextResponse.json({ ok: false, error: "Not authenticated" }, { status: 401 });
  const { id } = await ctx.params;

  let body: { action?: string; comment?: string } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }
  const action = body.action as Action;
  if (!ACTIONS.includes(action)) {
    return NextResponse.json({ ok: false, error: "Invalid action" }, { status: 400 });
  }
  const comment = (body.comment || "").trim() || null;

  const canApprove = caller.role === "admin" || caller.role === "lawyer";
  if (action !== "comment" && !canApprove) {
    return NextResponse.json({ ok: false, error: "Aðeins stjórnendur/lögfræðingar geta samþykkt" }, { status: 403 });
  }

  const { data: doc } = await supabaseAdmin.from("legal_documents").select("id").eq("id", id).maybeSingle();
  if (!doc) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });

  // Update approval status (skip for pure comments).
  if (action !== "comment") {
    const update: Record<string, unknown> = { approval_status: STATUS_FOR[action] };
    if (action === "approve") {
      update.approved_at = new Date().toISOString();
      update.approved_by = caller.id;
    } else {
      update.approved_at = null;
      update.approved_by = null;
    }
    const { error: updErr } = await supabaseAdmin.from("legal_documents").update(update).eq("id", id);
    if (updErr) return NextResponse.json({ ok: false, error: updErr.message }, { status: 500 });
  }

  await supabaseAdmin.from("legal_document_reviews").insert({
    document_id: id,
    action: HISTORY_ACTION[action],
    comment,
    reviewer_id: caller.id,
    reviewer_name: caller.name,
  });

  const { data: updated } = await supabaseAdmin.from("legal_documents").select("*").eq("id", id).maybeSingle();
  const { data: reviews } = await supabaseAdmin
    .from("legal_document_reviews")
    .select("action, comment, reviewer_name, created_at")
    .eq("document_id", id)
    .order("created_at", { ascending: false });

  return NextResponse.json({ ok: true, document: updated, reviews: reviews || [] });
}
