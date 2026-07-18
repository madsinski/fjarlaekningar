"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import type { SurveyQuestion } from "@/lib/survey-types";

interface Survey {
  slug: string;
  title: string;
  description: string;
  questions: SurveyQuestion[];
}

export default function PublicSurveyPage() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;

  const [survey, setSurvey] = useState<Survey | null>(null);
  const [loading, setLoading] = useState(true);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("surveys")
      .select("slug, title, description, questions")
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

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setErr(null);
    const res = await fetch(`/api/surveys/${slug}/respond`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ answers }),
    });
    const j = await res.json().catch(() => ({}));
    setSubmitting(false);
    if (!res.ok || !j.ok) {
      setErr(j.error || "Ekki tókst að senda svar.");
      return;
    }
    setDone(true);
  };

  if (loading) return <div className="max-w-2xl mx-auto px-4 py-20 text-sm text-slate-500">Hleð…</div>;
  if (!survey)
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <h1 className="text-2xl font-bold text-slate-900">Könnun fannst ekki</h1>
        <p className="text-slate-600 mt-2">Þessi könnun er ekki til eða ekki lengur virk.</p>
      </div>
    );

  if (done)
    return (
      <div className="max-w-2xl mx-auto px-4 py-24 text-center">
        <div className="w-14 h-14 rounded-full bg-brand-cyan-subtle text-[var(--primary-dark)] flex items-center justify-center mx-auto mb-4 text-2xl">✓</div>
        <h1 className="text-2xl font-bold text-slate-900">Takk fyrir!</h1>
        <p className="text-slate-600 mt-2">Svarið þitt hefur verið skráð.</p>
      </div>
    );

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <h1 className="text-3xl font-bold text-slate-900">{survey.title}</h1>
      {survey.description && <p className="text-slate-600 mt-2 mb-8">{survey.description}</p>}

      <form onSubmit={submit} className="space-y-6 mt-8">
        {survey.questions.map((q) => (
          <div key={q.id}>
            <label className="block text-sm font-medium text-slate-800 mb-1.5">
              {q.label}
              {q.required && <span className="text-red-500"> *</span>}
            </label>
            {q.type === "text" && (
              <input
                type="text"
                required={q.required}
                value={answers[q.id] || ""}
                onChange={(e) => setAnswers((a) => ({ ...a, [q.id]: e.target.value }))}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-cyan-200 outline-none"
              />
            )}
            {q.type === "textarea" && (
              <textarea
                required={q.required}
                rows={4}
                value={answers[q.id] || ""}
                onChange={(e) => setAnswers((a) => ({ ...a, [q.id]: e.target.value }))}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-cyan-200 outline-none"
              />
            )}
            {q.type === "single_choice" && (
              <div className="space-y-1.5">
                {(q.options || []).map((opt) => (
                  <label key={opt} className="flex items-center gap-2 text-sm text-slate-700">
                    <input
                      type="radio"
                      name={q.id}
                      required={q.required}
                      checked={answers[q.id] === opt}
                      onChange={() => setAnswers((a) => ({ ...a, [q.id]: opt }))}
                      className="accent-cyan-600"
                    />
                    {opt}
                  </label>
                ))}
              </div>
            )}
          </div>
        ))}

        {err && <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{err}</div>}

        <button
          type="submit"
          disabled={submitting}
          className="py-2.5 px-5 rounded-lg bg-[var(--primary)] hover:bg-[var(--primary-dark)] text-white font-semibold text-sm disabled:opacity-50"
        >
          {submitting ? "Sendi…" : "Senda svar"}
        </button>
      </form>
    </div>
  );
}
