"use client";

// „Hver er við“: allir sem nota vinnustöðina, eftir starfsstöð, með stöðu —
// virk(ur), innskráð(ur) en óvirk(ur), útskráð(ur) eða hefur ekki virkjað
// aðgang. Sjá /api/admin/vinnustod/presence.

import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronDown, PenSquare, Users } from "lucide-react";
import { supabase } from "@/lib/supabase";

type Status = "online" | "idle" | "offline" | "pending";
export interface PresencePerson {
  kind: "vs" | "staff" | "hsu"; id: string; name: string; email: string; title: string; isAdmin: boolean;
  workplace: string; status: Status; pageOpen: boolean; lastActive: string | null;
}

async function api<T>(path: string): Promise<T & { ok: boolean; error?: string }> {
  const { data: { session } } = await supabase.auth.getSession();
  const res = await fetch(path, { headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {} });
  return res.json().catch(() => ({ ok: false, error: `Villa (${res.status})` }));
}

const ORDER: Record<Status, number> = { online: 0, idle: 1, pending: 2, offline: 3 };
const LABEL: Record<Status, string> = { online: "Virk", idle: "Innskráð, óvirk", offline: "Útskráð", pending: "Ekki virkjað" };

function since(iso: string | null): string {
  if (!iso) return "";
  const m = Math.round((Date.now() - new Date(iso).getTime()) / 60_000);
  if (m < 1) return "rétt í þessu";
  if (m < 60) return `fyrir ${m} mín.`;
  const h = Math.round(m / 60);
  if (h < 24) return `fyrir ${h} klst.`;
  const d = Math.round(h / 24);
  return d === 1 ? "í gær" : `fyrir ${d} dögum`;
}

function Dot({ status }: { status: Status }) {
  if (status === "online") {
    return (
      <span className="relative flex h-3 w-3 shrink-0" aria-hidden>
        <span className="absolute h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
        <span className="relative h-3 w-3 rounded-full bg-emerald-500 ring-2 ring-white" />
      </span>
    );
  }
  const cls = status === "idle" ? "bg-amber-400" : status === "pending" ? "border-2 border-dashed border-slate-400 bg-white" : "bg-slate-300";
  return <span className={`h-3 w-3 shrink-0 rounded-full ${cls}`} aria-hidden />;
}

