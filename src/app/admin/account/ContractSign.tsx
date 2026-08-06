"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

export interface PendingContract {
  id: string;
  title: string;
  body: string;
  version: string;
}

export default function ContractSign({
  contract,
  defaultName,
  onSigned,
}: {
  contract: PendingContract;
  defaultName: string;
  onSigned: () => void;
}) {
  const [name, setName] = useState(defaultName);
  const [kennitala, setKennitala] = useState("");
  const [agree, setAgree] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const sign = async () => {
    if (!agree || !name.trim() || busy) return;
    setBusy(true);
    setErr(null);
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch(`/api/admin/account/contracts/${contract.id}/sign`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: session?.access_token ? `Bearer ${session.access_token}` : "" },
      body: JSON.stringify({ signatory_name: name, signatory_kennitala: kennitala, agree: true }),
    });
    const j = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok || !j.ok) {
      setErr(j.error || "Undirritun mistókst");
      return;
    }
    onSigned();
  };

  return (
    <div className="rounded-2xl border-2 border-amber-200 bg-amber-50/40 overflow-hidden">
      <div className="border-b border-amber-200 bg-amber-50 px-5 py-3">
        <div className="text-[11px] font-semibold uppercase tracking-wide text-amber-700">Til undirritunar</div>
        <div className="font-bold text-slate-900">{contract.title}</div>
      </div>
      <div className="p-5 space-y-4">
        <pre className="max-h-72 overflow-y-auto whitespace-pre-wrap rounded-lg border border-slate-200 bg-white px-4 py-3 font-sans text-[13px] leading-relaxed text-slate-700">{contract.body}</pre>
        <div className="grid gap-2 sm:grid-cols-2">
          <label className="text-xs text-slate-500">Fullt nafn
            <input value={name} onChange={(e) => setName(e.target.value)} className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-cyan-200" />
          </label>
          <label className="text-xs text-slate-500">Kennitala (valfrjálst)
            <input value={kennitala} onChange={(e) => setKennitala(e.target.value)} className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-cyan-200" />
          </label>
        </div>
        <label className="flex items-start gap-2 text-[13px] text-slate-700">
          <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} className="mt-0.5 accent-cyan-600" />
          <span>Ég hef lesið samninginn og samþykki hann. Rafræn undirritun er bindandi og jafngild eiginhandarundirritun, sbr. lög nr. 28/2001 um rafrænar undirskriftir.</span>
        </label>
        {err && <p className="text-sm text-red-600">{err}</p>}
        <button onClick={sign} disabled={busy || !agree || !name.trim()} className="rounded-lg bg-[var(--primary-dark)] px-6 py-2.5 text-sm font-semibold text-white hover:brightness-110 disabled:opacity-50">
          {busy ? "Undirrita…" : "Undirrita samning"}
        </button>
      </div>
    </div>
  );
}
