"use client";

// Starfsstöðvar: stofna, breyta, gera óvirka, sameina og eyða.

import { useState } from "react";
import { Building2, Check, ChevronDown, Merge, Pencil, Plus, Trash2, X } from "lucide-react";
import { supabase } from "@/lib/supabase";

export interface WorkplaceRow {
  id: string; name: string; address: string; phone: string; note: string; active: boolean;
  users: number; activeUsers: number;
}

async function api<T = Record<string, unknown>>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T & { ok: boolean; error?: string }> {
  const { data: { session } } = await supabase.auth.getSession();
  const res = await fetch(path, {
    method: init.method ?? (init.body ? "POST" : "GET"),
    headers: { "Content-Type": "application/json", ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}) },
    body: init.body ? JSON.stringify(init.body) : undefined,
    cache: "no-store",
  });
  return res.json().catch(() => ({ ok: false, error: `Villa (${res.status})` }));
}

const inputCls = "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100";
const btn = "inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold disabled:opacity-40";

type Draft = { name: string; address: string; phone: string; note: string };
const EMPTY: Draft = { name: "", address: "", phone: "", note: "" };

export default function Workplaces({ places, unlinked, reload }: { places: WorkplaceRow[] | null; unlinked: string[]; reload: () => Promise<void> }) {
  const [adding, setAdding] = useState<Draft | null>(null);
  const [editing, setEditing] = useState<{ id: string; draft: Draft } | null>(null);
  const [merging, setMerging] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [showInactive, setShowInactive] = useState(false);

  const run = async (key: string, fn: () => Promise<{ ok: boolean; error?: string }>, okText: string) => {
    setBusy(key); setMsg(null);
    const r = await fn();
    setBusy(null);
    if (!r.ok) { setMsg({ ok: false, text: r.error ?? "Mistókst" }); return false; }
    setMsg({ ok: true, text: okText });
    await reload();
    return true;
  };

  const create = async (d: Draft) => {
    if (await run("new", () => api("/api/admin/vinnustod/workplaces", { body: d }), `Starfsstöðin „${d.name}“ stofnuð.`)) setAdding(null);
  };
  const save = async (id: string, d: Draft) => {
    if (await run(id, () => api(`/api/admin/vinnustod/workplaces/${id}`, { method: "PATCH", body: d }), "Vistað.")) setEditing(null);
  };
  const toggle = (p: WorkplaceRow) =>
    run(p.id, () => api(`/api/admin/vinnustod/workplaces/${p.id}`, { method: "PATCH", body: { active: !p.active } }), p.active ? `„${p.name}“ er óvirk og birtist ekki í nýskráningu.` : `„${p.name}“ er virk.`);
  const merge = async (p: WorkplaceRow, targetId: string) => {
    const target = places?.find((x) => x.id === targetId);
    if (!target || !confirm(`Færa ${p.users} notend${p.users === 1 ? "a" : "ur"} af „${p.name}“ á „${target.name}“ og eyða „${p.name}“?`)) return;
    if (await run(p.id, () => api(`/api/admin/vinnustod/workplaces/${p.id}`, { method: "PATCH", body: { mergeInto: targetId } }), `„${p.name}“ sameinuð „${target.name}“.`)) setMerging(null);
  };
  const remove = (p: WorkplaceRow) => {
    if (!confirm(`Eyða starfsstöðinni „${p.name}“?`)) return;
    void run(p.id, () => api(`/api/admin/vinnustod/workplaces/${p.id}`, { method: "DELETE" }), `„${p.name}“ eytt.`);
  };

  const shown = (places ?? []).filter((p) => showInactive || p.active);
  const inactiveCount = (places ?? []).filter((p) => !p.active).length;

  return (
    <section aria-labelledby="wp-h" className="rounded-2xl border border-slate-200 bg-white">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 p-4">
        <h2 id="wp-h" className="flex items-center gap-2 font-bold"><Building2 className="h-4 w-4 text-cyan-700" /> Starfsstöðvar</h2>
        {!adding && (
          <button className={`${btn} bg-cyan-700 text-white hover:bg-cyan-800`} onClick={() => { setAdding({ ...EMPTY }); setMsg(null); }}>
            <Plus className="h-4 w-4" /> Ný starfsstöð
          </button>
        )}
      </div>

      {adding && (
        <div className="border-b border-slate-100 bg-cyan-50/50 p-4">
          <PlaceForm draft={adding} onChange={setAdding} busy={busy === "new"} submitLabel="Stofna" onSubmit={() => create(adding)} onCancel={() => setAdding(null)} />
        </div>
      )}

      {msg && <p className={`mx-4 mt-3 rounded-lg p-2.5 text-sm ${msg.ok ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-700"}`}>{msg.text}</p>}

      {unlinked.length > 0 && (
        <div className="mx-4 mt-3 rounded-lg bg-amber-50 p-3 text-xs text-amber-900">
          <b>Vinnustaðir úr nýskráningu sem eru ekki á listanum:</b>
          <ul className="mt-1 flex flex-wrap gap-1.5">
            {unlinked.map((u) => (
              <li key={u}>
                <button type="button" className="rounded-full bg-white px-2 py-0.5 font-semibold ring-1 ring-amber-300 hover:bg-amber-100"
                  onClick={() => { setAdding({ ...EMPTY, name: u }); setMsg(null); }} title="Stofna starfsstöð með þessu nafni — notendurnir tengjast henni">
                  + {u}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {places === null ? <div className="m-4 h-16 animate-pulse rounded-lg bg-slate-100" /> : (
        <ul className="divide-y divide-slate-100">
          {shown.length === 0 && <li className="p-4 text-sm text-slate-500">Engar starfsstöðvar enn.</li>}
          {shown.map((p) => (
            <li key={p.id} className={`p-4 ${p.active ? "" : "bg-slate-50"}`}>
              {editing?.id === p.id ? (
                <PlaceForm draft={editing.draft} onChange={(d) => setEditing({ id: p.id, draft: d })} busy={busy === p.id}
                  submitLabel="Vista" onSubmit={() => save(p.id, editing.draft)} onCancel={() => setEditing(null)} />
              ) : (
                <>
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-slate-900">{p.name}</span>
                        {!p.active && <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-bold uppercase text-slate-600">Óvirk</span>}
                      </div>
                      <div className="text-xs text-slate-500">
                        {p.users === 0 ? "Engir notendur" : `${p.activeUsers} virk${p.activeUsers === 1 ? "ur" : "ir"} notand${p.activeUsers === 1 ? "i" : "ur"}${p.users > p.activeUsers ? ` · ${p.users - p.activeUsers} óvirk${p.users - p.activeUsers === 1 ? "ur" : "ir"}` : ""}`}
                        {p.address ? ` · ${p.address}` : ""}{p.phone ? ` · ${p.phone}` : ""}
                      </div>
                      {p.note && <div className="mt-0.5 text-xs text-slate-600">{p.note}</div>}
                    </div>
                    <div className="flex flex-wrap gap-1">
                      <IconBtn label="Breyta" onClick={() => { setEditing({ id: p.id, draft: { name: p.name, address: p.address, phone: p.phone, note: p.note } }); setMsg(null); }}><Pencil className="h-3.5 w-3.5" /></IconBtn>
                      <IconBtn label={p.active ? "Gera óvirka" : "Gera virka"} onClick={() => toggle(p)} disabled={busy === p.id}>
                        {p.active ? <X className="h-3.5 w-3.5" /> : <Check className="h-3.5 w-3.5" />}
                      </IconBtn>
                      {(places?.length ?? 0) > 1 && (
                        <IconBtn label="Sameina annarri stöð" onClick={() => setMerging(merging === p.id ? null : p.id)}><Merge className="h-3.5 w-3.5" /></IconBtn>
                      )}
                      <IconBtn label={p.users ? "Ekki hægt að eyða — notendur tengdir" : "Eyða"} onClick={() => remove(p)} disabled={busy === p.id || p.users > 0} danger>
                        <Trash2 className="h-3.5 w-3.5" />
                      </IconBtn>
                    </div>
                  </div>
                  {merging === p.id && (
                    <div className="mt-2 flex flex-wrap items-center gap-2 rounded-lg bg-slate-50 p-2 text-xs">
                      <span className="font-semibold text-slate-700">Sameina við:</span>
                      <select className={`${inputCls} w-auto py-1 text-xs`} defaultValue="" onChange={(e) => e.target.value && merge(p, e.target.value)}>
                        <option value="" disabled>Veldu stöð…</option>
                        {(places ?? []).filter((x) => x.id !== p.id).map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
                      </select>
                      <span className="text-slate-500">Notendur færast þangað og þessari stöð er eytt.</span>
                    </div>
                  )}
                </>
              )}
            </li>
          ))}
        </ul>
      )}
      {inactiveCount > 0 && (
        <button type="button" onClick={() => setShowInactive((v) => !v)} className="flex w-full items-center justify-center gap-1 border-t border-slate-100 p-2 text-xs font-semibold text-slate-600 hover:bg-slate-50">
          <ChevronDown className={`h-3.5 w-3.5 transition ${showInactive ? "rotate-180" : ""}`} /> {showInactive ? "Fela óvirkar" : `Sýna óvirkar (${inactiveCount})`}
        </button>
      )}
    </section>
  );
}

function IconBtn({ label, onClick, disabled, danger, children }: { label: string; onClick: () => void; disabled?: boolean; danger?: boolean; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} title={label} aria-label={label}
      className={`rounded-lg p-2 ring-1 disabled:opacity-30 ${danger ? "text-red-700 ring-red-200 hover:bg-red-50" : "text-slate-600 ring-slate-200 hover:bg-slate-50"}`}>
      {children}
    </button>
  );
}

function PlaceForm({ draft, onChange, onSubmit, onCancel, busy, submitLabel }: {
  draft: Draft; onChange: (d: Draft) => void; onSubmit: () => void; onCancel: () => void; busy: boolean; submitLabel: string;
}) {
  return (
    <form className="space-y-2" onSubmit={(e) => { e.preventDefault(); onSubmit(); }}>
      <label className="block text-xs font-semibold text-slate-600">Nafn
        <input autoFocus required className={`${inputCls} mt-1`} value={draft.name} onChange={(e) => onChange({ ...draft, name: e.target.value })} placeholder="t.d. HSU Vestmannaeyjum" />
      </label>
      <div className="grid gap-2 sm:grid-cols-2">
        <label className="block text-xs font-semibold text-slate-600">Heimilisfang
          <input className={`${inputCls} mt-1`} value={draft.address} onChange={(e) => onChange({ ...draft, address: e.target.value })} />
        </label>
        <label className="block text-xs font-semibold text-slate-600">Sími
          <input className={`${inputCls} mt-1`} value={draft.phone} onChange={(e) => onChange({ ...draft, phone: e.target.value })} inputMode="tel" />
        </label>
      </div>
      <label className="block text-xs font-semibold text-slate-600">Athugasemd
        <input className={`${inputCls} mt-1`} value={draft.note} onChange={(e) => onChange({ ...draft, note: e.target.value })} placeholder="t.d. tengiliður eða opnunartími" />
      </label>
      <div className="flex gap-2">
        <button className={`${btn} bg-cyan-700 text-white hover:bg-cyan-800`} disabled={busy || !draft.name.trim()}>{submitLabel}</button>
        <button type="button" className={`${btn} border border-slate-300 bg-white text-slate-700 hover:bg-slate-50`} onClick={onCancel}>Hætta við</button>
      </div>
    </form>
  );
}
