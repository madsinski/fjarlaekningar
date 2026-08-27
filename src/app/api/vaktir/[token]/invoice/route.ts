// The contractor's monthly invoice.
//
// GET  — derives the month from the shifts they already recorded. Nothing is
//        entered here; the number comes from roster_shifts.patients_seen.
// POST — issues it. Only the contractor can issue: they are the issuer, the
//        number comes from THEIR sequence, and the rate and their own details
//        are copied onto the invoice so it stops tracking later changes.

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { monthRange } from "@/lib/roster";
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
  const url = new URL(req.url);
  const asked = url.searchParams.get("year") && url.searchParams.get("month");

  // Every month this doctor has something to invoice for, plus every month they
  // have already invoiced. Without this the panel could only ever show one
  // period, and if that period happened to be empty it looked broken.
  const [{ data: recorded }, { data: allInvoices }] = await Promise.all([
    supabaseAdmin
      .from("roster_shifts")
      .select("shift_date, patients_seen")
      .eq("doctor_id", c.doctor.id)
      .gt("patients_seen", 0)
      .order("shift_date", { ascending: false }),
    supabaseAdmin
      .from("contractor_invoices")
      .select("id, invoice_number, period_year, period_month, patients_total, amount, status, issued_at")
      .eq("staff_id", c.doctor.staff_id)
      .order("period_year", { ascending: false })
      .order("period_month", { ascending: false }),
  ]);

  const byPeriod = new Map<string, { year: number; month: number; patients: number; invoiced: boolean }>();
  for (const r of recorded ?? []) {
    const key = (r.shift_date as string).slice(0, 7);
    const [y, m] = key.split("-").map(Number);
    const e = byPeriod.get(key) ?? { year: y, month: m, patients: 0, invoiced: false };
    e.patients += (r.patients_seen as number) || 0;
    byPeriod.set(key, e);
  }
  for (const inv of allInvoices ?? []) {
    const key = `${inv.period_year}-${String(inv.period_month).padStart(2, "0")}`;
    const e = byPeriod.get(key) ?? { year: inv.period_year, month: inv.period_month, patients: inv.patients_total, invoiced: false };
    e.invoiced = inv.status !== "void";
    byPeriod.set(key, e);
  }
  const periods = [...byPeriod.entries()].sort(([a], [b]) => b.localeCompare(a)).map(([, v]) => v);

  // Asked for a month: show that one. Otherwise the most recent month with
  // work in it — last month is the usual answer, but late in a month whose
  // predecessor was empty it is the one thing guaranteed to look broken.
  let { year, month } = period(url);
  if (!asked && periods.length) {
    year = periods[0].year;
    month = periods[0].month;
  }

  const { first, next } = monthRange(`${year}-${String(month).padStart(2, "0")}`);
  const { data: shifts, error: shiftErr } = await supabaseAdmin
    .from("roster_shifts")
    .select("shift_date, patients_seen")
    .eq("doctor_id", c.doctor.id)
    .gte("shift_date", first)
    .lt("shift_date", next);
  // Never treat a failed read as a month with no patients — that is an invoice
  // for 0 kr., or a refusal to issue one at all.
  if (shiftErr) return NextResponse.json({ ok: false, error: shiftErr.message }, { status: 500 });

  const derived = deriveInvoice(shifts ?? [], year, month, c.rate);

  // An already-issued invoice is a document, not a live query: show what was
  // issued, never the recalculated figure.
  // A period can now hold several rows: at most one live, plus any voided ones
  // kept for the record. Only the live one is the invoice.
  const { data: existing } = await supabaseAdmin
    .from("contractor_invoices")
    .select("*")
    .eq("staff_id", c.doctor.staff_id)
    .eq("period_year", year)
    .eq("period_month", month)
    .neq("status", "void")
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
    periods,
    // Voided invoices are listed as well: the number was issued, and a series
    // with a silent hole in it is worse than one with a cancellation in it.
    history: allInvoices ?? [],
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
    .neq("status", "void")
    .maybeSingle();
  // A voided invoice no longer blocks the month. Voiding is the only way to
  // correct one, and it used to lock the period out permanently.
  if (existing && existing.status !== "draft") {
    return NextResponse.json(
      { ok: false, error: `Reikningur ${existing.invoice_number ?? ""} hefur þegar verið gefinn út.` },
      { status: 409 },
    );
  }

  const { first, next } = monthRange(`${year}-${String(month).padStart(2, "0")}`);
  const { data: shifts, error: shiftErr } = await supabaseAdmin
    .from("roster_shifts")
    .select("shift_date, patients_seen")
    .eq("doctor_id", c.doctor.id)
    .gte("shift_date", first)
    .lt("shift_date", next);
  // Never treat a failed read as a month with no patients — that is an invoice
  // for 0 kr., or a refusal to issue one at all.
  if (shiftErr) return NextResponse.json({ ok: false, error: shiftErr.message }, { status: 500 });

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

  const row = {
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
  };

  // Update the draft in place if there is one, otherwise a plain insert. Not an
  // upsert: the conflict target is now a partial index, and a voided row for
  // this period must be left standing rather than overwritten.
  const { data: saved, error } = existing
    ? await supabaseAdmin.from("contractor_invoices").update(row).eq("id", existing.id).select("*").single()
    : await supabaseAdmin.from("contractor_invoices").insert(row).select("*").single();
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  // Only advance the contractor's sequence once the invoice is safely stored,
  // so a failed insert cannot burn a number and leave a gap in their series.
  await supabaseAdmin.from("staff_billing").update({ invoice_seq: seq }).eq("staff_id", c.doctor.staff_id);

  return NextResponse.json({ ok: true, invoice: saved });
}
