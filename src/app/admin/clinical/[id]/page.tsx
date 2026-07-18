"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Eye, Save, Activity } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { renderMarkdown } from "@/lib/markdown";

interface Protocol {
  id: string;
  slug: string;
  title: string;
  summary: string;
  algorithm: string;
  version: number;
  status: string;
  risk_class: string;
  updated_at: string;
}
interface Change {
  version: number;
  change_type: string;
  summary: string;
  rationale: string | null;
  changed_by_name: string | null;
  created_at: string;
}

const CHANGE_TYPES: { v: string; l: string }[] = [
  { v: "algorithm_change", l: "Breyting á reikniriti" },
  { v: "clarification", l: "Skýring" },
  { v: "correction", l: "Leiðrétting" },
  { v: "retired", l: "Afskráning" },
  { v: "reactivated", l: "Enduropnun" },
];
const CHANGE_LABEL: Record<string, string> = {
  created: "Stofnað",
  ...Object.fromEntries(CHANGE_TYPES.map((c) => [c.v, c.l])),
};
const STATUSES: { v: string; l: string }[] = [
  { v: "draft", l: "Drög" },
  { v: "active", l: "Virkt" },
  { v: "retired", l: "Afskráð" },
];

export default function ClinicalEditPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;

  const [p, setP] = useState<Protocol | null>(null);
  const [changes, setChanges] = useState<Change[]>([]);
  const [loading, setLoading] = useState(true);

  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [algorithm, setAlgorithm] = useState("");
  const [status, setStatus] = useState("draft");
  const [riskClass, setRiskClass] = useState("unclassified");
  const [preview, setPreview] = useState(false);

  // Mandatory change note for each save.
  const [changeType, setChangeType] = useState("algorithm_change");
  const [changeSummary, setChangeSummary] = useState("");
  const [rationale, setRationale] = useState("");

  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const authHeaders = async (): Promise<Record<string, string>> => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    return { "Content-Type": "application/json", Authorization: session?.access_token ? `Bearer ${session.access_token}` : "" };
  };

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/admin/clinical/${id}`, { headers: await authHeaders() });
    const j = await res.json().catch(() => ({}));
    if (j.ok) {
      const d = j.protocol as Protocol;
      setP(d);
      setTitle(d.title);
      setSummary(d.summary || "");
      setAlgorithm(d.algorithm || "");
      setStatus(d.status);
      setRiskClass(d.risk_class);
      setChanges(j.changes || []);
    }
    setLoading(false);
  }, [id]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  const save = async () => {
    if (!changeSummary.trim()) {
      setMsg({ type: "err", text: "Lýsing á breytingu er skylda (audit-skráning)." });
      return;
    }
    setBusy(true);
    setMsg(null);
    const res = await fetch(`/api/admin/clinical/${id}`, {
      method: "PATCH",
      headers: await authHeaders(),
      body: JSON.stringify({
        title,
        summary,
        algorithm,
        status,
        risk_class: riskClass,
        change_type: changeType,
        change_summary: changeSummary,
        rationale,
      }),
    });
    const j = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok || !j.ok) {
      setMsg({ type: "err", text: j.error || "Villa" });
      return;
    }
    setChangeSummary("");
    setRationale("");
    setMsg({ type: "ok", text: `Vistað sem útgáfa ${j.protocol.version}.` });
    await load();
  };

  if (loading) return <div className="p-8 text-sm text-slate-500">Hleð…</div>;
  if (!p) return <div className="p-8 text-sm text-slate-500">Reiknirit fannst ekki.</div>;

  return (
    <div className="p-8 max-w-4xl">
      <Link href="/admin/clinical" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 mb-4">
        <ArrowLeft className="w-4 h-4" /> Klínísk reiknirit
      </Link>

      <div className="flex items-center gap-3">
        <Activity className="w-6 h-6 text-cyan-600" />
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{p.title}</h1>
          <div className="text-sm text-slate-500">
            /{p.slug} · núverandi útgáfa {p.version}
          </div>
        </div>
      </div>

      {/* Meta */}
      <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Titill" className="sm:col-span-2 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-cyan-200 outline-none" />
        <input value={summary} onChange={(e) => setSummary(e.target.value)} placeholder="Stutt lýsing" className="sm:col-span-2 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-cyan-200 outline-none" />
        <label className="text-xs text-slate-600 flex items-center gap-2">
          Staða
          <select value={status} onChange={(e) => setStatus(e.target.value)} className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white">
            {STATUSES.map((s) => <option key={s.v} value={s.v}>{s.l}</option>)}
          </select>
        </label>
        <label className="text-xs text-slate-600 flex items-center gap-2">
          Áhættuflokkur
          <select value={riskClass} onChange={(e) => setRiskClass(e.target.value)} className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white">
            {["unclassified", "I", "IIa", "IIb", "III"].map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        </label>
      </div>

      {/* Algorithm */}
      <div className="mt-4 flex items-center justify-between">
        <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Reiknirit (markdown)</div>
        <button onClick={() => setPreview((v) => !v)} className="inline-flex items-center gap-1 text-xs text-slate-600 hover:text-slate-900">
          <Eye className="w-3.5 h-3.5" /> {preview ? "Breyta" : "Forskoða"}
        </button>
      </div>
      {preview ? (
        <div className="mt-2 rounded-lg border border-slate-200 bg-white p-6 min-h-[240px]">{renderMarkdown(algorithm)}</div>
      ) : (
        <textarea value={algorithm} onChange={(e) => setAlgorithm(e.target.value)} rows={16} placeholder={"# Reiknirit\n\n1. Upplýsingasöfnun…\n2. Mat…\n3. Meðferð / tilvísun…"} className="mt-2 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-mono leading-relaxed focus:ring-2 focus:ring-cyan-200 outline-none" />
      )}

      {/* Mandatory change note */}
      <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4">
        <div className="text-sm font-semibold text-amber-900 mb-2">Skrá breytingu (skylda)</div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <select value={changeType} onChange={(e) => setChangeType(e.target.value)} className="px-3 py-2 border border-amber-200 rounded-lg text-sm bg-white">
            {CHANGE_TYPES.map((c) => <option key={c.v} value={c.v}>{c.l}</option>)}
          </select>
          <input value={changeSummary} onChange={(e) => setChangeSummary(e.target.value)} placeholder="Hverju var breytt?" className="sm:col-span-2 px-3 py-2 border border-amber-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-amber-200 outline-none" />
          <input value={rationale} onChange={(e) => setRationale(e.target.value)} placeholder="Rökstuðningur (af hverju) — valfrjálst" className="sm:col-span-3 px-3 py-2 border border-amber-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-amber-200 outline-none" />
        </div>
        <div className="mt-3 flex items-center gap-3">
          <button onClick={save} disabled={busy} className="inline-flex items-center gap-2 py-2 px-4 rounded-lg bg-cyan-600 hover:bg-cyan-700 text-white text-sm font-semibold disabled:opacity-50">
            <Save className="w-4 h-4" /> Vista nýja útgáfu
          </button>
          {msg && <span className={`text-xs ${msg.type === "ok" ? "text-emerald-700" : "text-red-600"}`}>{msg.text}</span>}
        </div>
      </div>

      {/* Change log */}
      <div className="mt-8">
        <h2 className="text-sm font-semibold text-slate-900 mb-3">Breytingasaga</h2>
        <div className="rounded-xl border border-slate-200 bg-white divide-y divide-slate-100">
          {changes.length === 0 ? (
            <div className="p-4 text-sm text-slate-500">Engin saga.</div>
          ) : (
            changes.map((c) => (
              <div key={c.version} className="p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-slate-400">v{c.version}</span>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">{CHANGE_LABEL[c.change_type] || c.change_type}</span>
                  </div>
                  <span className="text-xs text-slate-400">
                    {c.changed_by_name || "—"} · {new Date(c.created_at).toLocaleString("is-IS")}
                  </span>
                </div>
                <div className="text-sm text-slate-800 mt-1.5">{c.summary}</div>
                {c.rationale && <div className="text-xs text-slate-500 mt-0.5">Rökstuðningur: {c.rationale}</div>}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
