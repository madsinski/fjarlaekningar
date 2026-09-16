"use client";

// Spurningar til Fjarlækninga — tvíhliða samtöl.
//
// Starfsmaður spyr um þjónustuna („Má sjúklingur á brjóstagjöf nota þetta?“),
// Fjarlækningar svara í stjórnborðinu og svarið birtist hér — og í tölvupósti.
// Listinn endurnýjast sjálfur svo svar sjáist án þess að endurhlaða.

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, Loader2, MessageCircle, Plus, Send } from "lucide-react";
import { Badge, Button, Card, Field, Notice, cx, inputCls, timeAgoIs } from "@/app/hsu/_components/ui";
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

export default function QuestionsPanel({ onUnreadChange, initialCompose }: { onUnreadChange?: (n: number) => void; initialCompose?: string }) {
  const [threads, setThreads] = useState<Thread[] | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [composing, setComposing] = useState(Boolean(initialCompose));

  const load = useCallback(async () => {
    const r = await vsApi<{ threads: Thread[] }>("/api/vinnustod/threads");
    if (r.ok) {
      setThreads(r.threads);
      onUnreadChange?.(r.threads.filter((t) => t.unread).length);
    }
  }, [onUnreadChange]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
    const t = setInterval(() => { void load(); }, 30_000);
    return () => clearInterval(t);
  }, [load]);

  if (open) return <ThreadView id={open} onRead={load} onBack={() => { setOpen(null); void load(); }} />;
  if (composing) {
    return <NewQuestion initial={initialCompose ?? ""} onCancel={() => setComposing(false)}
      onCreated={(id) => { setComposing(false); setOpen(id); void load(); }} />;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">Spurningar til Fjarlækninga</h1>
          <p className="text-sm text-slate-500">Spyrðu okkur um þjónustuna. Við svörum hér og þú færð tölvupóst.</p>
        </div>
        <Button onClick={() => setComposing(true)}><Plus className="h-4 w-4" /> Ný spurning</Button>
      </div>

      <Card className="divide-y divide-slate-100">
        {threads === null ? (
          <div className="m-4 h-20 animate-pulse rounded-xl bg-slate-100" />
        ) : threads.length === 0 ? (
          <div className="p-8 text-center">
            <MessageCircle className="mx-auto h-8 w-8 text-slate-300" />
            <p className="mt-2 text-sm text-slate-600">Engar spurningar enn. Sé eitthvað óljóst um þjónustuna máttu spyrja okkur hvenær sem er.</p>
          </div>
        ) : (
          threads.map((t) => (
            <button key={t.id} onClick={() => setOpen(t.id)}
              className={cx("flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-slate-50", t.unread && "bg-[var(--hsu-soft)]")}>
              {t.unread && <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-[var(--hsu)]" aria-label="Ólesið svar" />}
              <span className="min-w-0 flex-1">
                <span className={cx("block truncate text-sm", t.unread ? "font-bold" : "font-semibold")}>{t.subject}</span>
                <span className="block text-xs text-slate-500">
                  {t.last_author === "staff" ? "Fjarlækningar svöruðu" : "Bíður svars"} · {timeAgoIs(t.last_message_at)}
                </span>
              </span>
              {t.status === "closed" ? <Badge>Lokið</Badge> : t.last_author === "staff" ? <Badge tone="green">Svarað</Badge> : <Badge tone="amber">Bíður</Badge>}
            </button>
          ))
        )}
      </Card>
    </div>
  );
}

function NewQuestion({ initial, onCancel, onCreated }: { initial: string; onCancel: () => void; onCreated: (id: string) => void }) {
  const [subject, setSubject] = useState(initial);
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setErr(null);
    const r = await vsApi<{ id: string }>("/api/vinnustod/threads", { body: { subject, body } });
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

function ThreadView({ id, onBack, onRead }: { id: string; onBack: () => void; onRead: () => void }) {
  const [data, setData] = useState<{ thread: Thread; messages: Message[] } | null>(null);
  const [reply, setReply] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const bottom = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    const r = await vsApi<{ thread: Thread; messages: Message[] }>(`/api/vinnustod/threads/${id}`);
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
    const r = await vsApi(`/api/vinnustod/threads/${id}`, { body: { body: reply } });
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
