"use client";

// The contractor's own details and their monthly invoice, on the same
// token-gated page they already use to record patients.
//
// The invoice is DERIVED from the shifts they recorded — there is no field here
// for "how many patients this month". Entering that twice would guarantee two
// numbers that disagree. A wrong figure is corrected on the shift itself.

import { useCallback, useEffect, useState } from "react";
import { Building2, User, FileText, Check, TriangleAlert, Loader2 } from "lucide-react";
import {
  formatKennitala, formatBankAccount, isPlausibleKennitala, monthLabelIs,
  VAT_LINE, type InvoiceAs, type StaffBilling, type ContractorInvoice, type InvoiceLine,
} from "@/lib/billing";
import { formatIsk } from "@/lib/roster";

type Derived = { lines: InvoiceLine[]; patients_total: number; amount: number };

const input =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100";
const label = "block text-xs font-semibold text-slate-600 mb-1";

interface HistoryRow {
  id: string;
  invoice_number: string | null;
  period_year: number;
  period_month: number;
  patients_total: number;
  amount: number;
  status: string;
}

export default function DoctorBilling({ token, doctorName }: { token: string; doctorName: string }) {
  const [billing, setBilling] = useState<StaffBilling | null>(null);
  const [email, setEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [period, setPeriod] = useState<{ year: number; month: number } | null>(null);
  const [derived, setDerived] = useState<Derived | null>(null);
  const [invoice, setInvoice] = useState<ContractorInvoice | null>(null);
  const [missing, setMissing] = useState<string[]>([]);
  const [rate, setRate] = useState(0);
  const [currency, setCurrency] = useState("kr.");
  const [party, setParty] = useState<{ name: string; kennitala: string | null } | null>(null);
  const [issuing, setIssuing] = useState(false);
  const [periods, setPeriods] = useState<{ year: number; month: number; patients: number; invoiced: boolean }[]>([]);
  const [history, setHistory] = useState<HistoryRow[]>([]);

  const loadInvoice = useCallback(async (y?: number, m?: number) => {
    const qs = y && m ? `?year=${y}&month=${m}` : "";
    const r = await fetch(`/api/vaktir/${token}/invoice${qs}`);
    const j = await r.json().catch(() => ({}));
    if (!j.ok) return;
    setPeriod({ year: j.year, month: j.month });
    setDerived(j.derived);
    setInvoice(j.invoice);
    setMissing(j.missing ?? []);
    setRate(j.rate ?? 0);
    setCurrency(j.currency ?? "kr.");
    setParty(j.party ?? null);
    setBilling((b) => b ?? j.billing);
    setPeriods(j.periods ?? []);
    setHistory(j.history ?? []);
  }, [token]);

  useEffect(() => {
    (async () => {
      const r = await fetch(`/api/vaktir/${token}/billing`);
      const j = await r.json().catch(() => ({}));
      if (j.ok) {
        setBilling(j.billing);
        setEmail(j.staff?.email ?? "");
      }
      await loadInvoice();
    })();
  }, [token, loadInvoice]);

  const set = (patch: Partial<StaffBilling>) =>
    setBilling((b) => (b ? { ...b, ...patch } : b));

  async function save() {
    if (!billing) return;
    setSaving(true); setErr(null);
    const r = await fetch(`/api/vaktir/${token}/billing`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...billing, email }),
    });
    const j = await r.json().catch(() => ({}));
    setSaving(false);
    if (!j.ok) { setErr(j.error || "Ekki tókst að vista"); return; }
    setBilling(j.billing);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
    await loadInvoice(period?.year, period?.month);
  }

  async function issue() {
    if (!period) return;
    setIssuing(true); setErr(null);
    const r = await fetch(`/api/vaktir/${token}/invoice`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(period),
    });
    const j = await r.json().catch(() => ({}));
    setIssuing(false);
    if (!j.ok) { setErr(j.error || "Ekki tókst að gefa út"); return; }
    setInvoice(j.invoice);
    // Re-read so the period list and the history below pick the new invoice up.
    // Without this it exists but shows nowhere until the page is reloaded.
    await loadInvoice(period.year, period.month);
  }

  if (!billing) {
    return (
      <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-400">
        Hleð…
      </div>
    );
  }

  const isSlf = billing.invoice_as === "slf";
  const ktWarn = !!billing.kennitala && !isPlausibleKennitala(billing.kennitala);
  const slfKtWarn = isSlf && !!billing.slf_kennitala && !isPlausibleKennitala(billing.slf_kennitala);

  return (
    <>
      {/* ── Mínar upplýsingar ─────────────────────────────────────────── */}
      <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
        <h2 className="text-lg font-bold text-slate-900">Mínar upplýsingar</h2>
        <p className="mt-1 text-sm text-slate-500">
          Þessar upplýsingar fara á reikninginn þinn og í samninginn. Fylltu þær út einu sinni.
        </p>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <div>
            <label className={label} htmlFor="b-email">Netfang</label>
            <input id="b-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={input} />
          </div>
          <div>
            <label className={label} htmlFor="b-phone">Símanúmer</label>
            <input id="b-phone" value={billing.phone ?? ""} onChange={(e) => set({ phone: e.target.value })} className={input} />
          </div>
          <div>
            <label className={label} htmlFor="b-kt">Kennitala</label>
            <input id="b-kt" inputMode="numeric" value={formatKennitala(billing.kennitala)}
              onChange={(e) => set({ kennitala: e.target.value })} className={input} placeholder="000000-0000" />
            {ktWarn && (
              <p className="mt-1 flex items-center gap-1 text-xs text-amber-700">
                <TriangleAlert className="h-3.5 w-3.5" /> Kennitalan lítur ekki út fyrir að vera gild — athugaðu hana.
              </p>
            )}
          </div>
          <div>
            <label className={label} htmlFor="b-bank">
              Reikningsnúmer{isSlf ? " (persónulegt)" : ""}
            </label>
            <input id="b-bank" inputMode="numeric" value={formatBankAccount(billing.bank_account)}
              onChange={(e) => set({ bank_account: e.target.value })} className={input} placeholder="0000-00-000000" />
          </div>
        </div>

        {/* Who gets paid decides who the contract is with, so it is a choice,
            not a checkbox tucked at the end. */}
        <fieldset className="mt-6">
          <legend className={label}>Hver tekur við greiðslunni?</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {([
              ["person", "Ég sjálf/ur", "Greitt á mína kennitölu.", User],
              ["slf", "Slf-félagið mitt", "Félagið er verktaki og gefur út reikninginn.", Building2],
            ] as [InvoiceAs, string, string, typeof User][]).map(([v, title, hint, Icon]) => (
              <button key={v} type="button" onClick={() => set({ invoice_as: v })}
                aria-pressed={billing.invoice_as === v}
                className={`flex items-start gap-3 rounded-xl border p-3 text-left transition-colors ${
                  billing.invoice_as === v
                    ? "border-cyan-500 bg-cyan-50"
                    : "border-slate-200 bg-white hover:border-cyan-300"
                }`}>
                <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${billing.invoice_as === v ? "text-cyan-600" : "text-slate-400"}`} />
                <span>
                  <span className="block text-sm font-semibold text-slate-900">{title}</span>
                  <span className="block text-xs text-slate-500">{hint}</span>
                </span>
              </button>
            ))}
          </div>
        </fieldset>

        {isSlf && (
          <div className="mt-4 grid gap-4 rounded-xl bg-slate-50 p-4 sm:grid-cols-2">
            <div>
              <label className={label} htmlFor="b-slf">Nafn félags</label>
              <input id="b-slf" value={billing.slf_name ?? ""} onChange={(e) => set({ slf_name: e.target.value })} className={input} />
            </div>
            <div>
              <label className={label} htmlFor="b-slfkt">Kennitala félags</label>
              <input id="b-slfkt" inputMode="numeric" value={formatKennitala(billing.slf_kennitala)}
                onChange={(e) => set({ slf_kennitala: e.target.value })} className={input} placeholder="000000-0000" />
              {slfKtWarn && (
                <p className="mt-1 flex items-center gap-1 text-xs text-amber-700">
                  <TriangleAlert className="h-3.5 w-3.5" /> Athugaðu kennitöluna.
                </p>
              )}
            </div>
            <div className="sm:col-span-2">
              <label className={label} htmlFor="b-slfbank">Reikningsnúmer félags</label>
              <input id="b-slfbank" inputMode="numeric" value={formatBankAccount(billing.slf_bank_account)}
                onChange={(e) => set({ slf_bank_account: e.target.value })} className={input} placeholder="0000-00-000000" />
              <p className="mt-1 text-xs text-slate-500">
                Greiðslan fer á reikning félagsins, ekki þinn eigin.
              </p>
            </div>
          </div>
        )}

        <div className="mt-5 flex items-center gap-3">
          <button onClick={save} disabled={saving}
            className="inline-flex items-center gap-2 rounded-lg bg-cyan-600 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-700 disabled:opacity-50">
            {saving && <Loader2 className="h-4 w-4 animate-spin" />} Vista
          </button>
          {saved && <span className="flex items-center gap-1 text-sm text-emerald-600"><Check className="h-4 w-4" /> Vistað</span>}
          {err && <span className="text-sm text-red-600">{err}</span>}
        </div>
      </section>

      {/* ── Reikningur ────────────────────────────────────────────────── */}
      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-lg font-bold text-slate-900">Reikningur</h2>
          {/* Every month with work in it, reachable. The panel used to show one
              fixed period and nothing else, so a month with no shifts in it read
              as a broken page rather than an empty one. */}
          {periods.length > 1 && period ? (
            <select
              value={`${period.year}-${period.month}`}
              onChange={(e) => {
                const [y, m] = e.target.value.split("-").map(Number);
                void loadInvoice(y, m);
              }}
              className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-sm font-medium text-slate-700"
            >
              {periods.map((p) => (
                <option key={`${p.year}-${p.month}`} value={`${p.year}-${p.month}`}>
                  {monthLabelIs(p.year, p.month)}{p.invoiced ? " · gefinn út" : ""}
                </option>
              ))}
            </select>
          ) : period ? (
            <span className="text-sm font-medium text-slate-500">{monthLabelIs(period.year, period.month)}</span>
          ) : null}
        </div>
        <p className="mt-1 text-sm text-slate-500">
          Talan kemur úr vöktunum þínum hér að ofan. Sé hún ekki rétt, leiðréttu fjölda sjúklinga á
          vaktinni sjálfri — ekki hér.
        </p>

        {derived && derived.lines.length === 0 && (
          <div className="mt-4 rounded-lg bg-slate-50 px-4 py-3 text-sm text-slate-500">
            <p>Engir skráðir sjúklingar í þessum mánuði.</p>
            <p className="mt-1 text-xs">
              {periods.length > 0
                ? "Veldu annan mánuð hér að ofan, eða skráðu fjölda sjúklinga á vaktirnar í „Vaktir“."
                : "Skráðu fjölda sjúklinga á vaktirnar þínar í „Vaktir“ — reikningurinn reiknast af þeim."}
            </p>
          </div>
        )}

        {derived && derived.lines.length > 0 && (
          <>
            <div className="mt-4 overflow-hidden rounded-xl border border-slate-200">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr><th className="px-3 py-2 text-left">Vakt</th><th className="px-3 py-2 text-right">Sjúklingar</th></tr>
                </thead>
                <tbody>
                  {(invoice?.lines ?? derived.lines).map((l) => (
                    <tr key={l.shift_date} className="border-t border-slate-100">
                      <td className="px-3 py-2 text-slate-700">{l.shift_date}</td>
                      <td className="px-3 py-2 text-right tabular-nums text-slate-900">{l.patients}</td>
                    </tr>
                  ))}
                  <tr className="border-t-2 border-slate-200 bg-slate-50 font-semibold">
                    <td className="px-3 py-2 text-slate-900">
                      Samtals × {formatIsk(invoice?.rate ?? rate, currency)}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums text-slate-900">
                      {invoice?.patients_total ?? derived.patients_total}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <p className="mt-4 text-2xl font-bold text-slate-900">
              {formatIsk(invoice?.amount ?? derived.amount, currency)}
            </p>
            <p className="mt-1 text-xs text-slate-500">{VAT_LINE[billing.vat_status]}</p>
            {party && (
              <p className="mt-2 text-xs text-slate-500">
                Útgefandi: <span className="font-medium text-slate-700">{party.name}</span>
                {party.kennitala ? `, kt. ${formatKennitala(party.kennitala)}` : ""}
              </p>
            )}

            {invoice && invoice.status !== "draft" ? (
              <div className="mt-5 flex flex-wrap items-center gap-3 rounded-xl bg-emerald-50 px-4 py-3">
                <Check className="h-4 w-4 text-emerald-600" />
                <span className="text-sm text-emerald-900">
                  Reikningur <strong>{invoice.invoice_number}</strong> hefur verið gefinn út og er kominn
                  til Fjarlækninga.
                </span>
                <span className="ml-auto text-xs font-semibold uppercase tracking-wide text-emerald-700">
                  {invoice.status === "issued" ? "Útgefinn"
                    : invoice.status === "approved" ? "Samþykktur"
                    : invoice.status === "paid" ? "Greiddur" : invoice.status}
                </span>
              </div>
            ) : (
              <div className="mt-5">
                {missing.length > 0 && (
                  <p className="mb-3 flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
                    <TriangleAlert className="h-4 w-4 shrink-0" />
                    Fylltu fyrst út: {missing.join(", ")}.
                  </p>
                )}
                <button onClick={issue} disabled={issuing || missing.length > 0}
                  className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-40">
                  {issuing ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
                  Gefa út reikning
                </button>
                <p className="mt-2 text-xs text-slate-500">
                  Þú ert útgefandi reikningsins. Við útgáfu fær hann númer úr þinni röð og upphæðin
                  frýs — síðari breytingar á taxta hreyfa hann ekki.
                </p>
              </div>
            )}
          </>
        )}
        {err && <p className="mt-3 text-sm text-red-600">{err}</p>}

        {history.length > 0 && (
          <div className="mt-6 border-t border-slate-100 pt-4">
            <h3 className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Fyrri reikningar</h3>
            <ul className="mt-2 space-y-1">
              {history.map((h) => (
                <li key={h.id} className={`flex items-center justify-between gap-3 text-sm ${h.status === "void" ? "opacity-50" : ""}`}>
                  <button
                    onClick={() => void loadInvoice(h.period_year, h.period_month)}
                    className={`truncate text-left hover:text-cyan-700 ${h.status === "void" ? "text-slate-500 line-through" : "text-slate-700"}`}
                  >
                    <span className="font-mono text-xs text-slate-400">{h.invoice_number ?? "—"}</span>{" "}
                    {monthLabelIs(h.period_year, h.period_month)}
                  </button>
                  <span className="shrink-0 tabular-nums text-slate-600">{formatIsk(h.amount, currency)}</span>
                  <span className="w-20 shrink-0 text-right text-[11px] uppercase tracking-wide text-slate-400">
                    {h.status === "issued" ? "Útgefinn"
                      : h.status === "approved" ? "Samþykktur"
                      : h.status === "paid" ? "Greiddur"
                      : h.status === "void" ? "Ógiltur" : h.status}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>
      <p className="sr-only">{doctorName}</p>
    </>
  );
}
