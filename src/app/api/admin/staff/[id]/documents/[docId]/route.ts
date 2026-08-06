// One staff document: signed download URL (GET) or delete (DELETE). Admin only.

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getCallerStaff, isAdmin } from "@/lib/admin-auth";

export const runtime = "nodejs";

export async function GET(req: Request, ctx: { params: Promise<{ id: string; docId: string }> }) {
  const caller = await getCallerStaff(req);
  if (!isAdmin(caller)) return NextResponse.json({ ok: false, error: "Admin role required" }, { status: 403 });
  const { docId } = await ctx.params;

  const { data: doc } = await supabaseAdmin.from("staff_documents").select("storage_path").eq("id", docId).maybeSingle();
  if (!doc) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });

  const { data, error } = await supabaseAdmin.storage.from("staff-documents").createSignedUrl(doc.storage_path, 600);
  if (error || !data) return NextResponse.json({ ok: false, error: error?.message || "Villa" }, { status: 500 });
  return NextResponse.json({ ok: true, url: data.signedUrl });
}

export async function DELETE(req: Request, ctx: { params: Promise<{ id: string; docId: string }> }) {
  const caller = await getCallerStaff(req);
  if (!isAdmin(caller)) return NextResponse.json({ ok: false, error: "Admin role required" }, { status: 403 });
  const { docId } = await ctx.params;

  const { data: doc } = await supabaseAdmin.from("staff_documents").select("storage_path").eq("id", docId).maybeSingle();
  if (doc) await supabaseAdmin.storage.from("staff-documents").remove([doc.storage_path]);
  const { error } = await supabaseAdmin.from("staff_documents").delete().eq("id", docId);
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
