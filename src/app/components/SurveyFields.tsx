"use client";

// Shared question renderer for a survey form. Used by both the public survey
// page and the admin live preview so the two never drift. It renders only the
// currently-visible questions (honouring showIf), and reports value changes via
// callbacks — the parent owns the answers state.

import {
  isQuestionVisible,
  localizeQuestion,
  localizedOptions,
  scaleValues,
  type Locale,
  type SurveyAnswerValue,
  type SurveyQuestion,
} from "@/lib/survey-types";

export default function SurveyFields({
  questions,
  answers,
  onSet,
  onToggleMulti,
  locale = "is",
}: {
  questions: SurveyQuestion[];
  answers: Record<string, SurveyAnswerValue>;
  onSet: (id: string, value: SurveyAnswerValue) => void;
  onToggleMulti: (id: string, opt: string) => void;
  locale?: Locale;
}) {
  const visible = questions.filter((q) => isQuestionVisible(q, answers));

  return (
    <>
      {visible.map((q) => {
        const l = localizeQuestion(q, locale);
        const opts = localizedOptions(q, locale);
        const value = answers[q.id];
        return (
          <div key={q.id}>
            <label className="block text-sm font-medium text-slate-800">
              {l.label}
              {q.required && <span className="text-red-500"> *</span>}
            </label>
            {l.helper && <p className="text-xs text-slate-500 mt-0.5 mb-2">{l.helper}</p>}
            <div className={l.helper ? "" : "mt-2"}>
              {q.type === "text" && (
                <input
                  type="text"
                  required={q.required}
                  value={(value as string) || ""}
                  onChange={(e) => onSet(q.id, e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-cyan-200 outline-none"
                />
              )}
              {q.type === "textarea" && (
                <textarea
                  required={q.required}
                  rows={4}
                  value={(value as string) || ""}
                  onChange={(e) => onSet(q.id, e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-cyan-200 outline-none"
                />
              )}
              {(q.type === "single_choice" || q.type === "yes_no") && (
                <div className="space-y-1.5">
                  {opts.map((opt) => (
                    <label key={opt.value} className="flex items-center gap-2 text-sm text-slate-700">
                      <input
                        type="radio"
                        name={q.id}
                        required={q.required}
                        checked={value === opt.value}
                        onChange={() => onSet(q.id, opt.value)}
                        className="accent-cyan-600"
                      />
                      {opt.label}
                    </label>
                  ))}
                </div>
              )}
              {q.type === "multi_choice" && (
                <div className="space-y-1.5">
                  {opts.map((opt) => (
                    <label key={opt.value} className="flex items-center gap-2 text-sm text-slate-700">
                      <input
                        type="checkbox"
                        checked={Array.isArray(value) && value.includes(opt.value)}
                        onChange={() => onToggleMulti(q.id, opt.value)}
                        className="accent-cyan-600"
                      />
                      {opt.label}
                    </label>
                  ))}
                </div>
              )}
              {(q.type === "scale" || q.type === "nps") && (
                <div>
                  <div className="flex flex-wrap gap-2">
                    {scaleValues(q).map((n) => {
                      const sel = String(value) === String(n);
                      return (
                        <button
                          key={n}
                          type="button"
                          onClick={() => onSet(q.id, String(n))}
                          aria-pressed={sel}
                          className={`w-10 h-10 rounded-lg border text-sm font-semibold transition-colors ${
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
                    <div className="flex justify-between text-[11px] text-slate-500 mt-1.5 max-w-sm">
                      <span>{l.minLabel}</span>
                      <span>{l.maxLabel}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </>
  );
}
