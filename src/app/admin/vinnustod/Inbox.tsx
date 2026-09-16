"use client";

// Innhólf Fjarlækninga: spurningar starfsfólks úr vinnustöðinni. Notað bæði í
// stjórnborðinu (/admin/vinnustod) og inni í vinnustöðinni sjálfri, þegar
// stjórnandi Fjarlækninga er skráður þar inn.

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, Check, Send } from "lucide-react";
import { supabase } from "@/lib/supabase";

async function api<T = Record<string, unknown>>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T & { ok: boolean; error?: string }> {
  const { data: { session } } = await supabase.auth.getSession();
  const res = await fetch(path, {
    method: init.method ?? (init.body ? "POST" : "GET"),
    headers: { "Content-Type": "application/json", ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}) },
    body: init.body ? JSON.stringify(init.body) : undefined,
  });
  return res.json().catch(() => ({ ok: false, error: `Villa (${res.status})` }));
}

const fmt = (iso: string | null) => {
  if (!iso) return "—";
  const d = new Date(iso);
  return `${d.getDate()}.${d.getMonth() + 1}. kl. ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};
const inputCls = "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100";
const btn = "inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold disabled:opacity-40";
const btnPrimary = `${btn} bg-cyan-700 text-white hover:bg-cyan-800`;
const btnGhost = `${btn} border border-slate-300 bg-white text-slate-700 hover:bg-slate-50`;


interface InboxThread {
  id: string; subject: string; status: "open" | "closed"; last_message_at: string; last_author: "user" | "staff"; unread: boolean;
  user: { name: string; email: string; workplace: string; title: string } | null;
}
interface Msg { id: string; author_kind: "user" | "staff"; author_name: string; body: string; created_at: string }

export default function Inbox({ onAwaitingChange }: { onAwaitingChange?: (n: number) => void } = {}) {
  const [filter, setFilter] = useState<"open" | "closed" | "all">("open");
  const [threads, setThreads] = useState<InboxThread[] | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    const r = await api<{ threads: InboxThread[] }>(`/api/admin/vinnustod/threads${filter === "all" ? "" : `?status=${filter}`}`);
    if (r.ok) {
      setThreads(r.threads);
      setErr(null);
      if (filter === "open") onAwaitingChange?.(r.threads.filter((t) => t.last_author === "user").length);
    } else setErr(r.error ?? "Mistókst");
  }, [filter, onAwaitingChange]);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
    const t = setInterval(() => { void load(); }, 30_000);
    return () => clearInterval(t);
  }, [load]);

  if (open) return <InboxThreadView id={open} onBack={() => { setOpen(null); void load(); }} />;
  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        {(["open", "closed", "all"] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className={`rounded-full px-3 py-1 text-sm font-medium ${filter === f ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600"}`}>
            {{ open: "Opnar", closed: "Lokið", all: "Allar" }[f]}
          </button>
        ))}
      </div>
      {err && <p className="text-sm text-red-600">{err}</p>}
      <div className="divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white">
        {threads === null ? <div className="m-4 h-16 animate-pulse rounded-lg bg-slate-100" />
          : threads.length === 0 ? <p className="p-6 text-center text-sm text-slate-500">Engar spurningar.</p>
          : threads.map((t) => (
            <button key={t.id} onClick={() => setOpen(t.id)} className={`flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-slate-50 ${t.unread ? "bg-cyan-50/60" : ""}`}>
              {t.unread && <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-cyan-600" />}
              <span className="min-w-0 flex-1">
                <span className={`block truncate text-sm ${t.unread ? "font-bold" : "font-semibold"}`}>{t.subject}</span>
                <span className="block truncate text-xs text-slate-500">{t.user?.name ?? "?"}{t.user?.workplace ? ` · ${t.user.workplace}` : ""} · {fmt(t.last_message_at)}</span>
              </span>
              <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${t.status === "closed" ? "bg-slate-100 text-slate-500" : t.last_author === "user" ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"}`}>
                {t.status === "closed" ? "Lokið" : t.last_author === "user" ? "Bíður svars" : "Svarað"}
              </span>
            </button>
          ))}
      </div>
    </div>
  );
}

function InboxThreadView({ id, onBack }: { id: string; onBack: () => void }) {
  const [data, setData] = useState<{ thread: InboxThread; user: InboxThread["user"]; messages: Msg[] } | null>(null);
  const [reply, setReply] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const bottom = useRef<HTMLDivElement>(null);
  const load = useCallback(async () => {
    const r = await api<{ thread: InboxThread; user: InboxThread["user"]; messages: Msg[] }>(`/api/admin/vinnustod/threads/${id}`);
    if (r.ok) setData({ thread: r.thread, user: r.user, messages: r.messages }); else setErr(r.error ?? "Mistókst");
  }, [id]);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);
  useEffect(() => { bottom.current?.scrollIntoView({ block: "end" }); }, [data?.messages.length]);

  const send = async () => {
    setBusy(true); setErr(null);
    const r = await api(`/api/admin/vinnustod/threads/${id}`, { body: { body: reply } });
    setBusy(false);
    if (!r.ok) { setErr(r.error ?? "Mistókst"); return; }
    setReply("");
    await load();
  };
  const setStatus = async (status: "open" | "closed") => {
    await api(`/api/admin/vinnustod/threads/${id}`, { method: "PATCH", body: { status } });
    await load();
  };

  return (
    <div className="space-y-3">
      <button onClick={onBack} className="inline-flex items-center gap-1 text-sm font-semibold text-slate-600 hover:underline"><ArrowLeft className="h-4 w-4" /> Allar spurningar</button>
      {!data ? <div className="h-40 animate-pulse rounded-2xl bg-slate-100" /> : (
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold">{data.thread.subject}</h2>
              <p className="text-sm text-slate-500">
                {data.user?.name} · {data.user?.title}{data.user?.workplace ? `, ${data.user.workplace}` : ""} · <a className="underline" href={`mailto:${data.user?.email}`}>{data.user?.email}</a>
              </p>
            </div>
            {data.thread.status === "open"
              ? <button className={btnGhost} onClick={() => setStatus("closed")}><Check className="h-4 w-4" /> Merkja lokið</button>
              : <button className={btnGhost} onClick={() => setStatus("open")}>Opna aftur</button>}
          </div>
          <div className="mt-4 space-y-3">
            {data.messages.map((m) => (
              <div key={m.id} className={`flex ${m.author_kind === "staff" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${m.author_kind === "staff" ? "bg-cyan-700 text-white" : "border border-slate-200 bg-slate-50"}`}>
                  <div className={`text-[11px] font-semibold ${m.author_kind === "staff" ? "text-white/80" : "text-slate-500"}`}>{m.author_name} · {fmt(m.created_at)}</div>
                  <p className="mt-0.5 whitespace-pre-wrap text-sm">{m.body}</p>
                </div>
              </div>
            ))}
            <div ref={bottom} />
          </div>
          <div className="mt-5 space-y-2 border-t border-slate-100 pt-4">
            <textarea className={`${inputCls} min-h-24`} value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Svar — birtist starfsmanninum í vinnustöðinni og fer í tölvupósti" />
            {err && <p className="text-sm text-red-600">{err}</p>}
            <div className="flex justify-end"><button className={btnPrimary} disabled={busy || !reply.trim()} onClick={send}><Send className="h-4 w-4" /> Senda svar</button></div>
          </div>
        </div>
      )}
    </div>
  );
}
