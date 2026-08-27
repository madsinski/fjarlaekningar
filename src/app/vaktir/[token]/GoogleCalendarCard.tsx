"use client";

// Tenging við Google-dagatal: bein samstilling í stað áskriftar.
//
// Áskrift að .ics er pull — Google sækir þegar því hentar, sem getur verið
// klukkustundum eftir að vakt breytist. Þessi leið skrifar breytinguna beint
// inn um leið og hún verður til.

import { useCallback, useEffect, useState } from "react";
import { RefreshCw, Link2, Unlink, AlertTriangle, Check, Loader2 } from "lucide-react";

interface Status {
  configured: boolean;
  connected: boolean;
  email: string | null;
  enabled: boolean;
  lastSyncAt: string | null;
  lastError: string | null;
  calendarName: string;
}

function timeAgoIs(iso: string | null): string {
  if (!iso) return "aldrei";
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "rétt í þessu";
  if (mins < 60) return `fyrir ${mins} mín`;
  const h = Math.floor(mins / 60);
  if (h < 24) return `fyrir ${h} klst`;
  return `fyrir ${Math.floor(h / 24)} d`;
}

export default function GoogleCalendarCard({ token }: { token: string }) {
  const [st, setSt] = useState<Status | null>(null);
  const [busy, setBusy] = useState(false);
  // Read once at mount rather than in an effect: it is a fact about the URL we
  // arrived on, not something that changes while the page is open.
  const [justConnected] = useState(
    () => typeof window !== "undefined" && new URLSearchParams(window.location.search).get("google") === "connected",
  );

  const load = useCallback(async () => {
    const r = await fetch(`/api/vaktir/${token}/google`);
    const j = await r.json().catch(() => ({}));
    if (j.ok) setSt(j as Status);
  }, [token]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
    if (!justConnected) return;
    // The first sync runs after the redirect returns, so "síðast uppfært" is
    // still empty for a moment. Ask again once it has had time to finish.
    const t = setTimeout(() => { void load(); }, 2500);
    return () => clearTimeout(t);
  }, [load, justConnected]);

  if (!st?.configured) return null;

  const connect = () => {
    const from = encodeURIComponent(location.pathname);
    location.href = `/api/vaktir/${token}/google/start?from=${from}`;
  };

  const toggle = async () => {
    if (!st.connected || busy) return;
    setBusy(true);
    await fetch(`/api/vaktir/${token}/google`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: !st.enabled }),
    });
    await load();
    setBusy(false);
  };

  const disconnect = async () => {
    if (!confirm(`Aftengja Google-dagatal?\n\nDagatalinu „${st.calendarName}“ verður eytt úr Google-reikningnum þínum. Eigin dagatöl þín snertum við ekki.`)) return;
    setBusy(true);
    await fetch(`/api/vaktir/${token}/google`, { method: "DELETE" });
    await load();
    setBusy(false);
  };

  if (!st.connected) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
          <RefreshCw className="h-4 w-4 text-[var(--primary-dark)]" /> Bein samstilling við Google
        </div>
        <p className="mt-1 text-sm text-slate-600">
          Tengdu Google-reikninginn og vaktirnar berast samstundis — ekki eftir nokkrar klukkustundir
          eins og áskrift gerir.
        </p>
        <button onClick={connect}
          className="mt-3 inline-flex items-center gap-2 rounded-lg bg-[var(--primary-dark)] px-4 py-2 text-sm font-semibold text-white hover:brightness-110">
          <Link2 className="h-4 w-4" /> Tengja Google-dagatal
        </button>
        <p className="mt-2 text-[11px] text-slate-400">
          Við búum til nýtt dagatal, „{st.calendarName}“, og skrifum eingöngu í það. Heimildin sem beðið
          er um nær ekki til eigin dagatala þinna — hvorki til að lesa þau né breyta þeim.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-emerald-200 bg-emerald-50/40 p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
          <Check className="h-4 w-4 text-emerald-600" /> Tengt við Google
        </div>
        <button onClick={disconnect} disabled={busy}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50">
          {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <Unlink className="h-3 w-3" />} Aftengja
        </button>
      </div>

      <p className="mt-1 text-sm text-slate-600">
        {st.email ? <span className="font-medium">{st.email}</span> : "Google-reikningur"} · dagatalið „{st.calendarName}“
      </p>

      {justConnected && (
        <p className="mt-2 rounded-lg bg-white px-3 py-2 text-xs text-emerald-800">
          Tengingin tókst. Vaktirnar þínar eru komnar í dagatalið.
        </p>
      )}

      {st.lastError && (
        <p className="mt-2 flex items-start gap-1.5 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {st.lastError}
        </p>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <label className="inline-flex items-center gap-2 text-xs text-slate-600">
          <input type="checkbox" checked={st.enabled} onChange={toggle} disabled={busy}
            className="h-4 w-4 rounded border-slate-300" />
          Samstilling virk
        </label>
        <span className="text-[11px] text-slate-400">Síðast uppfært {timeAgoIs(st.lastSyncAt)}</span>
      </div>

      {!st.enabled && (
        <p className="mt-2 text-[11px] text-slate-500">
          Slökkt: dagatalið er tómt meðan svo er. Kveiktu aftur til að fylla það.
        </p>
      )}
    </div>
  );
}
