"use client";

// Sprettigluggi við innskráningu: annaðhvort tilkynning um nýjung sem
// viðkomandi hefur ekki séð, eða nokkur ráð í einu.
//
// Nýjungin gengur fyrir og birtist EINU SINNI á mann (vistað í onboarding).
// Ráðin rúlla áfram — þrjú í senn — og má slökkva á þeim í einum smelli; hjá
// læknum eru þau áfram til undir spurningarmerkinu.

import { useMemo, useState, useSyncExternalStore } from "react";
import { ArrowRight, Lightbulb, Sparkles } from "lucide-react";
import { Modal } from "./ui";
import { markOnboarding } from "./Tour";
import { useT } from "@/lib/hsu/i18n/client";
import { help as helpMsgs } from "@/lib/hsu/i18n/messages/help";
import { nextNews, type HsuNews } from "@/lib/hsu/help/news";
import { advanceTips, tipsFor, type HsuTip, type TipRole } from "@/lib/hsu/help/tips";

type Shown =
  | { kind: "news"; news: HsuNews }
  | { kind: "tips"; tips: HsuTip[]; next: number }
  | null;

export default function Nudge({ role, onboarding, hold, persist = true, onOpenHelp, onGo, onRefresh }: {
  role: TipRole;
  onboarding: Record<string, string>;
  /** Satt meðan annað á skjánum á forgang (kynning, dagatalsuppsetning). */
  hold: boolean;
  /** Ósatt fyrir staff-aðgang sem á enga læknaröð: þá er munað í vafranum. */
  persist?: boolean;
  /** Opnar hjálparsafnið á tiltekinni leiðbeiningu (aðeins læknar). */
  onOpenHelp?: (articleId?: string | null) => void;
  /** Opnar flipann sem ráðið á við. */
  onGo?: (tab: string) => void;
  onRefresh: () => void;
}) {
  const t = useT(helpMsgs);
  const [done, setDone] = useState(false);
  // Ráðin eru lesin úr vafrageymslu; á þjóni er ekkert sýnt svo hydration
  // stemmi. useSyncExternalStore gefur false á þjóni og true í vafranum.
  const mounted = useSyncExternalStore(() => () => {}, () => true, () => false);

  const shown = useMemo<Shown>(() => {
    if (!mounted || hold || done) return null;
    const news = nextNews(onboarding, role);
    if (news) return { kind: "news", news };
    // Ráð aðeins ef slökkt hefur ekki verið á þeim.
    if (onboarding["tips:off"]) return null;
    const { tips, next } = tipsFor(role);
    return tips.length ? { kind: "tips", tips, next } : null;
  }, [mounted, hold, done, onboarding, role]);

  // Héðan í frá er alltaf eitthvað til að sýna.
  if (!shown) return null;

  const close = async () => {
    setDone(true);
    if (shown.kind === "news") {
      await markOnboarding(`news:${shown.news.id}`, true, persist);
      onRefresh();
    } else {
      advanceTips(role, shown.next);
    }
  };

  const stopTips = async () => {
    setDone(true);
    await markOnboarding("tips:off", true, persist);
    onRefresh();
  };

  /** „Sýna mér“: leiðbeining hjá lækni, flipi hjá yfirlækni. */
  const show = (tip: HsuTip) => {
    void close();
    if (tip.article && onOpenHelp) onOpenHelp(tip.article);
    else if (tip.tab) onGo?.(tip.tab);
  };

  if (shown.kind === "news") {
    const n = shown.news;
    return (
      <Modal open onClose={close} title={t.dyn(`news.${n.id}.t`)} headerTone="amber">
        <div className="space-y-4">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-amber-900">
            <Sparkles className="h-3.5 w-3.5" /> {t("news.badge")}
          </span>
          <p className="text-sm text-slate-700">{t.dyn(`news.${n.id}.b`)}</p>
          <div className="flex flex-wrap justify-end gap-2">
            {n.article && onOpenHelp && (
              <button type="button" onClick={() => { void close(); onOpenHelp(n.article); }}
                className="rounded-xl px-4 py-2 text-sm font-semibold text-[var(--hsu)] hover:bg-slate-50">
                {t("news.more")}
              </button>
            )}
            <button type="button" onClick={close}
              className="rounded-xl bg-amber-500 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-600">
              {t("news.ok")}
            </button>
          </div>
        </div>
      </Modal>
    );
  }

  // Titill og texti ráðsins: úr hjálparsafninu hjá læknum, annars eigin texti.
  const title = (tip: HsuTip) => (tip.article ? t.dyn(`${tip.article}.t`) : t.dyn(`tip.${tip.id}.t`));
  const body = (tip: HsuTip) => (tip.article ? t.dyn(`${tip.article}.w`) : t.dyn(`tip.${tip.id}.b`));
  // Fyrsta skrefið fylgir ráði læknisins — það er handtakið sjálft.
  const firstStep = (tip: HsuTip) => (tip.article ? t.dyn(`${tip.article}.s`).split("\n")[0] : "");

  return (
    <Modal open onClose={close} title={t("tip.title")} headerTone="amber">
      <div className="space-y-4">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-amber-900">
          <Lightbulb className="h-3.5 w-3.5" /> {t("tip.badge")}
        </span>
        <ul className="space-y-2.5">
          {shown.tips.map((tip) => (
            <li key={tip.id} className="rounded-xl border-l-4 border-amber-400 bg-amber-50/70 p-3">
              <div className="text-sm font-bold text-slate-900">{title(tip)}</div>
              <p className="mt-0.5 text-sm text-slate-700">{body(tip)}</p>
              {firstStep(tip) && <p className="mt-0.5 text-xs text-slate-500">{firstStep(tip)}</p>}
              {(tip.article ? Boolean(onOpenHelp) : Boolean(tip.tab && onGo)) && (
                <button type="button" onClick={() => show(tip)}
                  className="mt-1.5 inline-flex items-center gap-1 text-xs font-semibold text-amber-900 underline hover:text-amber-950">
                  {t("show")} <ArrowRight className="h-3 w-3" />
                </button>
              )}
            </li>
          ))}
        </ul>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <button type="button" onClick={stopTips} className="text-xs font-semibold text-slate-500 underline hover:text-slate-700">
            {t("tip.off")}
          </button>
          <button type="button" onClick={close}
            className="rounded-xl bg-amber-500 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-600">
            {t("tip.ok")}
          </button>
        </div>
      </div>
    </Modal>
  );
}
