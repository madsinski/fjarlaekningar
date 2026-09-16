"use client";

// Afritanlegir textar. Allir afrita; aðeins stjórnandi Fjarlækninga (með
// tveggja þrepa auðkenningu) breytir þeim, og breytingin gildir hjá öllum.
// Textinn er útgáfa stjórnanda (gatt_settings `text:<id>`) eða sjálfgefni
// textinn í src/lib/nurse-guide.ts. Þjónninn framfylgir sömu reglu.

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, Check, Copy, Pencil, RotateCcw, Send } from "lucide-react";
import { cx } from "@/app/hsu/_components/ui";
import { defaultText, hasPortalLink, textNeedsLink, type GuideAnswer } from "@/lib/nurse-guide";
import { vsApi } from "./shared";

export interface SharedText { text: string; by: string; at: string }
/** Efni sem kemur af vefnum (sjá src/lib/vinnustod/guide-content.ts). */
export interface GuideContent { answers: GuideAnswer[]; livePages: string[] }

interface TextsCtx {
  shared: Record<string, SharedText>;
  guide: GuideContent;
  canEdit: boolean;
  save: (id: string, text: string | null) => Promise<string | null>;
}

const Ctx = createContext<TextsCtx | null>(null);

export function TextsProvider({ canEdit, initial, guide, children }: {
  canEdit: boolean; initial: Record<string, SharedText>; guide: GuideContent; children: React.ReactNode;
}) {
  const [shared, setShared] = useState(initial);

  const save = useCallback(async (id: string, text: string | null) => {
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

  const value = useMemo(() => ({ shared, guide, canEdit, save }), [shared, guide, canEdit, save]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

/** Textinn eins og hann á að afritast núna. */
export function useText(id: string) {
  const ctx = useContext(Ctx);
  const shared = ctx?.shared[id];
  return { text: shared?.text ?? defaultText(id, ctx?.guide) ?? "", shared };
}

const NO_GUIDE: GuideContent = { answers: [], livePages: [] };
/** Algengar spurningar af vefnum og hvaða erindasíður eru opnar. */
export function useGuideContent(): GuideContent {
  return useContext(Ctx)?.guide ?? NO_GUIDE;
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
 * Afritanlegur texti með „Afrita“. Stjórnandi fær líka „Breyta“ og vistar
 * fyrir alla. `size="lg"` fyrir aðaltextann í erindi, `sm` í spjöldum.
 */
export function EditableText({ id, size = "lg", copyLabel = "Afrita texta", onSms, className }: {
  id: string; size?: "lg" | "sm"; copyLabel?: string; onSms?: () => void; className?: string;
}) {
  const ctx = useContext(Ctx);
  const canEdit = Boolean(ctx?.canEdit);
  const { text, shared } = useText(id);
  const [draft, setDraft] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const area = useRef<HTMLTextAreaElement>(null);
  const lg = size === "lg";

  // Nýr texti (t.d. skipt um tungumál) lokar breytiham.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDraft(null); setErr(null);
  }, [id]);
  useEffect(() => {
    if (draft === null || !area.current) return;
    const el = area.current;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight + 2}px`;
  }, [draft]);

  const missingLink = draft !== null && textNeedsLink(id) && !hasPortalLink(draft);

  const save = async (value: string | null) => {
    if (!ctx) return;
    setBusy(true); setErr(null);
    const e = await ctx.save(id, value);
    setBusy(false);
    if (e) { setErr(e); return; }
    setDraft(null);
  };

  // Langar slóðir mega brotna hvar sem er, annars flæða þær út fyrir spjaldið.
  const body = cx("whitespace-pre-wrap [overflow-wrap:anywhere]", lg ? "text-[15px] leading-relaxed" : "text-sm leading-relaxed");

  return (
    <div className={cx("min-w-0", className)}>
      {draft !== null ? (
        <>
          <label className="sr-only" htmlFor={`t-${id}`}>Breyta texta</label>
          <textarea id={`t-${id}`} ref={area} value={draft} onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Escape") setDraft(null); }}
            className={cx("block w-full resize-none rounded-xl border border-cyan-300 bg-white p-3 text-slate-800 outline-none ring-4 ring-cyan-100 focus:border-cyan-500", body)} />
          {missingLink && (
            <p className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-amber-700">
              <AlertTriangle className="h-4 w-4 shrink-0" /> Hlekkinn vantar — sjúklingurinn þarf slóðina til að byrja.
            </p>
          )}
          {err && <p className="mt-2 text-xs font-semibold text-red-700">{err}</p>}
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" disabled={busy || missingLink} onClick={() => save(draft)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--hsu)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--hsu-dark)] disabled:opacity-50">
              <Check className="h-4 w-4" /> {busy ? "Vista…" : "Vista fyrir alla"}
            </button>
            <button type="button" onClick={() => setDraft(null)} className="rounded-xl px-3 py-2 text-sm font-medium text-slate-500 hover:bg-slate-100">Hætta við</button>
          </div>
          <p className="mt-2 text-[11px] text-slate-500">Breytingin birtist strax hjá öllu starfsfólki sem notar vinnustöðina.</p>
        </>
      ) : (
        <>
          <p className={cx("text-slate-800", body)}>{text}</p>
          {canEdit && shared && (
            <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-slate-500">
              <span className="rounded-full bg-cyan-100 px-2 py-0.5 font-semibold text-cyan-900">Breyttur texti</span>
              {shared.by ? <span>{shared.by}</span> : null}
              <button type="button" disabled={busy} onClick={() => { if (confirm("Setja upprunalega textann aftur hjá öllum?")) void save(null); }}
                className="inline-flex items-center gap-1 font-semibold text-slate-600 hover:underline">
                <RotateCcw className="h-3 w-3" /> Upprunalegur texti
              </button>
            </p>
          )}
          {err && <p className="mt-2 text-xs font-semibold text-red-700">{err}</p>}
          <div className={cx("flex flex-wrap gap-2", lg ? "mt-4" : "mt-3")}>
            <CopyButton text={text} label={copyLabel} big={lg} />
            {canEdit && (
              <button type="button" onClick={() => { setDraft(text); setErr(null); setTimeout(() => area.current?.focus(), 0); }}
                className={lg ? ghostBtn : "inline-flex items-center gap-1 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"}>
                <Pencil className={lg ? "h-4 w-4" : "h-3.5 w-3.5"} /> Breyta
              </button>
            )}
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
