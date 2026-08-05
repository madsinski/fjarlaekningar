"use client";

// Shared question renderer for a survey form. Used by both the public survey
// page and the admin live preview so the two never drift. Renders only the
// currently-visible questions (honouring showIf). Supports two layouts:
//   "list"  — every question at once (default)
//   "steps" — one question card at a time, with Back / Áfram navigation
// The parent owns the answers state and passes a `footer` (submit button) that
// is shown at the end (after the last step, or below the list).

import { useState } from "react";
import {
  isQuestionVisible,
  localizeQuestion,
  localizedOptions,
  scaleValues,
  type Locale,
  type SurveyAnswerValue,
  type SurveyQuestion,
} from "@/lib/survey-types";

export type SurveyLayout = "list" | "steps";

const NAV = {
  is: { back: "Til baka", next: "Áfram", of: "af", question: "Spurning", required: "Vinsamlegast svaraðu áður en þú heldur áfram." },
  en: { back: "Back", next: "Next", of: "of", question: "Question", required: "Please answer before continuing." },
} as const;

function isEmpty(v: SurveyAnswerValue | undefined): boolean {
  if (v === undefined || v === null) return true;
  if (Array.isArray(v)) return v.length === 0;
  return String(v).trim() === "";
}

export default function SurveyFields({
  questions,
  answers,
  onSet,
  onToggleMulti,
  locale = "is",
  mode = "list",
  footer = null,
}: {
  questions: SurveyQuestion[];
  answers: Record<string, SurveyAnswerValue>;
  onSet: (id: string, value: SurveyAnswerValue) => void;
  onToggleMulti: (id: string, opt: string) => void;
  locale?: Locale;
  mode?: SurveyLayout;
  footer?: React.ReactNode;
}) {
  const visible = questions.filter((q) => isQuestionVisible(q, answers));
  const [step, setStep] = useState(0);
  const [stepErr, setStepErr] = useState(false);
  const nav = NAV[locale];

  function field(q: SurveyQuestion) {
    const l = localizeQuestion(q, locale);
    const opts = localizedOptions(q, locale);
    const value = answers[q.id];
    return (
      <div key={q.id} className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
        <label className="block text-[15px] font-semibold text-slate-900">
          {l.label}
          {q.required && <span className="text-[var(--primary)]"> *</span>}
        </label>
        {l.helper && <p className="text-xs text-slate-500 mt-0.5 mb-2">{l.helper}</p>}
        <div className={l.helper ? "" : "mt-3"}>
          {q.type === "text" && (
            <input
              type="text"
              required={q.required}
              value={(value as string) || ""}
              onChange={(e) => onSet(q.id, e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-cyan-muted focus:border-brand-cyan outline-none"
            />
          )}
          {q.type === "textarea" && (
            <textarea
              required={q.required}
              rows={4}
              value={(value as string) || ""}
              onChange={(e) => onSet(q.id, e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-cyan-muted focus:border-brand-cyan outline-none"
            />
          )}
          {(q.type === "single_choice" || q.type === "yes_no") && (
            <div className="space-y-2">
              {opts.map((opt) => {
                const sel = value === opt.value;
                return (
                  <label
                    key={opt.value}
                    className={`flex items-center gap-2.5 text-sm rounded-lg border px-3 py-2 cursor-pointer transition-colors ${
                      sel ? "border-brand-cyan bg-brand-cyan-subtle/60 text-slate-900" : "border-slate-200 text-slate-700 hover:border-brand-cyan-muted"
                    }`}
                  >
                    <input
                      type="radio"
                      name={q.id}
                      required={q.required}
                      checked={sel}
                      onChange={() => onSet(q.id, opt.value)}
                      className="accent-[var(--primary)]"
                    />
                    {opt.label}
                  </label>
                );
              })}
            </div>
          )}
          {q.type === "multi_choice" && (
            <div className="space-y-2">
              {opts.map((opt) => {
                const sel = Array.isArray(value) && value.includes(opt.value);
                return (
                  <label
                    key={opt.value}
                    className={`flex items-center gap-2.5 text-sm rounded-lg border px-3 py-2 cursor-pointer transition-colors ${
                      sel ? "border-brand-cyan bg-brand-cyan-subtle/60 text-slate-900" : "border-slate-200 text-slate-700 hover:border-brand-cyan-muted"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={sel}
                      onChange={() => onToggleMulti(q.id, opt.value)}
                      className="accent-[var(--primary)]"
                    />
                    {opt.label}
                  </label>
                );
              })}
            </div>
          )}
          {(q.type === "scale" || q.type === "nps") && (
            <div className="w-full align-top">
              <div className="flex gap-1 sm:gap-2">
                {scaleValues(q).map((n) => {
                  const sel = String(value) === String(n);
                  return (
                    <button
                      key={n}
                      type="button"
                      onClick={() => onSet(q.id, String(n))}
                      aria-pressed={sel}
                      className={`flex-1 basis-0 min-w-0 h-10 sm:h-11 rounded-lg sm:rounded-xl border text-xs sm:text-sm font-semibold transition-colors ${
                        sel
                          ? "bg-[var(--primary)] border-[var(--primary)] text-white"
                          : "border-slate-300 text-slate-700 hover:border-[var(--primary)]"
                      }`}
                    >
                      {n}
                    </button>
                  );
                })}
              </div>
              {(l.minLabel || l.maxLabel) && (
                <div className="flex justify-between gap-4 text-[11px] font-medium text-slate-400 mt-2 px-0.5">
                  <span>{l.minLabel}</span>
                  <span className="text-right">{l.maxLabel}</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  if (mode === "steps" && visible.length > 0) {
    const idx = Math.min(step, visible.length - 1);
    const q = visible[idx];
    const last = idx === visible.length - 1;
    const pct = Math.round(((idx + 1) / visible.length) * 100);
    return (
      <div className="space-y-5">
        <div>
          <div className="flex justify-between text-xs text-slate-500 mb-1.5">
            <span>{nav.question} {idx + 1} {nav.of} {visible.length}</span>
            <span>{pct}%</span>
          </div>
          <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
            <div className="h-full bg-[var(--primary)] transition-all" style={{ width: `${pct}%` }} />
          </div>
        </div>

        {field(q)}
        {stepErr && <p className="text-xs text-red-600">{nav.required}</p>}

        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => { setStepErr(false); setStep(Math.max(0, idx - 1)); }}
            disabled={idx === 0}
            className="py-2 px-4 rounded-lg border border-slate-300 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40"
          >
            {nav.back}
          </button>
          {last ? (
            <div>{footer}</div>
          ) : (
            <button
              type="button"
              onClick={() => {
                if (q.required && isEmpty(answers[q.id])) { setStepErr(true); return; }
                setStepErr(false);
                setStep(idx + 1);
              }}
              className="py-2 px-5 rounded-lg bg-[var(--primary)] hover:bg-[var(--primary-dark)] text-white text-sm font-semibold"
            >
              {nav.next}
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <>
      {visible.map(field)}
      {footer}
    </>
  );
}
