"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Building2, Plus, Globe } from "lucide-react";
import { supabase } from "@/lib/supabase";

// Samstarfsstofnanir — list of partner institutions, each with a shareable
// /samstarf/<slug> proposal page. Reads via RLS (staff-read-all); create is
// admin-only through the API.

interface Row {
  id: string;
  slug: string;
  name: string;
  short_name: string | null;
  status: string;
  updated_at: string;
}

export default function StofnanirPage() {
  const router = useRouter();
  const [rows, setRows] = useState<Row[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

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
      .from("partner_pages")
      .select("id, slug, name, short_name, status, updated_at")
      .order("updated_at", { ascending: false });
    setRows((data as Row[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  const create = async () => {
    if (!name.trim()) return;
    setBusy(true);
    setErr(null);
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const res = await fetch("/api/admin/stofnanir", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: session?.access_token ? `Bearer ${session.access_token}` : "",
      },
      body: JSON.stringify({ name }),
    });
    const j = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok || !j.ok) {
      setErr(j.error || "Villa við að stofna");
      return;
    }
    router.push(`/admin/stofnanir/${j.partner.id}`);
  };

  return (
    <div className="p-8 max-w-4xl">
      <div className="text-[11px] font-semibold uppercase tracking-widest text-cyan-700 mb-1">Stjórnborð</div>
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-slate-900">Samstarfsstofnanir</h1>
        {isAdmin && !creating && (
          <button
            onClick={() => setCreating(true)}
            className="inline-flex items-center gap-2 rounded-md bg-cyan-600 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-700"
          >
            <Plus className="w-4 h-4" /> Ný stofnun
          </button>
        )}
      </div>
      <p className="text-sm text-slate-600 mt-1 mb-6">
        Deilanleg kynningarsíða fyrir hverja heilbrigðisstofnun (HSU, HSN, …) sem vill bjóða aðgang að Fjarlækningum á sínum vef.
      </p>

      {creating && (
        <div className="mb-6 rounded-xl border border-slate-200 bg-white p-4">
          <label className="block text-xs font-medium text-slate-500 mb-1.5">Nafn stofnunar</label>
          <div className="flex flex-wrap gap-2">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && create()}
              placeholder="t.d. Heilbrigðisstofnun Norðurlands"
              autoFocus
              className="flex-1 min-w-56 px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-cyan-200"
            />
            <button onClick={create} disabled={busy || !name.trim()} className="rounded-lg bg-cyan-600 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-700 disabled:opacity-50">
              {busy ? "Stofna…" : "Stofna"}
            </button>
            <button onClick={() => { setCreating(false); setName(""); setErr(null); }} className="px-3 py-2 text-sm text-slate-600 hover:text-slate-900">
              Hætta við
            </button>
          </div>
          {err && <p className="mt-2 text-sm text-red-600">{err}</p>}
        </div>
      )}

      {loading ? (
        <p className="text-sm text-slate-500">Hleð…</p>
      ) : rows.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
          <Building2 className="w-6 h-6 mx-auto mb-2 text-slate-400" />
          Engin stofnun enn.
        </div>
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white divide-y divide-slate-100">
          {rows.map((r) => (
            <Link key={r.id} href={`/admin/stofnanir/${r.id}`} className="flex items-center justify-between gap-4 p-4 hover:bg-slate-50">
              <div className="min-w-0">
                <div className="font-medium text-slate-900 truncate">{r.name}</div>
                <div className="text-xs text-slate-500">/samstarf/{r.slug}</div>
              </div>
              {r.status === "published" ? (
                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700">
                  <Globe className="w-3.5 h-3.5" /> Birt
                </span>
              ) : (
                <span className="text-xs text-amber-600">Drög</span>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
