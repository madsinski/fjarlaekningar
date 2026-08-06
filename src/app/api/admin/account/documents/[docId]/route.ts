// Signed download URL for one of the CALLER'S OWN documents. Any active staff,
// scoped to documents belonging to them.

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getCallerStaff } from "@/lib/admin-auth";

export const runtime = "nodejs";

export async function GET(req: Request, ctx: { params: Promise<{ docId: string }> }) {
  const caller = await getCallerStaff(req);
  if (!caller) return NextResponse.json({ ok: false, error: "Not authenticated" }, { status: 401 });
  const { docId } = await ctx.params;

  const { data: doc } = await supabaseAdmin
    .from("staff_documents")
    .select("storage_path, staff_id")
    .eq("id", docId)
    .maybeSingle();
  if (!doc || doc.staff_id !== caller.id) {
    return NextResponse.json({ ok: false, error: "Skjalið tilheyrir þér ekki" }, { status: 403 });
  }

  const { data, error } = await supabaseAdmin.storage.from("staff-documents").createSignedUrl(doc.storage_path, 600);
  if (error || !data) return NextResponse.json({ ok: false, error: error?.message || "Villa" }, { status: 500 });
  return NextResponse.json({ ok: true, url: data.signedUrl });
}
