// Void or re-issue a staff contract. Admin only.
//   { action: "void" }   → cancel a pending contract (removes it from Mín síða)
//   { action: "resend" } → void the current one and create a fresh pending copy
//                          from the same text (new token + hash)

import { NextResponse } from "next/server";
import { randomBytes, createHash } from "node:crypto";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getCallerStaff, isAdmin } from "@/lib/admin-auth";

export const runtime = "nodejs";

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string; contractId: string }> }) {
  const caller = await getCallerStaff(req);
  if (!isAdmin(caller)) return NextResponse.json({ ok: false, error: "Admin role required" }, { status: 403 });
  const { id, contractId } = await ctx.params;

  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }
  const action = String(body.action || "");

  const { data: c } = await supabaseAdmin.from("staff_contracts").select("*").eq("id", contractId).eq("staff_id", id).maybeSingle();
  if (!c) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  if (c.status === "signed") return NextResponse.json({ ok: false, error: "Samningur er þegar undirritaður" }, { status: 409 });

  if (action === "void") {
    await supabaseAdmin.from("staff_contracts").update({ status: "void" }).eq("id", contractId);
    return NextResponse.json({ ok: true });
  }

  if (action === "resend") {
    if (c.status === "sent") await supabaseAdmin.from("staff_contracts").update({ status: "void" }).eq("id", contractId);
    const { data, error } = await supabaseAdmin
      .from("staff_contracts")
      .insert({
        staff_id: id,
        token: randomBytes(24).toString("hex"),
        title: c.title,
        body: c.body,
        terms_hash: createHash("sha256").update(c.body).digest("hex"),
        created_by: caller!.id,
      })
      .select("id, title, status, created_at")
      .single();
    if (error || !data) return NextResponse.json({ ok: false, error: error?.message || "Villa" }, { status: 500 });
    return NextResponse.json({ ok: true, contract: data });
  }

  return NextResponse.json({ ok: false, error: "Óþekkt aðgerð" }, { status: 400 });
}
