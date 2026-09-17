"use client";

// Vinnustöð — stjórnun: spurningar starfsfólks, notendur, tilkynningar og
// stillingar. Aðeins stjórnandi með tveggja þrepa auðkenningu.

import { useCallback, useEffect, useRef, useState } from "react";
import { Check, Copy, Megaphone, MessageCircle, RefreshCw, Settings, UserPlus, Users, Volume2, VolumeX } from "lucide-react";
import { PushToggle, UnreadDot, chimeOnce, useFaviconBadge, useLiveSignal, useSoundPref, useUnlockAudio } from "@/app/vinnustod/_components/shared";
import { supabase } from "@/lib/supabase";
import Inbox from "./Inbox";
import Presence from "./Presence";
import Workplaces, { type WorkplaceRow } from "./Workplaces";

type Tab = "spurningar" | "notendur" | "tilkynningar" | "stillingar";

async function api<T = Record<string, unknown>>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T & { ok: boolean; error?: string }> {
  const { data: { session } } = await supabase.auth.getSession();
  const res = await fetch(path, {
    method: init.method ?? (init.body ? "POST" : "GET"),
    headers: { "Content-Type": "application/json", ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}) },
    body: init.body ? JSON.stringify(init.body) : undefined,
  });
  return res.json().catch(() => ({ ok: false, error: `Villa (${res.status})` }));
}

const fmt = (iso: string | null) => (iso ? new Date(iso).toLocaleString("is-IS", { dateStyle: "short", timeStyle: "short" }) : "—");
const inputCls = "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100";
const btn = "inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold disabled:opacity-40";
const btnPrimary = `${btn} bg-cyan-700 text-white hover:bg-cyan-800`;
const btnGhost = `${btn} border border-slate-300 bg-white text-slate-700 hover:bg-slate-50`;

