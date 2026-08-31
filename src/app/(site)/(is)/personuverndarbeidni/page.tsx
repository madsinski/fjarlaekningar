"use client";

import { useState } from "react";

// Public GDPR data-subject request form. Anyone may exercise their rights
// under the GDPR / lög nr. 90/2018 regarding personal data held by
// Fjarlækningar ehf. Submissions land in the admin triage queue.

const REQUEST_TYPES: { value: string; label: string }[] = [
  { value: "access", label: "Aðgangur að gögnum (afrit)" },
  { value: "rectification", label: "Leiðrétting rangra gagna" },
  { value: "erasure", label: "Eyðing gagna („réttur til að gleymast“)" },
  { value: "restriction", label: "Takmörkun vinnslu" },
  { value: "portability", label: "Flutningur gagna" },
  { value: "objection", label: "Andmæli gegn vinnslu" },
  { value: "other", label: "Annað" },
];

export default function DataRequestPage() {
  const [requestType, setRequestType] = useState("access");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [details, setDetails] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setErr(null);
    const res = await fetch("/api/data-requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ request_type: requestType, full_name: fullName, email, details }),
    });
    const j = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok || !j.ok) {
      setErr(j.error || "Ekki tókst að senda beiðni. Reyndu aftur.");
      return;
    }
    setDone(true);
  };

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <h1 className="text-3xl font-bold text-slate-900">Persónuverndarbeiðni</h1>
      <p className="text-slate-600 mt-3 mb-8 leading-relaxed">
        Hér getur þú nýtt réttindi þín samkvæmt persónuverndarlögum (lög nr.
        90/2018) og GDPR varðandi persónuupplýsingar sem Fjarlækningar ehf.
        vinnur. Við svörum beiðnum eins fljótt og auðið er og eigi síðar en
        innan eins mánaðar.
      </p>

      {done ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-6">
          <div className="font-semibold text-emerald-800">Beiðni móttekin</div>
          <p className="text-sm text-emerald-700 mt-1">
            Takk fyrir. Við höfum móttekið beiðnina og höfum samband við þig á
            uppgefið netfang.
          </p>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1">Tegund beiðni</label>
            <select
              value={requestType}
              onChange={(e) => setRequestType(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-cyan-200 outline-none"
            >
              {REQUEST_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1">Fullt nafn</label>
              <input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-cyan-200 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1">Netfang</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-cyan-200 outline-none"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1">Nánari lýsing</label>
            <textarea
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              rows={5}
              placeholder="Lýstu beiðninni þinni — t.d. hvaða gögn málið varðar."
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-cyan-200 outline-none"
            />
          </div>

          {err && <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">{err}</div>}

          <button
            type="submit"
            disabled={busy || !fullName || !email}
            className="py-2.5 px-5 rounded-lg bg-cyan-600 hover:bg-cyan-700 text-white font-semibold text-sm disabled:opacity-50"
          >
            {busy ? "Sendi…" : "Senda beiðni"}
          </button>
        </form>
      )}
    </div>
  );
}
