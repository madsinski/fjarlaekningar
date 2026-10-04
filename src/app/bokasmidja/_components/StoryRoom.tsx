"use client";

// Sögusmiðjan. Keyrir smíðina skref fyrir skref — höfundurinn skrifar,
// málarinn málar hverja síðu, sagan er endursögð á hinum málunum — og sýnir
// barninu alltaf hvar hún er stödd. Lesa má um leið og textinn er kominn.
// Hvert skref er endurtekningarþolið á þjóninum, svo óhætt er að loka og opna
// síðuna aftur: smíðin heldur áfram þar sem frá var horfið.

import { useCallback, useEffect, useRef, useState } from "react";
import { Check } from "lucide-react";
import { errorText } from "@/lib/bokasmidja/i18n";
import { LANGS, type I18nText, type Lang, type PageView, type StoryView } from "@/lib/bokasmidja/types";
import { useBk } from "./Provider";
import Reader from "./Reader";
import { BigButton, TopBar, call, cx } from "./ui";

export type Story = StoryView & { pages: PageView[] };
export interface BookInfo { id: string; title: I18nText; subtitle: I18nText; color: string; emoji: string; collection: boolean }
export type Phase =
  | { kind: "writing" }
  | { kind: "sheet" }
  | { kind: "painting"; n: number; total: number }
  | { kind: "refining"; n: number; total: number }
  | { kind: "translating" }
  | { kind: "polishing" }
  | { kind: "done" }
  | { kind: "error"; code: string };

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
/** Síðu vantar texta á þessu máli en á hann á öðru. */
const lacks = (s: Story, l: Lang) => !s.title[l] || s.pages.some((p) => !p.text[l] && LANGS.some((x) => p.text[x]));
/** Íslenski textinn er til en hefur ekki farið í yfirlestur. */
const needsPolish = (s: Story) => !!s.title.is && !s.polishedIs && s.pages.some((p) => p.text.is);
const needsWork = (s: Story) =>
  s.status === "idea" || needsPolish(s) || s.pages.some((p) => p.svg && !p.reviewed) || s.pages.some((p) => !p.svg && p.autoArt) || LANGS.some((l) => lacks(s, l));

