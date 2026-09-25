"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowLeft, ChevronRight, ExternalLink, Hand, MessageSquare, Phone, RotateCcw, TestTube, X, type LucideIcon } from "lucide-react";
import {
  PORTAL_URL, TK, TRIAGE, TRIAGE_START,
  type ServiceKey, type TriageExample, type TriageOption, type TriageResult, type TriageStep,
} from "@/lib/triage";
import type { LocaleContent } from "@/lib/site-content/types";

// The popup behind "Opna sjúklingagátt". The tree and the reasoning for its
// scope live in src/lib/triage.ts; every word comes from the CMS (`text`,
// already resolved for the page's language). This file is only the UI:
// TriagePanel is the card's contents, TriageDialog the modal around it. The CMS
// preview renders TriagePanel inline, so editors see exactly what visitors do.
//
// Same hand-rolled pattern as the site's other overlays (Screenshot, TeamGrid):
// portal to <body>, Escape and backdrop close, body scroll locked while open.
// Bottom sheet on phones, centred card from sm up.

const TONE: Record<ServiceKey, { badge: string; ring: string }> = {
  "112": { badge: "bg-red-600 text-white", ring: "border-red-200 bg-red-50" },
  brada: { badge: "bg-red-600 text-white", ring: "border-red-200 bg-red-50" },
  "1700": { badge: "bg-amber-500 text-white", ring: "border-amber-200 bg-amber-50" },
  heilsugaesla: { badge: "bg-[var(--slate-deep)] text-white", ring: "border-slate-200 bg-slate-50" },
  heilsuvera: { badge: "bg-[var(--slate-deep)] text-white", ring: "border-slate-200 bg-slate-50" },
  "other-adult": { badge: "bg-[var(--slate-deep)] text-white", ring: "border-slate-200 bg-slate-50" },
  fjar: { badge: "bg-[var(--primary-dark)] text-white", ring: "border-brand-cyan-muted bg-brand-cyan-subtle" },
};


const LINE_ICONS: Record<string, LucideIcon> = {
  "test-tube": TestTube, hand: Hand, "message-square": MessageSquare, phone: Phone,
};

const lines = (v: string | undefined) => (v ?? "").split("\n").map((l) => l.trim()).filter(Boolean);
const paragraphs = (v: string | undefined) => (v ?? "").split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);

// Mounted only while open (see TriageTrigger), so every open starts from the
// top: a half-finished path from last time is more confusing than helpful.
export default function TriageDialog({
  onClose,
  text,
  examples,
}: {
  onClose: () => void;
  text: LocaleContent;
  examples?: TriageExample[];
}) {
  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
      opener?.focus();
    };
  }, [onClose]);

  return createPortal(
    <div
      className="fixed inset-0 z-[10060] flex items-end justify-center bg-slate-900/50 p-0 sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="triage-heading"
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:max-w-lg sm:rounded-3xl"
      >
        <TriagePanel text={text} examples={examples} onClose={onClose} />
      </div>
    </div>,
    document.body,
  );
}

