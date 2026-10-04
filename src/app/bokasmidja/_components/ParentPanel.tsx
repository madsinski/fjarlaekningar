"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { CheckCircle2, CircleAlert, Plus, Trash2 } from "lucide-react";
import { errorText } from "@/lib/bokasmidja/i18n";
import { AVATARS, COLORS, pick, type BookView, type Child, type Lang } from "@/lib/bokasmidja/types";
import { useBk } from "./Provider";
import { Avatar, BigButton, LangSwitch, TopBar, call, cx } from "./ui";

interface Form { id: string | null; name: string; avatar: string; color: string; lang: Lang; age: string; pin: string }

export default function ParentPanel({ kids, books, setup }: { kids: Child[]; books: BookView[]; setup: { writer: boolean; voice: boolean } }) {
  const { lang, t } = useBk();
  const router = useRouter();
  const [form, setForm] = useState<Form | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const blank = (): Form => ({ id: null, name: "", avatar: Object.keys(AVATARS)[kids.length % 12], color: COLORS[kids.length % COLORS.length], lang, age: "", pin: "" });
  const edit = (k: Child): Form => ({ id: k.id, name: k.name, avatar: k.avatar, color: k.color, lang: k.lang, age: k.age ? String(k.age) : "", pin: "" });

  const done = (res: { ok: boolean; error?: string }) => {
    setBusy(false);
    if (!res.ok) { setError(errorText(t, res.error)); return; }
    setForm(null);
    setError("");
    router.refresh();
  };
  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form) return;
    setBusy(true);
    const body = { name: form.name, avatar: form.avatar, color: form.color, lang: form.lang, age: form.age ? Number(form.age) : null, pin: form.pin };
    done(form.id ? await call("PATCH", `/api/bokasmidja/children/${form.id}`, body) : await call("POST", "/api/bokasmidja/children", body));
  };
  const removeKid = async (k: Child) => {
    if (!window.confirm(t("parent.removeSure", { name: k.name }))) return;
    setBusy(true);
    done(await call("DELETE", `/api/bokasmidja/children/${k.id}`));
  };
  const removeBook = async (b: BookView) => {
    if (!window.confirm(t("parent.deleteBookSure", { title: pick(b.title, lang) }))) return;
    setBusy(true);
    done(await call("DELETE", `/api/bokasmidja/books/${b.id}`));
  };

  const field = "mt-1 w-full rounded-2xl border-2 border-slate-200 px-4 py-2.5 text-lg outline-none focus:border-orange-400";

  return (
    <>
      <TopBar />
      <main className="mx-auto w-full max-w-3xl px-4 pb-16 pt-6">
        <h1 className="bk-display text-4xl font-extrabold text-slate-900">{t("parent.title")}</h1>

        <section className="mt-6 rounded-[2rem] bg-white p-6 shadow-lg ring-2 ring-slate-100">
          <h2 className="bk-display text-2xl font-extrabold">{t("parent.kids")}</h2>
          {!kids.length && !form && <p className="mt-2 font-bold text-slate-600">{t("parent.kidsEmpty")}</p>}
          <ul className="mt-4 space-y-3">
            {kids.map((k) => (
              <li key={k.id} className="flex items-center gap-4 rounded-3xl bg-slate-50 p-3">
                <Avatar avatar={k.avatar} color={k.color} size={56} />
                <span className="bk-display min-w-0 flex-1 truncate text-xl font-extrabold">{k.name}</span>
                <button type="button" onClick={() => { setForm(edit(k)); setError(""); }} className="bk-press rounded-2xl bg-white px-4 py-2 font-bold ring-2 ring-slate-200">{t("parent.edit")}</button>
                <button type="button" onClick={() => removeKid(k)} disabled={busy} aria-label={`${t("parent.remove")}: ${k.name}`} className="bk-press rounded-2xl bg-white p-2.5 ring-2 ring-slate-200">
                  <Trash2 className="h-5 w-5 text-red-600" aria-hidden />
                </button>
              </li>
            ))}
          </ul>

          {form ? (
            <form onSubmit={save} className="bk-pop mt-5 rounded-3xl border-2 border-orange-200 p-5">
              <div className="grid gap-4 sm:grid-cols-[1fr_7rem]">
                <label className="block font-bold text-slate-700">{t("parent.name")}
                  <input className={field} value={form.name} maxLength={40} required autoFocus onChange={(e) => setForm({ ...form, name: e.target.value })} />
                </label>
                <label className="block font-bold text-slate-700">{t("parent.age")}
                  <input className={field} type="number" min={2} max={17} inputMode="numeric" value={form.age} onChange={(e) => setForm({ ...form, age: e.target.value })} />
                </label>
              </div>
              <label className="mt-4 block font-bold text-slate-700">{form.id ? t("parent.pinKeep") : t("parent.pin")}
                <input className={cx(field, "tracking-[0.5em]")} inputMode="numeric" pattern="\d{4}" maxLength={4} autoComplete="off" required={!form.id}
                  value={form.pin} onChange={(e) => setForm({ ...form, pin: e.target.value.replace(/\D/g, "").slice(0, 4) })} />
              </label>
              <fieldset className="mt-4">
                <legend className="font-bold text-slate-700">{t("parent.picture")}</legend>
                <div className="mt-1 flex flex-wrap gap-2">
                  {Object.entries(AVATARS).map(([key, emoji]) => (
                    <button key={key} type="button" aria-pressed={form.avatar === key} aria-label={key} onClick={() => setForm({ ...form, avatar: key })}
                      className={cx("bk-press flex h-12 w-12 items-center justify-center rounded-2xl text-2xl ring-4", form.avatar === key ? "bg-orange-100 ring-orange-400" : "bg-slate-50 ring-transparent")}>{emoji}</button>
                  ))}
                </div>
              </fieldset>
              <fieldset className="mt-4">
                <legend className="font-bold text-slate-700">{t("parent.color")}</legend>
                <div className="mt-1 flex flex-wrap gap-2">
                  {COLORS.map((c) => (
                    <button key={c} type="button" aria-pressed={form.color === c} aria-label={c} onClick={() => setForm({ ...form, color: c })}
                      className={cx("bk-press h-10 w-10 rounded-full ring-4", form.color === c ? "ring-slate-800" : "ring-transparent")} style={{ background: c }} />
                  ))}
                </div>
              </fieldset>
              <div className="mt-4">
                <p className="mb-1 font-bold text-slate-700">{t("parent.lang")}</p>
                <LangSwitch value={form.lang} onPick={(l) => setForm({ ...form, lang: l })} />
              </div>
              {error && <p role="alert" className="mt-4 font-bold text-red-600">{error}</p>}
              <div className="mt-5 flex gap-3">
                <BigButton tone="white" onClick={() => { setForm(null); setError(""); }}>{t("parent.cancel")}</BigButton>
                <BigButton type="submit" className="flex-1" disabled={busy}>{t("parent.save")}</BigButton>
              </div>
            </form>
          ) : (
            <BigButton className="mt-5" onClick={() => { setForm(blank()); setError(""); }}><Plus className="h-6 w-6" aria-hidden />{t("parent.add")}</BigButton>
          )}
        </section>

        <section className="mt-6 rounded-[2rem] bg-white p-6 shadow-lg ring-2 ring-slate-100">
          <h2 className="bk-display text-2xl font-extrabold">{t("parent.setup")}</h2>
          <ul className="mt-3 space-y-2 font-bold">
            <Check ok={setup.writer} yes={t("parent.writerOk")} no={t("parent.writerMissing")} />
            <Check ok={setup.voice} yes={t("parent.voiceOk")} no={t("parent.voiceMissing")} />
          </ul>
        </section>

        <section className="mt-6 rounded-[2rem] bg-white p-6 shadow-lg ring-2 ring-slate-100">
          <h2 className="bk-display text-2xl font-extrabold">{t("parent.books")}</h2>
          <ul className="mt-3 divide-y-2 divide-slate-100">
            {books.map((b) => (
              <li key={b.id} className="flex items-center gap-3 py-3">
                <span aria-hidden className="text-2xl">{b.emoji}</span>
                <span className="min-w-0 flex-1 truncate font-bold">{pick(b.title, lang) || t("shelf.newBook")}</span>
                <span className="shrink-0 text-sm font-bold text-slate-500">{t("shelf.stories", { done: b.stories.filter((s) => s.status !== "idea").length, total: b.plannedStories })}</span>
                <button type="button" onClick={() => removeBook(b)} disabled={busy} aria-label={`${t("parent.deleteBook")}: ${pick(b.title, lang)}`} className="bk-press rounded-2xl p-2 ring-2 ring-slate-200">
                  <Trash2 className="h-5 w-5 text-red-600" aria-hidden />
                </button>
              </li>
            ))}
          </ul>
        </section>

        <Link href="/bokasmidja/books" className="bk-press bk-display mt-8 flex min-h-16 items-center justify-center rounded-3xl bg-emerald-500 px-6 text-2xl font-extrabold text-white shadow-[0_6px_0_#047857]">
          {t("parent.toShelf")} →
        </Link>
      </main>
    </>
  );
}

function Check({ ok, yes, no }: { ok: boolean; yes: string; no: string }) {
  return (
    <li className={cx("flex items-start gap-2", ok ? "text-emerald-700" : "text-amber-700")}>
      {ok ? <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" aria-hidden /> : <CircleAlert className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />}
      <span>{ok ? yes : no}</span>
    </li>
  );
}
