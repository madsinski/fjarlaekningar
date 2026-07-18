"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FlaskConical, Plus, ExternalLink, Pencil } from "lucide-react";
import { supabase } from "@/lib/supabase";

interface Note {
  id: string;
  title: string;
  category: string;
  source_url: string | null;
  updated_at: string;
}

export default function ResearchListPage() {
  const router = useRouter();
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("research_notes")
      .select("id, title, category, source_url, updated_at")
      .order("updated_at", { ascending: false });
    setNotes((data as Note[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setErr(null);
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const res = await fetch("/api/admin/research", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: session?.access_token ? `Bearer ${session.access_token}` : "" },
      body: JSON.stringify({ title, category: category || "general" }),
    });
    const j = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok || !j.ok) {
      setErr(j.error || "Ekki tókst að stofna.");
      return;
    }
    router.push(`/admin/research/${j.note.id}`);
  };

  return (
    <div className="p-8 max-w-4xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-widest text-cyan-700 mb-1">Stjórnborð</div>
          <h1 className="text-2xl font-bold text-slate-900">Rannsóknir</h1>
          <p className="text-sm text-slate-600 mt-1">
            Innra rannsóknarsafn — rannsóknir, verklag og niðurstöður sem glósur með heimildatenglum.
          </p>
        </div>
        <button onClick={() => setCreating((v) => !v)} className="inline-flex items-center gap-2 py-2 px-3 rounded-lg bg-cyan-600 hover:bg-cyan-700 text-white text-sm font-semibold shrink-0">
          <Plus className="w-4 h-4" /> Ný glósa
        </button>
      </div>

      {creating && (
        <form onSubmit={create} className="mt-6 rounded-xl border border-slate-200 bg-white p-5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Titill" required className="sm:col-span-2 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-cyan-200 outline-none" />
            <input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Flokkur (valfrjálst)" className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-cyan-200 outline-none" />
          </div>
          <div className="mt-3 flex items-center gap-3">
            <button type="submit" disabled={busy || !title} className="py-2 px-4 rounded-lg bg-cyan-600 hover:bg-cyan-700 text-white font-semibold text-sm disabled:opacity-50">
              {busy ? "Stofna…" : "Stofna og opna"}
            </button>
            {err && <span className="text-xs text-red-600">{err}</span>}
          </div>
        </form>
      )}

      <div className="mt-6">
        {loading ? (
          <div className="text-sm text-slate-500">Hleð…</div>
        ) : notes.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
            <FlaskConical className="w-6 h-6 mx-auto mb-2 text-slate-400" />
            Engar glósur enn.
          </div>
        ) : (
          <div className="rounded-xl border border-slate-200 bg-white divide-y divide-slate-100">
            {notes.map((n) => (
              <div key={n.id} className="flex items-center justify-between gap-4 p-4 hover:bg-slate-50">
                <Link href={`/admin/research/${n.id}`} className="min-w-0 flex-1">
                  <div className="font-medium text-slate-900 truncate">{n.title}</div>
                  <div className="text-xs text-slate-500">{n.category}</div>
                </Link>
                <div className="flex items-center gap-3 shrink-0">
                  {n.source_url && (
                    <a href={n.source_url} target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-cyan-700" title="Heimild">
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  )}
                  <Link href={`/admin/research/${n.id}`} className="text-slate-400 hover:text-slate-700">
                    <Pencil className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
