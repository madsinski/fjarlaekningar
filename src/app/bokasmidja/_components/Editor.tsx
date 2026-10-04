"use client";

// Ritillinn. Hér má breyta öllum texta bókarinnar á hverju máli fyrir sig,
// hlaða upp eigin teikningu sem málarinn gerir að bókarmynd, og draga myndir,
// texta og heilar síður á nýjan stað.
//
// Drátturinn notar bendilatburði (pointer events) en ekki HTML5 drag-and-drop,
// svo hann virki eins með fingri á spjaldtölvu og með mús. Gripið er í
// ✋-hnappana; annars myndi snerting á mynd stöðva skrun á síma.
//
// Allar breytingar fara í eina röð til þjónsins, svo vistun texta og færsla
// sem kemur strax á eftir lendi alltaf í réttri röð.

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowDown, ArrowLeft, ArrowLeftRight, ArrowUp, Camera, Check, Hand, Paintbrush, Plus, SpellCheck, Trash2 } from "lucide-react";
import { errorText } from "@/lib/bokasmidja/i18n";
import { LANGS, LENGTH_KEYS, MAX_PAGES, pageText, pagesFor, type Lang, type PageView, type StoryLength } from "@/lib/bokasmidja/types";
import { useBk } from "./Provider";
import type { Story } from "./StoryRoom";
import { Art, LangSwitch, TopBar, call, cx, shrinkImage } from "./ui";

type Kind = "page" | "art" | "text";
interface Drag { kind: Kind; id: string; x: number; y: number; over: string | null }

