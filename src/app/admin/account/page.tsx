"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Copy, Check } from "lucide-react";
import { supabase } from "@/lib/supabase";
import DoctorShifts from "@/app/vaktir/[token]/DoctorShifts";
import MonthSchedule from "./MonthSchedule";
import { DESIGN_BUILDERS, DESIGN_LABELS, type DesignKey, type SignatureFields } from "@/lib/signature";
import type { RosterShift, RosterDoctor, RosterSwap, RosterSettings } from "@/lib/roster";

interface RosterBlock {
  doctorId: string;
  doctorName: string;
  token: string;
  calendarUrl: string;
  shifts: RosterShift[];
  settings: RosterSettings;
  doctors: RosterDoctor[];
  swaps: RosterSwap[];
}

export default function AccountPage() {
  const [me, setMe] = useState<{ name: string; email: string; roles: string[] } | null>(null);
  const [sig, setSig] = useState<SignatureFields | null>(null);
  const [roster, setRoster] = useState<RosterBlock | null>(null);
  const [loading, setLoading] = useState(true);
  const [design, setDesign] = useState<DesignKey>("stacked");
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);

  const authHeaders = async (): Promise<Record<string, string>> => {
    const { data: { session } } = await supabase.auth.getSession();
    return { "Content-Type": "application/json", Authorization: session?.access_token ? `Bearer ${session.access_token}` : "" };
  };

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/admin/account", { headers: await authHeaders() });
    const j = await res.json().catch(() => ({}));
    if (j?.ok) {
      setMe(j.me);
      setSig(j.signature);
      setRoster(j.roster);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  const setField = (k: "name" | "title" | "phone", v: string) => setSig((s) => (s ? { ...s, [k]: v } : s));

  const saveSig = async () => {
    if (!sig) return;
    const res = await fetch("/api/admin/account/signature", {
      method: "PUT",
      headers: await authHeaders(),
      body: JSON.stringify({ name: sig.name, title: sig.title, phone: sig.phone }),
    });
    if (res.ok) {
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    }
  };

  const sigHtml = useMemo(() => (sig ? DESIGN_BUILDERS[design](sig) : ""), [sig, design]);

  const copyHtml = async () => {
    try {
      await navigator.clipboard.writeText(sigHtml);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  };

  if (loading) return <div className="p-8 text-sm text-slate-500">Hleð…</div>;

  return (
    <div className="p-6 lg:p-8 max-w-6xl">
      <div className="mb-8">
        <div className="text-[11px] font-semibold uppercase tracking-widest text-cyan-700 mb-1">Stjórnborð</div>
        <h1 className="text-2xl font-bold text-slate-900">Mín síða</h1>
        <p className="text-sm text-slate-600 mt-1">{me?.name} · {me?.email}</p>
      </div>

      <div className={`grid gap-8 ${roster ? "lg:grid-cols-3" : ""}`}>
        <div className={`space-y-10 ${roster ? "lg:col-span-2" : ""}`}>
      {/* Roster (doctors only) */}
      {roster ? (
        <section>
          <DoctorShifts
            token={roster.token}
            doctorId={roster.doctorId}
            doctorName={roster.doctorName}
            initialShifts={roster.shifts}
            doctors={roster.doctors}
            initialSwaps={roster.swaps}
            settings={roster.settings}
            calendarUrl={roster.calendarUrl}
          />
        </section>
      ) : (
        <section className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500">
          Þú ert ekki með vaktir. Vaktir birtast hér ef þú hefur hlutverkið „Læknir“.
        </section>
      )}

      {/* Own email signature */}
      {sig && (
        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500 mb-3">Netfangsundirskrift</h2>
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="space-y-3">
              <label className="block text-xs text-slate-500">Nafn
                <input value={sig.name} onChange={(e) => setField("name", e.target.value)} onBlur={saveSig} className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-cyan-200" />
              </label>
              <label className="block text-xs text-slate-500">Titill / hlutverk
                <input value={sig.title} onChange={(e) => setField("title", e.target.value)} onBlur={saveSig} placeholder="t.d. Læknir, Fjarlækningar ehf." className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-cyan-200" />
              </label>
              <label className="block text-xs text-slate-500">Sími
                <input value={sig.phone} onChange={(e) => setField("phone", e.target.value)} onBlur={saveSig} placeholder="+354 000 0000" className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-cyan-200" />
              </label>
              <label className="block text-xs text-slate-500">Netfang
                <input value={sig.email} disabled className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 text-slate-500" />
              </label>
              <div className="flex items-center gap-3 pt-1">
                <label className="text-xs text-slate-500">Hönnun
                  <select value={design} onChange={(e) => setDesign(e.target.value as DesignKey)} className="ml-2 px-2 py-1.5 border border-slate-200 rounded-lg text-sm bg-white">
                    {(Object.keys(DESIGN_LABELS) as DesignKey[]).map((k) => <option key={k} value={k}>{DESIGN_LABELS[k]}</option>)}
                  </select>
                </label>
                {saved && <span className="text-xs text-emerald-600 inline-flex items-center gap-1"><Check className="w-3.5 h-3.5" /> Vistað</span>}
              </div>
              <button onClick={copyHtml} className="inline-flex items-center gap-2 rounded-lg bg-cyan-600 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-700">
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copied ? "Afritað!" : "Afrita HTML"}
              </button>
              <p className="text-[11px] text-slate-400">Límdu HTML-ið inn í undirskriftarstillingar í tölvupóstforritinu þínu.</p>
            </div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">Forskoðun</div>
              <div className="rounded-xl border border-slate-200 bg-white p-5 overflow-x-auto" dangerouslySetInnerHTML={{ __html: sigHtml }} />
            </div>
          </div>
        </section>
      )}
        </div>

        {roster && (
          <aside className="space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Vaktaplan</h2>
            <MonthSchedule myDoctorId={roster.doctorId} />
          </aside>
        )}
      </div>
    </div>
  );
}
