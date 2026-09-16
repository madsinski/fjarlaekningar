"use client";

// Afritanlegir textar sem má breyta.
//
// Hver texti leysist upp í þessari röð:
//   1. eigin útgáfa notandans (geymd í þessum vafra — t.d. með nafni stöðvar)
//   2. útgáfa sem stjórnandi Fjarlækninga vistaði fyrir alla
//   3. sjálfgefni textinn í src/lib/nurse-guide.ts
// Einnig má breyta texta aðeins fyrir eina sendingu: breyta → afrita, án þess
// að vista.

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, Check, Copy, Pencil, RotateCcw, Send, Users } from "lucide-react";
import { cx } from "@/app/hsu/_components/ui";
import { defaultText, hasPortalLink, textNeedsLink } from "@/lib/nurse-guide";
import { vsApi } from "./shared";

export interface SharedText { text: string; by: string; at: string }

interface TextsCtx {
  shared: Record<string, SharedText>;
  mine: Record<string, string>;
  canShare: boolean;
  saveMine: (id: string, text: string | null) => void;
  saveShared: (id: string, text: string | null) => Promise<string | null>;
}

const Ctx = createContext<TextsCtx | null>(null);

export function TextsProvider({ userKey, canShare, initial, children }: {
  userKey: string; canShare: boolean; initial: Record<string, SharedText>; children: React.ReactNode;
}) {
  const storeKey = `vs-texts:${userKey}`;
  const [shared, setShared] = useState(initial);
  const [mine, setMine] = useState<Record<string, string>>({});

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(storeKey);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (raw) setMine(JSON.parse(raw) as Record<string, string>);
    } catch { /* einkagluggi eða lokað geymslusvæði — sjálfgefnir textar duga */ }
  }, [storeKey]);

  const saveMine = useCallback((id: string, text: string | null) => {
    setMine((prev) => {
      const next = { ...prev };
      if (text === null) delete next[id]; else next[id] = text;
      try { window.localStorage.setItem(storeKey, JSON.stringify(next)); } catch { /* sjá að ofan */ }
      return next;
    });
  }, [storeKey]);

  const saveShared = useCallback(async (id: string, text: string | null) => {
    const r = await vsApi<{ text: string; custom: boolean; by?: string; at?: string }>("/api/admin/vinnustod/texts", {
      method: "PUT", body: { id, text }, staff: true,
    });
    if (!r.ok) return r.error ?? "Ekki tókst að vista";
    setShared((prev) => {
      const next = { ...prev };
      if (r.custom) next[id] = { text: r.text, by: r.by ?? "", at: r.at ?? "" }; else delete next[id];
      return next;
    });
    return null;
  }, []);

  const value = useMemo(() => ({ shared, mine, canShare, saveMine, saveShared }), [shared, mine, canShare, saveMine, saveShared]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

/** Textinn eins og hann á að afritast núna. */
export function useText(id: string) {
  const ctx = useContext(Ctx);
  const base = defaultText(id) ?? "";
  const shared = ctx?.shared[id];
  const mine = ctx?.mine[id];
  return {
    text: mine ?? shared?.text ?? base,
    source: mine !== undefined ? ("mine" as const) : shared ? ("shared" as const) : ("default" as const),
    shared,
    teamText: shared?.text ?? base,
  };
}

export function CopyButton({ text, label = "Afrita", big }: { text: string; label?: string; big?: boolean }) {
  const [done, setDone] = useState(false);
  return (
    <button type="button"
      onClick={async () => { try { await navigator.clipboard.writeText(text); setDone(true); setTimeout(() => setDone(false), 1800); } catch { /* ekkert */ } }}
      className={cx("inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500",
        big ? "px-4 py-2.5 text-sm" : "px-3 py-1.5 text-xs",
        done ? "bg-emerald-600 text-white" : big ? "bg-[var(--hsu)] text-white hover:bg-[var(--hsu-dark)]" : "bg-white text-[var(--hsu-dark)] ring-1 ring-cyan-200 hover:bg-cyan-50")}>
      {done ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
      <span aria-live="polite">{done ? "Afritað" : label}</span>
    </button>
  );
}

const ghostBtn = "inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-semibold text-[var(--hsu-dark)] ring-1 ring-cyan-200 hover:bg-cyan-50 disabled:opacity-50";

/**
 * Afritanlegur texti: les-hamur með „Afrita“ og „Breyta“, og breytihamur með
 * textasvæði. `size="lg"` fyrir aðaltextann í erindi, `sm` í spjöldum.
 */
export function EditableText({ id, size = "lg", copyLabel = "Afrita texta", onSms, className }: {
  id: string; size?: "lg" | "sm"; copyLabel?: string; onSms?: () => void; className?: string;
}) {
  const ctx = useContext(Ctx);
  const { text, source, shared, teamText } = useText(id);
  const [draft, setDraft] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const area = useRef<HTMLTextAreaElement>(null);
  const editing = draft !== null;
  const lg = size === "lg";

  // Nýr texti (t.d. skipt um tungumál) lokar breytiham.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDraft(null); setErr(null);
  }, [id]);
  useEffect(() => {
    if (!editing || !area.current) return;
    const el = area.current;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight + 2}px`;
  }, [editing, draft]);

  const missingLink = draft !== null && textNeedsLink(id) && !hasPortalLink(draft);
  const start = () => { setDraft(text); setErr(null); setTimeout(() => area.current?.focus(), 0); };

  const shareSave = async (value: string | null) => {
    if (!ctx) return;
    setBusy(true); setErr(null);
    const e = await ctx.saveShared(id, value);
    setBusy(false);
    if (e) { setErr(e); return; }
    ctx.saveMine(id, null);
    setDraft(null);
  };

  const body = lg ? "text-[15px] leading-relaxed" : "text-sm leading-relaxed";

  return (
    <div className={className}>
      {draft !== null ? (
        <>
          <label className="sr-only" htmlFor={`t-${id}`}>Breyta texta</label>
          <textarea id={`t-${id}`} ref={area} value={draft} onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Escape") setDraft(null); }}
            className={cx("block w-full resize-none rounded-xl border border-cyan-300 bg-white p-3 text-slate-800 outline-none ring-4 ring-cyan-100 focus:border-cyan-500", body)} />
          {missingLink && (
            <p className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-amber-700">
              <AlertTriangle className="h-4 w-4" /> Hlekkinn vantar — sjúklingurinn þarf slóðina til að byrja.
            </p>
          )}
          {err && <p className="mt-2 text-xs font-semibold text-red-700">{err}</p>}
          <div className="mt-3 flex flex-wrap gap-2">
            <CopyButton text={draft} label="Afrita" big={lg} />
            <button type="button" className={ghostBtn} disabled={busy} onClick={() => { ctx?.saveMine(id, draft === teamText ? null : draft); setDraft(null); }}>
              <Check className="h-4 w-4" /> Vista hjá mér
            </button>
            {ctx?.canShare && (
              <button type="button" className={ghostBtn} disabled={busy || missingLink} onClick={() => shareSave(draft)}>
                <Users className="h-4 w-4" /> {busy ? "Vista…" : "Vista fyrir alla"}
              </button>
            )}
            <button type="button" onClick={() => setDraft(null)} className="rounded-xl px-3 py-2 text-sm font-medium text-slate-500 hover:bg-slate-100">Hætta við</button>
          </div>
          <p className="mt-2 text-[11px] text-slate-500">
            „Afrita“ notar breytinguna aðeins núna. „Vista hjá mér“ geymir hana í þessum vafra
            {ctx?.canShare ? "; „Vista fyrir alla“ breytir textanum hjá öllu starfsfólki." : "."}
          </p>
        </>
      ) : (
        <>
          <p className={cx("whitespace-pre-wrap text-slate-800", body)}>{text}</p>
          {source !== "default" && (
            <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-slate-500">
              {source === "mine" ? (
                <>
                  <span className="rounded-full bg-violet-100 px-2 py-0.5 font-semibold text-violet-800">Þín útgáfa</span>
                  <button type="button" onClick={() => ctx?.saveMine(id, null)} className="inline-flex items-center gap-1 font-semibold text-slate-600 hover:underline">
                    <RotateCcw className="h-3 w-3" /> Nota sameiginlega textann
                  </button>
                </>
              ) : (
                <>
                  <span className="rounded-full bg-cyan-100 px-2 py-0.5 font-semibold text-cyan-900">Aðlagað af Fjarlækningum</span>
                  {shared?.by ? <span>{shared.by}</span> : null}
                  {ctx?.canShare && (
                    <button type="button" disabled={busy} onClick={() => { if (confirm("Setja upprunalega textann aftur hjá öllum?")) void shareSave(null); }}
                      className="inline-flex items-center gap-1 font-semibold text-slate-600 hover:underline">
                      <RotateCcw className="h-3 w-3" /> Upprunalegur texti
                    </button>
                  )}
                </>
              )}
            </p>
          )}
          {err && <p className="mt-2 text-xs font-semibold text-red-700">{err}</p>}
          <div className={cx("flex flex-wrap gap-2", lg ? "mt-4" : "mt-3")}>
            <CopyButton text={text} label={copyLabel} big={lg} />
            <button type="button" onClick={start} className={lg ? ghostBtn : "inline-flex items-center gap-1 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"}>
              <Pencil className={lg ? "h-4 w-4" : "h-3.5 w-3.5"} /> Breyta
            </button>
            {onSms && (
              <button type="button" onClick={onSms} className={ghostBtn}>
                <Send className="h-4 w-4" /> Senda hlekkinn í SMS
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
