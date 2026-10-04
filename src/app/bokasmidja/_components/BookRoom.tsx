"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, FileDown, Plus } from "lucide-react";
import { pick, type BookView, type StoryView } from "@/lib/bokasmidja/types";
import PdfDialog from "./PdfDialog";
import { useBk } from "./Provider";
import { BookCover } from "./Shelf";
import { Art, TopBar, call } from "./ui";

export default function BookRoom({ book }: { book: BookView }) {
  const { lang, t } = useBk();
  const [pdf, setPdf] = useState(false);
  const slots = Array.from({ length: Math.max(book.plannedStories, book.stories.length) }, (_, i) => book.stories.find((s) => s.position === i + 1) ?? null);
  const unfinished = book.stories.find((s) => s.status !== "ready");
  const firstEmpty = slots.findIndex((s) => !s) + 1;
  const newHref = `/bokasmidja/new?book=${book.id}`;
  const title = (s: StoryView) => pick(s.title, lang) || t("book.inProgress");

  // Næsta skref er alltaf eitt og skýrt: klára, búa til næstu, eða lesa.
  const next = unfinished
    ? { href: `/bokasmidja/story/${unfinished.id}`, label: t("book.nextContinue", { title: title(unfinished) }) }
    : firstEmpty
      ? { href: newHref, label: t("book.nextMake", { n: firstEmpty }) }
      : book.stories[0] ? { href: `/bokasmidja/story/${book.stories[0].id}`, label: t("book.nextRead") } : null;

  const loadStories = async () => {
    const out: StoryView[] = [];
    for (const s of book.stories) {
      if (s.status === "idea") continue;
      const res = await call("GET", `/api/bokasmidja/stories/${s.id}`);
      if (res.ok) out.push(res.story);
    }
    return out;
  };

  return (
    <>
      <TopBar />
      <main className="mx-auto w-full max-w-5xl px-4 pb-16 pt-6">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
          <BookCover book={book} className="w-36 shrink-0" />
          <div className="min-w-0">
            <h1 className="bk-display text-4xl font-extrabold leading-tight text-slate-900 [text-wrap:balance]">{pick(book.title, lang)}</h1>
            <p className="mt-1 text-xl font-bold text-slate-600">{pick(book.subtitle, lang)}</p>
            {book.stories.some((s) => s.status !== "idea") && (
              <button type="button" onClick={() => setPdf(true)}
                className="bk-press mt-4 inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-2.5 font-extrabold text-slate-700 ring-2 ring-slate-200">
                <FileDown className="h-5 w-5 text-sky-600" aria-hidden />{t("book.pdf")}
              </button>
            )}
          </div>
        </div>

        {next && (
          <Link href={next.href} className="bk-press mt-8 flex items-center gap-4 rounded-[2rem] bg-emerald-500 p-5 text-white shadow-[0_8px_0_#047857]">
            <span aria-hidden className="bk-nudge text-4xl">👉</span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-extrabold uppercase tracking-wide text-white/85">{t("book.next")}</span>
              <span className="bk-display block text-2xl font-extrabold leading-tight">{next.label}</span>
            </span>
            <ArrowRight className="h-8 w-8 shrink-0" aria-hidden />
          </Link>
        )}

        <ol className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {slots.map((s, i) => (
            <li key={s?.id ?? i}>
              {s ? (
                <Link href={`/bokasmidja/story/${s.id}`} className="bk-press block overflow-hidden rounded-3xl bg-white shadow-[0_6px_0_#e2e8f0] ring-2 ring-slate-100">
                  <Art svg={s.cover}><span aria-hidden className="bk-write text-5xl">🎨</span></Art>
                  <div className="p-4">
                    <span className="text-sm font-extrabold uppercase tracking-wide text-slate-400">{t("book.story", { n: i + 1 })}</span>
                    <span className="bk-display block text-xl font-extrabold leading-tight">{title(s)}</span>
                    <span className="mt-1 block font-bold text-slate-500">
                      {s.status !== "ready" ? t("book.inProgress") : s.authorName ? t("book.by", { name: s.authorName }) : ""}
                    </span>
                  </div>
                </Link>
              ) : (
                <Link href={newHref} className="bk-press flex h-full min-h-56 flex-col items-center justify-center gap-2 rounded-3xl border-4 border-dashed border-slate-300 bg-white/60 p-5 text-center">
                  <span className="flex h-16 w-16 items-center justify-center rounded-full bg-orange-100"><Plus className="h-9 w-9 text-orange-500" aria-hidden /></span>
                  <span className="text-sm font-extrabold uppercase tracking-wide text-slate-400">{t("book.story", { n: i + 1 })}</span>
                  <span className="bk-display text-xl font-extrabold text-slate-700">{t("book.make")}</span>
                </Link>
              )}
            </li>
          ))}
        </ol>
      </main>
      {pdf && (
        <PdfDialog onClose={() => setPdf(false)} load={loadStories}
          book={{ title: book.title, subtitle: book.subtitle, color: book.color, emoji: book.emoji, cover: book.plannedStories > 1 }} />
      )}
    </>
  );
}