export default function Presence({ refresh = 0, onWrite }: { refresh?: number; onWrite?: (p: PresencePerson) => void }) {
  const [people, setPeople] = useState<PresencePerson[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [showOffline, setShowOffline] = useState(true);
  const [, setTick] = useState(0);

  const load = useCallback(async () => {
    const r = await api<{ people: PresencePerson[] }>("/api/admin/vinnustod/presence");
    if (r.ok) { setPeople(r.people); setErr(null); } else setErr(r.error ?? "Mistókst");
  }, []);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
    const t = setInterval(() => { void load(); setTick((n) => n + 1); }, 20_000);
    const onVisible = () => { if (document.visibilityState === "visible") void load(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => { clearInterval(t); document.removeEventListener("visibilitychange", onVisible); };
  }, [load]);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (refresh) void load();
  }, [refresh, load]);

  const counts = useMemo(() => {
    const c: Record<Status, number> = { online: 0, idle: 0, offline: 0, pending: 0 };
    for (const p of people ?? []) c[p.status]++;
    return c;
  }, [people]);

  const groups = useMemo(() => {
    const byPlace = new Map<string, PresencePerson[]>();
    for (const p of people ?? []) {
      if (!showOffline && (p.status === "offline" || p.status === "pending")) continue;
      const list = byPlace.get(p.workplace) ?? [];
      list.push(p);
      byPlace.set(p.workplace, list);
    }
    const rank = (list: PresencePerson[]) => Math.min(...list.map((p) => ORDER[p.status]));
    return [...byPlace.entries()]
      .map(([place, list]) => ({
        place,
        list: list.sort((a, b) => ORDER[a.status] - ORDER[b.status] || a.name.localeCompare(b.name, "is")),
        online: list.filter((p) => p.status === "online").length,
      }))
      .sort((a, b) => rank(a.list) - rank(b.list) || b.online - a.online || a.place.localeCompare(b.place, "is"));
  }, [people, showOffline]);

  return (
    <section aria-labelledby="presence-h" className="rounded-2xl border border-slate-200 bg-white">
      <div className="border-b border-slate-100 p-4">
        <h2 id="presence-h" className="flex items-center gap-2 font-bold text-slate-900"><Users className="h-5 w-5 text-cyan-700" /> Hver er við</h2>
        <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-600">
          <span className="inline-flex items-center gap-1.5"><Dot status="online" /> {counts.online} virk</span>
          <span className="inline-flex items-center gap-1.5"><Dot status="idle" /> {counts.idle} innskráð, óvirk</span>
          <span className="inline-flex items-center gap-1.5"><Dot status="offline" /> {counts.offline} útskráð</span>
          {counts.pending > 0 && <span className="inline-flex items-center gap-1.5"><Dot status="pending" /> {counts.pending} ekki virkjað</span>}
        </div>
        <label className="mt-2 inline-flex items-center gap-1.5 text-xs text-slate-600">
          <input type="checkbox" checked={showOffline} onChange={(e) => setShowOffline(e.target.checked)} /> Sýna útskráða
        </label>
      </div>
      {err && <p className="p-4 text-sm text-red-600">{err}</p>}
      {people === null ? <div className="m-4 h-24 animate-pulse rounded-lg bg-slate-100" /> : (
        <div className="max-h-[70vh] divide-y divide-slate-100 overflow-y-auto">
          {groups.length === 0 && <p className="p-4 text-sm text-slate-500">Enginn innskráður núna.</p>}
          {groups.map((g) => (
            <details key={g.place} open className="group">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-2 bg-slate-50 px-4 py-2 text-xs font-bold uppercase tracking-wide text-slate-600">
                <span className="truncate">{g.place}</span>
                <span className="flex items-center gap-2 font-semibold normal-case tracking-normal">
                  {g.online > 0 && <span className="text-emerald-700">{g.online} virk</span>}
                  <span className="text-slate-400">{g.list.length}</span>
                  <ChevronDown className="h-4 w-4 text-slate-400 transition group-open:rotate-180" />
                </span>
              </summary>
              <ul>
                {g.list.map((p) => (
                  <li key={`${p.kind}:${p.id}`}>
                    {(() => {
                      const clickable = Boolean(onWrite && !p.isAdmin);
                      const body = (
                        <>
                          <Dot status={p.status} />
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-sm font-semibold text-slate-900">{p.name}</div>
                            <div className="truncate text-[11px] text-slate-500">
                              <span className={p.status === "online" ? "font-semibold text-emerald-700" : p.status === "idle" ? "font-semibold text-amber-700" : ""}>{LABEL[p.status]}</span>
                              {p.status === "online" ? "" : p.lastActive ? ` · síðast virk ${since(p.lastActive)}` : p.status === "offline" ? " · aldrei opnað" : ""}
                              {p.title ? ` · ${p.title}` : ""}
                            </div>
                          </div>
                          {clickable && <PenSquare className="h-4 w-4 shrink-0 text-slate-300 transition group-hover/row:text-cyan-700" aria-hidden />}
                        </>
                      );
                      return clickable ? (
                        <button type="button" onClick={() => onWrite!(p)} title={`Samtal við ${p.name}`}
                          className="group/row flex w-full items-center gap-3 px-4 py-2.5 text-left transition hover:bg-cyan-50 focus:bg-cyan-50 focus:outline-none">
                          {body}
                        </button>
                      ) : (
                        <div className="flex items-center gap-3 px-4 py-2.5">{body}</div>
                      );
                    })()}
                  </li>
                ))}
              </ul>
            </details>
          ))}
        </div>
      )}
    </section>
  );
}
