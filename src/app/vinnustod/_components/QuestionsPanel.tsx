"use client";

// Spurningar til Fjarlækninga — tvíhliða samtöl.
//
// Starfsmaður spyr um þjónustuna („Má sjúklingur á brjóstagjöf nota þetta?“),
// Fjarlækningar svara í stjórnborðinu og svarið birtist hér — og í tölvupósti.
// Listinn (QuestionsCard) endurnýjast sjálfur svo svar sjáist án þess að
// endurhlaða; samtal og ný spurning opnast í skúffu.

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, Loader2, MessageCircle, Plus, Send } from "lucide-react";
import { Button, Card, Field, Notice, cx, inputCls } from "@/app/hsu/_components/ui";
import { vsApi, whenIs } from "./shared";

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
  const [subject, setSubject] = useState(initial);
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setErr(null);
    const r = await vsApi<{ id: string }>("/api/vinnustod/threads", { body: { subject, body }, staff: true });
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
        <Field label="Fyrirsögn">
          <input className={inputCls} value={subject} onChange={(e) => setSubject(e.target.value)} maxLength={140} placeholder="t.d. Má sjúklingur á brjóstagjöf nota þjónustuna?" required />
        </Field>
        <Field label="Spurningin">
          <textarea className={cx(inputCls, "min-h-36")} value={body} onChange={(e) => setBody(e.target.value)} maxLength={4000} required />
        </Field>
        {err && <Notice tone="err">{err}</Notice>}
        <Button type="submit" busy={busy}><Send className="h-4 w-4" /> Senda spurningu</Button>
      </Card>
    </form>
  );
}

export function ThreadView({ id, onBack, onRead }: { id: string; onBack: () => void; onRead: () => void }) {
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
  useEffect(() => { bottom.current?.scrollIntoView({ block: "end" }); }, [data?.messages.length]);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reply.trim()) return;
    setBusy(true); setErr(null);
    const r = await vsApi(`/api/vinnustod/threads/${id}`, { body: { body: reply }, staff: true });
    setBusy(false);
    if (!r.ok) { setErr(r.error ?? "Ekki tókst að senda"); return; }
    setReply("");
    await load();
  };

  return (
    <div className="space-y-4">
      <button onClick={onBack} className="inline-flex items-center gap-1 text-sm font-semibold text-slate-600 hover:underline">
        <ArrowLeft className="h-4 w-4" /> Allar spurningar
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
            <textarea className={cx(inputCls, "min-h-20")} value={reply} onChange={(e) => setReply(e.target.value)} maxLength={4000}
              placeholder={data.thread.status === "closed" ? "Samtalinu var lokið — skrifaðu til að opna það aftur" : "Skrifa svar…"} />
            {err && <Notice tone="err">{err}</Notice>}
            <div className="flex justify-end">
              <Button type="submit" busy={busy} disabled={!reply.trim()}>
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
 * Spurningar í hliðardálki: nýjustu samtölin og „Ný spurning“. Samtal opnast í
 * skúffu (onOpen) svo leitin og SMS-ið hverfi ekki á meðan.
 */
export function QuestionsCard({ onOpen, onNew, onUnreadChange }: {
  onOpen: (id: string) => void; onNew: () => void; onUnreadChange?: (n: number) => void;
}) {
  const [threads, setThreads] = useState<Thread[] | null>(null);
  const [all, setAll] = useState(false);
  const load = useCallback(async () => {
    const r = await vsApi<{ threads: Thread[] }>("/api/vinnustod/threads", { staff: true });
    if (r.ok) { setThreads(r.threads); onUnreadChange?.(r.threads.filter((t) => t.unread).length); }
  }, [onUnreadChange]);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
    const t = setInterval(() => { void load(); }, 30_000);
    return () => clearInterval(t);
  }, [load]);
  const shown = all ? threads ?? [] : (threads ?? []).slice(0, 4);
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 font-bold text-slate-900">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--hsu-soft)] text-[var(--hsu)]"><MessageCircle className="h-4 w-4" /></span>
          Skilaboð við Fjarlækningar
        </h2>
      </div>
      <p className="mt-1 text-xs text-slate-500">Spurning um þjónustuna? Skrifaðu stjórnanda Fjarlækninga. Svör og skilaboð frá okkur birtast hér og koma í pósti.</p>
      <Button className="mt-3 w-full" onClick={onNew}><Plus className="h-4 w-4" /> Ný spurning</Button>
      <div className="mt-3 divide-y divide-slate-100">
        {threads === null ? <div className="h-12 animate-pulse rounded-lg bg-slate-100" />
          : threads.length === 0 ? <p className="py-2 text-xs text-slate-500">Engin skilaboð enn.</p>
          : shown.map((t) => (
            <button key={t.id} type="button" onClick={() => onOpen(t.id)}
              className={cx("flex w-full items-center gap-2 rounded-lg px-1 py-2 text-left hover:bg-slate-50", t.unread && "font-bold")}>
              {t.unread ? <span className="h-2 w-2 shrink-0 rounded-full bg-[var(--hsu)]" aria-label="Ólesið" /> : <span className="h-2 w-2 shrink-0" />}
              <span className="min-w-0 flex-1 truncate text-sm">{t.subject}</span>
              <span className={cx("shrink-0 text-[10px] font-semibold", t.last_author === "staff" ? "text-emerald-700" : "text-amber-700")}>
                {t.status === "closed" ? "Lokið" : t.last_author === "staff" ? "Frá okkur" : "Bíður"}
              </span>
            </button>
          ))}
      </div>
      {(threads?.length ?? 0) > 4 && (
        <button type="button" onClick={() => setAll((v) => !v)} className="mt-1 text-xs font-semibold text-[var(--hsu-dark)] hover:underline">
          {all ? "Sýna færri" : `Allar spurningar (${threads!.length})`}
        </button>
      )}
    </Card>
  );
}
