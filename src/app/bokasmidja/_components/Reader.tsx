"use client";

// Lesarinn. Kápa → síður → „Endir“. Stórir takkar til að fletta (líka strok og
// örvatakkar), upplestur sem flettir sjálfur, og „töfrar“: myndin hreyfist og
// svarar þegar ýtt er á hana.

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, FileDown, LayoutDashboard, Maximize, MoreHorizontal, Pencil, RefreshCw, Sparkles, Square, Trash2, Volume2 } from "lucide-react";
import { errorText } from "@/lib/bokasmidja/i18n";
import { LANGS, LANG_BCP47, pick, type Lang } from "@/lib/bokasmidja/types";
import PdfDialog from "./PdfDialog";
import { useBk } from "./Provider";
import type { BookInfo, Phase, Story } from "./StoryRoom";
import { Art, BigButton, LangSwitch, TopBar, call, cx } from "./ui";

/** Stutt „popp“ þegar ýtt er á hlut í myndinni. */
function pop() {
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    const ac = new Ctx();
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(520, ac.currentTime);
    osc.frequency.exponentialRampToValueAtTime(880, ac.currentTime + 0.12);
    gain.gain.setValueAtTime(0.12, ac.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.2);
    osc.connect(gain).connect(ac.destination);
    osc.start();
    osc.stop(ac.currentTime + 0.22);
    osc.onended = () => void ac.close();
  } catch { /* hljóð er aukaatriði */ }
}

/** Talgervill vafrans, notaður þegar upplestur af þjóni fæst ekki. Skilar false ef engin rödd er til. */
function speak(text: string, lang: Lang, onEnd: () => void): boolean {
  const synth = typeof window !== "undefined" ? window.speechSynthesis : undefined;
  if (!synth) return false;
  const prefixes = lang === "nb" ? ["nb", "no"] : [lang];
  const voice = synth.getVoices().find((v) => prefixes.some((p) => v.lang.toLowerCase().startsWith(p)));
  if (!voice) return false;
  const u = new SpeechSynthesisUtterance(text);
  u.voice = voice;
  u.lang = voice.lang || LANG_BCP47[lang];
  u.rate = 0.9;
  u.onend = onEnd;
  synth.cancel();
  synth.speak(u);
  return true;
}

