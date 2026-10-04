"use client";

// Fyrsta skrefið í nýrri bók: gefa henni nafn núna, eða velja það seinna.
// Svo tekur hugmyndasmiðjan við og fyrsta sagan verður til.

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { errorText } from "@/lib/bokasmidja/i18n";
import { useBk } from "./Provider";
import { BigButton, TopBar, call } from "./ui";

export default function NewBook() {
  const { lang, t } = useBk();
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const create = async (name: string) => {
    setBusy(true);
    setError("");
    const res = await call("POST", "/api/bokasmidja/books", { lang, title: name });
    if (res.ok) { router.push(`/bokasmidja/new?book=${res.bookId}`); return; }
    setError(errorText(t, res.error));
    setBusy(false);
  };

  return (
    <>
      <TopBar />
      <main className="mx-auto w-full max-w-2xl px-4 pb-16 pt-6">
        <h1 className="bk-display text-4xl font-extrabold text-slate-900">{t("new.title")}</h1>
        <form onSubmit={(e) => { e.preventDefault(); if (title.trim()) void create(title); }}
          className="bk-pop mt-6 rounded-[2rem] bg-white p-6 shadow-xl ring-2 ring-slate-100">
          <div aria-hidden className="text-6xl">📕</div>
          <label htmlFor="bk-book-name" className="bk-display mt-3 block text-3xl font-extrabold">{t("newbook.question")}</label>
          <input id="bk-book-name" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={80} autoFocus placeholder={t("newbook.placeholder")}
            className="bk-display mt-4 w-full rounded-3xl border-4 border-orange-200 px-5 py-4 text-2xl font-extrabold outline-none focus:border-orange-400" />
          <BigButton type="submit" tone="green" disabled={busy || !title.trim()} className="mt-5 w-full text-2xl">
            {t("newbook.create")}<ArrowRight className="h-7 w-7" aria-hidden />
          </BigButton>

          <p className="my-5 text-center text-lg font-extrabold uppercase tracking-wide text-slate-400">{t("newbook.or")}</p>

          <BigButton tone="white" disabled={busy} onClick={() => create("")} className="w-full text-xl">🤔 {t("newbook.later")}</BigButton>
          <p className="mt-3 text-center font-bold text-slate-500">{t("newbook.laterSub")}</p>
          {error && <p role="alert" className="mt-4 text-center font-bold text-red-600">{error}</p>}
        </form>
      </main>
    </>
  );
}
