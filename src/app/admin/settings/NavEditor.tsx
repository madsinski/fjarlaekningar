"use client";

import { useCallback, useEffect, useState } from "react";
import { ChevronUp, ChevronDown, RotateCcw } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { ADMIN_NAV, applyNavConfig, type NavConfig } from "@/lib/admin-nav";

const DEFAULT_LABEL: Record<string, string> = Object.fromEntries(ADMIN_NAV.map((i) => [i.href, i.label]));

export default function NavEditor() {
  const [order, setOrder] = useState<string[]>(ADMIN_NAV.map((i) => i.href));
  const [labels, setLabels] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState<"idle" | "saving" | "saved">("idle");

  const authHeaders = async (): Promise<Record<string, string>> => {
    const { data: { session } } = await supabase.auth.getSession();
    return { "Content-Type": "application/json", Authorization: session?.access_token ? `Bearer ${session.access_token}` : "" };
  };

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/admin/nav", { headers: await authHeaders() });
    const j = await res.json().catch(() => ({}));
    const cfg: NavConfig = j?.config ?? {};
    setOrder(applyNavConfig(ADMIN_NAV, cfg).map((i) => i.href));
    setLabels(cfg.labels ?? {});
    setLoading(false);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= order.length) return;
    setOrder((o) => {
      const c = [...o];
      [c[i], c[j]] = [c[j], c[i]];
      return c;
    });
  };

  const save = async () => {
    setSaved("saving");
    const res = await fetch("/api/admin/nav", { method: "PATCH", headers: await authHeaders(), body: JSON.stringify({ order, labels }) });
    setSaved(res.ok ? "saved" : "idle");
    if (res.ok) setTimeout(() => setSaved("idle"), 2000);
  };

  const reset = async () => {
    if (!confirm("Endurstilla valmynd í sjálfgefið?")) return;
    setOrder(ADMIN_NAV.map((i) => i.href));
    setLabels({});
    await fetch("/api/admin/nav", { method: "PATCH", headers: await authHeaders(), body: JSON.stringify({ order: [], labels: {} }) });
    setSaved("saved");
    setTimeout(() => setSaved("idle"), 2000);
  };

  if (loading) return <p className="text-sm text-slate-500">Hleð…</p>;

  return (
    <div className="space-y-3">
      <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200">
        {order.map((href, i) => (
          <li key={href} className="flex items-center gap-2 p-2">
            <div className="flex flex-col">
              <button onClick={() => move(i, -1)} disabled={i === 0} className="p-0.5 text-slate-400 hover:text-slate-700 disabled:opacity-30"><ChevronUp className="w-4 h-4" /></button>
              <button onClick={() => move(i, 1)} disabled={i === order.length - 1} className="p-0.5 text-slate-400 hover:text-slate-700 disabled:opacity-30"><ChevronDown className="w-4 h-4" /></button>
            </div>
            <input
              value={labels[href] ?? ""}
              onChange={(e) => setLabels((l) => ({ ...l, [href]: e.target.value }))}
              placeholder={DEFAULT_LABEL[href] || href}
              className="flex-1 px-3 py-1.5 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-cyan-200"
            />
            <code className="text-[11px] text-slate-400 w-40 truncate text-right">{href}</code>
          </li>
        ))}
      </ul>
      <div className="flex items-center gap-3">
        <button onClick={save} disabled={saved === "saving"} className="rounded-lg bg-cyan-600 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-700 disabled:opacity-50">
          {saved === "saving" ? "Vista…" : saved === "saved" ? "Vistað ✓" : "Vista valmynd"}
        </button>
        <button onClick={reset} className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800">
          <RotateCcw className="w-4 h-4" /> Endurstilla
        </button>
      </div>
      <p className="text-[11px] text-slate-400">Tómt heiti notar sjálfgefna nafnið. Röð og heiti gilda fyrir alla sem sjá valmyndina.</p>
    </div>
  );
}
