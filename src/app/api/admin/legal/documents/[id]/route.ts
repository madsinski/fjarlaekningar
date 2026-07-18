// Update a legal document (admin only): save an edit (new version snapshot)
// and/or change publish status. Also supports GET (single doc + version list)
// and DELETE.

import { NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getCallerStaff, isAdmin } from "@/lib/admin-auth";

export const runtime = "nodejs";

const CATEGORIES = ["privacy", "terms", "consent", "general"];
const LANGS = ["is", "en"];

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const caller = await getCallerStaff(req);
  if (!caller) return NextResponse.json({ ok: false, error: "Not authenticated" }, { status: 401 });
  const { id } = await ctx.params;

  const { data: document } = await supabaseAdmin.from("legal_documents").select("*").eq("id", id).maybeSingle();
  if (!document) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  const { data: versions } = await supabaseAdmin
    .from("legal_document_versions")
    .select("version, title, status, edited_by_name, created_at")
    .eq("document_id", id)
    .order("version", { ascending: false });
  // Review history is best-effort: the approval migration may not be run yet.
  const { data: reviews } = await supabaseAdmin
    .from("legal_document_reviews")
    .select("action, comment, reviewer_name, created_at")
    .eq("document_id", id)
    .order("created_at", { ascending: false });

  return NextResponse.json({ ok: true, document, versions: versions || [], reviews: reviews || [] });
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const caller = await getCallerStaff(req);
  if (!isAdmin(caller)) {
    return NextResponse.json({ ok: false, error: "Admin role required" }, { status: 403 });
  }
  const { id } = await ctx.params;

  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const { data: current } = await supabaseAdmin.from("legal_documents").select("*").eq("id", id).maybeSingle();
  if (!current) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });

  const update: Record<string, unknown> = { updated_by: caller!.id };
  let contentChanged = false;

  if (typeof body.title === "string" && body.title.trim() && body.title !== current.title) {
    update.title = body.title.trim();
    contentChanged = true;
  }
  if (typeof body.body === "string" && body.body !== current.body) {
    update.body = body.body;
    contentChanged = true;
  }
  if (typeof body.category === "string") {
    if (!CATEGORIES.includes(body.category)) return NextResponse.json({ ok: false, error: "Invalid category" }, { status: 400 });
    if (body.category !== current.category) update.category = body.category;
  }
  if (typeof body.language === "string") {
    if (!LANGS.includes(body.language)) return NextResponse.json({ ok: false, error: "Invalid language" }, { status: 400 });
    if (body.language !== current.language) update.language = body.language;
  }

  // Publish / unpublish.
  if (body.status === "published" || body.status === "draft") {
    update.status = body.status;
    update.published_at = body.status === "published" ? new Date().toISOString() : null;
  }

  const nextVersion = contentChanged ? (current.version as number) + 1 : (current.version as number);
  if (contentChanged) update.version = nextVersion;

  const { data: updated, error: updErr } = await supabaseAdmin
    .from("legal_documents")
    .update(update)
    .eq("id", id)
    .select()
    .single();
  if (updErr || !updated) {
    return NextResponse.json({ ok: false, error: updErr?.message || "Villa" }, { status: 500 });
  }

  if (contentChanged) {
    await supabaseAdmin.from("legal_document_versions").insert({
      document_id: id,
      version: nextVersion,
      title: updated.title,
      body: updated.body,
      status: updated.status,
      text_hash: createHash("sha256").update(String(updated.body)).digest("hex"),
      edited_by: caller!.id,
      edited_by_name: caller!.name,
    });
  }

  return NextResponse.json({ ok: true, document: updated });
}

export async function DELETE(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const caller = await getCallerStaff(req);
  if (!isAdmin(caller)) {
    return NextResponse.json({ ok: false, error: "Admin role required" }, { status: 403 });
  }
  const { id } = await ctx.params;
  const { error } = await supabaseAdmin.from("legal_documents").delete().eq("id", id);
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
