"use client";

// Spurningar til Fjarlækninga — tvíhliða samtöl.
//
// Starfsmaður spyr um þjónustuna („Má sjúklingur á brjóstagjöf nota þetta?“),
// Fjarlækningar svara í stjórnborðinu og svarið birtist hér — og í tölvupósti.
// Listinn (QuestionsCard) endurnýjast sjálfur svo svar sjáist án þess að
// endurhlaða; samtal og ný spurning opnast í skúffu.

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, ChevronDown, Loader2, MessageCircle, Send, Trash2 } from "lucide-react";
import { Button, Card, Field, Notice, cx, inputCls } from "@/app/hsu/_components/ui";
import { ENTER_HINT, UnreadDot, onEnterSend, vsApi, whenIs } from "./shared";

interface Thread {
  id: string;
  subject: string;
  status: "open" | "closed";
  last_message_at: string;
  last_author: "user" | "staff";
  unread: boolean;
}
interface Message {
  id: string;
  author_kind: "user" | "staff";
  author_name: string;
  body: string;
  created_at: string;
}

export function NewQuestion({ initial, onCancel, onCreated }: { initial: string; onCancel: () => void; onCreated: (id: string) => void }) {
  const [body, setBody] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy || !body.trim()) return;
    setBusy(true); setErr(null);
    const r = await vsApi<{ id: string }>("/api/vinnustod/threads", { body: { body }, staff: true });
    setBusy(false);
    if (!r.ok) { setErr(r.error ?? "Ekki tókst að senda"); return; }
    onCreated(r.id);
  };
  return (
    <form onSubmit={submit} className="space-y-4">
      <button type="button" onClick={onCancel} className="inline-flex items-center gap-1 text-sm font-semibold text-slate-600 hover:underline">
        <ArrowLeft className="h-4 w-4" /> Til baka
      </button>
      <Card className="space-y-4 p-5">
        <h1 className="text-lg font-bold">Ný spurning</h1>
        <Notice tone="info">Ekki setja nöfn, kennitölur eða aðrar persónuupplýsingar sjúklinga í spurninguna.</Notice>
        <Field label="Spurningin" hint={`Fyrsta línan birtist sem fyrirsögn samtalsins. ${ENTER_HINT}.`}>
          <textarea autoFocus className={cx(inputCls, "min-h-36")} value={body} onChange={(e) => setBody(e.target.value)} maxLength={4000} required
            onKeyDown={(e) => onEnterSend(e, () => e.currentTarget.form?.requestSubmit())}
            placeholder="t.d. Má sjúklingur á brjóstagjöf nota þjónustuna?" />
        </Field>
        {err && <Notice tone="err">{err}</Notice>}
        <Button type="submit" busy={busy}><Send className="h-4 w-4" /> Senda spurningu</Button>
      </Card>
    </form>
  );
}

