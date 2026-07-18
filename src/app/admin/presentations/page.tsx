"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Presentation, Plus, Globe, Pencil, Printer } from "lucide-react";
import { supabase } from "@/lib/supabase";

interface Item {
  id: string;
  slug: string;
  title: string;
  kind: string;
  status: string;
  updated_at: string;
}

const KIND_LABELS: Record<string, string> = { kynning: "Kynningar", prentefni: "Prentefni" };
const KIND_ORDER = ["kynning", "prentefni"];

export default function PresentationsListPage() {
  const router = useRouter();
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [creating, setCreating] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [kind, setKind] = useState("kynning");

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
      .from("presentations")
      .select("id, slug, title, kind, status, updated_at")
      .order("kind", { ascending: true })
      .order("title", { ascending: true });
    setItems((data as Item[]) || []);
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
    const res = await fetch("/api/admin/presentations", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: session?.access_token ? `Bearer ${session.access_token}` : "" },
      body: JSON.stringify({ title, kind }),
    });
    const j = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok || !j.ok) {
      setErr(j.error || "Ekki tókst að stofna.");
      return;
    }
    router.push(`/admin/presentations/${j.presentation.id}`);
  };

  const grouped = KIND_ORDER.map((k) => ({ k, items: items.filter((i) => i.kind === k) })).filter((g) => g.items.length > 0);

  return (
    <div className="p-8 max-w-4xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-widest text-cyan-700 mb-1">Stjórnborð</div>
          <h1 className="text-2xl font-bold text-slate-900">Kynningar & prentefni</h1>
          <p className="text-sm text-slate-600 mt-1">Kynningar og prentvænt efni til að deila.</p>
        </div>
        {isAdmin && (
          <button onClick={() => setCreating((v) => !v)} className="inline-flex items-center gap-2 py-2 px-3 rounded-lg bg-cyan-600 hover:bg-cyan-700 text-white text-sm font-semibold shrink-0">
            <Plus className="w-4 h-4" /> Nýtt
          </button>
        )}
      </div>

      {creating && isAdmin && (
        <form onSubmit={create} className="mt-6 rounded-xl border border-slate-200 bg-white p-5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Titill" required className="sm:col-span-2 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-cyan-200 outline-none" />
            <select value={kind} onChange={(e) => setKind(e.target.value)} className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white">
              {KIND_ORDER.map((k) => (
                <option key={k} value={k}>{KIND_LABELS[k]}</option>
              ))}
            </select>
          </div>
          <div className="mt-3 flex items-center gap-3">
            <button type="submit" disabled={busy || !title} className="py-2 px-4 rounded-lg bg-cyan-600 hover:bg-cyan-700 text-white font-semibold text-sm disabled:opacity-50">
              {busy ? "Stofna…" : "Stofna og opna"}
            </button>
            {err && <span className="text-xs text-red-600">{err}</span>}
          </div>
        </form>
      )}

      <div className="mt-6 space-y-8">
        {loading ? (
          <div className="text-sm text-slate-500">Hleð…</div>
        ) : items.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
            <Presentation className="w-6 h-6 mx-auto mb-2 text-slate-400" />
            Ekkert efni enn.
          </div>
        ) : (
          grouped.map((g) => (
            <section key={g.k}>
              <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2 flex items-center gap-1">
                {g.k === "prentefni" ? <Printer className="w-3.5 h-3.5" /> : <Presentation className="w-3.5 h-3.5" />}
                {KIND_LABELS[g.k]}
              </h2>
              <div className="rounded-xl border border-slate-200 bg-white divide-y divide-slate-100">
                {g.items.map((d) => (
                  <Link key={d.id} href={`/admin/presentations/${d.id}`} className="flex items-center justify-between gap-4 p-4 hover:bg-slate-50">
                    <div className="min-w-0">
                      <div className="font-medium text-slate-900 truncate">{d.title}</div>
                      <div className="text-xs text-slate-500">/{d.slug}</div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      {d.status === "published" ? (
                        <span className="inline-flex items-center gap-1 text-xs text-emerald-700"><Globe className="w-3.5 h-3.5" /> Birt</span>
                      ) : (
                        <span className="text-xs text-amber-600">Drög</span>
                      )}
                      <Pencil className="w-4 h-4 text-slate-400" />
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          ))
        )}
      </div>
    </div>
  );
}
