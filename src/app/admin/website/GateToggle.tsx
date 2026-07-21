"use client";

import { useCallback, useEffect, useState } from "react";
import { Globe, Lock } from "lucide-react";
import { supabase } from "@/lib/supabase";

// Coming-soon gate toggle.
//
// Flips public visibility of the marketing site without a redeploy. Admin-only;
// other staff see the current state read-only. The proxy caches the gate for
// ~30s, so a change can take up to half a minute to reach every instance.
export default function GateToggle() {
  const [gated, setGated] = useState<boolean | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [unavailable, setUnavailable] = useState(false);

  const authHeaders = async (): Promise<Record<string, string>> => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    return {
      "Content-Type": "application/json",
      Authorization: session?.access_token ? `Bearer ${session.access_token}` : "",
    };
  };

  const load = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      const { data: me } = await supabase.from("staff").select("role").eq("id", user.id).maybeSingle();
      setIsAdmin(me?.role === "admin");
    }
    const res = await fetch("/api/admin/site-settings", { headers: await authHeaders() });
    const j = await res.json().catch(() => ({}));
    if (j?.ok) {
      setGated(!!j.coming_soon);
      setUnavailable(!!j.unavailable);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  const toggle = async () => {
    if (gated === null || busy) return;
    setBusy(true);
    setErr(null);
    const next = !gated;
    const res = await fetch("/api/admin/site-settings", {
      method: "POST",
      headers: await authHeaders(),
      body: JSON.stringify({ coming_soon: next }),
    });
    const j = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok || !j.ok) {
      setErr(j.error || "Ekki tókst að breyta stöðu.");
      return;
    }
    setGated(next);
  };

  if (gated === null) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-4 mb-6 text-sm text-slate-400">Hleð stöðu…</div>
    );
  }

  const live = !gated;

  return (
    <div
      className={`rounded-xl border p-4 mb-6 ${
        live ? "border-emerald-200 bg-emerald-50/60" : "border-amber-200 bg-amber-50/60"
      }`}
    >
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-start gap-3 min-w-0">
          <div
            className={`w-9 h-9 shrink-0 rounded-lg flex items-center justify-center ${
              live ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
            }`}
          >
            {live ? <Globe className="w-5 h-5" /> : <Lock className="w-5 h-5" />}
          </div>
          <div className="min-w-0">
            <div className="font-semibold text-slate-900 text-sm">
              {live ? "Vefurinn er í loftinu" : "„Coming soon“ hlið er virkt"}
            </div>
            <p className="text-xs text-slate-600 mt-0.5 max-w-xl">
              {live
                ? "Allir sjá vefinn. Kveiktu á hliðinu til að fela hann aftur á meðan unnið er að honum."
                : "Gestir sjá „coming soon“ síðuna. Stjórnborð, lögfræðiskjöl og forskoðunartenglar virka áfram."}
            </p>
          </div>
        </div>

        {isAdmin ? (
          <button
            onClick={toggle}
            disabled={busy}
            className={`shrink-0 rounded-md px-4 py-2 text-sm font-medium text-white disabled:opacity-50 ${
              live ? "bg-amber-600 hover:bg-amber-700" : "bg-emerald-600 hover:bg-emerald-700"
            }`}
          >
            {busy ? "Breyti…" : live ? "Kveikja á hliði" : "Setja vefinn í loftið"}
          </button>
        ) : (
          <span className="shrink-0 text-xs text-slate-500">Aðeins stjórnendur geta breytt</span>
        )}
      </div>

      {err && <p className="mt-2 text-xs text-red-600">{err}</p>}
      {unavailable && (
        <p className="mt-2 text-xs text-amber-700">
          Taflan <code>site_settings</code> er ekki til enn — keyrðu flutning #15. Á meðan ræðst staðan af{" "}
          <code>COMING_SOON</code> umhverfisbreytunni.
        </p>
      )}
      <p className="mt-2 text-[11px] text-slate-500">Breytingin tekur gildi alls staðar innan ~30 sekúndna.</p>
    </div>
  );
}
