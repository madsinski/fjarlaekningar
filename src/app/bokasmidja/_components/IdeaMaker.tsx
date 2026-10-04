"use client";

// Hugmyndasmiðjan. Tvær leiðir: skrifa hugmyndina sjálf(ur), eða svara
// spurningum með stórum spjöldum, eitt skref í einu.

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowLeft, ArrowRight, Sparkles } from "lucide-react";
import { errorText } from "@/lib/bokasmidja/i18n";
import { pick, type I18nText, type Lang } from "@/lib/bokasmidja/types";
import { IDEA_MAX, WIZARD } from "@/lib/bokasmidja/wizard";
import { useBk } from "./Provider";
import { BigButton, LangSwitch, TopBar, call, cx } from "./ui";

type Mode = "choose" | "prompt" | "wizard";

export default function IdeaMaker({ book }: { book: { id: string; title: I18nText } | null }) {
  const { lang, t } = useBk();
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("choose");
  const [storyLang, setStoryLang] = useState<Lang>(lang);
  const [text, setText] = useState("");
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [heroName, setHeroName] = useState("");
  const [extra, setExtra] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const lastStep = WIZARD.length; // the step after the cards: name, extra, language
  const current = WIZARD[step];
  const answer = current ? answers[current.key] : undefined;
  const own = answer?.startsWith("own:") ? answer.slice(4) : null;

  const create = async () => {
    setBusy(true);
    setError("");
    const idea = mode === "prompt" ? { kind: "prompt", text } : { kind: "wizard", answers, heroName, extra };
    const res = await call("POST", "/api/bokasmidja/stories", { bookId: book?.id, lang: storyLang, idea });
    if (res.ok) { router.push(`/bokasmidja/story/${res.storyId}`); return; }
    setError(errorText(t, res.error));
    setBusy(false);
  };

  const back = () => {
    setError("");
    if (mode === "wizard" && step > 0) setStep(step - 1);
    else setMode("choose");
  };

  const langPicker = (
    <div className="mt-6">
      <p className="bk-display text-xl font-extrabold">{t("new.lang")}</p>
      <p className="mb-3 font-bold text-slate-500">{t("new.langSub")}</p>
      <LangSwitch big value={storyLang} onPick={setStoryLang} />
    </div>
  );
  const goButton = (disabled: boolean) => (
    <BigButton tone="green" onClick={create} disabled={busy || disabled} className="flex-1 text-2xl">
      <Sparkles className="h-7 w-7" aria-hidden />{t("new.go")}
    </BigButton>
  );

  return (
    <>
      <TopBar />
      <main className="mx-auto w-full max-w-3xl px-4 pb-16 pt-6">
        <h1 className="bk-display text-4xl font-extrabold text-slate-900">{t("new.title")}</h1>
        {book && <p className="mt-1 text-lg font-bold text-indigo-700">🌙 {t("new.into", { book: pick(book.title, lang) })}</p>}

        {mode === "choose" && (
          <section className="mt-6">
            <h2 className="bk-display text-2xl font-extrabold">{t("new.how")}</h2>
            <div className="mt-4 grid gap-5 sm:grid-cols-2">
              <button type="button" onClick={() => setMode("wizard")} className="bk-press bk-pop rounded-[2rem] bg-violet-500 p-6 text-left text-white shadow-[0_8px_0_#6d28d9]">
                <span aria-hidden className="text-6xl">🎲</span>
                <span className="bk-display mt-3 block text-3xl font-extrabold">{t("new.wizard")}</span>
                <span className="mt-1 block text-lg font-bold text-white/90">{t("new.wizardSub")}</span>
              </button>
              <button type="button" onClick={() => setMode("prompt")} className="bk-press bk-pop rounded-[2rem] bg-sky-500 p-6 text-left text-white shadow-[0_8px_0_#0369a1]">
                <span aria-hidden className="text-6xl">✍️</span>
                <span className="bk-display mt-3 block text-3xl font-extrabold">{t("new.prompt")}</span>
                <span className="mt-1 block text-lg font-bold text-white/90">{t("new.promptSub")}</span>
              </button>
            </div>
          </section>
        )}

        {mode === "prompt" && (
          <section className="bk-pop mt-6 rounded-[2rem] bg-white p-6 shadow-xl ring-2 ring-slate-100">
            <label htmlFor="bk-idea" className="bk-display block text-2xl font-extrabold">{t("new.promptLabel")}</label>
            <textarea id="bk-idea" value={text} onChange={(e) => setText(e.target.value.slice(0, IDEA_MAX))} rows={6} autoFocus
              placeholder={t("new.promptPlaceholder")}
              className="mt-3 w-full rounded-3xl border-4 border-sky-200 p-4 text-xl leading-relaxed outline-none focus:border-sky-400" />
            {langPicker}
            {error && <p role="alert" className="mt-4 font-bold text-red-600">{error}</p>}
            <div className="mt-6 flex gap-3">
              <BigButton tone="white" onClick={back} aria-label={t("new.back")}><ArrowLeft className="h-6 w-6" aria-hidden /></BigButton>
              {goButton(text.trim().length < 3)}
            </div>
          </section>
        )}

        {mode === "wizard" && (
          <section className="mt-6">
            <div className="flex items-center gap-2" aria-label={t("new.step", { n: step + 1, total: lastStep + 1 })} role="img">
              {Array.from({ length: lastStep + 1 }, (_, i) => (
                <span key={i} className={cx("h-3 flex-1 rounded-full", i < step ? "bg-emerald-400" : i === step ? "bg-violet-500" : "bg-slate-200")} />
              ))}
            </div>
            <p className="mt-2 font-extrabold uppercase tracking-wide text-slate-400">{t("new.step", { n: step + 1, total: lastStep + 1 })}</p>

            <div key={step} className="bk-pop mt-3 rounded-[2rem] bg-white p-6 shadow-xl ring-2 ring-slate-100">
              {current ? (
                <>
                  <h2 className="bk-display text-3xl font-extrabold">{current.question[lang]}</h2>
                  <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3">
                    {current.options.map((opt) => (
                      <button key={opt.key} type="button" aria-pressed={answer === opt.key}
                        onClick={() => { setAnswers({ ...answers, [current.key]: opt.key }); setTimeout(() => setStep((s) => Math.max(s, step + 1)), 250); }}
                        className={cx("bk-press flex min-h-32 flex-col items-center justify-center gap-2 rounded-3xl p-3 text-center ring-4",
                          answer === opt.key ? "bg-violet-100 ring-violet-500" : "bg-slate-50 ring-transparent")}>
                        <span aria-hidden className="text-5xl">{opt.emoji}</span>
                        <span className="bk-display text-lg font-extrabold leading-tight">{opt.label[lang]}</span>
                      </button>
                    ))}
                  </div>
                  <label className="mt-5 block">
                    <span className="font-extrabold text-slate-600">💡 {t("new.own")}</span>
                    <input value={own ?? ""} placeholder={t("new.ownPlaceholder")} maxLength={120}
                      onChange={(e) => {
                        const next = { ...answers };
                        if (e.target.value.trim()) next[current.key] = `own:${e.target.value}`; else delete next[current.key];
                        setAnswers(next);
                      }}
                      className={cx("mt-1 w-full rounded-2xl border-4 px-4 py-3 text-lg outline-none focus:border-violet-400", own ? "border-violet-500" : "border-slate-200")} />
                  </label>
                </>
              ) : (
                <>
                  <label className="block">
                    <span className="bk-display text-2xl font-extrabold">{t("new.heroName")}</span>
                    <input value={heroName} onChange={(e) => setHeroName(e.target.value)} maxLength={40} placeholder={t("new.heroNamePlaceholder")}
                      className="mt-2 w-full rounded-2xl border-4 border-slate-200 px-4 py-3 text-xl outline-none focus:border-violet-400" />
                  </label>
                  <label className="mt-5 block">
                    <span className="bk-display text-2xl font-extrabold">{t("new.extra")}</span>
                    <textarea value={extra} onChange={(e) => setExtra(e.target.value)} maxLength={400} rows={2} placeholder={t("new.extraPlaceholder")}
                      className="mt-2 w-full rounded-2xl border-4 border-slate-200 px-4 py-3 text-xl outline-none focus:border-violet-400" />
                  </label>
                  {langPicker}
                </>
              )}
              {error && <p role="alert" className="mt-4 font-bold text-red-600">{error}</p>}
              <div className="mt-6 flex gap-3">
                <BigButton tone="white" onClick={back} aria-label={t("new.back")}><ArrowLeft className="h-6 w-6" aria-hidden /></BigButton>
                {current
                  ? <BigButton tone="purple" onClick={() => setStep(step + 1)} disabled={!answer} className="flex-1 text-2xl">{t("new.next")}<ArrowRight className="h-7 w-7" aria-hidden /></BigButton>
                  : goButton(false)}
              </div>
            </div>
          </section>
        )}
      </main>
    </>
  );
}
