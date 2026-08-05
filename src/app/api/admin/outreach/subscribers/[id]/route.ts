// Hard-delete one subscriber. Admin only.
//
// This is a REAL delete (row removed), distinct from unsubscribe — which only
// sets unsubscribed_at and keeps the row as a record of the opt-out. Use this to
// remove a test address or scrub an entry entirely (e.g. an erasure request).

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getCallerStaff, isAdmin } from "@/lib/admin-auth";

export const runtime = "nodejs";

export async function DELETE(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const caller = await getCallerStaff(req);
  if (!isAdmin(caller)) {
    return NextResponse.json({ ok: false, error: "Admin role required" }, { status: 403 });
  }
  const { id } = await ctx.params;
  const { error } = await supabaseAdmin.from("subscribers").delete().eq("id", id);
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
