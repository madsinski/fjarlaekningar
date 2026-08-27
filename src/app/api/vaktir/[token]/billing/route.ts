// The contractor's own billing details, filled in by them.
// Token-gated (the unguessable token in the URL is the credential) — no login,
// exactly like the patient-count endpoint beside it.

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { EMPTY_BILLING, normalizeKennitala, type InvoiceAs } from "@/lib/billing";

export const runtime = "nodejs";

/** token → the staff row behind the roster doctor, or null. */
async function staffForToken(token: string) {
  if (!token || token.length < 16) return null;
  const { data } = await supabaseAdmin
    .from("roster_doctors")
    .select("id, name, staff_id")
    .eq("access_token", token)
    .maybeSingle();
  return data?.staff_id ? data : null;
}

export async function GET(_req: Request, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params;
  const doctor = await staffForToken(token);
  if (!doctor) return NextResponse.json({ ok: false, error: "Ógildur hlekkur" }, { status: 404 });

  const { data } = await supabaseAdmin
    .from("staff_billing")
    .select("*")
    .eq("staff_id", doctor.staff_id)
    .maybeSingle();

  const { data: staff } = await supabaseAdmin
    .from("staff")
    .select("name, email, phone")
    .eq("id", doctor.staff_id)
    .maybeSingle();

  return NextResponse.json({
    ok: true,
    billing: data ?? { staff_id: doctor.staff_id, ...EMPTY_BILLING },
    staff: staff ?? null,
  });
}

export async function PUT(req: Request, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params;
  const doctor = await staffForToken(token);
  if (!doctor) return NextResponse.json({ ok: false, error: "Ógildur hlekkur" }, { status: 404 });

  let body: Record<string, unknown> = {};
  try { body = await req.json(); } catch {
    return NextResponse.json({ ok: false, error: "Ógild gögn" }, { status: 400 });
  }

  const str = (v: unknown) => (typeof v === "string" ? v.trim() || null : null);
  const invoiceAs: InvoiceAs = body.invoice_as === "slf" ? "slf" : "person";

  const row = {
    staff_id: doctor.staff_id,
    kennitala: body.kennitala ? normalizeKennitala(String(body.kennitala)) || null : null,
    phone: str(body.phone),
    bank_account: body.bank_account ? String(body.bank_account).replace(/\D/g, "") || null : null,
    invoice_as: invoiceAs,
    // Company details are only meaningful while "slf" is selected; clearing them
    // on the way out stops a stale company name reappearing if it is switched
    // back on months later.
    slf_name: invoiceAs === "slf" ? str(body.slf_name) : null,
    slf_kennitala:
      invoiceAs === "slf" && body.slf_kennitala
        ? normalizeKennitala(String(body.slf_kennitala)) || null
        : null,
    updated_at: new Date().toISOString(),
    updated_by: "self",
  };

  const { data, error } = await supabaseAdmin
    .from("staff_billing")
    .upsert(row, { onConflict: "staff_id" })
    .select("*")
    .single();
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  // Email and phone live on `staff` and are shown all over the admin, so keep
  // them in step rather than letting two copies drift.
  const staffPatch: Record<string, string> = {};
  if (row.phone) staffPatch.phone = row.phone;
  if (typeof body.email === "string" && body.email.trim()) staffPatch.email = body.email.trim();
  if (Object.keys(staffPatch).length) {
    await supabaseAdmin.from("staff").update(staffPatch).eq("id", doctor.staff_id);
  }

  return NextResponse.json({ ok: true, billing: data });
}
