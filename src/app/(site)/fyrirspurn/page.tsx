"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";

// Public general-inquiry form. NON-medical only — medical erindi go through
// the Medalia patient portal (see the Hafa samband page).

export default function FyrirspurnPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setErr(null);
    const res = await fetch("/api/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, subject, message }),
    });
    const j = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok || !j.ok) {
      setErr(j.error || "Ekki tókst að senda fyrirspurn.");
      return;
    }
    setSent(true);
  };

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900">Almenn fyrirspurn</h1>
      <p className="mt-4 text-slate-600">
        Þetta eyðublað er fyrir <strong>almennar fyrirspurnir</strong> sem tengjast ekki
        læknisþjónustu. Fyrir læknisfræðileg erindi skaltu nota{" "}
        <Link href="/hafa-samband" className="text-cyan-700 underline hover:text-cyan-900">sjúklingagátt Medalia</Link>.
      </p>

      {sent ? (
        <div className="mt-8 rounded-2xl border border-emerald-200 bg-emerald-50 p-8 text-center">
          <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto mb-3" />
          <h2 className="text-lg font-semibold text-slate-900">Takk fyrir!</h2>
          <p className="text-sm text-slate-600 mt-1">Fyrirspurnin þín hefur borist. Við svörum eins fljótt og auðið er.</p>
        </div>
      ) : (
        <form onSubmit={submit} className="mt-8 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nafn" required className="px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-cyan-200 outline-none" />
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Netfang" required className="px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-cyan-200 outline-none" />
          </div>
          <input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Efni (valfrjálst)" className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-cyan-200 outline-none" />
          <textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Skilaboð" required rows={7} className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-cyan-200 outline-none" />
          {err && <p className="text-sm text-red-600">{err}</p>}
          <button type="submit" disabled={busy || !name || !email || !message} className="py-2.5 px-5 rounded-lg bg-cyan-600 hover:bg-cyan-700 text-white font-semibold text-sm disabled:opacity-50">
            {busy ? "Sendi…" : "Senda fyrirspurn"}
          </button>
        </form>
      )}
    </div>
  );
}
