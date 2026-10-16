"use client";

// Sprettigluggi við innskráningu: annaðhvort tilkynning um nýjung sem
// læknirinn hefur ekki séð, eða eitt ráð úr hjálparsafninu.
//
// Nýjungin gengur fyrir og birtist EINU SINNI á mann (vistað í onboarding).
// Ráðin rúlla áfram og má slökkva á þeim í einum smelli — þau eru áfram til
// undir spurningarmerkinu.

import { useMemo, useState, useSyncExternalStore } from "react";
import { Lightbulb, Sparkles } from "lucide-react";
import { Modal } from "./ui";
import { markOnboarding } from "./Tour";
import { useT } from "@/lib/hsu/i18n/client";
import { help as helpMsgs } from "@/lib/hsu/i18n/messages/help";
import { nextNews, type HsuNews } from "@/lib/hsu/help/news";
import { TIP_IDS, advanceTip, nextTip } from "@/lib/hsu/help/tips";

type Shown = { kind: "news"; news: HsuNews } | { kind: "tip"; id: string; index: number } | null;

export default function Nudge({ onboarding, hold, onOpenHelp, onRefresh }: {
  onboarding: Record<string, string>;
  /** Satt meðan annað á skjánum á forgang (kynning, dagatalsuppsetning). */
  hold: boolean;
  /** Opnar hjálparsafnið, eftir atvikum á tiltekinni leiðbeiningu. */
  onOpenHelp: (articleId?: string | null) => void;
  onRefresh: () => void;
}) {
  const t = useT(helpMsgs);
  const [done, setDone] = useState(false);
  // Ráðið er lesið úr vafrageymslu; á þjóni er ekkert sýnt svo hydration
  // stemmi. useSyncExternalStore gefur false á þjóni og true í vafranum.
  const mounted = useSyncExternalStore(() => () => {}, () => true, () => false);

  const shown = useMemo<Shown>(() => {
    if (!mounted || hold || done) return null;
    const news = nextNews(onboarding);
    if (news) return { kind: "news", news };
    // Ráð aðeins ef læknirinn hefur ekki slökkt á þeim.
    if (onboarding["tips:off"]) return null;
    return { kind: "tip", ...nextTip() };
  }, [mounted, hold, done, onboarding]);

  // Héðan í frá er alltaf eitthvað til að sýna.
  if (!shown) return null;

  const close = async () => {
    setDone(true);
    if (shown.kind === "news") {
      await markOnboarding(`news:${shown.news.id}`);
      onRefresh();
    } else {
      advanceTip(shown.index);
    }
  };

  const stopTips = async () => {
    setDone(true);
    await markOnboarding("tips:off");
    onRefresh();
  };

  if (shown.kind === "news") {
    const n = shown.news;
    return (
      <Modal open onClose={close} title={t.dyn(`news.${n.id}.t`)}>
        <div className="space-y-4">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--hsu-soft)] px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-[var(--hsu-dark)]">
            <Sparkles className="h-3.5 w-3.5" /> {t("news.badge")}
          </span>
          <p className="text-sm text-slate-700">{t.dyn(`news.${n.id}.b`)}</p>
          <div className="flex flex-wrap justify-end gap-2">
            {n.article && (
              <button type="button" onClick={() => { void close(); onOpenHelp(n.article); }}
                className="rounded-xl px-4 py-2 text-sm font-semibold text-[var(--hsu)] hover:bg-slate-50">
                {t("news.more")}
              </button>
            )}
            <button type="button" onClick={close}
              className="rounded-xl bg-[var(--hsu)] px-4 py-2 text-sm font-semibold text-white hover:brightness-110">
              {t("news.ok")}
            </button>
          </div>
        </div>
      </Modal>
    );
  }

  const id = TIP_IDS.includes(shown.id) ? shown.id : TIP_IDS[0];
  return (
    <Modal open onClose={close} title={t.dyn(`${id}.t`)}>
      <div className="space-y-4">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-amber-800">
          <Lightbulb className="h-3.5 w-3.5" /> {t("tip.badge")}
        </span>
        <p className="text-sm text-slate-700">{t.dyn(`${id}.w`)}</p>
        <p className="text-sm text-slate-600">{t.dyn(`${id}.s`).split("\n")[0]}</p>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <button type="button" onClick={stopTips} className="text-xs font-semibold text-slate-500 underline hover:text-slate-700">
            {t("tip.off")}
          </button>
          <div className="flex gap-2">
            <button type="button" onClick={close} className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50">
              {t("tip.ok")}
            </button>
            <button type="button" onClick={() => { void close(); onOpenHelp(id); }}
              className="rounded-xl bg-[var(--hsu)] px-4 py-2 text-sm font-semibold text-white hover:brightness-110">
              {t("show")}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
