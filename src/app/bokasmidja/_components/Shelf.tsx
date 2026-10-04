"use client";

import Link from "next/link";
import { Sparkles } from "lucide-react";
import { pick, type BookView } from "@/lib/bokasmidja/types";
import { useBk } from "./Provider";
import { TopBar } from "./ui";

/** Hlekkur á bók: bók utan um eina tilbúna sögu opnast beint í lesaranum. */
export function bookHref(b: BookView): string {
  return b.plannedStories === 1 && b.stories.length === 1 ? `/bokasmidja/story/${b.stories[0].id}` : `/bokasmidja/book/${b.id}`;
}

export function BookCover({ book, className }: { book: BookView; className?: string }) {
  const { lang, t } = useBk();
  return (
    <div className={`relative flex aspect-[3/4] flex-col justify-between overflow-hidden rounded-r-3xl rounded-l-lg p-4 text-white shadow-[0_8px_0_rgba(0,0,0,0.18)] ${className || ""}`}
      style={{ background: `linear-gradient(160deg, ${book.color}, color-mix(in srgb, ${book.color} 62%, #0f172a))` }}>
      <span aria-hidden className="absolute inset-y-0 left-0 w-3 bg-black/20" />
      <span aria-hidden className="pl-2 text-5xl drop-shadow">{book.emoji}</span>
      <span className="bk-display pl-2 text-xl font-extrabold leading-tight [text-wrap:balance]">{pick(book.title, lang) || t("shelf.newBook")}</span>
    </div>
  );
}

export default function Shelf({ books }: { books: BookView[] }) {
  const { lang, t, viewer } = useBk();
  return (
    <>
      <TopBar />
      <main className="mx-auto w-full max-w-5xl px-4 pb-16 pt-6">
        <h1 className="bk-display text-4xl font-extrabold text-slate-900 sm:text-5xl">
          {viewer?.role === "kid" ? t("shelf.hello", { name: viewer.child.name }) : t("shelf.helloParent")}
        </h1>
        <p className="mt-1 text-xl font-bold text-slate-600">{t("shelf.what")}</p>

        <Link href="/bokasmidja/new"
          className="bk-press mt-6 flex items-center gap-5 rounded-[2rem] bg-gradient-to-r from-orange-500 to-pink-500 p-6 text-white shadow-[0_8px_0_#be185d]">
          <span aria-hidden className="bk-nudge flex h-20 w-20 shrink-0 items-center justify-center rounded-3xl bg-white/25 text-5xl">✏️</span>
          <span>
            <span className="bk-display flex items-center gap-2 text-3xl font-extrabold"><Sparkles className="h-7 w-7" aria-hidden />{t("shelf.make")}</span>
            <span className="mt-1 block text-lg font-bold text-white/90">{t("shelf.makeSub")}</span>
          </span>
        </Link>

        <h2 className="bk-display mt-10 text-3xl font-extrabold">{t("shelf.books")}</h2>
        <p className="font-bold text-slate-500">{t("shelf.booksSub")}</p>
        <ul className="mt-5 grid grid-cols-2 gap-5 sm:grid-cols-3 md:grid-cols-4">
          {books.map((b) => {
            const done = b.stories.filter((s) => s.status !== "idea").length;
            return (
              <li key={b.id}>
                <Link href={bookHref(b)} className="bk-press block rounded-3xl" aria-label={pick(b.title, lang) || t("shelf.newBook")}>
                  <BookCover book={b} />
                  {b.plannedStories > 1 && (
                    <span className="mt-3 block text-center font-bold text-slate-600">{t("shelf.stories", { done, total: b.plannedStories })}</span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </main>
    </>
  );
}