export default function VinnustodAdminPage() {
  const [tab, setTabState] = useState<Tab>(() => {
    if (typeof window === "undefined") return "spurningar";
    const t = new URLSearchParams(window.location.search).get("t") as Tab | null;
    return t && ["spurningar", "notendur", "tilkynningar", "stillingar"].includes(t) ? t : "spurningar";
  });
  const setTab = (t: Tab) => {
    setTabState(t);
    const u = new URL(window.location.href);
    u.searchParams.set("t", t);
    window.history.replaceState(null, "", u);
  };

  // Samtöl sem bíða svars: rauður punktur á flipanum, fjöldi í flipaheiti og
  // hljóð þegar nýtt bætist við — óháð því hvaða flipi er opinn.
  const [awaiting, setAwaiting] = useState(0);
  const [live, setLive] = useState<{ topic: string | null; vapidKey: string | null }>({ topic: null, vapidKey: null });
  const [pulse, setPulse] = useState(0);
  const [composeTo, setComposeTo] = useState<{ kind: "vs" | "staff" | "hsu"; id: string; nonce: number } | null>(null);
  const [soundOn, setSoundOn] = useSoundPref();
  useUnlockAudio();
  const poll = useCallback(async () => {
    const r = await api<{ awaiting: number; topic: string; vapidKey: string | null }>("/api/admin/vinnustod/live");
    if (r.ok) {
      setAwaiting(r.awaiting);
      setLive((prev) => (prev.topic === r.topic ? prev : { topic: r.topic, vapidKey: r.vapidKey }));
    }
  }, []);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void poll();
    const t = setInterval(() => { void poll(); }, 20_000);
    return () => clearInterval(t);
  }, [poll]);
  // Tafarlaust merki þegar starfsmaður skrifar: sækja strax og spila hljóð.
  useLiveSignal(live.topic, (kind) => {
    setPulse((n) => n + 1);
    void poll();
    if (kind === "message" && soundOn) chimeOnce();
  });
  useFaviconBadge(awaiting);
  const last = useRef<number | null>(null);
  useEffect(() => {
    if (last.current !== null && awaiting > last.current && soundOn) chimeOnce();
    last.current = awaiting;
    const base = document.title.replace(/^\(\d+\) /, "");
    document.title = awaiting ? `(${awaiting}) ${base}` : base;
  }, [awaiting, soundOn]);

  const tabs: { key: Tab; label: string; icon: React.ReactNode; badge?: number }[] = [
    { key: "spurningar", label: "Samtöl", icon: <MessageCircle className="h-4 w-4" />, badge: awaiting },
    { key: "notendur", label: "Notendur", icon: <Users className="h-4 w-4" /> },
    { key: "tilkynningar", label: "Tilkynningar", icon: <Megaphone className="h-4 w-4" /> },
    { key: "stillingar", label: "Stillingar", icon: <Settings className="h-4 w-4" /> },
  ];
  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Vinnustöð</h1>
          <p className="text-sm text-slate-500">Hjúkrunarfræðingar og annað starfsfólk heilsugæslunnar sem vísar á Fjarlækningar.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <PushToggle vapidKey={live.vapidKey} variant="light" />
          <button type="button" onClick={() => setSoundOn(!soundOn)} aria-pressed={soundOn}
            title={soundOn ? "Hljóð við ný skilaboð: á" : "Hljóð við ný skilaboð: af"} className={btnGhost}>
            {soundOn ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />} Hljóð {soundOn ? "á" : "af"}
          </button>
          <a href="/vinnustod" target="_blank" rel="noopener" className={btnGhost}>Opna vinnustöðina</a>
        </div>
      </div>
      <div className="mt-5 flex flex-wrap gap-1 border-b border-slate-200">
        {tabs.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`-mb-px inline-flex items-center gap-1.5 border-b-2 px-3 py-2 text-sm font-semibold ${tab === t.key ? "border-cyan-600 text-cyan-800" : "border-transparent text-slate-500 hover:text-slate-800"}`}>
            {t.icon} {t.label}
            {t.badge ? <UnreadDot count={t.badge} className="ml-1" /> : null}
          </button>
        ))}
      </div>
      <div className="mt-6">
        {tab === "spurningar" && (
          <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
            <Inbox onAwaitingChange={setAwaiting} refresh={pulse} composeTo={composeTo} />
            <div className="lg:sticky lg:top-4">
              <Presence refresh={pulse} onWrite={(p) => setComposeTo({ kind: p.kind, id: p.id, nonce: Date.now() })} />
            </div>
          </div>
        )}
        {tab === "notendur" && <UsersTab />}
        {tab === "tilkynningar" && <AnnouncementsTab />}
        {tab === "stillingar" && <SettingsTab />}
      </div>
    </div>
  );
}

// ── Notendur ────────────────────────────────────────────────────────────────

interface VsUserRow {
  id: string; name: string; email: string; workplace: string; workplace_id: string | null; title: string; active: boolean; source: string;
  activated: boolean; has_pin: boolean; invite_pending: boolean; last_login_at: string | null; created_at: string;
}

