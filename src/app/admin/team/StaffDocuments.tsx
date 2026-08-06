"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Upload, Download, Trash2, FileText } from "lucide-react";
import { supabase } from "@/lib/supabase";

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

export default function StaffDocuments({ staffId }: { staffId: string }) {
  const [docs, setDocs] = useState<Doc[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
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
    const res = await fetch(`/api/admin/staff/${staffId}/documents`, { headers: await authHeaders() });
    const j = await res.json().catch(() => ({}));
    if (j?.ok) setDocs(j.documents);
    setLoading(false);
  }, [staffId]);

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

      <div className="rounded-lg border border-dashed border-slate-300 bg-white p-3 space-y-2">
        <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Bæta við skjali</div>
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
