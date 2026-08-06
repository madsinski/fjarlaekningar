"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Upload, Download, Trash2, FileText } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { DEFAULT_CONTRACT_TITLE, DEFAULT_CONTRACT_BODY } from "@/lib/contract-template";

interface Doc {
  id: string;
  kind: string;
  title: string;
  filename: string;
  size_bytes: number | null;
  signer_name: string | null;
  signed_at: string | null;
  note: string;
  uploaded_at: string;
}

const KINDS: Record<string, string> = {
  employment_contract: "Ráðningarsamningur",
  nda: "Þagnarskyldusamningur",
  offer_letter: "Ráðningarbréf",
  other: "Annað",
};

function fmtSize(n: number | null) {
  if (!n) return "";
  return n > 1e6 ? `${(n / 1e6).toFixed(1)} MB` : `${Math.round(n / 1024)} KB`;
}

interface Contract {
  id: string;
  title: string;
  status: string;
  signatory_name: string | null;
  signed_at: string | null;
  created_at: string;
}

export default function StaffDocuments({ staffId }: { staffId: string }) {
  const [docs, setDocs] = useState<Doc[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [cTitle, setCTitle] = useState(DEFAULT_CONTRACT_TITLE);
  const [cBody, setCBody] = useState(DEFAULT_CONTRACT_BODY);
  const [cBusy, setCBusy] = useState(false);
  const [kind, setKind] = useState("employment_contract");
  const [title, setTitle] = useState("");
  const [signer, setSigner] = useState("");
  const [signedAt, setSignedAt] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const authHeaders = async (): Promise<Record<string, string>> => {
    const { data: { session } } = await supabase.auth.getSession();
    return { Authorization: session?.access_token ? `Bearer ${session.access_token}` : "" };
  };

  const load = useCallback(async () => {
    setLoading(true);
    const h = await authHeaders();
    const [dRes, cRes] = await Promise.all([
      fetch(`/api/admin/staff/${staffId}/documents`, { headers: h }),
      fetch(`/api/admin/staff/${staffId}/contracts`, { headers: h }),
    ]);
    const dj = await dRes.json().catch(() => ({}));
    const cj = await cRes.json().catch(() => ({}));
    if (dj?.ok) setDocs(dj.documents);
    if (cj?.ok) setContracts(cj.contracts);
    setLoading(false);
  }, [staffId]);

  const createContract = async () => {
    if (cBody.trim().length < 20 || cBusy) return;
    setCBusy(true);
    setErr(null);
    const res = await fetch(`/api/admin/staff/${staffId}/contracts`, {
      method: "POST",
      headers: { ...(await authHeaders()), "Content-Type": "application/json" },
      body: JSON.stringify({ title: cTitle, body: cBody }),
    });
    const j = await res.json().catch(() => ({}));
    setCBusy(false);
    if (!res.ok || !j.ok) {
      setErr(j.error || "Mistókst");
      return;
    }
    setContracts((p) => [j.contract, ...p]);
    setCTitle(DEFAULT_CONTRACT_TITLE);
    setCBody(DEFAULT_CONTRACT_BODY);
  };

  const contractAction = async (contractId: string, action: "void" | "resend") => {
    if (action === "void" && !confirm("Afturkalla samning sem bíður undirritunar?")) return;
    await fetch(`/api/admin/staff/${staffId}/contracts/${contractId}`, {
      method: "PATCH",
      headers: { ...(await authHeaders()), "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    load();
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  const upload = async () => {
    const file = fileRef.current?.files?.[0];
    if (!file) return;
    setBusy(true);
    setErr(null);
    const fd = new FormData();
    fd.set("file", file);
    fd.set("kind", kind);
    fd.set("title", title);
    fd.set("signer_name", signer);
    fd.set("signed_at", signedAt);
    const res = await fetch(`/api/admin/staff/${staffId}/documents`, { method: "POST", headers: await authHeaders(), body: fd });
    const j = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok || !j.ok) {
      setErr(j.error || "Innhleðsla mistókst");
      return;
    }
    setDocs((p) => [j.document, ...p]);
    setTitle("");
    setSigner("");
    setSignedAt("");
    if (fileRef.current) fileRef.current.value = "";
  };

  const download = async (id: string) => {
    const res = await fetch(`/api/admin/staff/${staffId}/documents/${id}`, { headers: await authHeaders() });
    const j = await res.json().catch(() => ({}));
    if (j?.ok && j.url) window.open(j.url, "_blank", "noopener");
  };

  const remove = async (id: string) => {
    if (!confirm("Eyða skjali varanlega?")) return;
    setDocs((p) => p.filter((d) => d.id !== id));
    await fetch(`/api/admin/staff/${staffId}/documents/${id}`, { method: "DELETE", headers: await authHeaders() });
  };

  const inputCls = "px-2 py-1.5 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-cyan-200";

  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 space-y-3">
      {loading ? (
        <p className="text-sm text-slate-400">Hleð…</p>
      ) : docs.length === 0 ? (
        <p className="text-sm text-slate-500">Engin skjöl skráð.</p>
      ) : (
        <ul className="divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white">
          {docs.map((d) => (
            <li key={d.id} className="flex items-center gap-3 p-2.5 text-sm">
              <FileText className="w-4 h-4 shrink-0 text-slate-400" />
              <div className="min-w-0 flex-1">
                <div className="font-medium text-slate-900 truncate">{d.title || d.filename}</div>
                <div className="text-[11px] text-slate-500">
                  {KINDS[d.kind] || d.kind}
                  {d.signed_at && ` · undirritað ${d.signed_at}`}
                  {d.signer_name && ` · ${d.signer_name}`}
                  {d.size_bytes ? ` · ${fmtSize(d.size_bytes)}` : ""}
                </div>
              </div>
              <button onClick={() => download(d.id)} title="Sækja" className="p-1.5 text-slate-400 hover:text-cyan-700"><Download className="w-4 h-4" /></button>
              <button onClick={() => remove(d.id)} title="Eyða" className="p-1.5 text-slate-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
            </li>
          ))}
        </ul>
      )}

      {/* E-sign contracts */}
      <div className="rounded-lg border border-slate-200 bg-white p-3 space-y-2">
        <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Rafræn undirritun</div>
        {contracts.length > 0 && (
          <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200">
            {contracts.map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-2 p-2 text-sm">
                <span className="truncate text-slate-800">{c.title}</span>
                <span className="flex shrink-0 items-center gap-2">
                  {c.status === "signed" ? (
                    <span className="text-xs text-emerald-700">Undirritað{c.signed_at ? ` ${c.signed_at.slice(0, 10)}` : ""}</span>
                  ) : c.status === "void" ? (
                    <>
                      <span className="text-xs text-slate-400">Ógilt</span>
                      <button onClick={() => contractAction(c.id, "resend")} className="text-xs text-cyan-700 hover:underline">Senda aftur</button>
                    </>
                  ) : (
                    <>
                      <span className="text-xs text-amber-600">Bíður undirritunar</span>
                      <button onClick={() => contractAction(c.id, "resend")} className="text-xs text-cyan-700 hover:underline">Senda aftur</button>
                      <button onClick={() => contractAction(c.id, "void")} className="text-xs text-slate-400 hover:text-red-600">Afturkalla</button>
                    </>
                  )}
                </span>
              </li>
            ))}
          </ul>
        )}
        <input value={cTitle} onChange={(e) => setCTitle(e.target.value)} placeholder="Heiti samnings" className={`${inputCls} w-full`} />
        <textarea value={cBody} onChange={(e) => setCBody(e.target.value)} rows={5} placeholder="Samningstexti — birtist starfsmanni á Mín síðu til rafrænnar undirritunar." className={`${inputCls} w-full`} />
        <button onClick={createContract} disabled={cBusy || cBody.trim().length < 20} className="inline-flex items-center gap-1.5 rounded-lg border border-cyan-600 px-3 py-1.5 text-sm font-medium text-cyan-700 hover:bg-cyan-50 disabled:opacity-50">
          {cBusy ? "Sendi…" : "Senda til undirritunar"}
        </button>
      </div>

      <div className="rounded-lg border border-dashed border-slate-300 bg-white p-3 space-y-2">
        <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Bæta við skjali (þegar undirritað)</div>
        <div className="flex flex-wrap gap-2">
          <select value={kind} onChange={(e) => setKind(e.target.value)} className={`${inputCls} bg-white`}>
            {Object.entries(KINDS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Heiti (valfrjálst)" className={`${inputCls} flex-1 min-w-40`} />
          <input value={signer} onChange={(e) => setSigner(e.target.value)} placeholder="Undirritað af" className={inputCls} />
          <label className="text-[11px] text-slate-500 flex items-center gap-1">Dags. undirritunar
            <input type="date" value={signedAt} onChange={(e) => setSignedAt(e.target.value)} className={inputCls} />
          </label>
        </div>
        <div className="flex items-center gap-2">
          <input ref={fileRef} type="file" accept=".pdf,image/*,.doc,.docx" className="text-sm" />
          <button onClick={upload} disabled={busy} className="inline-flex items-center gap-1.5 rounded-lg bg-cyan-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-cyan-700 disabled:opacity-50">
            <Upload className="w-4 h-4" /> {busy ? "Hleð upp…" : "Hlaða upp"}
          </button>
        </div>
        {err && <p className="text-xs text-red-600">{err}</p>}
      </div>
    </div>
  );
}