function UsersTab() {
  const [users, setUsers] = useState<VsUserRow[] | null>(null);
  const [form, setForm] = useState({ name: "", email: "", title: "Hjúkrunarfræðingur", workplaceId: "" });
  const [places, setPlaces] = useState<WorkplaceRow[] | null>(null);
  const [unlinked, setUnlinked] = useState<string[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string; url?: string } | null>(null);

  const load = useCallback(async () => {
    const [r, w] = await Promise.all([
      api<{ users: VsUserRow[] }>("/api/admin/vinnustod/users"),
      api<{ workplaces: WorkplaceRow[]; unlinked: string[] }>("/api/admin/vinnustod/workplaces"),
    ]);
    if (r.ok) setUsers(r.users); else setMsg({ ok: false, text: r.error ?? "Mistókst" });
    if (w.ok) { setPlaces(w.workplaces); setUnlinked(w.unlinked); }
  }, []);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const invite = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy("invite"); setMsg(null);
    const r = await api<{ url: string }>("/api/admin/vinnustod/users", { body: form });
    setBusy(null);
    if (!r.ok) { setMsg({ ok: false, text: r.error ?? "Mistókst" }); return; }
    setMsg({ ok: true, text: `Boð sent á ${form.email}.`, url: r.url });
    setForm({ name: "", email: "", title: "Hjúkrunarfræðingur", workplaceId: form.workplaceId });
    await load();
  };
  const patch = async (id: string, body: Record<string, unknown>) => {
    setBusy(id); setMsg(null);
    const r = await api<{ url?: string }>(`/api/admin/vinnustod/users/${id}`, { method: "PATCH", body });
    setBusy(null);
    if (!r.ok) { setMsg({ ok: false, text: r.error ?? "Mistókst" }); return; }
    if (r.url) setMsg({ ok: true, text: "Nýr hlekkur sendur í tölvupósti.", url: r.url });
    await load();
  };

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[1fr_380px]">
      <div className="min-w-0 rounded-2xl border border-slate-200 bg-white">
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
          <h2 className="font-bold text-slate-900">Starfsmenn</h2>
          {users && <span className="text-xs text-slate-500">{users.filter((u) => u.active).length} virk{users.some((u) => !u.active) ? ` · ${users.filter((u) => !u.active).length} óvirk` : ""}</span>}
        </div>
        {users === null ? <div className="m-4 h-12 animate-pulse rounded bg-slate-100" />
          : users.length === 0 ? <p className="p-6 text-center text-sm text-slate-500">Engir notendur enn.</p>
          : (
            <ul className="divide-y divide-slate-100">
              {users.map((u) => (
                <li key={u.id} className={`flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 ${u.active ? "" : "opacity-50"}`}>
                  <div className="min-w-0 flex-[1_1_220px]">
                    <div className="truncate font-semibold text-slate-900">{u.name}</div>
                    <div className="truncate text-xs text-slate-500">{u.email}{u.title ? ` · ${u.title}` : ""}</div>
                    <div className="mt-0.5 text-[11px]">
                      {!u.active ? <span className="font-semibold text-slate-500">Óvirkur</span>
                        : u.activated ? <span className="font-semibold text-emerald-700">Virkur{u.has_pin ? " · kóði" : ""}</span>
                        : u.invite_pending ? <span className="font-semibold text-amber-700">Boð sent{u.source === "signup" ? " (nýskráning)" : ""}</span>
                        : <span className="font-semibold text-red-600">Boð útrunnið</span>}
                      <span className="text-slate-400"> · síðast inni {fmt(u.last_login_at)}</span>
                    </div>
                  </div>
                  <select aria-label={`Starfsstöð ${u.name}`} disabled={busy === u.id}
                    className="min-w-0 flex-[1_1_160px] rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs"
                    value={u.workplace_id ?? ""}
                    onChange={(e) => void patch(u.id, { workplaceId: e.target.value || null })}>
                    <option value="">{u.workplace && !u.workplace_id ? `${u.workplace} (ekki á lista)` : "— Engin starfsstöð —"}</option>
                    {(places ?? []).filter((p) => p.active || p.id === u.workplace_id).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                  <div className="flex shrink-0 gap-1">
                    <button type="button" className="rounded-lg p-2 text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50 disabled:opacity-40" disabled={busy === u.id}
                      onClick={() => patch(u.id, { action: "resend" })}
                      title={u.activated ? "Senda hlekk til að velja nýtt lykilorð" : "Senda boðið aftur"}
                      aria-label={u.activated ? `Nýtt lykilorð fyrir ${u.name}` : `Senda ${u.name} boðið aftur`}>
                      <RefreshCw className="h-4 w-4" />
                    </button>
                    <button type="button" className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50 disabled:opacity-40" disabled={busy === u.id}
                      onClick={() => { if (u.active && !confirm(`Gera ${u.name} óvirka(n)? Innskráning hættir strax að virka.`)) return; void patch(u.id, { active: !u.active }); }}>
                      {u.active ? "Óvirkja" : "Virkja"}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
      </div>

      <div className="space-y-6">
      <form onSubmit={invite} className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="flex items-center gap-2 font-bold"><UserPlus className="h-4 w-4 text-cyan-700" /> Bjóða starfsmanni</h2>
        <p className="text-xs text-slate-500">Starfsfólk með netfang á leyfðu léni getur líka skráð sig sjálft á /vinnustod.</p>
        <label className="block text-sm font-semibold">Nafn<input className={`${inputCls} mt-1`} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></label>
        <label className="block text-sm font-semibold">Netfang<input type="email" className={`${inputCls} mt-1`} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="nafn@hsu.is" required /></label>
        <label className="block text-sm font-semibold">Starfsheiti<input className={`${inputCls} mt-1`} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></label>
        <label className="block text-sm font-semibold">Starfsstöð
          <select className={`${inputCls} mt-1`} value={form.workplaceId} onChange={(e) => setForm({ ...form, workplaceId: e.target.value })}>
            <option value="">— Veldu starfsstöð —</option>
            {(places ?? []).filter((p) => p.active).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <span className="mt-1 block text-xs font-normal text-slate-500">Vantar stöð? Stofnaðu hana undir „Starfsstöðvar“ hér fyrir neðan.</span>
        </label>
        <button className={`${btnPrimary} w-full justify-center`} disabled={busy === "invite"}>Senda boð</button>
        {msg && (
          <div className={`rounded-lg p-3 text-sm ${msg.ok ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-700"}`}>
            {msg.text}
            {msg.url && <CopyLink url={msg.url} />}
          </div>
        )}
      </form>
      <Workplaces places={places} unlinked={unlinked} reload={load} />
      </div>
    </div>
  );
}

function CopyLink({ url }: { url: string }) {
  const [done, setDone] = useState(false);
  return (
    <div className="mt-2">
      <p className="text-xs">Skili pósturinn sér ekki má senda hlekkinn beint:</p>
      <button type="button" onClick={async () => { await navigator.clipboard.writeText(url); setDone(true); setTimeout(() => setDone(false), 1500); }}
        className="mt-1 inline-flex items-center gap-1 rounded bg-white px-2 py-1 text-xs font-semibold text-emerald-800 ring-1 ring-emerald-200">
        {done ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />} {done ? "Afritað" : "Afrita hlekk"}
      </button>
    </div>
  );
}

// ── Tilkynningar ────────────────────────────────────────────────────────────

interface Ann { id: string; created_at: string; created_by: string; title: string; body: string; level: "info" | "warning"; active: boolean; expires_at: string | null }

function AnnouncementsTab() {
  const [rows, setRows] = useState<Ann[] | null>(null);
  // Tíminn þegar listinn var sóttur — til að merkja útrunnar tilkynningar.
  const [loadedAt, setLoadedAt] = useState(0);
  const [form, setForm] = useState({ title: "", body: "", level: "info", expires_at: "" });
  const [err, setErr] = useState<string | null>(null);
  const load = useCallback(async () => {
    const r = await api<{ announcements: Ann[] }>("/api/admin/vinnustod/announcements");
    if (r.ok) { setRows(r.announcements); setLoadedAt(Date.now()); }
  }, []);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);
  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    const r = await api("/api/admin/vinnustod/announcements", { body: { ...form, expires_at: form.expires_at ? new Date(form.expires_at).toISOString() : "" } });
    if (!r.ok) { setErr(r.error ?? "Mistókst"); return; }
    setForm({ title: "", body: "", level: "info", expires_at: "" });
    await load();
  };
  return (
    <div className="grid items-start gap-6 lg:grid-cols-[1fr_340px]">
      <div className="space-y-2">
        {rows === null ? <div className="h-16 animate-pulse rounded-2xl bg-slate-100" />
          : rows.length === 0 ? <p className="rounded-2xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">Engar tilkynningar. Þær birtast efst í vinnustöðinni, t.d. „Nýtt erindi“ eða „Gáttin liggur niðri“.</p>
          : rows.map((a) => {
            const expired = Boolean(a.expires_at && new Date(a.expires_at).getTime() < loadedAt);
            return (
              <div key={a.id} className={`rounded-2xl border p-4 ${a.level === "warning" ? "border-amber-200 bg-amber-50" : "border-slate-200 bg-white"} ${!a.active || expired ? "opacity-50" : ""}`}>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div className="font-bold">{a.title}</div>
                    {a.body && <p className="mt-0.5 whitespace-pre-wrap text-sm text-slate-700">{a.body}</p>}
                    <div className="mt-1 text-xs text-slate-500">{a.created_by} · {fmt(a.created_at)}{a.expires_at ? ` · ${expired ? "rann út" : "rennur út"} ${fmt(a.expires_at)}` : ""}</div>
                  </div>
                  <div className="flex gap-1.5">
                    <button className={btnGhost} onClick={async () => { await api(`/api/admin/vinnustod/announcements/${a.id}`, { method: "PATCH", body: { active: !a.active } }); await load(); }}>{a.active ? "Fela" : "Sýna"}</button>
                    <button className={btnGhost} onClick={async () => { if (!confirm("Eyða tilkynningunni?")) return; await api(`/api/admin/vinnustod/announcements/${a.id}`, { method: "DELETE" }); await load(); }}>Eyða</button>
                  </div>
                </div>
              </div>
            );
          })}
      </div>
      <form onSubmit={create} className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="flex items-center gap-2 font-bold"><Megaphone className="h-4 w-4 text-cyan-700" /> Ný tilkynning</h2>
        <label className="block text-sm font-semibold">Fyrirsögn<input className={`${inputCls} mt-1`} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required /></label>
        <label className="block text-sm font-semibold">Texti<textarea className={`${inputCls} mt-1 min-h-20`} value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} /></label>
        <label className="block text-sm font-semibold">Tegund
          <select className={`${inputCls} mt-1`} value={form.level} onChange={(e) => setForm({ ...form, level: e.target.value })}>
            <option value="info">Upplýsingar</option><option value="warning">Viðvörun (gul)</option>
          </select>
        </label>
        <label className="block text-sm font-semibold">Rennur út <span className="font-normal text-slate-400">(valkvætt)</span>
          <input type="datetime-local" className={`${inputCls} mt-1`} value={form.expires_at} onChange={(e) => setForm({ ...form, expires_at: e.target.value })} />
        </label>
        {err && <p className="text-sm text-red-600">{err}</p>}
        <button className={`${btnPrimary} w-full justify-center`}>Birta</button>
      </form>
    </div>
  );
}

// ── Stillingar ──────────────────────────────────────────────────────────────

function SettingsTab() {
  const [domains, setDomains] = useState("");
  const [emails, setEmails] = useState("");
  const [nudgePhone, setNudgePhone] = useState("");
  const [nudgeMinutes, setNudgeMinutes] = useState("10");
  const [vsAdmins, setVsAdmins] = useState("");
  const [emergency, setEmergency] = useState({ name: "", phone: "", note: "" });
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  useEffect(() => {
    (async () => {
      const r = await api<{ allowedDomains: string[]; notifyEmails: string[]; nudgePhone: string; nudgeAfterMinutes: number; vsAdmins: string[]; emergency: { name: string; phone: string; note: string } }>("/api/admin/vinnustod/settings");
      if (r.ok) {
        setDomains(r.allowedDomains.join(", ")); setEmails(r.notifyEmails.join(", "));
        setNudgePhone(r.nudgePhone ?? ""); setNudgeMinutes(String(r.nudgeAfterMinutes ?? 10));
        setVsAdmins((r.vsAdmins ?? []).join(", "));
        if (r.emergency) setEmergency({ name: r.emergency.name ?? "", phone: r.emergency.phone ?? "", note: r.emergency.note ?? "" });
      }
    })();
  }, []);
  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const r = await api("/api/admin/vinnustod/settings", { method: "PUT", body: { allowedDomains: domains, notifyEmails: emails, nudgePhone, nudgeAfterMinutes: nudgeMinutes, vsAdmins, emergency } });
    setMsg(r.ok ? { ok: true, text: "Vistað." } : { ok: false, text: r.error ?? "Mistókst" });
  };
  return (
    <form onSubmit={save} className="max-w-xl space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
      <label className="block text-sm font-semibold">Lén sem mega nýskrá sig
        <input className={`${inputCls} mt-1`} value={domains} onChange={(e) => setDomains(e.target.value)} placeholder="hsu.is" />
        <span className="mt-1 block text-xs font-normal text-slate-500">Starfsfólk með netfang á þessum lénum getur skráð sig sjálft; staðfesting fer í pósthólf þess. Aðskilið með kommu. Tómt = aðeins boð.</span>
      </label>
      <label className="block text-sm font-semibold">Stjórnendur vinnustöðvar
        <input className={`${inputCls} mt-1`} value={vsAdmins} onChange={(e) => setVsAdmins(e.target.value)} placeholder="mads@fjarlaekningar.is" />
        <span className="mt-1 block text-xs font-normal text-slate-500">Svara spurningum starfsfólks, fá innhólfið og tilkynningar og birtast sem „Stjórnandi“. Aðrir starfsmenn Fjarlækninga eru venjulegir notendur vinnustöðvarinnar. Aðskilið með kommu.</span>
      </label>
      <label className="block text-sm font-semibold">Tilkynningar um nýjar spurningar fara á
        <input className={`${inputCls} mt-1`} value={emails} onChange={(e) => setEmails(e.target.value)} />
      </label>
      <fieldset className="rounded-xl border border-red-200 bg-red-50/50 p-3">
        <legend className="px-1 text-sm font-semibold">Neyðarnúmer Fjarlækninga</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-xs font-semibold text-slate-600">Nafn
            <input className={`${inputCls} mt-1`} value={emergency.name} onChange={(e) => setEmergency({ ...emergency, name: e.target.value })} />
          </label>
          <label className="block text-xs font-semibold text-slate-600">Símanúmer
            <input className={`${inputCls} mt-1`} value={emergency.phone} onChange={(e) => setEmergency({ ...emergency, phone: e.target.value })} inputMode="tel" placeholder="+354 …" />
          </label>
        </div>
        <label className="mt-2 block text-xs font-semibold text-slate-600">Skýring
          <input className={`${inputCls} mt-1`} value={emergency.note} onChange={(e) => setEmergency({ ...emergency, note: e.target.value })} placeholder="t.d. Brýnar spurningar eða bráð tæknivandamál" />
        </label>
        <span className="mt-1 block text-xs text-slate-500">Birtist öllum í vinnustöðinni. Tómt númer = ekki birt.</span>
      </fieldset>
      <fieldset className="rounded-xl bg-slate-50 p-3">
        <legend className="px-1 text-sm font-semibold">SMS ef spurning er ekki opnuð</legend>
        <div className="grid gap-3 sm:grid-cols-[1fr_140px]">
          <label className="block text-xs font-semibold text-slate-600">Símanúmer
            <input className={`${inputCls} mt-1`} value={nudgePhone} onChange={(e) => setNudgePhone(e.target.value)} inputMode="tel" placeholder="+354 …" />
          </label>
          <label className="block text-xs font-semibold text-slate-600">Eftir (mínútur)
            <input className={`${inputCls} mt-1`} type="number" min={1} max={1440} value={nudgeMinutes} onChange={(e) => setNudgeMinutes(e.target.value)} />
          </label>
        </div>
        <span className="mt-1 block text-xs text-slate-500">Eitt SMS þegar spurning frá starfsmanni hefur ekki verið opnuð í svo margar mínútur — ekki aftur fyrr en samtalið hefur verið opnað. Tómt númer = slökkt.</span>
      </fieldset>
      {msg && <p className={`text-sm ${msg.ok ? "text-emerald-700" : "text-red-600"}`}>{msg.text}</p>}
      <button className={btnPrimary}>Vista</button>
    </form>
  );
}
