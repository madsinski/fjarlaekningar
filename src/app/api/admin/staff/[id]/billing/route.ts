// A staff member's billing details, seen and edited by an admin.
// The contractor fills these in themselves on their /vaktir link; this is the
// same record, for when someone needs to correct it or type it in for them.

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getCallerStaff, isAdmin } from "@/lib/admin-auth";
import { EMPTY_BILLING, normalizeKennitala, type InvoiceAs } from "@/lib/billing";

export const runtime = "nodejs";

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const caller = await getCallerStaff(req);
  if (!isAdmin(caller)) return NextResponse.json({ ok: false, error: "Admin role required" }, { status: 403 });
  const { id } = await ctx.params;
  const { data } = await supabaseAdmin.from("staff_billing").select("*").eq("staff_id", id).maybeSingle();
  return NextResponse.json({ ok: true, billing: data ?? { staff_id: id, ...EMPTY_BILLING } });
}

export async function PUT(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const caller = await getCallerStaff(req);
  if (!isAdmin(caller)) return NextResponse.json({ ok: false, error: "Admin role required" }, { status: 403 });
  const { id } = await ctx.params;

  let body: Record<string, unknown> = {};
  try { body = await req.json(); } catch {
    return NextResponse.json({ ok: false, error: "Ógild gögn" }, { status: 400 });
  }
  const str = (v: unknown) => (typeof v === "string" ? v.trim() || null : null);
  const invoiceAs: InvoiceAs = body.invoice_as === "slf" ? "slf" : "person";

  const { data, error } = await supabaseAdmin
    .from("staff_billing")
    .upsert({
      staff_id: id,
      kennitala: body.kennitala ? normalizeKennitala(String(body.kennitala)) || null : null,
      phone: str(body.phone),
      bank_account: body.bank_account ? String(body.bank_account).replace(/\D/g, "") || null : null,
      invoice_as: invoiceAs,
      slf_name: invoiceAs === "slf" ? str(body.slf_name) : null,
      slf_kennitala:
        invoiceAs === "slf" && body.slf_kennitala
          ? normalizeKennitala(String(body.slf_kennitala)) || null
          : null,
      slf_bank_account:
        invoiceAs === "slf" && body.slf_bank_account
          ? String(body.slf_bank_account).replace(/\D/g, "") || null
          : null,
      ...(body.vat_status === "standard" || body.vat_status === "exempt_healthcare"
        ? { vat_status: body.vat_status }
        : {}),
      updated_at: new Date().toISOString(),
      updated_by: caller!.id,
    }, { onConflict: "staff_id" })
    .select("*")
    .single();
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, billing: data });
}
