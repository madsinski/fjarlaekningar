"use client";

// Ein bók: nafnið (sem má breyta), sögurnar, næsta skref og „Bæta við sögu“.

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowRight, FileDown, FolderInput, Image as ImageIcon, Paintbrush, Pencil, Plus, Trash2, Upload, X } from "lucide-react";
import { errorText } from "@/lib/bokasmidja/i18n";
import { MAX_STORIES, pick, type BookView, type I18nText, type StoryView } from "@/lib/bokasmidja/types";
import PdfDialog from "./PdfDialog";
import { useBk } from "./Provider";
import { BookCover } from "./Shelf";
import { Art, BigButton, TopBar, call, shrinkImage } from "./ui";

interface OtherBook { id: string; title: I18nText; emoji: string; color: string }

export default function BookRoom({ book: initial, others }: { book: BookView; others: OtherBook[] }) {
  const { lang, t, viewer } = useBk();
  const router = useRouter();
  const [book, setBook] = useState(initial);
  const [pdf, setPdf] = useState(false);
  const [name, setName] = useState<string | null>(null); // null = not renaming
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [coverOpen, setCoverOpen] = useState(false);
  const [coverBusy, setCoverBusy] = useState(false);
  const [moving, setMoving] = useState<StoryView | null>(null);

  const editable = viewer?.role === "parent" || (viewer?.role === "kid" && viewer.child.id === book.createdBy);
  const slots = Array.from({ length: Math.max(book.plannedStories, book.stories.length) }, (_, i) => book.stories[i] ?? null);
  const unfinished = book.stories.find((s) => s.status !== "ready");
  const firstEmpty = slots.findIndex((s) => !s) + 1;
  const canAdd = book.stories.length < MAX_STORIES;
  const newHref = `/bokasmidja/new?book=${book.id}`;
  const bookTitle = pick(book.title, lang) || t("shelf.newBook");
  const title = (s: StoryView) => pick(s.title, lang) || t("book.inProgress");

  // Næsta skref er alltaf eitt og skýrt: klára, búa til næstu, eða lesa.
  const next = unfinished
    ? { href: `/bokasmidja/story/${unfinished.id}`, label: t("book.nextContinue", { title: title(unfinished) }) }
    : !book.stories.length
      ? { href: newHref, label: t("book.nextFirst") }
      : firstEmpty
        ? { href: newHref, label: t("book.nextMake", { n: firstEmpty }) }
        : { href: `/bokasmidja/story/${book.stories[0].id}`, label: t("book.nextRead") };

  const rename = async (e: React.FormEvent) => {
    e.preventDefault();
    if (name === null) return;
    setBusy(true);
    const res = await call("PATCH", `/api/bokasmidja/books/${book.id}`, { lang, title: name });
    setBusy(false);
    if (!res.ok) { setError(errorText(t, res.error)); return; }
    setBook({ ...book, title: res.title });
    setName(null);
    setError("");
    router.refresh();
  };
  const remove = async () => {
    if (!window.confirm(t("parent.deleteBookSure", { title: bookTitle }))) return;
    setBusy(true);
    const res = await call("DELETE", `/api/bokasmidja/books/${book.id}`);
    if (!res.ok) { setBusy(false); setError(errorText(t, res.error)); return; }
    router.push("/bokasmidja/books");
    router.refresh();
  };

  const canEditStory = (s: StoryView) => viewer?.role === "parent" || (viewer?.role === "kid" && viewer.child.id === s.createdBy);

  /** Kápa: máluð úr efni bókarinnar, úr teikningu, tilbúin mynd, eða fjarlægð. */
  const cover = async (mode: "ai" | "drawing" | "image" | "remove", file?: File) => {
    setError("");
    setCoverBusy(true);
    let res;
    if (mode === "remove") res = await call("DELETE", `/api/bokasmidja/books/${book.id}/cover`);
    else {
      const image = mode === "ai" ? undefined : file ? await shrinkImage(file, mode === "image" ? 2000 : 1568) : null;
      res = image === null ? { ok: false, error: "bad_image" } : await call("POST", `/api/bokasmidja/books/${book.id}/cover`, { mode, image });
    }
    setCoverBusy(false);
    if (!res.ok) { setError(errorText(t, res.error)); return; }
    setBook((b) => ({ ...b, coverSvg: res.coverSvg ?? null, coverImage: res.coverImage ?? null }));
    setCoverOpen(false);
    router.refresh();
  };

  const move = async (to: string) => {
    if (!moving) return;
    setBusy(true);
    const res = await call("PATCH", `/api/bokasmidja/stories/${moving.id}`, { bookId: to });
    setBusy(false);
    if (!res.ok) { setError(errorText(t, res.error)); setMoving(null); return; }
    setBook((b) => ({ ...b, stories: b.stories.filter((s) => s.id !== moving.id) }));
    setMoving(null);
    router.refresh();
  };

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
          <div className="min-w-0 flex-1">
            {name !== null ? (
              <form onSubmit={rename}>
                <label htmlFor="bk-rename" className="font-extrabold text-slate-600">{t("book.name")}</label>
                <input id="bk-rename" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} autoFocus
                  className="bk-display mt-1 w-full rounded-3xl border-4 border-orange-200 px-4 py-3 text-2xl font-extrabold outline-none focus:border-orange-400" />
                <div className="mt-3 flex gap-3">
                  <BigButton tone="white" onClick={() => { setName(null); setError(""); }}>{t("reader.cancel")}</BigButton>
                  <BigButton type="submit" disabled={busy || !name.trim()} className="flex-1">{t("reader.save")}</BigButton>
                </div>
              </form>
            ) : (
              <>
                <h1 className="bk-display text-4xl font-extrabold leading-tight text-slate-900 [text-wrap:balance]">{bookTitle}</h1>
                <p className="mt-1 text-xl font-bold text-slate-600">{pick(book.subtitle, lang)}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {editable && (
                    <button type="button" onClick={() => setName(pick(book.title, lang))}
                      className="bk-press inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-2.5 font-extrabold text-slate-700 ring-2 ring-slate-200">
                      <Pencil className="h-5 w-5 text-violet-600" aria-hidden />{t("book.rename")}
                    </button>
                  )}
                  {editable && (
                    <button type="button" onClick={() => { setCoverOpen(true); setError(""); }}
                      className="bk-press inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-2.5 font-extrabold text-slate-700 ring-2 ring-slate-200">
                      <ImageIcon className="h-5 w-5 text-orange-500" aria-hidden />{t("cover.button")}
                    </button>
                  )}
                  {book.stories.some((s) => s.status !== "idea") && (
                    <button type="button" onClick={() => setPdf(true)}
                      className="bk-press inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-2.5 font-extrabold text-slate-700 ring-2 ring-slate-200">
                      <FileDown className="h-5 w-5 text-sky-600" aria-hidden />{t("book.pdf")}
                    </button>
                  )}
                  {editable && (
                    <button type="button" onClick={remove} disabled={busy} aria-label={t("book.delete")} title={t("book.delete")}
                      className="bk-press inline-flex items-center rounded-2xl bg-white p-2.5 ring-2 ring-slate-200">
                      <Trash2 className="h-5 w-5 text-red-600" aria-hidden />
                    </button>
                  )}
                </div>
              </>
            )}
            {error && <p role="alert" className="mt-3 font-bold text-red-600">{error}</p>}
          </div>
        </div>

        <Link href={next.href} className="bk-press mt-8 flex items-center gap-4 rounded-[2rem] bg-emerald-500 p-5 text-white shadow-[0_8px_0_#047857]">
          <span aria-hidden className="bk-nudge text-4xl">👉</span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-extrabold uppercase tracking-wide text-white/85">{t("book.next")}</span>
            <span className="bk-display block text-2xl font-extrabold leading-tight">{next.label}</span>
          </span>
          <ArrowRight className="h-8 w-8 shrink-0" aria-hidden />
        </Link>

        <ol className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {slots.map((s, i) => (
            <li key={s?.id ?? i}>
              {s ? (
                <div className="flex h-full flex-col gap-2">
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
                {canEditStory(s) && (
                  <button type="button" onClick={() => { setMoving(s); setError(""); }}
                    className="bk-press inline-flex items-center justify-center gap-2 rounded-2xl bg-white/70 px-3 py-2 text-sm font-extrabold text-slate-600 ring-2 ring-slate-200">
                    <FolderInput className="h-4 w-4 text-sky-600" aria-hidden />{t("move.button")}
                  </button>
                )}
                </div>
              ) : (
                <AddCard href={newHref} top={t("book.story", { n: i + 1 })} label={t("book.make")} />
              )}
            </li>
          ))}
          {/* Bók er aldrei „full“ fyrr en við hámarkið: alltaf má bæta við sögu. */}
          {!firstEmpty && canAdd && <li><AddCard href={newHref} top={t("book.story", { n: slots.length + 1 })} label={t("book.addStory")} /></li>}
        </ol>
      </main>
      {pdf && (
        <PdfDialog onClose={() => setPdf(false)} load={loadStories}
          book={{ title: book.title, subtitle: book.subtitle, color: book.color, emoji: book.emoji, cover: !!pick(book.title, lang) || !!book.coverImage, coverSvg: book.coverSvg, coverImage: book.coverImage }} />
      )}

      {coverOpen && (
        <Dialog title={t("cover.title")} onClose={() => setCoverOpen(false)} locked={coverBusy} closeLabel={t("pdf.close")}>
          {coverBusy ? (
            <p role="status" className="flex items-center gap-3 rounded-3xl bg-amber-100 p-4 text-lg font-bold text-amber-900">
              <span aria-hidden className="bk-write text-3xl">🎨</span>{t("cover.working")}
            </p>
          ) : (
            <div className="grid gap-3">
              <Choice icon={<Paintbrush className="h-7 w-7 text-emerald-600" aria-hidden />} title={t("cover.ai")} sub={t("cover.aiSub")} onClick={() => cover("ai")} />
              <Choice icon={<span aria-hidden className="text-3xl">🖍️</span>} title={t("cover.drawing")} sub={t("cover.drawingSub")} onFile={(f) => cover("drawing", f)} />
              <Choice icon={<Upload className="h-7 w-7 text-sky-600" aria-hidden />} title={t("cover.image")} sub={t("cover.imageSub")} onFile={(f) => cover("image", f)} />
              {(book.coverSvg || book.coverImage) && (
                <button type="button" onClick={() => cover("remove")} className="bk-press mt-1 inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-2 font-bold text-red-600">
                  <Trash2 className="h-5 w-5" aria-hidden />{t("cover.remove")}
                </button>
              )}
            </div>
          )}
          {error && <p role="alert" className="mt-3 font-bold text-red-600">{error}</p>}
        </Dialog>
      )}

      {moving && (
        <Dialog title={t("move.title", { title: title(moving) })} onClose={() => setMoving(null)} locked={busy} closeLabel={t("pdf.close")}>
          {others.length ? (
            <ul className="grid gap-3">
              {others.map((o) => (
                <li key={o.id}>
                  <button type="button" onClick={() => move(o.id)} disabled={busy}
                    className="bk-press flex w-full items-center gap-4 rounded-3xl bg-slate-50 p-4 text-left ring-2 ring-slate-200">
                    <span aria-hidden className="flex h-12 w-10 shrink-0 items-center justify-center rounded-r-xl rounded-l text-2xl" style={{ background: o.color }}>{o.emoji}</span>
                    <span className="bk-display text-xl font-extrabold">{pick(o.title, lang) || t("shelf.newBook")}</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : <p className="text-lg font-bold text-slate-600">{t("move.none")}</p>}
        </Dialog>
      )}
    </>
  );
}

function AddCard({ href, top, label }: { href: string; top: string; label: string }) {
  return (
    <Link href={href} className="bk-press flex h-full min-h-56 flex-col items-center justify-center gap-2 rounded-3xl border-4 border-dashed border-slate-300 bg-white/60 p-5 text-center">
      <span className="flex h-16 w-16 items-center justify-center rounded-full bg-orange-100"><Plus className="h-9 w-9 text-orange-500" aria-hidden /></span>
      <span className="text-sm font-extrabold uppercase tracking-wide text-slate-400">{top}</span>
      <span className="bk-display text-xl font-extrabold text-slate-700">{label}</span>
    </Link>
  );
}

function Dialog({ title, onClose, locked, closeLabel, children }: { title: string; onClose: () => void; locked?: boolean; closeLabel: string; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 p-4 sm:items-center" role="dialog" aria-modal="true" aria-label={title}>
      <div className="bk-pop max-h-full w-full max-w-lg overflow-auto rounded-[2rem] bg-white p-6 shadow-2xl">
        <div className="mb-4 flex items-start justify-between gap-3">
          <h2 className="bk-display text-2xl font-extrabold leading-tight">{title}</h2>
          <button type="button" onClick={onClose} disabled={locked} aria-label={closeLabel} className="bk-press shrink-0 rounded-2xl bg-slate-100 p-2.5"><X className="h-6 w-6" aria-hidden /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

/** Val í kápuglugganum: hnappur, eða skráarval þegar onFile er gefið. */
function Choice({ icon, title, sub, onClick, onFile }: { icon: React.ReactNode; title: string; sub: string; onClick?: () => void; onFile?: (f: File) => void }) {
  const body = (
    <>
      <span className="flex h-12 w-12 shrink-0 items-center justify-center">{icon}</span>
      <span>
        <span className="bk-display block text-xl font-extrabold">{title}</span>
        <span className="block font-bold text-slate-500">{sub}</span>
      </span>
    </>
  );
  const cls = "bk-press flex w-full cursor-pointer items-center gap-4 rounded-3xl bg-slate-50 p-4 text-left ring-2 ring-slate-200 focus-within:outline focus-within:outline-4 focus-within:outline-blue-700";
  if (!onFile) return <button type="button" onClick={onClick} className={cls}>{body}</button>;
  return (
    <label className={cls}>
      {body}
      <input type="file" accept="image/*" className="sr-only" onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) onFile(f); }} />
    </label>
  );
}
