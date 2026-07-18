"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ClipboardList, Plus, Globe, Pencil } from "lucide-react";
import { supabase } from "@/lib/supabase";

interface Survey {
  id: string;
  slug: string;
  title: string;
  status: string;
  updated_at: string;
  responseCount?: number;
}

export default function SurveysListPage() {
  const router = useRouter();
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [creating, setCreating] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [title, setTitle] = useState("");

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
      .from("surveys")
      .select("id, slug, title, status, updated_at")
      .order("updated_at", { ascending: false });
    const rows = (data as Survey[]) || [];
    // Response counts (best-effort; staff RLS allows reading responses).
    await Promise.all(
      rows.map(async (s) => {
        const { count } = await supabase
          .from("survey_responses")
          .select("id", { count: "exact", head: true })
          .eq("survey_id", s.id);
        s.responseCount = count || 0;
      }),
    );
    setSurveys(rows);
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
    const res = await fetch("/api/admin/surveys", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: session?.access_token ? `Bearer ${session.access_token}` : "" },
      body: JSON.stringify({ title }),
    });
    const j = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok || !j.ok) {
      setErr(j.error || "Ekki tókst að stofna könnun.");
      return;
    }
    router.push(`/admin/surveys/${j.survey.id}`);
  };

  return (
    <div className="p-8 max-w-4xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-widest text-cyan-700 mb-1">Stjórnborð</div>
          <h1 className="text-2xl font-bold text-slate-900">Kannanir</h1>
          <p className="text-sm text-slate-600 mt-1">Spurningakannanir sem almenningur getur svarað.</p>
        </div>
        {isAdmin && (
          <button onClick={() => setCreating((v) => !v)} className="inline-flex items-center gap-2 py-2 px-3 rounded-lg bg-cyan-600 hover:bg-cyan-700 text-white text-sm font-semibold shrink-0">
            <Plus className="w-4 h-4" /> Ný könnun
          </button>
        )}
      </div>

      {creating && isAdmin && (
        <form onSubmit={create} className="mt-6 rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex flex-col sm:flex-row gap-3">
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Titill könnunar" required className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-cyan-200 outline-none" />
            <button type="submit" disabled={busy || !title} className="py-2 px-4 rounded-lg bg-cyan-600 hover:bg-cyan-700 text-white font-semibold text-sm disabled:opacity-50">
              {busy ? "Stofna…" : "Stofna og opna"}
            </button>
          </div>
          {err && <p className="mt-3 text-xs text-red-600">{err}</p>}
        </form>
      )}

      <div className="mt-6 rounded-xl border border-slate-200 bg-white divide-y divide-slate-100">
        {loading ? (
          <div className="p-6 text-sm text-slate-500">Hleð…</div>
        ) : surveys.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-500">
            <ClipboardList className="w-6 h-6 mx-auto mb-2 text-slate-400" />
            Engar kannanir enn.
          </div>
        ) : (
          surveys.map((s) => (
            <Link key={s.id} href={`/admin/surveys/${s.id}`} className="flex items-center justify-between gap-4 p-4 hover:bg-slate-50">
              <div className="min-w-0">
                <div className="font-medium text-slate-900 truncate">{s.title}</div>
                <div className="text-xs text-slate-500">/{s.slug} · {s.responseCount ?? 0} svör</div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                {s.status === "published" ? (
                  <span className="inline-flex items-center gap-1 text-xs text-emerald-700"><Globe className="w-3.5 h-3.5" /> Birt</span>
                ) : (
                  <span className="text-xs text-amber-600">Drög</span>
                )}
                <Pencil className="w-4 h-4 text-slate-400" />
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
