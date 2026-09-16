"use client";

// Vinnustöð — stjórnun: spurningar starfsfólks, notendur, tilkynningar og
// stillingar. Aðeins stjórnandi með tveggja þrepa auðkenningu.

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, Check, Copy, Megaphone, MessageCircle, RefreshCw, Send, Settings, UserPlus, Users } from "lucide-react";
import { supabase } from "@/lib/supabase";
import Inbox from "./Inbox";

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
  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: "spurningar", label: "Spurningar", icon: <MessageCircle className="h-4 w-4" /> },
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
        <a href="/vinnustod" target="_blank" rel="noopener" className={btnGhost}>Opna vinnustöðina</a>
      </div>
      <div className="mt-5 flex flex-wrap gap-1 border-b border-slate-200">
        {tabs.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`-mb-px inline-flex items-center gap-1.5 border-b-2 px-3 py-2 text-sm font-semibold ${tab === t.key ? "border-cyan-600 text-cyan-800" : "border-transparent text-slate-500 hover:text-slate-800"}`}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>
      <div className="mt-6">
        {tab === "spurningar" && <Inbox />}
        {tab === "notendur" && <UsersTab />}
        {tab === "tilkynningar" && <AnnouncementsTab />}
        {tab === "stillingar" && <SettingsTab />}
      </div>
    </div>
  );
}

// ── Notendur ────────────────────────────────────────────────────────────────

interface VsUserRow {
  id: string; name: string; email: string; workplace: string; title: string; active: boolean; source: string;
  activated: boolean; has_pin: boolean; invite_pending: boolean; last_login_at: string | null; created_at: string;
}

function UsersTab() {
  const [users, setUsers] = useState<VsUserRow[] | null>(null);
  const [form, setForm] = useState({ name: "", email: "", title: "Hjúkrunarfræðingur", workplace: "" });
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string; url?: string } | null>(null);

  const load = useCallback(async () => {
    const r = await api<{ users: VsUserRow[] }>("/api/admin/vinnustod/users");
    if (r.ok) setUsers(r.users); else setMsg({ ok: false, text: r.error ?? "Mistókst" });
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
    setForm({ name: "", email: "", title: "Hjúkrunarfræðingur", workplace: form.workplace });
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
    <div className="grid items-start gap-6 lg:grid-cols-[1fr_340px]">
      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr><th className="px-4 py-2">Nafn</th><th className="px-4 py-2">Starfsstöð</th><th className="px-4 py-2">Staða</th><th className="px-4 py-2">Síðast inni</th><th /></tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {users === null ? <tr><td colSpan={5} className="p-4"><div className="h-12 animate-pulse rounded bg-slate-100" /></td></tr>
              : users.length === 0 ? <tr><td colSpan={5} className="p-6 text-center text-slate-500">Engir notendur enn.</td></tr>
              : users.map((u) => (
                <tr key={u.id} className={u.active ? "" : "opacity-50"}>
                  <td className="px-4 py-2.5"><div className="font-semibold">{u.name}</div><div className="text-xs text-slate-500">{u.email} · {u.title}</div></td>
                  <td className="px-4 py-2.5 text-slate-600">{u.workplace || "—"}</td>
                  <td className="px-4 py-2.5">
                    {!u.active ? <span className="text-xs font-semibold text-slate-500">Óvirkur</span>
                      : u.activated ? <span className="text-xs font-semibold text-emerald-700">Virkur{u.has_pin ? " · kóði" : ""}</span>
                      : u.invite_pending ? <span className="text-xs font-semibold text-amber-700">Boð sent{u.source === "signup" ? " (nýskráning)" : ""}</span>
                      : <span className="text-xs font-semibold text-red-600">Boð útrunnið</span>}
                  </td>
                  <td className="px-4 py-2.5 text-xs text-slate-500">{fmt(u.last_login_at)}</td>
                  <td className="px-4 py-2.5 text-right">
                    <div className="flex justify-end gap-1.5">
                      <button className={btnGhost} disabled={busy === u.id} onClick={() => patch(u.id, { action: "resend" })} title={u.activated ? "Senda hlekk til að velja nýtt lykilorð" : "Senda boðið aftur"}>
                        <RefreshCw className="h-3.5 w-3.5" /> {u.activated ? "Nýtt lykilorð" : "Senda aftur"}
                      </button>
                      <button className={btnGhost} disabled={busy === u.id} onClick={() => { if (u.active && !confirm(`Gera ${u.name} óvirka(n)? Innskráning hættir strax að virka.`)) return; void patch(u.id, { active: !u.active }); }}>
                        {u.active ? "Óvirkja" : "Virkja"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      <form onSubmit={invite} className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="flex items-center gap-2 font-bold"><UserPlus className="h-4 w-4 text-cyan-700" /> Bjóða starfsmanni</h2>
        <p className="text-xs text-slate-500">Starfsfólk með netfang á leyfðu léni getur líka skráð sig sjálft á /vinnustod.</p>
        <label className="block text-sm font-semibold">Nafn<input className={`${inputCls} mt-1`} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></label>
        <label className="block text-sm font-semibold">Netfang<input type="email" className={`${inputCls} mt-1`} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="nafn@hsu.is" required /></label>
        <label className="block text-sm font-semibold">Starfsheiti<input className={`${inputCls} mt-1`} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></label>
        <label className="block text-sm font-semibold">Starfsstöð<input className={`${inputCls} mt-1`} value={form.workplace} onChange={(e) => setForm({ ...form, workplace: e.target.value })} placeholder="t.d. HSU Vestmannaeyjum" /></label>
        <button className={`${btnPrimary} w-full justify-center`} disabled={busy === "invite"}>Senda boð</button>
        {msg && (
          <div className={`rounded-lg p-3 text-sm ${msg.ok ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-700"}`}>
            {msg.text}
            {msg.url && <CopyLink url={msg.url} />}
          </div>
        )}
      </form>
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
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  useEffect(() => {
    (async () => {
      const r = await api<{ allowedDomains: string[]; notifyEmails: string[] }>("/api/admin/vinnustod/settings");
      if (r.ok) { setDomains(r.allowedDomains.join(", ")); setEmails(r.notifyEmails.join(", ")); }
    })();
  }, []);
  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const r = await api("/api/admin/vinnustod/settings", { method: "PUT", body: { allowedDomains: domains, notifyEmails: emails } });
    setMsg(r.ok ? { ok: true, text: "Vistað." } : { ok: false, text: r.error ?? "Mistókst" });
  };
  return (
    <form onSubmit={save} className="max-w-xl space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
      <label className="block text-sm font-semibold">Lén sem mega nýskrá sig
        <input className={`${inputCls} mt-1`} value={domains} onChange={(e) => setDomains(e.target.value)} placeholder="hsu.is" />
        <span className="mt-1 block text-xs font-normal text-slate-500">Starfsfólk með netfang á þessum lénum getur skráð sig sjálft; staðfesting fer í pósthólf þess. Aðskilið með kommu. Tómt = aðeins boð.</span>
      </label>
      <label className="block text-sm font-semibold">Tilkynningar um nýjar spurningar fara á
        <input className={`${inputCls} mt-1`} value={emails} onChange={(e) => setEmails(e.target.value)} />
      </label>
      {msg && <p className={`text-sm ${msg.ok ? "text-emerald-700" : "text-red-600"}`}>{msg.text}</p>}
      <button className={btnPrimary}>Vista</button>
    </form>
  );
}