export function ThreadView({ id, onBack, onRead, refresh = 0 }: { id: string; onBack: () => void; onRead: () => void; refresh?: number }) {
  const [data, setData] = useState<{ thread: Thread; messages: Message[] } | null>(null);
  const [reply, setReply] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const bottom = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    const r = await vsApi<{ thread: Thread; messages: Message[] }>(`/api/vinnustod/threads/${id}`, { staff: true });
    if (r.ok) { setData({ thread: r.thread, messages: r.messages }); onRead(); }
    else setErr(r.error ?? "Samtalið fannst ekki");
  }, [id, onRead]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
    const t = setInterval(() => { void load(); }, 20_000);
    return () => clearInterval(t);
  }, [load]);
  // Ný skilaboð bárust (tafarlaust merki): sækja strax.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (refresh) void load();
  }, [refresh, load]);
  useEffect(() => { bottom.current?.scrollIntoView({ block: "end" }); }, [data?.messages.length]);

  const send = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (busy || !reply.trim()) return;
    setBusy(true); setErr(null);
    const r = await vsApi(`/api/vinnustod/threads/${id}`, { body: { body: reply }, staff: true });
    setBusy(false);
    if (!r.ok) { setErr(r.error ?? "Ekki tókst að senda"); return; }
    setReply("");
    await load();
  };
  const remove = async () => {
    if (!confirm("Eyða samtalinu? Það hverfur líka hjá Fjarlækningum og er ekki hægt að endurheimta.")) return;
    const r = await vsApi(`/api/vinnustod/threads/${id}`, { method: "DELETE", staff: true });
    if (!r.ok) { setErr(r.error ?? "Ekki tókst að eyða"); return; }
    onBack();
  };

  return (
    <div className="space-y-4">
      <button onClick={onBack} className="inline-flex items-center gap-1 text-sm font-semibold text-slate-600 hover:underline">
        <ArrowLeft className="h-4 w-4" /> Öll skilaboð
      </button>
      {!data ? (
        err ? <Notice tone="err">{err}</Notice> : <div className="h-40 animate-pulse rounded-2xl bg-slate-100" />
      ) : (
        <Card className="p-5">
          <h1 className="text-lg font-bold">{data.thread.subject}</h1>
          <div className="mt-4 space-y-3">
            {data.messages.map((m) => (
              <div key={m.id} className={cx("flex", m.author_kind === "user" ? "justify-end" : "justify-start")}>
                <div className={cx("max-w-[85%] rounded-2xl px-4 py-2.5",
                  m.author_kind === "user" ? "bg-[var(--hsu)] text-white" : "border border-slate-200 bg-white")}>
                  <div className={cx("text-[11px] font-semibold", m.author_kind === "user" ? "text-white/80" : "text-[var(--hsu)]")}>
                    {m.author_kind === "staff" ? `${m.author_name} · Fjarlækningar` : "Þú"} · {whenIs(m.created_at)}
                  </div>
                  <p className="mt-0.5 whitespace-pre-wrap text-sm leading-relaxed">{m.body}</p>
                </div>
              </div>
            ))}
            <div ref={bottom} />
          </div>
          <form onSubmit={send} className="mt-5 space-y-2 border-t border-slate-100 pt-4">
            <textarea autoFocus className={cx(inputCls, "min-h-20")} value={reply} onChange={(e) => setReply(e.target.value)} maxLength={4000}
              onKeyDown={(e) => onEnterSend(e, () => void send())}
              placeholder={data.thread.status === "closed" ? "Samtalinu var lokið — skrifaðu til að opna það aftur" : "Skrifa svar…"} />
            {err && <Notice tone="err">{err}</Notice>}
            <div className="flex flex-wrap items-center gap-2">
              <button type="button" onClick={remove} title="Eyða samtalinu hjá báðum"
                className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-semibold text-red-700 ring-1 ring-red-200 hover:bg-red-50">
                <Trash2 className="h-4 w-4" /> Eyða
              </button>
              <span className="ml-auto hidden text-[11px] text-slate-400 sm:inline">{ENTER_HINT}</span>
              <Button type="submit" busy={busy} disabled={!reply.trim()} className="ml-auto sm:ml-0">
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Senda
              </Button>
            </div>
          </form>
        </Card>
      )}
    </div>
  );
}

/**
 * „Samtal við Fjarlækningar“ — EITT samtal á hvern notanda. Lokað sýnir það
 * rauðan punkt og upphaf nýjustu skilaboðanna; opið er það spjall beint í
 * hliðardálkinum. Fyrstu skilaboðin stofna samtalið.
 */