export default function StoryRoom({ initial, book, editable }: { initial: Story; book: BookInfo; editable: boolean }) {
  const { t } = useBk();
  const [story, setStory] = useState(initial);
  const [phase, setPhase] = useState<Phase>(needsWork(initial) ? (initial.status === "idea" ? { kind: "writing" } : { kind: "painting", n: 0, total: initial.pages.length }) : { kind: "done" });
  const running = useRef(false);
  const alive = useRef(true);
  const url = `/api/bokasmidja/stories/${initial.id}`;

  const run = useCallback(async () => {
    if (running.current) return;
    running.current = true;
    let s = initial;
    const show = (p: Phase) => { if (alive.current) setPhase(p); };
    const reload = async () => {
      const res = await call("GET", url);
      if (res.ok) { s = res.story; if (alive.current) setStory(s); }
    };
    try {
      await reload();

      // 1. Höfundurinn skrifar söguna.
      for (let tries = 0; s.status === "idea" && alive.current; tries++) {
        show({ kind: "writing" });
        const res = await call("POST", `${url}/write`);
        if (!res.ok) return show({ kind: "error", code: res.error });
        if (res.busy) await sleep(8000);
        await reload();
        if (tries > 45) return show({ kind: "error", code: "agent_failed" });
      }

      // Íslenskur texti fer í yfirlestur áður en lesið er. Mistakist það stöðvar
      // það ekki smíðina: reynt er aftur næst þegar sagan er opnuð.
      const polish = async (quiet = false) => {
        if (!needsPolish(s) || !alive.current) return;
        if (!quiet) show({ kind: "polishing" });
        for (let tries = 0; tries < 30 && alive.current; tries++) {
          const res = await call("POST", `${url}/polish`, {});
          if (!res.ok || !res.busy) break;
          await sleep(8000);
        }
        await reload();
      };
      // Málaðar myndir eru fljótar: yfirlesturinn fer þá fram á meðan málað er,
      // svo bókin sé tilbúin á fáeinum mínútum. Annars er lesið yfir fyrst.
      const painted = s.artMode === "image";
      const proofreading = painted ? polish(true) : polish();
      if (!painted) await proofreading;

      // Persónublað: hetjurnar hannaðar einu sinni, áður en fyrsta síðan er máluð.
      // Mistakist það er málað án þess.
      if (!s.hasSheet && s.pages.some((p) => !p.svg && p.autoArt)) {
        show({ kind: "sheet" });
        for (let tries = 0; tries < 30 && alive.current; tries++) {
          const res = await call("POST", `${url}/sheet`, {});
          if (!res.ok || !res.busy) break;
          await sleep(8000);
        }
        await reload();
      }

      // 2. Málarinn málar síðurnar: eina í einu þegar teiknað er (SVG), fjórar
      // í einu þegar málað er með myndlíkani.
      const todo = s.pages.filter((p) => !p.svg && p.autoArt);
      const total = s.pages.length;
      let painting = 0;
      let failure: string | null = null;
      const paintOne = async (page: PageView) => {
        for (let tries = 0; alive.current && !failure; tries++) {
          const res = await call("POST", `/api/bokasmidja/pages/${page.id}/illustrate`, {});
          if (res.ok && res.svg) {
            s = { ...s, pages: s.pages.map((p) => (p.id === page.id ? { ...p, svg: res.svg, reviewed: painted || p.reviewed } : p)) };
            if (alive.current) setStory(s);
            return;
          }
          if (res.ok && res.busy) {
            if (tries > 40) { failure = "agent_failed"; return; }
            await sleep(10000);
            continue;
          }
          // Ein mynd má mistakast einu sinni; önnur villa stöðvar smíðina.
          if (tries >= 1 || res.error !== "agent_failed") { failure = res.error || "agent_failed"; return; }
        }
      };
      const queue = [...todo];
      const worker = async () => {
        for (let page = queue.shift(); page && alive.current && !failure; page = queue.shift()) {
          show({ kind: "painting", n: Math.min(total, total - todo.length + ++painting), total });
          await paintOne(page);
        }
      };
      await Promise.all(Array.from({ length: painted ? 4 : 1 }, worker));
      await proofreading;
      if (failure) return show({ kind: "error", code: failure });
      if (!alive.current) return;

      // Yfirferð: málarinn skoðar hverja mynd sína teiknaða og lagar það sem er að.
      // Sagan er þegar lesanleg; villa hér stöðvar ekki smíðina.
      const unreviewed = s.pages.filter((p) => p.svg && !p.reviewed);
      for (const [i, page] of unreviewed.entries()) {
        if (!alive.current) return;
        show({ kind: "refining", n: i + 1, total: unreviewed.length });
        let res = await call("POST", `/api/bokasmidja/pages/${page.id}/illustrate`, { review: true });
        for (let tries = 0; res.ok && res.busy && tries < 30 && alive.current; tries++) {
          await sleep(10000);
          res = await call("POST", `/api/bokasmidja/pages/${page.id}/illustrate`, { review: true });
        }
        if (!res.ok) break;
        s = { ...s, pages: s.pages.map((p) => (p.id === page.id ? { ...p, svg: res.svg || p.svg, reviewed: true } : p)) };
        if (alive.current) setStory(s);
      }

      // 3. Sagan endursögð á hinum málunum.
      for (const lang of LANGS) {
        if (!alive.current) return;
        if (!lacks(s, lang)) continue;
        show({ kind: "translating" });
        for (let tries = 0; tries < 30 && alive.current; tries++) {
          const res = await call("POST", `${url}/translate`, { lang });
          if (!res.ok) return show({ kind: "error", code: res.error });
          if (!res.busy) break;
          await sleep(8000);
        }
      }
      await reload();
      await polish();
      show({ kind: "done" });
    } finally {
      running.current = false;
    }
  }, [initial, url]);

  useEffect(() => {
    alive.current = true;
    if (needsWork(initial)) void run();
    return () => { alive.current = false; };
  }, [initial, run]);

  const retry = () => { setPhase(story.status === "idea" ? { kind: "writing" } : { kind: "painting", n: 0, total: story.pages.length }); void run(); };

  // Áður en textinn er kominn er ekkert að lesa: sýnum smíðina á heilum skjá.
  if (story.status === "idea") {
    return (
      <>
        <TopBar />
        <main className="mx-auto flex w-full max-w-xl flex-col items-center px-4 pb-16 pt-10 text-center">
          <div aria-hidden className="text-8xl"><span className="bk-write">✍️</span></div>
          <h1 className="bk-display mt-4 text-4xl font-extrabold">{t("studio.title")}</h1>
          <Steps phase={phase} />
          {phase.kind === "error" ? (
            <>
              <p role="alert" className="mt-6 text-xl font-bold text-red-600">{errorText(t, phase.code)}</p>
              <BigButton className="mt-4" onClick={retry}>{t("studio.retry")}</BigButton>
            </>
          ) : (
            <p role="status" className="mt-6 text-xl font-bold text-slate-600">{phase.kind === "polishing" ? t("studio.polishing") : t("studio.writing")}<br />{t("studio.writeWait")}</p>
          )}
        </main>
      </>
    );
  }

  return <Reader story={story} setStory={setStory} book={book} phase={phase} editable={editable} onRetry={retry} />;
}

function Steps({ phase }: { phase: Phase }) {
  const { t } = useBk();
  const at = phase.kind === "writing" || phase.kind === "polishing" ? 0 : phase.kind === "painting" || phase.kind === "sheet" || phase.kind === "refining" ? 1 : phase.kind === "translating" ? 2 : phase.kind === "done" ? 3 : -1;
  const steps = [t("studio.step1"), t("studio.step2"), t("studio.step3")];
  return (
    <ol className="mt-8 w-full space-y-3 text-left">
      {steps.map((label, i) => (
        <li key={i} className={cx("flex items-center gap-4 rounded-3xl p-4 ring-2", i === at ? "bg-white ring-orange-400" : "bg-white/60 ring-slate-100")}>
          <span className={cx("bk-display flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-xl font-extrabold",
            i < at ? "bg-emerald-500 text-white" : i === at ? "bg-orange-500 text-white" : "bg-slate-200 text-slate-500")}>
            {i < at ? <Check className="h-6 w-6" aria-hidden /> : i + 1}
          </span>
          <span className={cx("bk-display text-2xl font-extrabold", i > at && at >= 0 && "text-slate-400")}>{label}</span>
        </li>
      ))}
    </ol>
  );
}
