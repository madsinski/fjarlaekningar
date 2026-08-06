// Staff documents (signed employment contracts etc.): list + upload. Admin only.
// Files go to the private 'staff-documents' bucket via the service role.

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getCallerStaff, isAdmin } from "@/lib/admin-auth";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const caller = await getCallerStaff(req);
  if (!isAdmin(caller)) return NextResponse.json({ ok: false, error: "Admin role required" }, { status: 403 });
  const { id } = await ctx.params;
  const { data, error } = await supabaseAdmin
    .from("staff_documents")
    .select("id, kind, title, filename, content_type, size_bytes, signer_name, signed_at, note, uploaded_at")
    .eq("staff_id", id)
    .order("uploaded_at", { ascending: false });
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, documents: data ?? [] });
}

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const caller = await getCallerStaff(req);
  if (!isAdmin(caller)) return NextResponse.json({ ok: false, error: "Admin role required" }, { status: 403 });
  const { id } = await ctx.params;

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid form" }, { status: 400 });
  }
  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ ok: false, error: "Skrá vantar" }, { status: 400 });
  }
  if (file.size > 15 * 1024 * 1024) {
    return NextResponse.json({ ok: false, error: "Skrá er of stór (hámark 15 MB)" }, { status: 400 });
  }

  const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `${id}/${Date.now()}-${safe}`;
  const bytes = new Uint8Array(await file.arrayBuffer());

  const { error: upErr } = await supabaseAdmin.storage
    .from("staff-documents")
    .upload(path, bytes, { contentType: file.type || "application/octet-stream", upsert: false });
  if (upErr) return NextResponse.json({ ok: false, error: upErr.message }, { status: 500 });

  const signedAt = String(form.get("signed_at") || "").trim();
  const { data, error } = await supabaseAdmin
    .from("staff_documents")
    .insert({
      staff_id: id,
      kind: String(form.get("kind") || "employment_contract"),
      title: String(form.get("title") || "").trim() || file.name,
      filename: file.name,
      storage_path: path,
      content_type: file.type || null,
      size_bytes: file.size,
      signer_name: String(form.get("signer_name") || "").trim() || null,
      signed_at: /^\d{4}-\d{2}-\d{2}$/.test(signedAt) ? signedAt : null,
      note: String(form.get("note") || "").trim(),
      uploaded_by: caller!.id,
    })
    .select("id, kind, title, filename, content_type, size_bytes, signer_name, signed_at, note, uploaded_at")
    .single();

  if (error) {
    await supabaseAdmin.storage.from("staff-documents").remove([path]);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, document: data }, { status: 201 });
}