export default function Reader({ story, setStory, book, phase, editable, onRetry }: {
  story: Story;
  setStory: (s: Story) => void;
  book: BookInfo;
  phase: Phase;
  editable: boolean;
  onRetry: () => void;
}) {
  const { lang, t } = useBk();
  const router = useRouter();
  const n = story.pages.length;
  const [slide, setSlide] = useState(0); // 0 = kápa, 1..n = síður, n+1 = endir
  const [readLang, setReadLang] = useState<Lang>(lang);
  const [magic, setMagic] = useState(true);
  const [listening, setListening] = useState(false);
  const [note, setNote] = useState("");
  const [menu, setMenu] = useState(false);
  const [pdf, setPdf] = useState(false);
  const [draft, setDraft] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const audio = useRef<HTMLAudioElement | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const root = useRef<HTMLDivElement | null>(null);
  const touch = useRef<number | null>(null);
  // Nýjustu gildi handa atburðahlusturum sem lifa lengur en ein teikning.
  const live = useRef({ slide, listening, readLang, story });
  useEffect(() => { live.current = { slide, listening, readLang, story }; });

  const page = slide >= 1 && slide <= n ? story.pages[slide - 1] : null;
  const textIn = (v: Partial<Record<Lang, string>>, l: Lang) => v[l] || v[story.sourceLang] || pick(v, l);
  const title = textIn(story.title, readLang);
  // Textinn er til á öðru máli en ekki þessu (auð síða er ekki „vöntun“).
  const missing = !!page && !page.text[readLang] && LANGS.some((l) => page.text[l]);
  const shown = page ? page.text[readLang] || page.text[story.sourceLang] || pick(page.text, readLang) : "";
  // Síða án myndar sem smiðjan á ekki að mála: aðeins texti.
  const textOnly = !!page && !page.svg && !page.autoArt;
  const backHref = book.collection ? `/bokasmidja/book/${book.id}` : "/bokasmidja/books";

  const silence = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    const a = audio.current;
    if (a) { a.onended = null; a.onerror = null; a.pause(); }
    if (typeof window !== "undefined") window.speechSynthesis?.cancel();
  }, []);

  /** Les síðu i upphátt og flettir svo áfram. Kallað beint úr smelli, svo iOS leyfi spilun. */
  const play = useCallback((i: number) => {
    silence();
    const { story: s, readLang: l } = live.current;
    const p = s.pages[i - 1];
    const text = p ? p.text[l] || p.text[s.sourceLang] : "";
    const speechLang = p?.text[l] ? l : s.sourceLang;
    if (!p || !text) { setListening(false); return; }
    const onward = () => {
      timer.current = setTimeout(() => {
        if (!live.current.listening) return;
        if (i >= s.pages.length) { setSlide(s.pages.length + 1); setListening(false); return; }
        setSlide(i + 1);
        play(i + 1);
      }, 800);
    };
    const fallback = () => {
      if (!live.current.listening) return;
      if (!speak(text, speechLang, onward)) { setNote(t("reader.noVoice")); setListening(false); }
    };
    const a = (audio.current ??= new Audio());
    a.onended = onward;
    a.onerror = fallback;
    a.src = `/api/bokasmidja/pages/${p.id}/audio?lang=${speechLang}`;
    a.play().catch(fallback);
  }, [silence, t]);

  const go = useCallback((to: number) => {
    const { listening: on, story: s } = live.current;
    const next = Math.max(0, Math.min(s.pages.length + 1, to));
    setSlide(next);
    setDraft(null);
    setMenu(false);
    setNote("");
    if (!on) return;
    if (next >= 1 && next <= s.pages.length) play(next);
    else { silence(); setListening(false); }
  }, [play, silence]);

  const toggleListen = () => {
    setNote("");
    if (listening) { silence(); setListening(false); return; }
    const start = slide >= 1 && slide <= n ? slide : 1;
    live.current.listening = true;
    setListening(true);
    setSlide(start);
    play(start);
  };

  useEffect(() => silence, [silence]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === "ArrowRight") go(live.current.slide + 1);
      else if (e.key === "ArrowLeft") go(live.current.slide - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go]);

  const pickLang = (l: Lang) => {
    setReadLang(l);
    live.current.readLang = l;
    if (listening && page) play(slide);
  };

  const onArt = (e: React.MouseEvent) => {
    if (!magic) return;
    const el = (e.target as Element).closest?.("[data-tap]");
    if (!el) return;
    el.setAttribute("data-tapped", el.getAttribute("data-tap") || "jump");
    pop();
    setTimeout(() => el.removeAttribute("data-tapped"), 1500);
  };

  const saveText = async () => {
    if (!page || draft === null) return;
    setBusy(true);
    const langToSave = page.text[readLang] ? readLang : story.sourceLang;
    const res = await call("PATCH", `/api/bokasmidja/pages/${page.id}`, { lang: langToSave, text: draft });
    setBusy(false);
    if (!res.ok) { setNote(errorText(t, res.error)); return; }
    setStory({ ...story, pages: story.pages.map((p) => (p.id === page.id ? { ...p, text: { ...p.text, [langToSave]: draft.trim() } } : p)) });
    setDraft(null);
  };

  const repaint = async () => {
    if (!page) return;
    setMenu(false);
    setBusy(true);
    const id = page.id;
    setStory({ ...story, pages: story.pages.map((p) => (p.id === id ? { ...p, svg: null } : p)) });
    const res = await call("POST", `/api/bokasmidja/pages/${id}/illustrate`, { redo: true });
    setBusy(false);
    if (!res.ok || !res.svg) setNote(errorText(t, res.error));
    setStory({ ...live.current.story, pages: live.current.story.pages.map((p) => (p.id === id ? { ...p, svg: res.svg || page.svg } : p)) });
  };

  const remove = async () => {
    if (!window.confirm(t("reader.deleteSure"))) return;
    setBusy(true);
    const res = await call("DELETE", `/api/bokasmidja/stories/${story.id}`);
    if (!res.ok) { setBusy(false); setNote(errorText(t, res.error)); return; }
    router.push(res.bookGone ? "/bokasmidja/books" : backHref);
    router.refresh();
  };

  const status = phase.kind === "painting" && phase.n ? t("studio.painting", { n: phase.n, total: phase.total })
    : phase.kind === "translating" ? t("studio.translating") : "";

  return (
    <div ref={root} className="bk-root flex min-h-screen flex-col">
      <TopBar />
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center gap-2 px-4 pt-3">
        <Link href={backHref} className="bk-press flex items-center gap-1 rounded-2xl px-2 py-1.5 font-extrabold text-slate-600">
          <ArrowLeft className="h-5 w-5" aria-hidden /><span className="max-w-[40vw] truncate">{book.collection ? pick(book.title, lang) : t("nav.shelf")}</span>
        </Link>
        <div className="ml-auto flex items-center gap-2">
          <LangSwitch value={readLang} onPick={pickLang} />
          <div className="relative">
            <button type="button" onClick={() => setMenu(!menu)} aria-expanded={menu} aria-label={t("reader.more")} className="bk-press rounded-2xl bg-white p-2.5 ring-2 ring-slate-200">
              <MoreHorizontal className="h-6 w-6" aria-hidden />
            </button>
            {menu && (
              <div className="bk-pop absolute right-0 z-20 mt-2 w-72 rounded-3xl bg-white p-2 shadow-2xl ring-2 ring-slate-100">
                <MenuItem icon={<FileDown className="h-5 w-5 text-sky-600" />} onClick={() => { setMenu(false); setPdf(true); }}>{t("book.pdf")}</MenuItem>
                <MenuItem icon={<Maximize className="h-5 w-5 text-slate-600" />} onClick={() => { setMenu(false); void root.current?.requestFullscreen?.().catch(() => {}); }}>{t("reader.full")}</MenuItem>
                {editable && <Link href={`/bokasmidja/story/${story.id}/edit`} className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left font-bold hover:bg-slate-50"><LayoutDashboard className="h-5 w-5 text-orange-600" aria-hidden />{t("edit.open")}</Link>}
                {editable && page && !missing && <MenuItem icon={<Pencil className="h-5 w-5 text-violet-600" />} onClick={() => { setMenu(false); setDraft(page.text[readLang] || page.text[story.sourceLang] || ""); }}>{t("reader.edit")}</MenuItem>}
                {editable && page && page.svg && phase.kind === "done" && <MenuItem icon={<RefreshCw className="h-5 w-5 text-emerald-600" />} onClick={repaint}>{t("reader.repaint")}</MenuItem>}
                {editable && <MenuItem icon={<Trash2 className="h-5 w-5 text-red-600" />} onClick={remove}>{t("reader.delete")}</MenuItem>}
              </div>
            )}
          </div>
        </div>
      </div>

      {(status || phase.kind === "error") && (
        <div className="mx-auto mt-3 w-full max-w-6xl px-4">
          {phase.kind === "error" ? (
            <div role="alert" className="flex flex-wrap items-center gap-3 rounded-3xl bg-red-50 p-3 font-bold text-red-700 ring-2 ring-red-200">
              <span className="flex-1">{errorText(t, phase.code)}</span>
              <BigButton tone="white" className="min-h-11 px-4 py-1.5 text-base" onClick={onRetry}>{t("studio.retry")}</BigButton>
            </div>
          ) : (
            <p role="status" className="flex items-center gap-3 rounded-3xl bg-amber-100 p-3 font-bold text-amber-900">
              <span aria-hidden className="bk-write text-2xl">🎨</span>
              <span>{status} <span className="font-semibold">{phase.kind === "painting" ? t("studio.wait") : ""}</span></span>
            </p>
          )}
        </div>
      )}

      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 pb-4 pt-4"
        onTouchStart={(e) => { touch.current = e.touches[0].clientX; }}
        onTouchEnd={(e) => {
          if (touch.current === null || draft !== null) return;
          const dx = e.changedTouches[0].clientX - touch.current;
          touch.current = null;
          if (Math.abs(dx) > 70) go(slide + (dx < 0 ? 1 : -1));
        }}>
        {slide === 0 && (
          <section className="bk-pop grid flex-1 items-center gap-6 lg:grid-cols-2">
            <Art svg={story.pages[0]?.svg ?? null} className="rounded-[2rem] shadow-xl ring-4 ring-white"><span aria-hidden className="bk-write text-6xl">🎨</span></Art>
            <div className="text-center lg:text-left">
              <h1 className="bk-display text-4xl font-extrabold leading-tight text-slate-900 [text-wrap:balance] sm:text-6xl">{title}</h1>
              {story.authorName && <p className="mt-3 text-xl font-bold text-slate-600">{t("reader.inventedBy", { name: story.authorName })}</p>}
              <p className="mt-4 text-xl leading-relaxed text-slate-700">{textIn(story.summary, readLang)}</p>
              <div className="mt-6 flex flex-wrap justify-center gap-3 lg:justify-start">
                <BigButton tone="green" className="text-2xl" onClick={() => go(1)}>{t("reader.start")}<ArrowRight className="h-7 w-7" aria-hidden /></BigButton>
                <BigButton tone="blue" className="text-2xl" onClick={toggleListen}><Volume2 className="h-7 w-7" aria-hidden />{t("reader.listen")}</BigButton>
              </div>
            </div>
          </section>
        )}

        {page && (
          <section key={page.id} className={cx("bk-pop grid flex-1 items-center gap-5", textOnly ? "mx-auto w-full max-w-3xl" : page.layout === "text-first" ? "lg:grid-cols-[2fr_3fr]" : "lg:grid-cols-[3fr_2fr]")}>
            {!textOnly && <div className={cx(magic && "bk-magic", page.layout === "text-first" && "order-2")} onClick={onArt}>
              <Art svg={page.svg} className="rounded-[2rem] shadow-xl ring-4 ring-white">
                <span className="flex flex-col items-center gap-3 p-6 text-center font-bold text-sky-900">
                  <span aria-hidden className="bk-write text-6xl">🎨</span>{t("studio.pagePainting")}
                </span>
              </Art>
              {magic && page.svg && slide === 1 && <p className="mt-2 text-center font-bold text-slate-500">👆 {t("reader.tapHint")}</p>}
            </div>}
            <div className="rounded-[2rem] bg-white p-6 shadow-lg ring-2 ring-slate-100">
              {draft !== null ? (
                <>
                  <textarea value={draft} onChange={(e) => setDraft(e.target.value)} rows={8} maxLength={1500} autoFocus aria-label={t("reader.edit")}
                    className="w-full rounded-2xl border-4 border-violet-200 p-3 text-xl leading-relaxed outline-none focus:border-violet-400" />
                  <div className="mt-3 flex gap-3">
                    <BigButton tone="white" onClick={() => setDraft(null)}>{t("reader.cancel")}</BigButton>
                    <BigButton tone="purple" className="flex-1" onClick={saveText} disabled={busy || !draft.trim()}>{t("reader.save")}</BigButton>
                  </div>
                </>
              ) : (
                <>
                  {missing && <p className="mb-3 rounded-2xl bg-amber-100 p-3 font-bold text-amber-900">{t("reader.missingLang")}</p>}
                  <p lang={page.text[readLang] ? readLang : story.sourceLang} className="whitespace-pre-line text-2xl font-bold leading-relaxed text-slate-800 sm:text-[1.7rem] sm:leading-[1.6]">
                    {shown}
                  </p>
                </>
              )}
            </div>
          </section>
        )}

        {slide === n + 1 && (
          <section className="bk-pop flex flex-1 flex-col items-center justify-center text-center">
            <div aria-hidden className="text-8xl">🌙</div>
            <h2 className="bk-display mt-2 text-6xl font-extrabold text-slate-900">{t("reader.end")}</h2>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <BigButton tone="blue" onClick={() => go(0)}>{t("reader.again")}</BigButton>
              <Link href={backHref} className="bk-press bk-display inline-flex min-h-14 items-center rounded-3xl bg-white px-7 py-3 text-xl font-extrabold shadow-[0_6px_0_#cbd5e1] ring-2 ring-slate-200">
                {book.collection ? t("reader.toBook") : t("nav.shelf")}
              </Link>
              <Link href="/bokasmidja/new" className="bk-press bk-display inline-flex min-h-14 items-center gap-2 rounded-3xl bg-orange-500 px-7 py-3 text-xl font-extrabold text-white shadow-[0_6px_0_#c2410c]">
                <Sparkles className="h-6 w-6" aria-hidden />{t("shelf.make")}
              </Link>
            </div>
          </section>
        )}

        {note && <p role="alert" className="mt-3 text-center font-bold text-red-600">{note}</p>}
      </main>

      {/* Stýringar: alltaf á sama stað, stórar og fáar. */}
      <nav className="sticky bottom-0 z-10 border-t-2 border-slate-100 bg-white/95 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur" aria-label={t("reader.page", { n: Math.min(Math.max(slide, 1), n), total: n })}>
        <div className="mx-auto flex w-full max-w-6xl items-center gap-3">
          <button type="button" onClick={() => go(slide - 1)} disabled={slide === 0} aria-label={t("reader.prev")}
            className="bk-press flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-white shadow-[0_5px_0_#cbd5e1] ring-2 ring-slate-200">
            <ArrowLeft className="h-8 w-8" aria-hidden />
          </button>
          <div className="flex min-w-0 flex-1 flex-col items-center gap-2">
            <div className="flex items-center gap-2">
              <button type="button" onClick={toggleListen} aria-pressed={listening}
                className={cx("bk-press bk-display flex min-h-12 items-center gap-2 rounded-2xl px-4 text-lg font-extrabold", listening ? "bg-red-500 text-white" : "bg-sky-500 text-white")}>
                {listening ? <Square className="h-5 w-5" aria-hidden /> : <Volume2 className="h-6 w-6" aria-hidden />}
                <span className="hidden sm:inline">{listening ? t("reader.stop") : t("reader.listen")}</span>
              </button>
              <button type="button" onClick={() => setMagic(!magic)} aria-pressed={magic}
                className={cx("bk-press bk-display flex min-h-12 items-center gap-2 rounded-2xl px-4 text-lg font-extrabold", magic ? "bg-violet-500 text-white" : "bg-slate-200 text-slate-600")}>
                <Sparkles className="h-6 w-6" aria-hidden /><span className="hidden sm:inline">{t("reader.magic")}</span>
              </button>
            </div>
            <div className="flex max-w-full items-center gap-1.5 overflow-hidden" aria-hidden>
              {Array.from({ length: n + 2 }, (_, i) => (
                <span key={i} className={cx("h-2.5 rounded-full transition-all", i === slide ? "w-6 bg-orange-500" : "w-2.5 bg-slate-300")} />
              ))}
            </div>
          </div>
          <button type="button" onClick={() => go(slide + 1)} disabled={slide === n + 1} aria-label={t("reader.next")}
            className="bk-press flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white shadow-[0_5px_0_#047857]">
            <ArrowRight className="h-8 w-8" aria-hidden />
          </button>
        </div>
      </nav>

      {pdf && (
        <PdfDialog onClose={() => setPdf(false)} load={async () => [story]}
          book={{ title: story.title, subtitle: story.summary, color: book.color, emoji: book.emoji, cover: false }} />
      )}
    </div>
  );
}

function MenuItem({ icon, onClick, children }: { icon: React.ReactNode; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left font-bold hover:bg-slate-50">
      <span aria-hidden>{icon}</span>{children}
    </button>
  );
}