/** The card's contents: header, current screen, footer. Remount (key) to reset. */
export function TriagePanel({
  text,
  examples = [],
  onClose,
  initial,
  focusOnMount = true,
  onScreen,
}: {
  text: LocaleContent;
  /** Services pictured under "Algengt vandamál" (see triageExamples). */
  examples?: TriageExample[];
  /** Omit for the inline CMS preview: no close button. */
  onClose?: () => void;
  initial?: TriageStep[];
  focusOnMount?: boolean;
  /** Reports the screen now showing (the CMS preview highlights it). */
  onScreen?: (id: string) => void;
}) {
  const ui = (name: string) => text[TK.ui(name)] ?? "";
  const [steps, setSteps] = useState<TriageStep[]>(initial ?? [{ id: TRIAGE_START }]);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const mounted = useRef(false);

  // Move focus to the new question so keyboard and screen-reader users land
  // on it rather than on a button that no longer exists. Not on mount in the
  // CMS preview, where it would pull focus out of the field being edited.
  useEffect(() => {
    if (mounted.current || focusOnMount) headingRef.current?.focus({ preventScroll: !focusOnMount });
    mounted.current = true;
  }, [steps, focusOnMount]);

  const currentId = steps[steps.length - 1].id;
  useEffect(() => {
    onScreen?.(currentId);
  }, [currentId, onScreen]);

  const current = steps[steps.length - 1];
  const node = TRIAGE[current.id];
  const go = (opt: TriageOption, index: number) =>
    setSteps((s) => [...s, { id: opt.next, via: { from: current.id, index } }]);
  const why = current.via ? text[TK.why(current.via.from, current.via.index)] : undefined;
  const back = () => setSteps((s) => (s.length > 1 ? s.slice(0, -1) : s));
  const restart = () => setSteps([{ id: TRIAGE_START }]);

  return (
    <>
      <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-3.5 sm:px-6">
        <div className="flex items-center gap-2 min-w-0">
          {steps.length > 1 && (
            <button
              type="button"
              onClick={back}
              className="-ml-2 inline-flex items-center gap-1 rounded-full px-2 py-1 text-sm font-medium text-slate-600 hover:bg-slate-100"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden />
              {ui("back")}
            </button>
          )}
          {steps.length === 1 && (
            <span className="text-sm font-semibold text-[var(--primary-dark)]">{ui("title")}</span>
          )}
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label={ui("close")}
            className="rounded-full p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
        )}
      </div>

      <div className="overflow-y-auto px-5 py-6 sm:px-6">
        {node.kind === "question" ? (
          <>
            {steps.length === 1 && <p className="mb-4 text-sm text-slate-600">{ui("intro")}</p>}
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">{`${ui("step")} ${steps.length}`}</p>
            <h2
              id="triage-heading"
              ref={headingRef}
              tabIndex={-1}
              className="mt-1 text-xl font-bold text-slate-900 outline-none"
            >
              {text[TK.question(current.id)]}
            </h2>
            {node.hint && text[TK.hint(current.id)] && (
              <p className="mt-1 text-sm text-slate-500">{text[TK.hint(current.id)]}</p>
            )}
            {node.list && lines(text[TK.list(current.id)]).length > 0 && (
              <ul className="mt-4 space-y-1.5 rounded-2xl border border-red-100 bg-red-50/60 p-4 text-sm text-slate-700">
                {lines(text[TK.list(current.id)]).map((item) => (
                  <li key={item} className="flex gap-2">
                    <span aria-hidden className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-red-500" />
                    {item}
                  </li>
                ))}
              </ul>
            )}
            {node.options.some((o) => o.visual) ? (
              <VisualOptions
                options={node.options}
                label={(i) => text[TK.option(current.id, i)]}
                examples={examples}
                onPick={go}
              />
            ) : (
            <div className="mt-5 grid gap-2.5">
              {node.options.map((opt, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => go(opt, i)}
                  className="group flex w-full items-center justify-between gap-3 rounded-2xl border border-slate-200 px-4 py-3.5 text-left text-[15px] font-medium text-slate-800 transition-colors hover:border-[var(--primary)] hover:bg-brand-cyan-subtle focus-visible:border-[var(--primary)] focus-visible:outline-none"
                >
                  {text[TK.option(current.id, i)]}
                  <ChevronRight className="h-4 w-4 shrink-0 text-slate-400 group-hover:text-[var(--primary-dark)]" aria-hidden />
                </button>
              ))}
            </div>
            )}
          </>
        ) : (
          <Result id={current.id} node={node} why={why} text={text} headingRef={headingRef} />
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 bg-slate-50 px-5 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] text-xs text-slate-500 sm:px-6 sm:pb-3">
        <span>{ui("disclaimer")}</span>
        {node.kind === "result" ? (
          <button type="button" onClick={restart} className="inline-flex items-center gap-1 font-medium text-slate-600 hover:text-slate-900">
            <RotateCcw className="h-3.5 w-3.5" aria-hidden />
            {ui("restart")}
          </button>
        ) : (
          <a
            href={PORTAL_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 font-medium text-[var(--primary-dark)] hover:underline"
          >
            {ui("skip")}
            <ExternalLink className="h-3.5 w-3.5" aria-hidden />
          </a>
        )}
      </div>
    </>
  );
}

/**
 * Answer cards with pictures, for steps whose options carry a `visual`.
 * The gallery answer is a full-width card showing the actual services; the
 * rest are a two-column grid. Colourful illustration = Fjarlækningar handles
 * it; grey line icon = another service does.
 */
