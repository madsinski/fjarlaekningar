"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowLeft, ChevronRight, ExternalLink, Phone, RotateCcw, X } from "lucide-react";
import {
  PORTAL_URL, TRIAGE, TRIAGE_START, TRIAGE_UI,
  type ServiceKey, type TriageOption, type TriageResult,
} from "@/lib/triage";
import type { Locale } from "@/lib/site-content/types";

// The popup behind "Opna sjúklingagátt". Content and the reasoning for its
// scope live in src/lib/triage.ts; this file is only the dialog.
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

type Step = { id: string; via?: TriageOption };

// Mounted only while open (see TriageTrigger), so every open starts from the
// top: a half-finished path from last time is more confusing than helpful.
export default function TriageDialog({
  onClose,
  locale,
}: {
  onClose: () => void;
  locale: Locale;
}) {
  const t = TRIAGE_UI[locale];
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
  const go = (opt: TriageOption) => setSteps((s) => [...s, { id: opt.next, via: opt }]);
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
                {t.back}
              </button>
            )}
            {steps.length === 1 && (
              <span className="text-sm font-semibold text-[var(--primary-dark)]">{t.title}</span>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t.close}
            className="rounded-full p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>

        <div className="overflow-y-auto px-5 py-6 sm:px-6">
          {node.kind === "question" ? (
            <>
              {steps.length === 1 && <p className="mb-4 text-sm text-slate-600">{t.intro}</p>}
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">{t.step(steps.length)}</p>
              <h2
                id="triage-heading"
                ref={headingRef}
                tabIndex={-1}
                className="mt-1 text-xl font-bold text-slate-900 outline-none"
              >
                {node.question[locale]}
              </h2>
              {node.hint && <p className="mt-1 text-sm text-slate-500">{node.hint[locale]}</p>}
              {node.list && (
                <ul className="mt-4 space-y-1.5 rounded-2xl border border-red-100 bg-red-50/60 p-4 text-sm text-slate-700">
                  {node.list.map((item) => (
                    <li key={item.is} className="flex gap-2">
                      <span aria-hidden className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-red-500" />
                      {item[locale]}
                    </li>
                  ))}
                </ul>
              )}
              <div className="mt-5 grid gap-2.5">
                {node.options.map((opt) => (
                  <button
                    key={opt.next + opt.label.is}
                    type="button"
                    onClick={() => go(opt)}
                    className="group flex w-full items-center justify-between gap-3 rounded-2xl border border-slate-200 px-4 py-3.5 text-left text-[15px] font-medium text-slate-800 transition-colors hover:border-[var(--primary)] hover:bg-brand-cyan-subtle focus-visible:border-[var(--primary)] focus-visible:outline-none"
                  >
                    {opt.label[locale]}
                    <ChevronRight className="h-4 w-4 shrink-0 text-slate-400 group-hover:text-[var(--primary-dark)]" aria-hidden />
                  </button>
                ))}
              </div>
            </>
          ) : (
            <Result node={node} why={current.via?.why?.[locale]} locale={locale} headingRef={headingRef} whyLabel={t.why} />
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 bg-slate-50 px-5 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] text-xs text-slate-500 sm:px-6 sm:pb-3">
          <span>{t.disclaimer}</span>
          {node.kind === "result" ? (
            <button type="button" onClick={restart} className="inline-flex items-center gap-1 font-medium text-slate-600 hover:text-slate-900">
              <RotateCcw className="h-3.5 w-3.5" aria-hidden />
              {t.restart}
            </button>
          ) : (
            <a
              href={PORTAL_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 font-medium text-[var(--primary-dark)] hover:underline"
            >
              {t.skip}
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
  node,
  why,
  locale,
  headingRef,
  whyLabel,
}: {
  node: TriageResult;
  why?: string;
  locale: Locale;
  headingRef: React.RefObject<HTMLHeadingElement | null>;
  whyLabel: string;
}) {
  const tone = TONE[node.service];
  return (
    <div>
      <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${tone.badge}`}>
        {node.eyebrow[locale]}
      </span>
      <h2
        id="triage-heading"
        ref={headingRef}
        tabIndex={-1}
        className="mt-3 text-2xl font-bold text-slate-900 outline-none"
      >
        {node.title[locale]}
      </h2>
      {why && (
        <div className={`mt-4 rounded-2xl border p-4 text-sm text-slate-700 ${tone.ring}`}>
          <span className="font-semibold">{whyLabel} </span>
          {why}
        </div>
      )}
      <div className="mt-4 space-y-3 text-[15px] leading-relaxed text-slate-700">
        {node.body.map((p) => (
          <p key={p.is}>{p[locale]}</p>
        ))}
      </div>
      <div className="mt-6 flex flex-col gap-2.5 sm:flex-row sm:flex-wrap">
        {node.actions.map((a) => {
          const isTel = a.href.startsWith("tel:");
          const external = a.href.startsWith("http");
          const Icon = isTel ? Phone : ExternalLink;
          return (
            <a
              key={a.href}
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
              {a.label[locale]}
            </a>
          );
        })}
      </div>
    </div>
  );
}
