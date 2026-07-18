"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Activity, Plus, History } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { erindi } from "@/erindi";

interface Protocol {
  id: string;
  slug: string;
  title: string;
  version: number;
  status: string;
  risk_class: string;
  updated_at: string;
}

const STATUS_META: Record<string, { label: string; cls: string }> = {
  draft: { label: "Drög", cls: "bg-slate-100 text-slate-600" },
  active: { label: "Virkt", cls: "bg-emerald-100 text-emerald-700" },
  retired: { label: "Afskráð", cls: "bg-red-100 text-red-700" },
};

export default function ClinicalListPage() {
  const router = useRouter();
  const [protocols, setProtocols] = useState<Protocol[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const authHeaders = async (): Promise<Record<string, string>> => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    return { "Content-Type": "application/json", Authorization: session?.access_token ? `Bearer ${session.access_token}` : "" };
  };

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("clinical_protocols")
      .select("id, slug, title, version, status, risk_class, updated_at")
      .order("title", { ascending: true });
    setProtocols((data as Protocol[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  const createFor = async (slug: string, title: string, summary: string) => {
    setBusy(slug);
    setErr(null);
    const res = await fetch("/api/admin/clinical", {
      method: "POST",
      headers: await authHeaders(),
      body: JSON.stringify({ slug, title, summary }),
    });
    const j = await res.json().catch(() => ({}));
    setBusy(null);
    if (!res.ok || !j.ok) {
      setErr(j.error || "Ekki tókst að stofna reiknirit.");
      return;
    }
    router.push(`/admin/clinical/${j.protocol.id}`);
  };

  const existingSlugs = new Set(protocols.map((p) => p.slug));
  const missingErindi = erindi.filter((e) => !existingSlugs.has(e.slug));

  return (
    <div className="p-8 max-w-4xl">
      <div className="text-[11px] font-semibold uppercase tracking-widest text-cyan-700 mb-1">Stjórnborð</div>
      <h1 className="text-2xl font-bold text-slate-900">Klínísk reiknirit & útgáfustýring</h1>
      <p className="text-sm text-slate-600 mt-1 mb-2">
        Útgáfustýrð klínísk reiknirit fyrir hvert erindi. Sérhver breyting á reikniriti er skráð með skýringu og
        rökstuðningi — óbreytanleg saga fyrir lækningatæki (MDR / ISO 13485).
      </p>
      {err && <p className="text-xs text-red-600 mb-2">{err}</p>}

      {/* Existing protocols */}
      <div className="mt-6">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">Reiknirit</h2>
        <div className="rounded-xl border border-slate-200 bg-white divide-y divide-slate-100">
          {loading ? (
            <div className="p-6 text-sm text-slate-500">Hleð…</div>
          ) : protocols.length === 0 ? (
            <div className="p-6 text-sm text-slate-500">Engin reiknirit skráð enn. Stofnaðu úr erindalistanum hér að neðan.</div>
          ) : (
            protocols.map((p) => {
              const meta = STATUS_META[p.status] || STATUS_META.draft;
              return (
                <Link key={p.id} href={`/admin/clinical/${p.id}`} className="flex items-center justify-between gap-4 p-4 hover:bg-slate-50">
                  <div className="flex items-center gap-3 min-w-0">
                    <Activity className="w-5 h-5 text-cyan-600 shrink-0" />
                    <div className="min-w-0">
                      <div className="font-medium text-slate-900 truncate">{p.title}</div>
                      <div className="text-xs text-slate-500">
                        útg. {p.version} · áhættuflokkur {p.risk_class} · /{p.slug}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${meta.cls}`}>{meta.label}</span>
                    <History className="w-4 h-4 text-slate-400" />
                  </div>
                </Link>
              );
            })
          )}
        </div>
      </div>

      {/* Erindi without a protocol yet */}
      {missingErindi.length > 0 && (
        <div className="mt-8">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">
            Erindi án reiknirits ({missingErindi.length})
          </h2>
          <div className="rounded-xl border border-dashed border-slate-300 bg-white divide-y divide-slate-100">
            {missingErindi.map((e) => (
              <div key={e.slug} className="flex items-center justify-between gap-4 p-4">
                <div className="min-w-0">
                  <div className="font-medium text-slate-900 truncate">{e.title}</div>
                  <div className="text-xs text-slate-500 truncate">{e.description}</div>
                </div>
                <button
                  onClick={() => createFor(e.slug, e.title, e.description)}
                  disabled={busy === e.slug}
                  className="inline-flex items-center gap-1.5 py-1.5 px-3 rounded-lg bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-semibold shrink-0 disabled:opacity-50"
                >
                  <Plus className="w-3.5 h-3.5" /> {busy === e.slug ? "Stofna…" : "Stofna reiknirit"}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
