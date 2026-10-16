"use client";

// Hjálparsafnið: leit og leiðbeiningar um allt sem læknir gerir í kerfinu.
// Opnast með spurningarmerkinu í hausnum. Efnið er í messages/help.ts og
// uppbyggingin í lib/hsu/help/articles.ts — hér er aðeins framsetningin.

import { useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Play, Search } from "lucide-react";
import { Modal, cx } from "./ui";
import { useT } from "@/lib/hsu/i18n/client";
import { help as helpMsgs } from "@/lib/hsu/i18n/messages/help";
import { HELP_ARTICLES, HELP_CATS, fold, type HelpArt, type HelpArticle, type HelpTab } from "@/lib/hsu/help/articles";

/** Skýringarmyndir: eitt lítið strik sem segir það sem texti segir illa. */
function Art({ kind }: { kind: HelpArt }) {
  const box = "w-full rounded-xl bg-slate-50 p-3";
  if (kind === "swap") {
    return (
      <div className={box}>
        <svg viewBox="0 0 220 64" className="h-16 w-full" role="img" aria-hidden>
          {/* Spjöldin tvö eins og þau líta út í vaktaplaninu: þín vakt í lit. */}
          <rect x="6" y="18" width="80" height="28" rx="8" fill="var(--hsu)" />
          <rect x="16" y="26" width="16" height="5" rx="2.5" fill="#fff" opacity=".7" />
          <rect x="16" y="35" width="44" height="5" rx="2.5" fill="#fff" />
          <rect x="134" y="18" width="80" height="28" rx="8" fill="#fff" stroke="#cbd5e1" />
          <rect x="134" y="18" width="4" height="28" rx="2" fill="#94a3b8" />
          <rect x="146" y="26" width="16" height="5" rx="2.5" fill="#cbd5e1" />
          <rect x="146" y="35" width="44" height="5" rx="2.5" fill="#94a3b8" />
          <path d="M92 26h34m0 0-7-6m7 6-7 6" stroke="var(--hsu)" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M128 42H94m0 0 7-6m-7 6 7 6" stroke="#94a3b8" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    );
  }
  if (kind === "brush") {
    return (
      <div className={box}>
        <svg viewBox="0 0 220 64" className="h-16 w-full" role="img" aria-hidden>
          {[0, 1, 2, 3, 4, 5, 6].map((i) => (
            <rect key={i} x={6 + i * 30} y="16" width="26" height="32" rx="6"
              fill={i >= 2 && i <= 4 ? "#fecaca" : "#fff"} stroke={i >= 2 && i <= 4 ? "#f87171" : "#e2e8f0"} />
          ))}
          <path d="M70 32h64" stroke="#dc2626" strokeWidth="3" strokeLinecap="round" strokeDasharray="2 6" />
          <circle cx="134" cy="32" r="5" fill="#dc2626" />
        </svg>
      </div>
    );
  }
  if (kind === "dayparts") {
    return (
      <div className={box}>
        <svg viewBox="0 0 220 64" className="h-16 w-full" role="img" aria-hidden>
          <rect x="12" y="12" width="56" height="40" rx="8" fill="var(--hsu)" />
          <rect x="82" y="12" width="56" height="40" rx="8" fill="#fff" stroke="#cbd5e1" />
          <path d="M82 32h56" stroke="#cbd5e1" strokeWidth="1.5" />
          <rect x="82" y="12" width="56" height="20" rx="8" fill="var(--hsu)" opacity=".85" />
          <rect x="152" y="12" width="56" height="40" rx="8" fill="#fff" stroke="#cbd5e1" strokeDasharray="4 3" />
        </svg>
      </div>
    );
  }
  return (
    <div className={box}>
      <svg viewBox="0 0 220 64" className="h-16 w-full" role="img" aria-hidden>
        <rect x="14" y="8" width="44" height="48" rx="7" fill="#fff" stroke="#cbd5e1" />
        <rect x="20" y="16" width="32" height="6" rx="3" fill="var(--hsu)" />
        {[0, 1, 2].map((r) => [0, 1, 2].map((c) => (
          <rect key={`${r}${c}`} x={20 + c * 11} y={26 + r * 9} width="8" height="6" rx="2" fill="#e2e8f0" />
        )))}
        <path d="M72 32h58m0 0-8-7m8 7-8 7" stroke="var(--hsu)" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        <rect x="146" y="12" width="60" height="40" rx="8" fill="#fff" stroke="#cbd5e1" />
        <rect x="153" y="20" width="46" height="5" rx="2.5" fill="#cbd5e1" />
        <rect x="153" y="30" width="30" height="5" rx="2.5" fill="var(--hsu)" />
        <rect x="153" y="40" width="38" height="5" rx="2.5" fill="#cbd5e1" />
      </svg>
    </div>
  );
}

export default function Help({ open, onClose, onGo, onTour, startAt }: {
  open: boolean;
  onClose: () => void;
  /** Opnar flipann sem leiðbeiningin á við og lokar hjálpinni. */
  onGo: (tab: HelpTab) => void;
  onTour: () => void;
  /** Opna beint á tiltekinni leiðbeiningu (t.d. úr ráði eða tilkynningu). */
  startAt?: string | null;
}) {
  const t = useT(helpMsgs);
  const [q, setQ] = useState("");
  const [openId, setOpenId] = useState<string | null>(startAt ?? null);

  const txt = useMemo(() => {
    const read = (a: HelpArticle) => ({
      a,
      title: t.dyn(`${a.id}.t`),
      when: t.dyn(`${a.id}.w`),
      steps: t.dyn(`${a.id}.s`).split("\n").filter(Boolean),
      keys: t.dyn(`${a.id}.k`),
    });
    return HELP_ARTICLES.map(read);
  }, [t]);

  const hits = useMemo(() => {
    const needle = fold(q.trim());
    if (!needle) return null;
    return txt.filter((x) => fold([x.title, x.when, x.steps.join(" "), x.keys].join(" ")).includes(needle));
  }, [q, txt]);

  const current = openId ? txt.find((x) => x.a.id === openId) : null;
  const go = (a: HelpArticle) => {
    if (a.tour) { onClose(); onTour(); return; }
    if (a.tab) { onClose(); onGo(a.tab); }
  };

  const Row = ({ x }: { x: (typeof txt)[number] }) => (
    <button type="button" onClick={() => setOpenId(x.a.id)}
      className="flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left hover:bg-slate-50">
      <span className="min-w-0">
        <span className="block text-sm font-semibold text-slate-900">{x.title}</span>
        <span className="block truncate text-xs text-slate-500">{x.when}</span>
      </span>
      <ArrowRight className="h-4 w-4 shrink-0 text-slate-300" />
    </button>
  );

  return (
    <Modal open={open} onClose={() => { setOpenId(null); onClose(); }} title={current ? current.title : t("title")} wide>
      {current ? (
        <div className="space-y-4">
          <button type="button" onClick={() => setOpenId(null)}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--hsu)] hover:underline">
            <ArrowLeft className="h-4 w-4" /> {t("back")}
          </button>
          <p className="text-sm text-slate-600"><span className="font-semibold text-slate-800">{t("when")}: </span>{current.when}</p>
          {current.a.art && <Art kind={current.a.art} />}
          <div>
            <h3 className="mb-2 text-[11px] font-bold uppercase tracking-wide text-slate-500">{t("steps")}</h3>
            <ol className="space-y-2">
              {current.steps.map((s, i) => (
                <li key={i} className="flex gap-2.5 text-sm text-slate-700">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--hsu-soft)] text-[11px] font-bold text-[var(--hsu-dark)]">{i + 1}</span>
                  <span>{s}</span>
                </li>
              ))}
            </ol>
          </div>
          {(current.a.tab || current.a.tour) && (
            <button type="button" onClick={() => go(current.a)}
              className="inline-flex items-center gap-2 rounded-xl bg-[var(--hsu)] px-4 py-2 text-sm font-semibold text-white hover:brightness-110">
              {current.a.tour ? <Play className="h-4 w-4" /> : <ArrowRight className="h-4 w-4" />}
              {current.a.tour ? t("startTour") : t("show")}
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-slate-500">{t("subtitle")}</p>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("search")} aria-label={t("search")}
              className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm outline-none focus:border-[var(--hsu)] focus:ring-2 focus:ring-[var(--hsu)]/20" />
          </div>

          {hits ? (
            hits.length ? (
              <div>
                <h3 className="mb-1 text-[11px] font-bold uppercase tracking-wide text-slate-500">{t.n("hits", hits.length, { n: hits.length })}</h3>
                <div className="-mx-1">{hits.map((x) => <Row key={x.a.id} x={x} />)}</div>
              </div>
            ) : (
              <p className="rounded-xl bg-amber-50 px-3 py-2.5 text-sm text-amber-900">{t("noResults", { q: q.trim() })}</p>
            )
          ) : (
            <div className="space-y-4">
              {HELP_CATS.map((cat) => {
                const list = txt.filter((x) => x.a.cat === cat);
                if (!list.length) return null;
                return (
                  <div key={cat}>
                    <h3 className={cx("mb-1 text-[11px] font-bold uppercase tracking-wide text-slate-500")}>{t.dyn(`cat.${cat}`)}</h3>
                    <div className="-mx-1">{list.map((x) => <Row key={x.a.id} x={x} />)}</div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
