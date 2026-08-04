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
  layout?: string | null;
  brand_name?: string | null;
  brand_logo_url?: string | null;
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
      .select("*")
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
  const mode = survey.layout === "steps" ? "steps" : "list";

  const localeToggle = hasEn ? (
    <div className="inline-flex rounded-lg border border-slate-200 bg-white/70 overflow-hidden text-xs font-medium">
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
  ) : null;

  const footer = (
    <div className="space-y-4">
      {err && <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{err}</div>}
      <button
        type="submit"
        disabled={submitting}
        className="py-2.5 px-6 rounded-lg bg-[var(--primary)] hover:bg-[var(--primary-dark)] text-white font-semibold text-sm disabled:opacity-50"
      >
        {submitting ? tr.submitting : tr.submit}
      </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-[var(--background)] pb-20">
      {/* Branded header — mirrors the site's PageHero */}
      <div className="border-b border-slate-200 bg-gradient-to-b from-brand-cyan-subtle to-[var(--background)]">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-8">
          {localeToggle && <div className="flex justify-end mb-4">{localeToggle}</div>}
          {survey.brand_logo_url || survey.brand_name ? (
            <div className="flex items-center gap-3 mb-3">
              {survey.brand_logo_url && (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={survey.brand_logo_url} alt={survey.brand_name || ""} className="h-10 w-auto object-contain" />
              )}
              {survey.brand_name && <span className="text-sm font-semibold text-slate-700">{survey.brand_name}</span>}
            </div>
          ) : (
            <span className="inline-flex items-center gap-2.5 text-xs font-semibold uppercase tracking-wider text-[var(--primary-dark)]">
              <span aria-hidden className="h-px w-6 bg-[var(--primary)]" /> Fjarlækningar
            </span>
          )}
          <h1 className="mt-3 text-3xl sm:text-4xl font-bold tracking-tight text-slate-900">{title}</h1>
          {description && <p className="mt-3 text-base text-slate-600">{description}</p>}
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <form onSubmit={submit} className={mode === "steps" ? "" : "space-y-5"}>
          <SurveyFields
            questions={survey.questions}
            answers={answers}
            onSet={setOne}
            onToggleMulti={toggleMulti}
            locale={locale}
            mode={mode}
            footer={footer}
          />
        </form>
      </div>
    </div>
  );
}
