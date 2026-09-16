"use client";

// Innhólf Fjarlækninga: samtöl við alla sem nota vinnustöðina — spurningar
// sem berast og skilaboð sem stjórnandi sendir sjálfur („Ný skilaboð“). Notað bæði í
// stjórnborðinu (/admin/vinnustod) og inni í vinnustöðinni sjálfri, þegar
// stjórnandi Fjarlækninga er skráður þar inn.

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, Check, PenSquare, Search, Send, Trash2 } from "lucide-react";
import { ENTER_HINT, onEnterSend } from "@/app/vinnustod/_components/shared";
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
  user: { kind: "vs" | "staff" | "hsu"; name: string; email: string; workplace: string; title: string; active: boolean } | null;
}
interface Recipient { kind: "vs" | "staff" | "hsu"; id: string; name: string; email: string; workplace: string; title: string }
const KIND_IS: Record<Recipient["kind"], string> = { vs: "Vinnustöð", staff: "Starfsfólk", hsu: "Læknar HSU" };
interface Msg { id: string; author_kind: "user" | "staff"; author_name: string; body: string; created_at: string }

export default function Inbox({ onAwaitingChange, refresh = 0, compact = false, composeTo }: {
  onAwaitingChange?: (n: number) => void; refresh?: number;
  /** Opna „Ný skilaboð“ með þennan viðtakanda valinn (nonce breytist við hvern smell). */
  composeTo?: { kind: Recipient["kind"]; id: string; nonce: number } | null;
  /** Í þröngum hliðardálki (vinnustöðin): minna bil, allt í einum dálki. */
  compact?: boolean;
} = {}) {
  const [filter, setFilter] = useState<"open" | "closed" | "all">("open");
  const [threads, setThreads] = useState<InboxThread[] | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [composing, setComposing] = useState(false);
  const [presetTo, setPresetTo] = useState<{ kind: Recipient["kind"]; id: string } | null>(null);
  useEffect(() => {
    if (!composeTo) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPresetTo({ kind: composeTo.kind, id: composeTo.id });
    setOpen(null);
    setComposing(true);
  }, [composeTo]);
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
    const t = setInterval(() => { void load(); }, 20_000);
    return () => clearInterval(t);
  }, [load]);

  // Ný skilaboð bárust (tafarlaust merki): sækja listann strax.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (refresh) void load();
  }, [refresh, load]);

  if (open) return <InboxThreadView id={open} refresh={refresh} compact={compact} onBack={() => { setOpen(null); void load(); }} />;
  if (composing) {
    return <Compose key={presetTo ? `${presetTo.kind}:${presetTo.id}` : "new"} compact={compact} initialTo={presetTo} onCancel={() => { setComposing(false); setPresetTo(null); }} onSent={(id) => { setComposing(false); setOpen(id); void load(); }} />;
  }
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <button className={`${btnPrimary} mr-auto`} onClick={() => setComposing(true)}><PenSquare className="h-4 w-4" /> Ný skilaboð</button>
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
          : threads.length === 0 ? <p className="p-6 text-center text-sm text-slate-500">Engin samtöl.</p>
          : threads.map((t) => (
            <button key={t.id} onClick={() => setOpen(t.id)} className={`flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-slate-50 ${t.unread ? "bg-red-50/70" : ""}`}>
              {t.unread && (
                <span className="relative flex h-3 w-3 shrink-0" aria-label="Ólesið">
                  <span className="absolute h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
                  <span className="relative h-3 w-3 rounded-full bg-red-600" />
                </span>
              )}
              <span className="min-w-0 flex-1">
                <span className={`block truncate text-sm ${t.unread ? "font-bold" : "font-semibold"}`}>{t.subject}</span>
                <span className="block truncate text-xs text-slate-500">{t.user?.name ?? "?"}{t.user?.workplace ? ` · ${t.user.workplace}` : ""} · {fmt(t.last_message_at)}</span>
              </span>
              <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${t.status === "closed" ? "bg-slate-100 text-slate-500" : t.last_author === "user" ? "bg-red-100 text-red-800" : "bg-emerald-100 text-emerald-800"}`}>
                {t.status === "closed" ? "Lokið" : t.last_author === "user" ? "Bíður svars" : "Sent"}
              </span>
            </button>
          ))}
      </div>
    </div>
  );
}

function InboxThreadView({ id, onBack, refresh = 0, compact = false }: { id: string; onBack: () => void; refresh?: number; compact?: boolean }) {
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
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (refresh) void load();
  }, [refresh, load]);
  useEffect(() => { bottom.current?.scrollIntoView({ block: "end" }); }, [data?.messages.length]);

  const send = async () => {
    if (busy || !reply.trim()) return;
    setBusy(true); setErr(null);
    const r = await api(`/api/admin/vinnustod/threads/${id}`, { body: { body: reply } });
    setBusy(false);
    if (!r.ok) { setErr(r.error ?? "Mistókst"); return; }
    setReply("");
    await load();
  };
  const remove = async () => {
    if (!confirm("Eyða samtalinu? Það hverfur líka hjá viðtakandanum og er ekki hægt að endurheimta.")) return;
    const r = await api(`/api/admin/vinnustod/threads/${id}`, { method: "DELETE" });
    if (!r.ok) { setErr(r.error ?? "Ekki tókst að eyða"); return; }
    onBack();
  };
  const setStatus = async (status: "open" | "closed") => {
    await api(`/api/admin/vinnustod/threads/${id}`, { method: "PATCH", body: { status } });
    await load();
  };

  return (
    <div className="space-y-3">
      <button onClick={onBack} className="inline-flex items-center gap-1 text-sm font-semibold text-slate-600 hover:underline"><ArrowLeft className="h-4 w-4" /> Öll samtöl</button>
      {!data ? <div className="h-40 animate-pulse rounded-2xl bg-slate-100" /> : (
        <div className={compact ? "" : "rounded-2xl border border-slate-200 bg-white p-5"}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold">{data.thread.subject}</h2>
              <p className="text-sm text-slate-500">
                {[data.user?.name, [data.user?.title, data.user?.workplace].filter(Boolean).join(", ")].filter(Boolean).join(" · ")}
                {data.user?.email ? <> · <a className="underline" href={`mailto:${data.user.email}`}>{data.user.email}</a></> : null}
                {data.user && !data.user.active ? <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-xs">Óvirkur — fær ekki póst</span> : null}
              </p>
            </div>
          </div>
          <div className="mt-4 space-y-3">
            {data.messages.map((m) => (
              <div key={m.id} className={`flex ${m.author_kind === "staff" ? "justify-end" : "justify-start"}`}>
                <div className={`${compact ? "max-w-[90%] px-3 py-2" : "max-w-[80%] px-4 py-2.5"} rounded-2xl [overflow-wrap:anywhere] ${m.author_kind === "staff" ? "bg-cyan-700 text-white" : "border border-slate-200 bg-slate-50"}`}>
                  <div className={`text-[11px] font-semibold ${m.author_kind === "staff" ? "text-white/80" : "text-slate-500"}`}>{m.author_name} · {fmt(m.created_at)}</div>
                  <p className="mt-0.5 whitespace-pre-wrap text-sm">{m.body}</p>
                </div>
              </div>
            ))}
            <div ref={bottom} />
          </div>
          <div className="mt-5 space-y-2 border-t border-slate-100 pt-4">
            <textarea autoFocus className={`${inputCls} min-h-24`} value={reply} onChange={(e) => setReply(e.target.value)}
              onKeyDown={(e) => onEnterSend(e, () => void send())}
              placeholder="Skilaboð — birtast viðtakandanum í vinnustöðinni og fara í tölvupósti" />
            {err && <p className="text-sm text-red-600">{err}</p>}
            <div className="flex flex-wrap items-center gap-2">
              <button className={`${btn} border border-red-200 bg-white text-red-700 hover:bg-red-50`} onClick={remove} title="Eyða samtalinu hjá báðum">
                <Trash2 className="h-4 w-4" /> Eyða
              </button>
              {data.thread.status === "open"
                ? <button className={btnGhost} onClick={() => setStatus("closed")}><Check className="h-4 w-4" /> Merkja lokið</button>
                : <button className={btnGhost} onClick={() => setStatus("open")}>Opna aftur</button>}
              <button className={`${btnPrimary} ml-auto`} disabled={busy || !reply.trim()} onClick={send}><Send className="h-4 w-4" /> Senda</button>
            </div>
            <p className="text-right text-[11px] text-slate-400">{ENTER_HINT}</p>
          </div>
        </div>
      )}
    </div>
  );
}

/** Stjórnandi hefur samtal: velur viðtakanda og skrifar skilaboð. */
function Compose({ onCancel, onSent, compact = false, initialTo = null }: {
  onCancel: () => void; onSent: (id: string) => void; compact?: boolean; initialTo?: { kind: Recipient["kind"]; id: string } | null;
}) {
  const [people, setPeople] = useState<Recipient[] | null>(null);
  const [q, setQ] = useState("");
  const [to, setTo] = useState<Recipient | null>(null);
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    void api<{ recipients: Recipient[] }>("/api/admin/vinnustod/recipients").then((r) => {
      if (!r.ok) { setErr(r.error ?? "Mistókst"); return; }
      setPeople(r.recipients);
      if (initialTo) setTo(r.recipients.find((x) => x.kind === initialTo.kind && x.id === initialTo.id) ?? null);
    });
  }, [initialTo]);

  const fold = (x: string) => x.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/þ/g, "th").replace(/ð/g, "d").replace(/æ/g, "ae");
  const shown = (people ?? []).filter((p) => !q.trim() || fold(`${p.name} ${p.email} ${p.workplace} ${p.title}`).includes(fold(q.trim())));

  const send = async () => {
    if (!to || busy || !body.trim()) return;
    setBusy(true); setErr(null);
    const r = await api<{ id: string }>("/api/admin/vinnustod/threads", { body: { kind: to.kind, id: to.id, body } });
    setBusy(false);
    if (!r.ok) { setErr(r.error ?? "Mistókst"); return; }
    onSent(r.id);
  };

  return (
    <div className="space-y-3">
      <button onClick={onCancel} className="inline-flex items-center gap-1 text-sm font-semibold text-slate-600 hover:underline"><ArrowLeft className="h-4 w-4" /> Öll samtöl</button>
      <div className={compact ? "space-y-4" : "space-y-4 rounded-2xl border border-slate-200 bg-white p-5"}>
        <h2 className="text-lg font-bold">Ný skilaboð</h2>
        <div>
          <div className="mb-1 text-sm font-semibold text-slate-700">Til</div>
          {to ? (
            <div className="flex items-center justify-between gap-3 rounded-lg border border-cyan-300 bg-cyan-50 px-3 py-2">
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold">{to.name}</span>
                <span className="block truncate text-xs text-slate-500">{[to.title, to.workplace, to.email].filter(Boolean).join(" · ")}</span>
              </span>
              <button className="text-xs font-semibold text-cyan-800 hover:underline" onClick={() => setTo(null)}>Breyta</button>
            </div>
          ) : (
            <>
              <label className="relative block">
                <span className="sr-only">Leita að viðtakanda</span>
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input autoFocus className={`${inputCls} pl-9`} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Nafn, netfang eða vinnustaður" />
              </label>
              <div className="mt-2 max-h-72 overflow-y-auto rounded-lg border border-slate-200">
                {people === null ? <div className="m-3 h-10 animate-pulse rounded bg-slate-100" />
                  : shown.length === 0 ? <p className="p-3 text-sm text-slate-500">Enginn fannst.</p>
                  : (["vs", "staff", "hsu"] as const).map((k) => {
                    const group = shown.filter((p) => p.kind === k);
                    if (!group.length) return null;
                    return (
                      <div key={k}>
                        <div className="sticky top-0 bg-slate-50 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-slate-500">{KIND_IS[k]}</div>
                        {group.map((p) => (
                          <button key={`${p.kind}:${p.id}`} onClick={() => setTo(p)} className="flex w-full flex-col px-3 py-2 text-left hover:bg-cyan-50">
                            <span className="text-sm font-semibold">{p.name}</span>
                            <span className="text-xs text-slate-500">{[p.workplace, p.email].filter(Boolean).join(" · ")}</span>
                          </button>
                        ))}
                      </div>
                    );
                  })}
              </div>
            </>
          )}
        </div>
        <label className="block">
          <span className="mb-1 block text-sm font-semibold text-slate-700">Skilaboð</span>
          <textarea className={`${inputCls} min-h-32`} value={body} maxLength={4000} onChange={(e) => setBody(e.target.value)}
            onKeyDown={(e) => onEnterSend(e, () => void send())}
            placeholder={`Fyrsta línan birtist sem fyrirsögn hjá viðtakandanum. ${ENTER_HINT}.`} />
        </label>
        <p className="text-xs text-slate-500">Viðtakandinn sér skilaboðin í vinnustöðinni (fjarlaekningar.is/vinnustod), fær tölvupóst og getur svarað þar.</p>
        {err && <p className="text-sm text-red-600">{err}</p>}
        <div className="flex justify-end gap-2">
          <button className={btnGhost} onClick={onCancel}>Hætta við</button>
          <button className={btnPrimary} disabled={busy || !to || !body.trim()} onClick={send}><Send className="h-4 w-4" /> Senda</button>
        </div>
      </div>
    </div>
  );
}