export function ConversationCard({ onUnreadChange, refresh = 0, ask }: {
  onUnreadChange?: (n: number) => void;
  refresh?: number;
  /** Opna spjallið, valfrjálst með drögum (t.d. úr leitinni). nonce breytist við hvert kall. */
  ask?: { text: string; nonce: number } | null;
}) {
  const [thread, setThread] = useState<Thread | null | undefined>(undefined);
  const [open, setOpen] = useState(() => typeof window !== "undefined" && new URLSearchParams(window.location.search).get("t") === "spurningar");
  const [messages, setMessages] = useState<Message[] | null>(null);
  const [reply, setReply] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const box = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLTextAreaElement>(null);
  const root = useRef<HTMLDivElement>(null);

  const loadThread = useCallback(async () => {
    const r = await vsApi<{ threads: Thread[] }>("/api/vinnustod/threads", { staff: true });
    if (!r.ok) return null;
    const t = r.threads[0] ?? null;
    setThread(t);
    onUnreadChange?.(t?.unread ? 1 : 0);
    return t;
  }, [onUnreadChange]);

  const loadMessages = useCallback(async (id: string) => {
    const r = await vsApi<{ messages: Message[] }>(`/api/vinnustod/threads/${id}`, { staff: true });
    if (r.ok) {
      setMessages(r.messages);
      // Opnað = lesið.
      setThread((t) => (t ? { ...t, unread: false } : t));
      onUnreadChange?.(0);
    }
  }, [onUnreadChange]);

  const refreshAll = useCallback(async () => {
    const t = await loadThread();
    // Ný skilaboð merkjast aðeins lesin ef einhver sér þau (flipinn sýnilegur).
    if (open && t && (t.unread ? document.visibilityState === "visible" : true)) await loadMessages(t.id);
    if (open && !t) setMessages([]);
  }, [loadThread, loadMessages, open]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refreshAll();
    const t = setInterval(() => { void refreshAll(); }, 20_000);
    return () => clearInterval(t);
  }, [refreshAll]);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (refresh) void refreshAll();
  }, [refresh, refreshAll]);
  useEffect(() => {
    if (!ask) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (ask.text) setReply(ask.text);
    setTimeout(() => {
      root.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      input.current?.focus();
    }, 100);
  }, [ask]);
  useEffect(() => {
    if (open && box.current) box.current.scrollTop = box.current.scrollHeight;
  }, [open, messages?.length]);

  const send = async () => {
    if (busy || !reply.trim()) return;
    const text = reply;
    // Reiturinn tæmist strax; textinn kemur aftur ef sendingin mistekst.
    setBusy(true); setErr(null); setReply("");
    const r = await vsApi<{ id: string }>("/api/vinnustod/threads", { body: { body: text }, staff: true });
    setBusy(false);
    if (!r.ok) { setReply((cur) => cur || text); setErr(r.error ?? "Ekki tókst að senda"); return; }
    setOpen(true);
    await loadThread();
    await loadMessages(r.id);
  };
  const remove = async () => {
    if (!thread || !confirm("Eyða samtalinu? Það hverfur líka hjá Fjarlækningum og er ekki hægt að endurheimta.")) return;
    const r = await vsApi(`/api/vinnustod/threads/${thread.id}`, { method: "DELETE", staff: true });
    if (!r.ok) { setErr(r.error ?? "Ekki tókst að eyða"); return; }
    setThread(null); setMessages([]);
  };
  const toggle = () => {
    const next = !open;
    setOpen(next);
    if (next && thread) void loadMessages(thread.id);
    if (next && !thread) setMessages([]);
  };

  const unread = thread?.unread ? 1 : 0;
  return (
    <div ref={root}>
      <Card className={cx("overflow-hidden", unread > 0 && "border-red-300 ring-2 ring-red-200")}>
        <button type="button" onClick={toggle} aria-expanded={open} disabled={!thread}
          aria-label={thread ? (open ? "Fela fyrri skilaboð" : "Sýna fyrri skilaboð") : undefined}
          className={cx("flex w-full items-center gap-3 p-4 text-left disabled:cursor-default", unread > 0 ? "bg-red-50/70" : "")}>
          <span className={cx("relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl", unread ? "bg-red-600 text-white" : "bg-[var(--hsu-soft)] text-[var(--hsu)]")}>
            <MessageCircle className="h-5 w-5" />
            <UnreadDot count={unread} className="absolute -right-2 -top-2" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate font-bold text-slate-900">Samtal við Fjarlækningar</span>
            <span className={cx("block truncate text-xs", unread ? "font-semibold text-red-700" : "text-slate-600")}>
              {thread === undefined ? "…"
                : thread ? `${thread.last_author === "staff" ? "Fjarlækningar" : "Þú"}: ${thread.subject} · ${whenIs(thread.last_message_at)}`
                : "Spurning um þjónustuna? Skrifaðu okkur hér."}
            </span>
          </span>
          {thread && <ChevronDown className={cx("h-5 w-5 shrink-0 text-slate-400 transition", open && "rotate-180")} />}
        </button>

        {/* Fyrri skilaboð — opnuð með örinni (þá merkjast þau lesin). */}
        {open && thread && (
          <div ref={box} className="max-h-80 space-y-2.5 overflow-y-auto border-t border-slate-100 bg-slate-50 p-3">
            {messages === null ? <div className="h-16 animate-pulse rounded-lg bg-slate-100" />
              : messages.map((m) => (
                <div key={m.id} className={cx("flex", m.author_kind === "user" ? "justify-end" : "justify-start")}>
                  <div className={cx("max-w-[88%] rounded-2xl px-3 py-2 [overflow-wrap:anywhere]",
                    m.author_kind === "user" ? "bg-[var(--hsu)] text-white" : "border border-slate-200 bg-white")}>
                    <div className={cx("text-[10px] font-semibold", m.author_kind === "user" ? "text-white/80" : "text-[var(--hsu)]")}>
                      {m.author_kind === "staff" ? `${m.author_name} · Fjarlækningar` : "Þú"} · {whenIs(m.created_at)}
                    </div>
                    <p className="mt-0.5 whitespace-pre-wrap text-sm leading-relaxed">{m.body}</p>
                  </div>
                </div>
              ))}
          </div>
        )}

        {/* Skrifað beint — enginn aukahnappur. */}
        <div className="space-y-2 border-t border-slate-100 p-3">
          <textarea ref={input} className={cx(inputCls, "min-h-16")} rows={2} value={reply} maxLength={4000}
            onChange={(e) => setReply(e.target.value)} onKeyDown={(e) => onEnterSend(e, () => void send())}
            placeholder="Skrifaðu Fjarlækningum…" aria-label="Skilaboð til Fjarlækninga" />
          {err && <Notice tone="err">{err}</Notice>}
          <div className="flex flex-wrap items-center gap-2">
            {open && thread && (
              <button type="button" onClick={remove} title="Eyða samtalinu hjá báðum"
                className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold text-red-700 ring-1 ring-red-200 hover:bg-red-50">
                <Trash2 className="h-3.5 w-3.5" /> Eyða
              </button>
            )}
            <span className="text-[10px] text-slate-400">{ENTER_HINT} · engar persónuupplýsingar sjúklinga</span>
            <Button onClick={() => void send()} busy={busy} disabled={!reply.trim()} className="ml-auto">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Senda
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
