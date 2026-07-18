"use client";

import { useCallback, useEffect, useState } from "react";
import { Rocket, Plus, Trash2, Pencil, X, Check } from "lucide-react";
import { supabase } from "@/lib/supabase";

interface Release {
  id: string;
  version: string;
  title: string;
  notes: string;
  kind: string;
  released_on: string;
}

const KIND_LABELS: Record<string, string> = {
  feature: "Nýjung",
  fix: "Lagfæring",
  security: "Öryggi",
  compliance: "Regluvarsla",
};
const KIND_CHIP: Record<string, string> = {
  feature: "bg-cyan-50 text-cyan-700",
  fix: "bg-slate-100 text-slate-600",
  security: "bg-red-50 text-red-700",
  compliance: "bg-emerald-50 text-emerald-700",
};

const EMPTY = { version: "", title: "", kind: "feature", released_on: "", notes: "" };

export default function ReleasesPage() {
  const [rows, setRows] = useState<Release[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  const [form, setForm] = useState({ ...EMPTY });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const authHeaders = async (): Promise<Record<string, string>> => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    return { "Content-Type": "application/json", Authorization: session?.access_token ? `Bearer ${session.access_token}` : "" };
  };

  const load = useCallback(async () => {
    setLoading(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      const { data: me } = await supabase.from("staff").select("role").eq("id", user.id).maybeSingle();
      setIsAdmin(me?.role === "admin");
    }
    const { data } = await supabase
      .from("releases")
      .select("id, version, title, notes, kind, released_on")
      .order("released_on", { ascending: false });
    setRows((data as Release[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  const resetForm = () => {
    setForm({ ...EMPTY });
    setEditingId(null);
    setCreating(false);
    setErr(null);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setErr(null);
    const isEdit = !!editingId;
    const res = await fetch(isEdit ? `/api/admin/releases/${editingId}` : "/api/admin/releases", {
      method: isEdit ? "PATCH" : "POST",
      headers: await authHeaders(),
      body: JSON.stringify(form),
    });
    const j = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok || !j.ok) {
      setErr(j.error || "Villa");
      return;
    }
    resetForm();
    load();
  };

  const startEdit = (r: Release) => {
    setEditingId(r.id);
    setCreating(true);
    setForm({ version: r.version, title: r.title, kind: r.kind, released_on: r.released_on, notes: r.notes });
  };

  const remove = async (id: string) => {
    if (!confirm("Eyða þessari færslu?")) return;
    const res = await fetch(`/api/admin/releases/${id}`, { method: "DELETE", headers: await authHeaders() });
    if (res.ok) load();
  };

  return (
    <div className="p-8 max-w-4xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-widest text-cyan-700 mb-1">Stjórnborð</div>
          <h1 className="text-2xl font-bold text-slate-900">Útgáfusaga</h1>
          <p className="text-sm text-slate-600 mt-1">Breytingaskrá kerfisins — birt á /breytingaskra.</p>
        </div>
        {isAdmin && !creating && (
          <button onClick={() => setCreating(true)} className="inline-flex items-center gap-2 py-2 px-3 rounded-lg bg-cyan-600 hover:bg-cyan-700 text-white text-sm font-semibold shrink-0">
            <Plus className="w-4 h-4" /> Ný færsla
          </button>
        )}
      </div>

      {creating && isAdmin && (
        <form onSubmit={submit} className="mt-6 rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="font-semibold text-slate-900 text-sm">{editingId ? "Breyta færslu" : "Ný útgáfufærsla"}</div>
            <button type="button" onClick={resetForm} className="text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <input value={form.version} onChange={(e) => setForm((f) => ({ ...f, version: e.target.value }))} placeholder="Útgáfa (t.d. 1.2.0)" required className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-cyan-200 outline-none" />
            <input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="Titill" required className="sm:col-span-2 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-cyan-200 outline-none" />
            <select value={form.kind} onChange={(e) => setForm((f) => ({ ...f, kind: e.target.value }))} className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white">
              {Object.entries(KIND_LABELS).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
            <input type="date" value={form.released_on} onChange={(e) => setForm((f) => ({ ...f, released_on: e.target.value }))} className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-cyan-200 outline-none" />
            <textarea value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} rows={4} placeholder="Nánar (markdown)…" className="sm:col-span-4 px-3 py-2 border border-slate-200 rounded-lg text-sm font-mono focus:ring-2 focus:ring-cyan-200 outline-none" />
          </div>
          <div className="mt-4 flex items-center gap-3">
            <button type="submit" disabled={busy} className="inline-flex items-center gap-2 py-2 px-4 rounded-lg bg-cyan-600 hover:bg-cyan-700 text-white font-semibold text-sm disabled:opacity-50">
              <Check className="w-4 h-4" /> {busy ? "Vista…" : "Vista"}
            </button>
            {err && <span className="text-xs text-red-600">{err}</span>}
          </div>
        </form>
      )}

      <div className="mt-6 space-y-3">
        {loading ? (
          <div className="text-sm text-slate-500">Hleð…</div>
        ) : rows.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
            <Rocket className="w-6 h-6 mx-auto mb-2 text-slate-400" />
            Engar útgáfur skráðar.
          </div>
        ) : (
          rows.map((r) => (
            <div key={r.id} className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded ${KIND_CHIP[r.kind]}`}>{KIND_LABELS[r.kind]}</span>
                    <span className="font-mono text-xs text-slate-500">v{r.version}</span>
                    <span className="text-xs text-slate-400">{new Date(r.released_on).toLocaleDateString("is-IS")}</span>
                  </div>
                  <div className="font-semibold text-slate-900 mt-1">{r.title}</div>
                  {r.notes && <p className="text-sm text-slate-600 mt-1 whitespace-pre-wrap">{r.notes}</p>}
                </div>
                {isAdmin && (
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => startEdit(r)} className="p-2 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-50"><Pencil className="w-4 h-4" /></button>
                    <button onClick={() => remove(r.id)} className="p-2 text-red-400 hover:text-red-600 rounded-lg hover:bg-red-50"><Trash2 className="w-4 h-4" /></button>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
