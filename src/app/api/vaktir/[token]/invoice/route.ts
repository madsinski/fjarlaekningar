// The contractor's monthly invoice.
//
// GET  — derives the month from the shifts they already recorded. Nothing is
//        entered here; the number comes from roster_shifts.patients_seen.
// POST — issues it. Only the contractor can issue: they are the issuer, the
//        number comes from THEIR sequence, and the rate and their own details
//        are copied onto the invoice so it stops tracking later changes.

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import {
  deriveInvoice, invoiceNumber, missingBillingFields, billingParty, payoutAccount,
  EMPTY_BILLING, type StaffBilling, type IssuerSnapshot,
} from "@/lib/billing";

export const runtime = "nodejs";

async function ctxFor(token: string) {
  if (!token || token.length < 16) return null;
  const { data: doctor } = await supabaseAdmin
    .from("roster_doctors")
    .select("id, name, staff_id")
    .eq("access_token", token)
    .maybeSingle();
  if (!doctor?.staff_id) return null;

  const [{ data: billing }, { data: settings }, { data: staff }] = await Promise.all([
    supabaseAdmin.from("staff_billing").select("*").eq("staff_id", doctor.staff_id).maybeSingle(),
    supabaseAdmin.from("roster_settings").select("per_patient_salary, currency").eq("id", 1).maybeSingle(),
    supabaseAdmin.from("staff").select("name").eq("id", doctor.staff_id).maybeSingle(),
  ]);

  return {
    doctor,
    staffName: staff?.name ?? doctor.name,
    billing: (billing ?? { staff_id: doctor.staff_id, ...EMPTY_BILLING }) as StaffBilling,
    rate: settings?.per_patient_salary ?? 0,
    currency: settings?.currency ?? "kr.",
  };
}

function period(url: URL) {
  const now = new Date();
  // Default to LAST month — that is the one being invoiced in practice.
  const dy = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
  const dm = now.getMonth() === 0 ? 12 : now.getMonth();
  const year = Number(url.searchParams.get("year")) || dy;
  const month = Number(url.searchParams.get("month")) || dm;
  return { year, month };
}

export async function GET(req: Request, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params;
  const c = await ctxFor(token);
  if (!c) return NextResponse.json({ ok: false, error: "Ógildur hlekkur" }, { status: 404 });
  const { year, month } = period(new URL(req.url));

  const { data: shifts } = await supabaseAdmin
    .from("roster_shifts")
    .select("shift_date, patients_seen")
    .eq("doctor_id", c.doctor.id)
    .gte("shift_date", `${year}-${String(month).padStart(2, "0")}-01`)
    .lte("shift_date", `${year}-${String(month).padStart(2, "0")}-31`);

  const derived = deriveInvoice(shifts ?? [], year, month, c.rate);

  // An already-issued invoice is a document, not a live query: show what was
  // issued, never the recalculated figure.
  const { data: existing } = await supabaseAdmin
    .from("contractor_invoices")
    .select("*")
    .eq("staff_id", c.doctor.staff_id)
    .eq("period_year", year)
    .eq("period_month", month)
    .maybeSingle();

  return NextResponse.json({
    ok: true,
    year, month,
    rate: c.rate,
    currency: c.currency,
    derived,
    invoice: existing ?? null,
    billing: c.billing,
    missing: missingBillingFields(c.billing),
    party: billingParty(c.billing, c.staffName),
  });
}

export async function POST(req: Request, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params;
  const c = await ctxFor(token);
  if (!c) return NextResponse.json({ ok: false, error: "Ógildur hlekkur" }, { status: 404 });

  let body: Record<string, unknown> = {};
  try { body = await req.json(); } catch { /* period may come from the query */ }
  const url = new URL(req.url);
  const year = Number(body.year) || period(url).year;
  const month = Number(body.month) || period(url).month;

  const missing = missingBillingFields(c.billing);
  if (missing.length) {
    return NextResponse.json(
      { ok: false, error: `Fylltu fyrst út: ${missing.join(", ")}` }, { status: 400 },
    );
  }

  const { data: existing } = await supabaseAdmin
    .from("contractor_invoices")
    .select("id, status, invoice_number")
    .eq("staff_id", c.doctor.staff_id)
    .eq("period_year", year)
    .eq("period_month", month)
    .maybeSingle();
  if (existing && existing.status !== "draft") {
    return NextResponse.json(
      { ok: false, error: `Reikningur ${existing.invoice_number ?? ""} hefur þegar verið gefinn út.` },
      { status: 409 },
    );
  }

  const { data: shifts } = await supabaseAdmin
    .from("roster_shifts")
    .select("shift_date, patients_seen")
    .eq("doctor_id", c.doctor.id)
    .gte("shift_date", `${year}-${String(month).padStart(2, "0")}-01`)
    .lte("shift_date", `${year}-${String(month).padStart(2, "0")}-31`);

  const derived = deriveInvoice(shifts ?? [], year, month, c.rate);
  if (derived.patients_total <= 0) {
    return NextResponse.json({ ok: false, error: "Engir skráðir sjúklingar í þessum mánuði." }, { status: 400 });
  }

  const seq = (c.billing.invoice_seq ?? 0) + 1;
  const party = billingParty(c.billing, c.staffName);
  const snapshot: IssuerSnapshot = {
    name: party.name,
    kennitala: party.kennitala,
    bank_account: payoutAccount(c.billing),
    invoice_as: c.billing.invoice_as,
    vat_status: c.billing.vat_status,
  };

  const { data: saved, error } = await supabaseAdmin
    .from("contractor_invoices")
    .upsert({
      staff_id: c.doctor.staff_id,
      period_year: year,
      period_month: month,
      invoice_number: invoiceNumber(year, seq),
      patients_total: derived.patients_total,
      rate: c.rate,
      amount: derived.amount,
      issuer_snapshot: snapshot,
      lines: derived.lines,
      status: "issued",
      issued_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }, { onConflict: "staff_id,period_year,period_month" })
    .select("*")
    .single();
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  // Only advance the contractor's sequence once the invoice is safely stored,
  // so a failed insert cannot burn a number and leave a gap in their series.
  await supabaseAdmin.from("staff_billing").update({ invoice_seq: seq }).eq("staff_id", c.doctor.staff_id);

  return NextResponse.json({ ok: true, invoice: saved });
}
