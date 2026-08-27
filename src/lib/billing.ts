// Verktakagreiðslur — greiðsluupplýsingar og mánaðarlegir reikningar.
//
// Reikningur mánaðarins er AFLEIDDUR af roster_shifts.patients_seen, sem
// læknirinn skráir sjálfur eftir hverja vakt. Fjöldi sjúklinga er hvergi
// skráður aftur: tvöföld skráning byrjar strax að stangast á, og þá veit enginn
// hvor talan er rétt. Þurfi að leiðrétta tölu er það gert á vaktinni sjálfri.
//
// Sjá supabase/staff-billing-schema.sql.

export type InvoiceAs = "person" | "slf";
export type VatStatus = "exempt_healthcare" | "standard";
export type InvoiceStatus = "draft" | "issued" | "approved" | "paid" | "void";

export interface StaffBilling {
  staff_id: string;
  kennitala: string | null;
  phone: string | null;
  bank_account: string | null;
  invoice_as: InvoiceAs;
  slf_name: string | null;
  slf_kennitala: string | null;
  vat_status: VatStatus;
  invoice_seq: number;
  updated_at?: string;
  updated_by?: string | null;
}

/** One shift on an invoice, kept so the total can always be explained. */
export interface InvoiceLine {
  shift_date: string;
  patients: number;
}

export interface ContractorInvoice {
  id: string;
  staff_id: string;
  period_year: number;
  period_month: number;
  invoice_number: string | null;
  patients_total: number;
  rate: number;
  amount: number;
  issuer_snapshot: IssuerSnapshot | null;
  lines: InvoiceLine[] | null;
  status: InvoiceStatus;
  note: string;
  issued_at: string | null;
  approved_at: string | null;
  paid_at: string | null;
}

/** Who the invoice is FROM, frozen at the moment it was issued. */
export interface IssuerSnapshot {
  name: string;
  kennitala: string | null;
  bank_account: string | null;
  invoice_as: InvoiceAs;
  vat_status: VatStatus;
}

export const EMPTY_BILLING: Omit<StaffBilling, "staff_id"> = {
  kennitala: null,
  phone: null,
  bank_account: null,
  invoice_as: "person",
  slf_name: null,
  slf_kennitala: null,
  vat_status: "exempt_healthcare",
  invoice_seq: 0,
};

/**
 * The party that issues the invoice and signs the contract.
 *
 * When payment goes to an slf, that company is the counterparty — it carries
 * the kennitala on both the contract and the invoice. The doctor stays
 * personally responsible for clinical decisions either way (3. gr.); the two
 * must not be conflated.
 */
export function billingParty(
  billing: Pick<StaffBilling, "invoice_as" | "slf_name" | "slf_kennitala" | "kennitala">,
  personName: string,
): { name: string; kennitala: string | null } {
  if (billing.invoice_as === "slf" && (billing.slf_name || billing.slf_kennitala)) {
    return { name: billing.slf_name || personName, kennitala: billing.slf_kennitala ?? null };
  }
  return { name: personName, kennitala: billing.kennitala ?? null };
}

/** Fields still missing before an invoice can legally be issued. */
export function missingBillingFields(b: Partial<StaffBilling>): string[] {
  const missing: string[] = [];
  if (!b.kennitala?.trim()) missing.push("kennitala");
  if (!b.bank_account?.trim()) missing.push("reikningsnúmer");
  if (b.invoice_as === "slf") {
    if (!b.slf_name?.trim()) missing.push("nafn slf-félags");
    if (!b.slf_kennitala?.trim()) missing.push("kennitala slf-félags");
  }
  return missing;
}

/** Digits only, so "010101-2989" and "0101012989" are the same value. */
export function normalizeKennitala(v: string): string {
  return v.replace(/\D/g, "").slice(0, 10);
}

export function formatKennitala(v?: string | null): string {
  const d = (v ?? "").replace(/\D/g, "");
  return d.length === 10 ? `${d.slice(0, 6)}-${d.slice(6)}` : (v ?? "");
}

/**
 * Icelandic kennitala check digit (modulus 11 over 3-2-7-6-5-4-3-2).
 * Deliberately a warning rather than a hard block — a typo should be pointed
 * out, but a valid-but-unusual number must never stop someone being paid.
 */
export function isPlausibleKennitala(v?: string | null): boolean {
  const d = (v ?? "").replace(/\D/g, "");
  if (d.length !== 10) return false;
  const w = [3, 2, 7, 6, 5, 4, 3, 2];
  const sum = w.reduce((a, wi, i) => a + wi * Number(d[i]), 0);
  const rem = sum % 11;
  const check = rem === 0 ? 0 : 11 - rem;
  return check < 10 && check === Number(d[8]);
}

/** Icelandic bank account: 4-2-6 (banki-höfuðbók-reikningsnúmer). */
export function formatBankAccount(v?: string | null): string {
  const d = (v ?? "").replace(/\D/g, "");
  return d.length === 12 ? `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6)}` : (v ?? "");
}

/** Sum the patients the doctor recorded on their own shifts in one month. */
export function deriveInvoice(
  shifts: { shift_date: string; patients_seen: number }[],
  year: number,
  month: number,
  rate: number,
): { lines: InvoiceLine[]; patients_total: number; amount: number } {
  const prefix = `${year}-${String(month).padStart(2, "0")}`;
  const lines = shifts
    .filter((s) => s.shift_date.startsWith(prefix) && s.patients_seen > 0)
    .map((s) => ({ shift_date: s.shift_date, patients: s.patients_seen }))
    .sort((a, b) => a.shift_date.localeCompare(b.shift_date));
  const patients_total = lines.reduce((n, l) => n + l.patients, 0);
  return { lines, patients_total, amount: patients_total * rate };
}

/**
 * Invoice number, from the CONTRACTOR's own sequence.
 *
 * The contractor is the issuer, so the series belongs to them. One shared
 * Fjarlækningar series would make this self-billing, which needs a different
 * arrangement entirely.
 */
export function invoiceNumber(year: number, seq: number): string {
  return `${year}-${String(seq).padStart(4, "0")}`;
}

export const VAT_LINE: Record<VatStatus, string> = {
  exempt_healthcare:
    "Virðisaukaskattur er ekki lagður á þessa þjónustu. Heilbrigðisþjónusta er undanþegin virðisaukaskatti.",
  standard: "Virðisaukaskattur reiknast samkvæmt gildandi reglum.",
};

export function monthLabelIs(year: number, month: number): string {
  const names = [
    "janúar", "febrúar", "mars", "apríl", "maí", "júní",
    "júlí", "ágúst", "september", "október", "nóvember", "desember",
  ];
  return `${names[month - 1]} ${year}`;
}

/** Previous month, which is the one normally being invoiced. */
export function lastMonth(now = new Date()): { year: number; month: number } {
  const y = now.getFullYear();
  const m = now.getMonth(); // 0-indexed = previous month in 1-indexed terms
  return m === 0 ? { year: y - 1, month: 12 } : { year: y, month: m };
}
