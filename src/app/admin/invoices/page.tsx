"use client";

// Reikningar verktaka. Nothing is "shared" here — a contractor issuing an
// invoice on their own /vaktir page puts it straight into this list, because
// both sides were always in the same database.

import { Fragment, useCallback, useEffect, useState } from "react";
import { Check, Banknote, Ban, Loader2, Receipt } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { formatIsk } from "@/lib/roster";
import {
  formatKennitala, formatBankAccount, monthLabelIs, VAT_LINE,
  type ContractorInvoice, type InvoiceStatus,
} from "@/lib/billing";

interface Row extends ContractorInvoice {
  staff?: { name: string; email: string } | null;
}

const STATUS: Record<InvoiceStatus, { label: string; cls: string }> = {
  draft: { label: "Drög", cls: "bg-slate-100 text-slate-600" },
  issued: { label: "Útgefinn", cls: "bg-amber-100 text-amber-800" },
  approved: { label: "Samþykktur", cls: "bg-sky-100 text-sky-800" },
  paid: { label: "Greiddur", cls: "bg-emerald-100 text-emerald-800" },
  void: { label: "Ógiltur", cls: "bg-slate-100 text-slate-400 line-through" },
};

/**
 * `embedded` is set when this renders inside the Starfsfólk tabs: the page then
 * drops its own heading and outer padding, which the tab already provides.
 * Visiting /admin/invoices directly still gets the full page.
 */