export default function Editor({ initial }: { initial: Story }) {
  const { lang: uiLang, t } = useBk();
  const [story, setStory] = useState(initial);
  const [lang, setLang] = useState<Lang>(uiLang);
  const [drag, setDrag] = useState<Drag | null>(null);
  const [busy, setBusy] = useState<Record<string, "drawing" | "paint">>({});
  const [saving, setSaving] = useState(0);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [checking, setChecking] = useState(false);
  const [stamp, setStamp] = useState(0); // busts the cache of "your drawing" thumbnails
  const live = useRef(story);
  useEffect(() => { live.current = story; });
  const dragRef = useRef<Drag | null>(null);
  const dirty = useRef(new Set<string>());
  const queue = useRef<Promise<unknown>>(Promise.resolve());
  const url = `/api/bokasmidja/stories/${story.id}`;
  // Saga með þrjár lengdir: ritillinn sýnir eina útgáfu í einu. Texti sem er
  // skrifaður hér verður texti þeirrar útgáfu. Röð síðna, nýjar síður og eyðing
  // eiga við um alla söguna og eru því aðeins í boði í lengstu útgáfunni.
  const multi = story.lengths >= 3;
  const [len, setLen] = useState<StoryLength>(multi ? 3 : 1);
  const pages = pagesFor(story.pages, multi ? len : 1);
  const whole = !multi || len === 3;
  const field = len === 3 && multi ? "textL" : len === 2 && multi ? "textM" : "text";

  /** Updates local state at once and sends the change to the server, in order. */
  const send = useCallback((method: string, path: string, body?: unknown) => {
    setSaving((n) => n + 1);
    setSaved(false);
    const job = queue.current.then(() => call(method, path, body)).then((res) => {
      setSaving((n) => n - 1);
      if (res.ok) { setSaved(true); setError(""); } else setError(errorText(t, res.error));
      return res;
    });
    queue.current = job;
    return job;
  }, [t]);

  const patchPages = (fn: (pages: PageView[]) => PageView[]) => {
    const next = { ...live.current, pages: fn(live.current.pages) };
    live.current = next;
    setStory(next);
  };
  const patchPage = (id: string, change: Partial<PageView>) => patchPages((ps) => ps.map((p) => (p.id === id ? { ...p, ...change } : p)));

  // ── Texti ────────────────────────────────────────────────────────────────
  const typeText = (id: string, value: string) => {
    dirty.current.add(`${id}:${lang}:${field}`);
    patchPages((ps) => ps.map((p) => (p.id === id ? { ...p, [field]: { ...p[field], [lang]: value } } : p)));
  };
  const saveText = (id: string, l: Lang) => {
    if (!dirty.current.delete(`${id}:${l}:${field}`)) return;
    const length = field === "textL" ? 3 : field === "textM" ? 2 : 1;
    void send("PATCH", `/api/bokasmidja/pages/${id}`, { lang: l, length, text: live.current.pages.find((p) => p.id === id)?.[field]?.[l] || "" });
  };
  const typeStory = (field: "title" | "summary", value: string) => {
    dirty.current.add(`story:${lang}`);
    const next = { ...live.current, [field]: { ...live.current[field], [lang]: value } };
    live.current = next;
    setStory(next);
  };
  const saveStory = (l: Lang) => {
    if (!dirty.current.delete(`story:${l}`)) return;
    const title = (live.current.title[l] || "").trim();
    if (title) void send("PATCH", url, { lang: l, title, summary: live.current.summary[l] || "" });
  };

  /** Yfirlestur íslenskunnar eftir breytingar: bíður eftir vistun, les yfir og sækir leiðréttan texta. */
  const proofread = async () => {
    (document.activeElement as HTMLElement | null)?.blur?.();
    setChecking(true);
    setError("");
    await queue.current;
    let res = await call("POST", `${url}/polish`, { force: true });
    for (let tries = 0; res.ok && res.busy && tries < 30; tries++) {
      await new Promise((r) => setTimeout(r, 8000));
      res = await call("POST", `${url}/polish`, {});
    }
    if (res.ok) {
      const fresh = await call("GET", url);
      if (fresh.ok) { live.current = fresh.story; setStory(fresh.story); setSaved(true); }
    } else setError(errorText(t, res.error));
    setChecking(false);
  };

  // ── Færslur ──────────────────────────────────────────────────────────────
  const reorder = (id: string, toIndex: number) => {
    const from = live.current.pages.findIndex((p) => p.id === id);
    if (from < 0 || toIndex < 0 || toIndex >= live.current.pages.length || from === toIndex) return;
    patchPages((ps) => {
      const next = [...ps];
      const [moved] = next.splice(from, 1);
      next.splice(toIndex, 0, moved);
      return next.map((p, i) => ({ ...p, position: i + 1 }));
    });
    void send("PUT", `${url}/pages`, { order: live.current.pages.map((p) => p.id) });
  };
  const swap = (what: "art" | "text", a: string, b: string) => {
    patchPages((ps) => {
      const pa = ps.find((p) => p.id === a);
      const pb = ps.find((p) => p.id === b);
      if (!pa || !pb) return ps;
      return ps.map((p) => {
        if (p.id !== a && p.id !== b) return p;
        const other = p.id === a ? pb : pa;
        return what === "art" ? { ...p, svg: other.svg, hasDrawing: other.hasDrawing, autoArt: false } : { ...p, text: other.text };
      });
    });
    if (what === "art") setStamp((n) => n + 1);
    void send("POST", `${url}/swap`, { what, a, b });
  };
  const flip = (id: string) => {
    const layout = live.current.pages.find((p) => p.id === id)?.layout === "text-first" ? "art-first" : "text-first";
    patchPage(id, { layout });
    void send("PATCH", `/api/bokasmidja/pages/${id}`, { layout });
  };
  const remove = (p: PageView, n: number) => {
    if (!window.confirm(t("edit.deletePageSure", { n }))) return;
    patchPages((ps) => ps.filter((x) => x.id !== p.id).map((x, i) => ({ ...x, position: i + 1 })));
    void send("DELETE", `/api/bokasmidja/pages/${p.id}`);
  };
  const add = async () => {
    const res = await send("POST", `${url}/pages`);
    if (res.ok) patchPages((ps) => [...ps, res.page]);
  };

  // ── Myndir ───────────────────────────────────────────────────────────────
  const setBusyFor = (id: string, v: "drawing" | "paint" | null) =>
    setBusy((b) => { const next = { ...b }; if (v) next[id] = v; else delete next[id]; return next; });

  const upload = async (id: string, file: File | undefined) => {
    if (!file) return;
    setError("");
    setBusyFor(id, "drawing");
    const image = await shrinkImage(file);
    const res = image ? await call("POST", `/api/bokasmidja/pages/${id}/drawing`, { image }) : { ok: false, error: "bad_image" };
    setBusyFor(id, null);
    if (!res.ok) { setError(errorText(t, res.error)); return; }
    patchPage(id, { svg: res.svg, hasDrawing: !!res.hasDrawing, autoArt: false });
    setStamp((n) => n + 1);
  };
  const paint = async (p: PageView) => {
    setError("");
    setBusyFor(p.id, "paint");
    const res = await call("POST", `/api/bokasmidja/pages/${p.id}/illustrate`, { redo: !!p.svg });
    setBusyFor(p.id, null);
    if (!res.ok || !res.svg) { setError(errorText(t, res.busy ? "busy" : res.error)); return; }
    patchPage(p.id, { svg: res.svg });
  };

  // ── Dráttur ──────────────────────────────────────────────────────────────
  /** Where would this drop land? "art:<id>", "text:<id>", "page:<id>" or "flip:<id>". */
  const targetAt = (kind: Kind, id: string, x: number, y: number): string | null => {
    const hit = document.elementFromPoint(x, y);
    if (!hit) return null;
    const own = (attr: string) => hit.closest(`[${attr}]`)?.getAttribute(attr) ?? null;
    if (kind === "page") { const p = own("data-drop-page"); return p && p !== id ? `page:${p}` : null; }
    const same = own(kind === "art" ? "data-drop-art" : "data-drop-text");
    if (same && same !== id) return `${kind}:${same}`;
    // A picture dropped on its own text (or the other way round) swaps their places.
    const cross = own(kind === "art" ? "data-drop-text" : "data-drop-art");
    return cross === id ? `flip:${id}` : null;
  };

  const startDrag = (kind: Kind, id: string) => (e: React.PointerEvent<HTMLButtonElement>) => {
    if (e.button !== 0 && e.pointerType === "mouse") return;
    e.preventDefault();
    (document.activeElement as HTMLElement | null)?.blur?.(); // saves a text being typed
    const el = e.currentTarget;
    el.setPointerCapture(e.pointerId);
    const first: Drag = { kind, id, x: e.clientX, y: e.clientY, over: null };
    dragRef.current = first;
    setDrag(first);
    // Síðasta staða bendilsins; skrunlykkjan hér að neðan notar hana.
    const at = { x: e.clientX, y: e.clientY };
    const update = () => {
      const next: Drag = { kind, id, x: at.x, y: at.y, over: targetAt(kind, id, at.x, at.y) };
      const prev = dragRef.current;
      dragRef.current = next;
      if (!prev || prev.x !== next.x || prev.y !== next.y || prev.over !== next.over) setDrag(next);
    };
    const move = (ev: PointerEvent) => { at.x = ev.clientX; at.y = ev.clientY; update(); };
    // Sjálfvirkt skrun: á meðan bendlinum er haldið við efri eða neðri brún
    // skjásins skrunar síðan áfram, líka þótt hann sé kyrr, svo hægt sé að
    // draga á síðu sem er utan skjás. Hraðinn vex eftir því sem nær dregur brúninni.
    const EDGE = 110;
    let frame = 0;
    const tick = () => {
      const fromBottom = window.innerHeight - at.y;
      const speed = at.y < EDGE ? -Math.ceil((EDGE - at.y) / 6) : fromBottom < EDGE ? Math.ceil((EDGE - fromBottom) / 6) : 0;
      if (speed) {
        const before = window.scrollY;
        // "instant": síðan notar annars mjúkt skrun, sem gerir dráttinn seinan.
        window.scrollBy({ top: speed, behavior: "instant" });
        if (window.scrollY !== before) update();
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    const end = (ev: PointerEvent) => {
      cancelAnimationFrame(frame);
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerup", end);
      el.removeEventListener("pointercancel", end);
      const over = ev.type === "pointerup" ? dragRef.current?.over : null;
      dragRef.current = null;
      setDrag(null);
      if (!over) return;
      const [what, target] = over.split(":");
      if (what === "page") reorder(id, live.current.pages.findIndex((p) => p.id === target));
      else if (what === "flip") flip(id);
      else swap(what as "art" | "text", id, target);
    };
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerup", end);
    el.addEventListener("pointercancel", end);
  };

  const grip = (kind: Kind, id: string, label: string, className?: string) => (
    <button type="button" onPointerDown={startDrag(kind, id)} aria-label={label} title={label}
      className={cx("flex h-12 w-12 shrink-0 cursor-grab touch-none select-none items-center justify-center rounded-2xl bg-amber-300 text-slate-900 shadow-[0_4px_0_#d97706] active:cursor-grabbing", className)}>
      <Hand className="h-6 w-6" aria-hidden />
    </button>
  );
  const dragNumber = drag ? pages.findIndex((p) => p.id === drag.id) + 1 : 0;
  const inputClass = "w-full rounded-2xl border-4 border-slate-200 px-4 py-3 text-xl outline-none focus:border-violet-400";

  return (
    <>
      <TopBar langSwitch={false} />
      <main className={cx("mx-auto w-full max-w-5xl px-4 pb-28 pt-4", drag && "select-none")}>
        <Link href={`/bokasmidja/story/${story.id}`} className="bk-press inline-flex items-center gap-1 rounded-2xl px-2 py-1.5 font-extrabold text-slate-600">
          <ArrowLeft className="h-5 w-5" aria-hidden />{story.title[lang] || story.title[story.sourceLang]}
        </Link>
        <h1 className="bk-display mt-2 text-4xl font-extrabold text-slate-900">{t("edit.title")}</h1>
        <p className="mt-1 flex items-start gap-2 text-lg font-bold text-slate-600">{t("edit.hint")}</p>

        <section className="mt-5 rounded-[2rem] bg-white p-5 shadow-lg ring-2 ring-slate-100">
          <p className="bk-display text-xl font-extrabold">{t("edit.textLang")}</p>
          <div className="mt-2"><LangSwitch big value={lang} onPick={(l) => { saveStory(lang); setLang(l); }} /></div>
          {multi && (
            <fieldset className="mt-5">
              <legend className="bk-display text-xl font-extrabold">{t("len.title")}</legend>
              <div className="mt-2 flex flex-wrap gap-2">
                {([1, 2, 3] as const).map((l) => (
                  <button key={l} type="button" aria-pressed={len === l}
                    onClick={() => { (document.activeElement as HTMLElement | null)?.blur?.(); setLen(l); }}
                    className={cx("bk-press bk-display rounded-2xl bg-white px-4 py-2 text-lg font-extrabold", len === l ? "ring-4 ring-slate-900" : "opacity-80 ring-2 ring-slate-200")}>
                    {t(`len.${LENGTH_KEYS[l - 1]}`)} · {t("len.pages", { n: pagesFor(story.pages, l).length })}
                  </button>
                ))}
              </div>
            </fieldset>
          )}
          {lang === "is" && (
            <div className="mt-4">
              <button type="button" onClick={proofread} disabled={checking}
                className="bk-press bk-display inline-flex min-h-12 items-center gap-2 rounded-2xl bg-white px-4 text-lg font-extrabold text-slate-800 shadow-[0_5px_0_#cbd5e1] ring-2 ring-slate-200">
                <SpellCheck className="h-6 w-6 text-emerald-600" aria-hidden />{t("edit.checkIcelandic")}
              </button>
              {checking && <p role="status" className="mt-2 font-bold text-sky-700">{t("edit.checkingIcelandic")}</p>}
            </div>
          )}
          <label className="mt-5 block font-extrabold text-slate-600">{t("edit.storyTitle")}
            <input lang={lang} className={cx(inputClass, "bk-display mt-1 font-extrabold")} maxLength={120} value={story.title[lang] || ""}
              onChange={(e) => typeStory("title", e.target.value)} onBlur={() => saveStory(lang)} />
          </label>
          <label className="mt-4 block font-extrabold text-slate-600">{t("edit.summary")}
            <textarea lang={lang} className={cx(inputClass, "mt-1 text-lg")} rows={2} maxLength={600} value={story.summary[lang] || ""}
              onChange={(e) => typeStory("summary", e.target.value)} onBlur={() => saveStory(lang)} />
          </label>
        </section>

        <ol className="mt-6 space-y-6">
          {pages.map((p, i) => {
            const n = i + 1;
            const working = busy[p.id];
            const over = (key: string) => drag?.over === `${key}:${p.id}` || (drag?.over === `flip:${p.id}` && key !== "page");
            return (
              <li key={p.id} data-drop-page={p.id}
                className={cx("rounded-[2rem] bg-white p-4 shadow-lg ring-4 transition sm:p-5",
                  over("page") ? "ring-amber-400" : "ring-slate-100", drag?.kind === "page" && drag.id === p.id && "opacity-50")}>
                <div className="flex flex-wrap items-center gap-2">
                  {whole && grip("page", p.id, t("edit.movePage", { n }))}
                  <h2 className="bk-display mr-auto text-2xl font-extrabold">{t("edit.page", { n })}</h2>
                  {whole && <IconButton label={t("edit.up", { n })} disabled={i === 0} onClick={() => reorder(p.id, i - 1)}><ArrowUp className="h-6 w-6" aria-hidden /></IconButton>}
                  {whole && <IconButton label={t("edit.down", { n })} disabled={i === pages.length - 1} onClick={() => reorder(p.id, i + 1)}><ArrowDown className="h-6 w-6" aria-hidden /></IconButton>}
                  <IconButton label={t("edit.flip")} onClick={() => flip(p.id)}><ArrowLeftRight className="h-6 w-6 text-violet-600" aria-hidden /></IconButton>
                  {whole && <IconButton label={t("edit.deletePage", { n })} disabled={pages.length <= 1} onClick={() => remove(p, n)}><Trash2 className="h-6 w-6 text-red-600" aria-hidden /></IconButton>}
                </div>

                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  {/* Myndin */}
                  <div data-drop-art={p.id} className={cx("rounded-3xl p-2 ring-4 transition", p.layout === "text-first" && "md:order-2",
                    over("art") ? "bg-amber-50 ring-amber-400" : "ring-transparent", drag?.kind === "art" && drag.id === p.id && "opacity-50")}>
                    <div className="relative">
                      <Art svg={working ? null : p.svg} className="rounded-3xl ring-2 ring-slate-200">
                        <span className="flex flex-col items-center gap-2 p-5 text-center font-bold text-sky-900">
                          <span aria-hidden className={cx("text-5xl", working && "bk-write")}>{working ? "🎨" : "🖼️"}</span>
                          <span role={working ? "status" : undefined}>
                            {working === "drawing" ? t("edit.drawingWorking") : working === "paint" ? t("edit.painting") : t("edit.noPicture")}
                          </span>
                        </span>
                      </Art>
                      {p.svg && !working && grip("art", p.id, t("edit.movePicture", { n }), "absolute left-2 top-2")}
                      {p.hasDrawing && !working && (
                        <figure className="absolute bottom-2 right-2 w-24 overflow-hidden rounded-2xl bg-white shadow-lg ring-2 ring-white">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={`/api/bokasmidja/pages/${p.id}/drawing?v=${stamp}`} alt={t("edit.myDrawing")} className="block h-16 w-full object-cover" />
                          <figcaption className="px-1 py-0.5 text-center text-[11px] font-extrabold leading-tight text-slate-700">{t("edit.myDrawing")}</figcaption>
                        </figure>
                      )}
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <label className={cx("bk-press bk-display flex min-h-12 flex-1 cursor-pointer items-center justify-center gap-2 rounded-2xl bg-sky-500 px-4 text-lg font-extrabold text-white shadow-[0_5px_0_#0369a1] focus-within:outline focus-within:outline-4 focus-within:outline-blue-700", working && "pointer-events-none opacity-55")}>
                        <Camera className="h-6 w-6" aria-hidden />{t("edit.upload")}
                        <input type="file" accept="image/*" className="sr-only" disabled={!!working}
                          onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; void upload(p.id, f); }} />
                      </label>
                      <button type="button" onClick={() => paint(p)} disabled={!!working}
                        className="bk-press bk-display flex min-h-12 flex-1 items-center justify-center gap-2 rounded-2xl bg-white px-4 text-lg font-extrabold text-slate-800 shadow-[0_5px_0_#cbd5e1] ring-2 ring-slate-200">
                        <Paintbrush className="h-6 w-6 text-emerald-600" aria-hidden />{p.svg ? t("reader.repaint") : t("edit.paint")}
                      </button>
                    </div>
                  </div>

                  {/* Textinn */}
                  <div data-drop-text={p.id} className={cx("flex flex-col rounded-3xl p-2 ring-4 transition",
                    over("text") ? "bg-amber-50 ring-amber-400" : "ring-transparent", drag?.kind === "text" && drag.id === p.id && "opacity-50")}>
                    <div className="mb-2 flex items-center gap-2">
                      {grip("text", p.id, t("edit.moveText", { n }))}
                      <label htmlFor={`bk-text-${p.id}`} className="bk-display text-lg font-extrabold text-slate-600">{t("edit.text")}</label>
                    </div>
                    <textarea id={`bk-text-${p.id}`} lang={lang} value={pageText(p, lang, multi ? len : 1)} maxLength={1500} placeholder={t("edit.textPlaceholder")}
                      onChange={(e) => typeText(p.id, e.target.value)} onBlur={() => saveText(p.id, lang)}
                      className={cx(inputClass, "min-h-48 flex-1 leading-relaxed")} />
                    {!pageText(p, lang, multi ? len : 1) && LANGS.some((l) => p.text[l]) && (
                      <p className="mt-2 rounded-2xl bg-slate-50 p-3 text-slate-600" lang={LANGS.find((l) => p.text[l])}>{p.text[LANGS.find((l) => p.text[l])!]}</p>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ol>

        {whole && pages.length < MAX_PAGES && (
          <button type="button" onClick={add}
            className="bk-press mt-6 flex w-full items-center justify-center gap-3 rounded-[2rem] border-4 border-dashed border-slate-300 bg-white/60 p-6">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-orange-100"><Plus className="h-7 w-7 text-orange-500" aria-hidden /></span>
            <span className="bk-display text-2xl font-extrabold text-slate-700">{t("edit.addPage")}</span>
          </button>
        )}
      </main>

      <div className="fixed inset-x-0 bottom-0 z-20 border-t-2 border-slate-100 bg-white/95 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur">
        <div className="mx-auto flex w-full max-w-5xl items-center gap-3">
          <p role="status" className={cx("flex min-w-0 flex-1 items-center gap-2 font-bold", error ? "text-red-600" : "text-slate-500")}>
            {error || (saving > 0 ? t("edit.saving") : saved ? <><Check className="h-5 w-5 text-emerald-600" aria-hidden />{t("edit.saved")}</> : "")}
          </p>
          <Link href={`/bokasmidja/story/${story.id}`} className="bk-press bk-display inline-flex min-h-14 items-center rounded-3xl bg-emerald-500 px-6 text-xl font-extrabold text-white shadow-[0_6px_0_#047857]">
            {t("edit.done")}
          </Link>
        </div>
      </div>

      {drag && (
        <div aria-hidden className="bk-display pointer-events-none fixed z-50 flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-2 text-lg font-extrabold text-white shadow-2xl"
          style={{ left: drag.x + 14, top: drag.y + 14 }}>
          <span>{drag.kind === "art" ? "🖼️" : drag.kind === "text" ? "📝" : "📄"}</span>
          {drag.over ? t("edit.dropHere") : t("edit.page", { n: dragNumber })}
        </div>
      )}
    </>
  );
}

function IconButton({ label, onClick, disabled, children }: { label: string; onClick: () => void; disabled?: boolean; children: React.ReactNode }) {
  return (
    <button type="button" aria-label={label} title={label} onClick={onClick} disabled={disabled}
      className="bk-press flex h-12 w-12 items-center justify-center rounded-2xl bg-white ring-2 ring-slate-200">
      {children}
    </button>
  );
}