function VisualOptions({
  options,
  label,
  examples,
  onPick,
}: {
  options: TriageOption[];
  label: (i: number) => string;
  examples: TriageExample[];
  onPick: (opt: TriageOption, i: number) => void;
}) {
  const card =
    "group rounded-2xl border border-slate-200 text-left transition-colors hover:border-[var(--primary)] hover:bg-brand-cyan-subtle/60 focus-visible:border-[var(--primary)] focus-visible:outline-none";
  return (
    <div className="mt-5 grid grid-cols-2 gap-2.5">
      {options.map((opt, i) => {
        const v = opt.visual ?? {};
        if (v.gallery) {
          return (
            <button key={i} type="button" onClick={() => onPick(opt, i)} className={`${card} col-span-2 p-4`}>
              <span className="flex items-center justify-between gap-2 text-[15px] font-semibold text-slate-800">
                {label(i)}
                <ChevronRight className="h-4 w-4 shrink-0 text-slate-400 group-hover:text-[var(--primary-dark)]" aria-hidden />
              </span>
              {examples.length > 0 && (
                <span className="mt-3 grid grid-cols-4 gap-x-2 gap-y-3 sm:grid-cols-5">
                  {examples.map((ex) => (
                    <span key={ex.slug} className="flex min-w-0 flex-col items-center gap-1 text-center">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={`/erindi-icons/${ex.slug}.png`} alt="" width={44} height={44} loading="lazy" className="h-11 w-11 object-contain" />
                      <span className="w-full break-words hyphens-auto text-[11px] leading-tight text-slate-600">{ex.title}</span>
                    </span>
                  ))}
                </span>
              )}
            </button>
          );
        }
        const Line = v.icon ? LINE_ICONS[v.icon] : null;
        return (
          <button key={i} type="button" onClick={() => onPick(opt, i)} className={`${card} flex flex-col gap-2.5 p-3.5`}>
            {v.img ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={v.img} alt="" width={40} height={40} loading="lazy" className="h-10 w-10 object-contain" />
            ) : Line ? (
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-500">
                <Line className="h-5 w-5" aria-hidden />
              </span>
            ) : null}
            <span className="text-sm font-medium leading-snug text-slate-800">{label(i)}</span>
          </button>
        );
      })}
    </div>
  );
}

function Result({
  id,
  node,
  why,
  text,
  headingRef,
}: {
  id: string;
  node: TriageResult;
  why?: string;
  text: LocaleContent;
  headingRef: React.RefObject<HTMLHeadingElement | null>;
}) {
  const tone = TONE[node.service];
  return (
    <div>
      <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${tone.badge}`}>
        {text[TK.eyebrow(id)]}
      </span>
      <h2
        id="triage-heading"
        ref={headingRef}
        tabIndex={-1}
        className="mt-3 text-2xl font-bold text-slate-900 outline-none"
      >
        {text[TK.title(id)]}
      </h2>
      {why && (
        <div className={`mt-4 rounded-2xl border p-4 text-sm text-slate-700 ${tone.ring}`}>
          <span className="font-semibold">{text[TK.ui("why")]} </span>
          {why}
        </div>
      )}
      <div className="mt-4 space-y-3 text-[15px] leading-relaxed text-slate-700">
        {paragraphs(text[TK.body(id)]).map((p) => (
          <p key={p}>{p}</p>
        ))}
      </div>
      <div className="mt-6 flex flex-col gap-2.5 sm:flex-row sm:flex-wrap">
        {node.actions.map((a) => {
          const isTel = a.href.startsWith("tel:");
          const external = a.href.startsWith("http");
          const Icon = isTel ? Phone : ExternalLink;
          return (
            <a
              key={a.id}
              href={a.href}
              {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
              className={`inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-semibold transition-all ${
                a.primary
                  ? node.service === "112" || node.service === "brada"
                    ? "bg-red-600 text-white hover:bg-red-700"
                    : "bg-[var(--primary-dark)] text-white hover:brightness-110"
                  : "border-2 border-slate-300 text-slate-700 hover:border-slate-400"
              }`}
            >
              <Icon className="h-4 w-4" aria-hidden />
              {text[TK.action(a.id)]}
            </a>
          );
        })}
      </div>
    </div>
  );
}