export default function InvoicesPage({ embedded = false }: { embedded?: boolean } = {}) {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);

  const authHeaders = async (): Promise<Record<string, string>> => {
    const { data: { session } } = await supabase.auth.getSession();
    return { Authorization: session?.access_token ? `Bearer ${session.access_token}` : "" };
  };

  const load = useCallback(async () => {
    setLoading(true);
    const r = await fetch("/api/admin/invoices", { headers: await authHeaders() });
    const j = await r.json().catch(() => ({}));
    setRows(j.ok ? j.invoices : []);
    setLoading(false);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  async function move(id: string, status: InvoiceStatus) {
    if (status === "void" && !confirm("Ógilda þennan reikning?")) return;
    setBusy(id); setErr(null);
    const r = await fetch(`/api/admin/invoices/${id}`, {
      method: "PUT",
      headers: { ...(await authHeaders()), "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    const j = await r.json().catch(() => ({}));
    setBusy(null);
    if (!j.ok) { setErr(j.error || "Mistókst"); return; }
    setRows((p) => p.map((x) => (x.id === id ? { ...x, ...j.invoice } : x)));
  }

  const outstanding = rows.filter((r) => r.status === "issued" || r.status === "approved");
  const owed = outstanding.reduce((n, r) => n + r.amount, 0);

  return (
    <div className={embedded ? "max-w-5xl" : "mx-auto max-w-5xl px-4 py-8 sm:px-6"}>
      <header className="mb-6">
        {!embedded && (
          <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900">
            <Receipt className="h-6 w-6 text-cyan-600" /> Reikningar verktaka
          </h1>
        )}
        <p className={embedded ? "text-sm text-slate-600" : "mt-1 text-sm text-slate-500"}>
          Verktakar gefa út reikninga sjálfir á sínum vaktahlekk. Upphæðin kemur úr fjölda sjúklinga
          sem þeir skráðu á vaktirnar — hún er hvergi slegin inn aftur.
        </p>
      </header>

      {outstanding.length > 0 && (
        <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <span className="text-sm text-amber-900">
            <strong>{outstanding.length}</strong> reikning{outstanding.length === 1 ? "ur" : "ar"} ógreidd
            {outstanding.length === 1 ? "ur" : "ir"} — samtals{" "}
            <strong>{formatIsk(owed)}</strong>
          </span>
        </div>
      )}

      {err && <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{err}</p>}

      {loading ? (
        <p className="text-sm text-slate-400">Hleð…</p>
      ) : rows.length === 0 ? (
        <p className="rounded-xl border border-slate-200 bg-white px-4 py-8 text-center text-sm text-slate-500">
          Enginn reikningur hefur verið gefinn út enn.
        </p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-2.5 text-left">Nr.</th>
                <th className="px-4 py-2.5 text-left">Verktaki</th>
                <th className="px-4 py-2.5 text-left">Tímabil</th>
                <th className="px-4 py-2.5 text-right">Sjúklingar</th>
                <th className="px-4 py-2.5 text-right">Upphæð</th>
                <th className="px-4 py-2.5 text-left">Staða</th>
                <th className="px-4 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <Fragment key={r.id}>
                  <tr className="border-t border-slate-100 hover:bg-slate-50/60">
                    <td className="px-4 py-2.5 font-mono text-xs text-slate-500">{r.invoice_number}</td>
                    <td className="px-4 py-2.5">
                      <button onClick={() => setOpen(open === r.id ? null : r.id)}
                        className="font-medium text-slate-900 hover:text-cyan-700">
                        {r.issuer_snapshot?.name ?? r.staff?.name ?? "—"}
                      </button>
                    </td>
                    <td className="px-4 py-2.5 text-slate-600">{monthLabelIs(r.period_year, r.period_month)}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-slate-700">{r.patients_total}</td>
                    <td className="px-4 py-2.5 text-right font-semibold tabular-nums text-slate-900">{formatIsk(r.amount)}</td>
                    <td className="px-4 py-2.5">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS[r.status].cls}`}>
                        {STATUS[r.status].label}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <div className="flex justify-end gap-1.5">
                        {r.status === "issued" && (
                          <button onClick={() => move(r.id, "approved")} disabled={busy === r.id}
                            className="inline-flex items-center gap-1 rounded-md border border-sky-300 px-2 py-1 text-xs font-medium text-sky-700 hover:bg-sky-50 disabled:opacity-40">
                            {busy === r.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />} Samþykkja
                          </button>
                        )}
                        {r.status === "approved" && (
                          <button onClick={() => move(r.id, "paid")} disabled={busy === r.id}
                            className="inline-flex items-center gap-1 rounded-md border border-emerald-300 px-2 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-50 disabled:opacity-40">
                            {busy === r.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Banknote className="h-3 w-3" />} Greitt
                          </button>
                        )}
                        {(r.status === "issued" || r.status === "approved") && (
                          <button onClick={() => move(r.id, "void")} disabled={busy === r.id}
                            title="Ógilda" aria-label="Ógilda reikning"
                            className="rounded-md border border-slate-200 px-2 py-1 text-slate-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-40">
                            <Ban className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                  {open === r.id && (
                    <tr className="border-t border-slate-100 bg-slate-50/60">
                      <td colSpan={7} className="px-4 py-4">
                        <div className="grid gap-4 sm:grid-cols-2">
                          <div className="text-xs text-slate-600">
                            <p className="mb-1 font-semibold uppercase tracking-wide text-slate-500">Útgefandi</p>
                            <p className="text-slate-900">{r.issuer_snapshot?.name}</p>
                            {r.issuer_snapshot?.kennitala && <p>kt. {formatKennitala(r.issuer_snapshot.kennitala)}</p>}
                            {r.issuer_snapshot?.bank_account && <p>reikn. {formatBankAccount(r.issuer_snapshot.bank_account)}</p>}
                            <p className="mt-1">
                              {r.issuer_snapshot?.invoice_as === "slf" ? "Greitt til slf-félags" : "Greitt til einstaklings"}
                            </p>
                            {r.issuer_snapshot?.vat_status && (
                              <p className="mt-2 text-slate-500">{VAT_LINE[r.issuer_snapshot.vat_status]}</p>
                            )}
                          </div>
                          <div className="text-xs text-slate-600">
                            <p className="mb-1 font-semibold uppercase tracking-wide text-slate-500">
                              Vaktir að baki — {r.patients_total} × {formatIsk(r.rate)}
                            </p>
                            <ul className="space-y-0.5">
                              {(r.lines ?? []).map((l) => (
                                <li key={l.shift_date} className="flex justify-between tabular-nums">
                                  <span>{l.shift_date}</span><span>{l.patients}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
