"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowLeft, ChevronRight, ExternalLink, Phone, RotateCcw, X } from "lucide-react";
import {
  PORTAL_URL, TK, TRIAGE, TRIAGE_START,
  type ServiceKey, type TriageOption, type TriageResult,
} from "@/lib/triage";
import type { LocaleContent } from "@/lib/site-content/types";

// The popup behind "Opna sjúklingagátt". The tree and the reasoning for its
// scope live in src/lib/triage.ts; every word comes from the CMS (`text`,
// already resolved for the page's language). This file is only the dialog.
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

// `via` = the node and option index that led here, for the "why" note.
type Step = { id: string; via?: { from: string; index: number } };

const lines = (v: string | undefined) => (v ?? "").split("\n").map((l) => l.trim()).filter(Boolean);
const paragraphs = (v: string | undefined) => (v ?? "").split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);

// Mounted only while open (see TriageTrigger), so every open starts from the
// top: a half-finished path from last time is more confusing than helpful.
export default function TriageDialog({
  onClose,
  text,
}: {
  onClose: () => void;
  text: LocaleContent;
}) {
  const ui = (name: string) => text[TK.ui(name)] ?? "";
  const [steps, setSteps] = useState<Step[]>([{ id: TRIAGE_START }]);
  const headingRef = useRef<HTMLHeadingElement>(null);

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

  // Move focus to the new question so keyboard and screen-reader users land
  // on it rather than on a button that no longer exists.
  useEffect(() => {
    headingRef.current?.focus();
  }, [steps]);

  const current = steps[steps.length - 1];
  const node = TRIAGE[current.id];
  const go = (opt: TriageOption, index: number) =>
    setSteps((s) => [...s, { id: opt.next, via: { from: current.id, index } }]);
  const why = current.via ? text[TK.why(current.via.from, current.via.index)] : undefined;
  const back = () => setSteps((s) => (s.length > 1 ? s.slice(0, -1) : s));
  const restart = () => setSteps([{ id: TRIAGE_START }]);

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
          <button
            type="button"
            onClick={onClose}
            aria-label={ui("close")}
            className="rounded-full p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
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
      </div>
    </div>,
    document.body,
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
