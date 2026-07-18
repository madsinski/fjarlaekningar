"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FileText, Plus, Globe, Pencil, CheckCircle2, Circle } from "lucide-react";

const APPROVAL_META: Record<string, { label: string; cls: string }> = {
  draft: { label: "Drög", cls: "text-slate-500" },
  in_review: { label: "Í yfirlestri", cls: "text-amber-600" },
  changes_requested: { label: "Breytinga óskað", cls: "text-red-600" },
  approved: { label: "Samþykkt", cls: "text-emerald-700" },
};
import { supabase } from "@/lib/supabase";

interface Doc {
  id: string;
  slug: string;
  title: string;
  category: string;
  language: string;
  status: string;
  version: number;
  updated_at: string;
  approval_status?: string;
}

const CATEGORY_LABELS: Record<string, string> = {
  privacy: "Persónuvernd",
  terms: "Skilmálar",
  consent: "Samþykki",
  general: "Almennt",
};

const CATEGORY_ORDER = ["privacy", "terms", "consent", "general"];

export default function LegalListPage() {
  const router = useRouter();
  const [docs, setDocs] = useState<Doc[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [creating, setCreating] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("privacy");
  const [language, setLanguage] = useState("is");

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
      .from("legal_documents")
      .select("id, slug, title, category, language, status, version, updated_at, approval_status")
      .order("category", { ascending: true })
      .order("title", { ascending: true });
    setDocs((data as Doc[]) || []);
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
    const res = await fetch("/api/admin/legal/documents", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: session?.access_token ? `Bearer ${session.access_token}` : "",
      },
      body: JSON.stringify({ title, category, language }),
    });
    const j = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok || !j.ok) {
      setErr(j.error || "Ekki tókst að stofna skjal.");
      return;
    }
    router.push(`/admin/legal/${j.document.id}`);
  };

  const grouped = CATEGORY_ORDER.map((cat) => ({
    cat,
    items: docs.filter((d) => d.category === cat),
  })).filter((g) => g.items.length > 0);

  return (
    <div className="p-8 max-w-4xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-widest text-cyan-700 mb-1">Stjórnborð</div>
          <h1 className="text-2xl font-bold text-slate-900">Lögfræðiskjöl</h1>
          <p className="text-sm text-slate-600 mt-1">Persónuverndarstefna, skilmálar og samþykkisskjöl Fjarlækninga.</p>
        </div>
        {isAdmin && (
          <button
            onClick={() => setCreating((v) => !v)}
            className="inline-flex items-center gap-2 py-2 px-3 rounded-lg bg-cyan-600 hover:bg-cyan-700 text-white text-sm font-semibold shrink-0"
          >
            <Plus className="w-4 h-4" /> Nýtt skjal
          </button>
        )}
      </div>

      {creating && isAdmin && (
        <form onSubmit={create} className="mt-6 rounded-xl border border-slate-200 bg-white p-5">
          <div className="font-semibold text-slate-900 text-sm mb-4">Nýtt lögfræðiskjal</div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Titill (t.d. Persónuverndarstefna)"
              required
              className="sm:col-span-3 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-cyan-200 outline-none"
            />
            <select value={category} onChange={(e) => setCategory(e.target.value)} className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white">
              {CATEGORY_ORDER.map((c) => (
                <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>
              ))}
            </select>
            <select value={language} onChange={(e) => setLanguage(e.target.value)} className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white">
              <option value="is">Íslenska</option>
              <option value="en">English</option>
            </select>
            <button
              type="submit"
              disabled={busy || !title}
              className="py-2 px-4 rounded-lg bg-cyan-600 hover:bg-cyan-700 text-white font-semibold text-sm disabled:opacity-50"
            >
              {busy ? "Stofna…" : "Stofna og opna"}
            </button>
          </div>
          {err && <p className="mt-3 text-xs text-red-600">{err}</p>}
        </form>
      )}

      {!loading && docs.length > 0 && (() => {
        const approved = docs.filter((d) => (d.approval_status || "draft") === "approved").length;
        const pct = Math.round((approved / docs.length) * 100);
        return (
          <div className="mt-6 rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-slate-900">Samþykkt skjöl</span>
              <span className="text-slate-600">
                <span className="text-emerald-700 font-semibold">{approved}</span> af {docs.length}
              </span>
            </div>
            <div className="mt-2 h-2 rounded-full bg-slate-100 overflow-hidden">
              <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
            </div>
          </div>
        );
      })()}

      <div className="mt-6 space-y-8">
        {loading ? (
          <div className="text-sm text-slate-500">Hleð…</div>
        ) : docs.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
            <FileText className="w-6 h-6 mx-auto mb-2 text-slate-400" />
            Engin skjöl enn. {isAdmin ? "Stofnaðu fyrsta skjalið." : ""}
          </div>
        ) : (
          grouped.map((g) => (
            <section key={g.cat}>
              <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">{CATEGORY_LABELS[g.cat]}</h2>
              <div className="rounded-xl border border-slate-200 bg-white divide-y divide-slate-100">
                {g.items.map((d) => (
                  <Link
                    key={d.id}
                    href={`/admin/legal/${d.id}`}
                    className="flex items-center justify-between gap-4 p-4 hover:bg-slate-50"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {(d.approval_status || "draft") === "approved" ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                      ) : (
                        <Circle className="w-5 h-5 text-slate-300 shrink-0" />
                      )}
                      <div className="min-w-0">
                        <div className="font-medium text-slate-900 truncate">{d.title}</div>
                        <div className="text-xs text-slate-500">
                          /{d.slug} · {d.language.toUpperCase()} · útg. {d.version}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className={`text-xs ${(APPROVAL_META[d.approval_status || "draft"] || APPROVAL_META.draft).cls}`}>
                        {(APPROVAL_META[d.approval_status || "draft"] || APPROVAL_META.draft).label}
                      </span>
                      {d.status === "published" && (
                        <span className="inline-flex items-center gap-1 text-xs text-slate-400" title="Birt á vefnum">
                          <Globe className="w-3.5 h-3.5" />
                        </span>
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
