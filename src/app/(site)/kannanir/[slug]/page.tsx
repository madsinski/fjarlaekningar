"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import SurveyFields from "@/app/components/SurveyFields";
import {
  isQuestionVisible,
  type Locale,
  type SurveyAnswerValue,
  type SurveyQuestion,
} from "@/lib/survey-types";

interface Survey {
  slug: string;
  title: string;
  title_en: string | null;
  description: string;
  description_en: string | null;
  questions: SurveyQuestion[];
}

const T = {
  is: {
    loading: "Hleð…",
    notFound: "Könnun fannst ekki",
    notFoundBody: "Þessi könnun er ekki til eða ekki lengur virk.",
    thanks: "Takk fyrir!",
    thanksBody: "Svarið þitt hefur verið skráð.",
    submit: "Senda svar",
    submitting: "Sendi…",
    error: "Ekki tókst að senda svar.",
  },
  en: {
    loading: "Loading…",
    notFound: "Survey not found",
    notFoundBody: "This survey does not exist or is no longer active.",
    thanks: "Thank you!",
    thanksBody: "Your response has been recorded.",
    submit: "Submit",
    submitting: "Sending…",
    error: "Could not submit your response.",
  },
} as const;

export default function PublicSurveyPage() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;

  const [survey, setSurvey] = useState<Survey | null>(null);
  const [loading, setLoading] = useState(true);
  const [locale, setLocale] = useState<Locale>("is");
  const [answers, setAnswers] = useState<Record<string, SurveyAnswerValue>>({});
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const tr = T[locale];

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("surveys")
      .select("slug, title, title_en, description, description_en, questions")
      .eq("slug", slug)
      .eq("status", "published")
      .maybeSingle();
    setSurvey((data as Survey) || null);
    setLoading(false);
  }, [slug]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  const visibleQuestions = useMemo(
    () => (survey?.questions || []).filter((q) => isQuestionVisible(q, answers)),
    [survey, answers],
  );

  const setOne = (id: string, value: SurveyAnswerValue) =>
    setAnswers((a) => ({ ...a, [id]: value }));

  const toggleMulti = (id: string, opt: string) =>
    setAnswers((a) => {
      const cur = Array.isArray(a[id]) ? (a[id] as string[]) : [];
      return { ...a, [id]: cur.includes(opt) ? cur.filter((x) => x !== opt) : [...cur, opt] };
    });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setErr(null);
    // Only send answers for questions that are actually visible.
    const visibleIds = new Set(visibleQuestions.map((q) => q.id));
    const payload: Record<string, SurveyAnswerValue> = {};
    for (const [k, v] of Object.entries(answers)) {
      if (visibleIds.has(k) && !(Array.isArray(v) ? v.length === 0 : String(v).trim() === "")) {
        payload[k] = v;
      }
    }
    const res = await fetch(`/api/surveys/${slug}/respond`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ answers: payload }),
    });
    const j = await res.json().catch(() => ({}));
    setSubmitting(false);
    if (!res.ok || !j.ok) {
      setErr(j.error || tr.error);
      return;
    }
    setDone(true);
  };

  if (loading) return <div className="max-w-2xl mx-auto px-4 py-20 text-sm text-slate-500">{tr.loading}</div>;
  if (!survey)
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <h1 className="text-2xl font-bold text-slate-900">{tr.notFound}</h1>
        <p className="text-slate-600 mt-2">{tr.notFoundBody}</p>
      </div>
    );

  if (done)
    return (
      <div className="max-w-2xl mx-auto px-4 py-24 text-center">
        <div className="w-14 h-14 rounded-full bg-brand-cyan-subtle text-[var(--primary-dark)] flex items-center justify-center mx-auto mb-4 text-2xl">✓</div>
        <h1 className="text-2xl font-bold text-slate-900">{tr.thanks}</h1>
        <p className="text-slate-600 mt-2">{tr.thanksBody}</p>
      </div>
    );

  const hasEn = !!(survey.title_en || survey.questions.some((q) => q.labelEn));
  const title = locale === "en" && survey.title_en ? survey.title_en : survey.title;
  const description =
    locale === "en" && survey.description_en ? survey.description_en : survey.description;

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      {hasEn && (
        <div className="flex justify-end mb-4">
          <div className="inline-flex rounded-lg border border-slate-200 overflow-hidden text-xs font-medium">
            {(["is", "en"] as Locale[]).map((l) => (
              <button
                key={l}
                type="button"
                onClick={() => setLocale(l)}
                className={`px-3 py-1.5 ${locale === l ? "bg-[var(--primary)] text-white" : "text-slate-600 hover:bg-slate-50"}`}
              >
                {l === "is" ? "IS" : "EN"}
              </button>
            ))}
          </div>
        </div>
      )}

      <h1 className="text-3xl font-bold text-slate-900">{title}</h1>
      {description && <p className="text-slate-600 mt-2 mb-8">{description}</p>}

      <form onSubmit={submit} className="space-y-8 mt-8">
        <SurveyFields
          questions={survey.questions}
          answers={answers}
          onSet={setOne}
          onToggleMulti={toggleMulti}
          locale={locale}
        />

        {err && <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{err}</div>}

        <button
          type="submit"
          disabled={submitting}
          className="py-2.5 px-5 rounded-lg bg-[var(--primary)] hover:bg-[var(--primary-dark)] text-white font-semibold text-sm disabled:opacity-50"
        >
          {submitting ? tr.submitting : tr.submit}
        </button>
      </form>
    </div>
  );
}
