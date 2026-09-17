"use client";

// Kynning á kerfinu: skref fyrir skref, hvert skref lýsir upp hluta síðunnar
// (data-tour="…") og útskýrir hann. Skref án marks birtast á miðjum skjá.
// Í síma birtist skýringin neðst á skjánum svo hún hylji ekki það sem er lýst.

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { useCommon } from "@/lib/hsu/i18n/client";
import { cx } from "./ui";

export interface TourStep {
  /** data-tour gildi þess sem á að lýsa upp ("a|b" = a, annars b); ekkert = á miðjum skjá. */
  target?: string;
  title: string;
  body: string;
  /** Kallað áður en skrefið birtist (t.d. til að skipta um flipa). */
  before?: () => void;
}

type Rect = { top: number; left: number; width: number; height: number };
const PAD = 6;

function findTarget(name?: string): HTMLElement | null {
  if (!name) return null;
  // "a|b": fyrsta sýnilega markið (sumt er aðeins sýnilegt í tölvu).
  for (const n of name.split("|")) {
    const el = Array.from(document.querySelectorAll<HTMLElement>(`[data-tour="${n}"]`))
      .find((x) => { const r = x.getBoundingClientRect(); return r.width > 0 && r.height > 0; });
    if (el) return el;
  }
  return null;
}

export default function Tour({ steps, open, onClose }: {
  steps: TourStep[];
  open: boolean;
  /** completed = true ef farið var í gegnum öll skrefin. */
  onClose: (completed: boolean) => void;
}) {
  const t = useCommon();
  const [i, setI] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);
  const [vw, setVw] = useState(1024);
  const card = useRef<HTMLDivElement>(null);
  const step = steps[i];

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (open) setI(0);
  }, [open]);

  const measure = useCallback(() => {
    setVw(window.innerWidth);
    const el = findTarget(step?.target);
    if (!el) { setRect(null); return; }
    const r = el.getBoundingClientRect();
    setRect({ top: r.top - PAD, left: r.left - PAD, width: r.width + PAD * 2, height: r.height + PAD * 2 });
  }, [step?.target]);

  // Nýtt skref: keyra before(), bíða eftir að síðan teiknist, fletta að markinu.
  useLayoutEffect(() => {
    if (!open || !step) return;
    step.before?.();
    let cancelled = false;
    const t1 = setTimeout(() => {
      if (cancelled) return;
      const el = findTarget(step.target);
      if (el) {
        const r = el.getBoundingClientRect();
        const offscreen = r.top < 80 || r.bottom > window.innerHeight - (window.innerWidth < 640 ? 260 : 40);
        if (offscreen) el.scrollIntoView({ block: "center", behavior: "instant" as ScrollBehavior });
      }
      measure();
      card.current?.focus();
    }, 120);
    return () => { cancelled = true; clearTimeout(t1); };
  }, [open, i, step, measure]);

  useEffect(() => {
    if (!open) return;
    const onMove = () => measure();
    window.addEventListener("resize", onMove);
    window.addEventListener("scroll", onMove, true);
    return () => { window.removeEventListener("resize", onMove); window.removeEventListener("scroll", onMove, true); };
  }, [open, measure]);

  const last = i === steps.length - 1;
  const next = useCallback(() => (last ? onClose(true) : setI((n) => n + 1)), [last, onClose]);
  const back = useCallback(() => setI((n) => Math.max(0, n - 1)), []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose(false);
      else if (e.key === "ArrowRight") next();
      else if (e.key === "ArrowLeft") back();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, next, back, onClose]);

  if (!open || !step) return null;

  const mobile = vw < 640;
  const CARD_W = Math.min(360, vw - 32);
  let cardStyle: React.CSSProperties;
  if (!rect) {
    cardStyle = { top: "50%", left: "50%", transform: "translate(-50%, -50%)", width: Math.min(440, vw - 32) };
  } else if (mobile) {
    cardStyle = { left: 16, right: 16, bottom: 16 };
  } else {
    const below = rect.top + rect.height + 12;
    const fitsBelow = below + 220 < window.innerHeight;
    const left = Math.min(Math.max(16, rect.left), vw - CARD_W - 16);
    cardStyle = fitsBelow
      ? { top: below, left, width: CARD_W }
      : { top: Math.max(16, rect.top - 12), left, width: CARD_W, transform: "translateY(-100%)" };
  }

  return (
    <div className="fixed inset-0 z-[100]" role="dialog" aria-modal="true" aria-labelledby="tour-title">
      {/* Myrkvun; ljósopið er skuggi utan um markið. */}
      {rect ? (
        <div aria-hidden className="pointer-events-none fixed rounded-xl ring-2 ring-white transition-all duration-200"
          style={{ ...rect, boxShadow: "0 0 0 9999px rgba(15, 23, 42, 0.6)" }} />
      ) : (
        <div aria-hidden className="fixed inset-0 bg-slate-900/60" />
      )}
      {/* Smellir utan skýringar gera ekkert — kynningunni er lokað með hnöppunum. */}
      <div className="fixed inset-0" onClick={(e) => e.stopPropagation()} />

      <div ref={card} tabIndex={-1} style={cardStyle}
        className={cx("fixed rounded-2xl bg-white p-5 shadow-2xl outline-none", !rect && "text-center")}>
        <button onClick={() => onClose(false)} aria-label={t("action.close")}
          className="absolute right-3 top-3 rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
          <X className="h-4 w-4" />
        </button>
        <div className="text-[11px] font-semibold uppercase tracking-wide text-[var(--hsu)]">{i + 1} / {steps.length}</div>
        <h2 id="tour-title" className="mt-1 pr-6 text-base font-bold text-slate-900">{step.title}</h2>
        <p className="mt-1.5 whitespace-pre-line text-sm leading-relaxed text-slate-600">{step.body}</p>
        <div className={cx("mt-4 flex items-center gap-2", !rect && "justify-center")}>
          <div className="mr-auto flex gap-1" aria-hidden>
            {steps.map((_, n) => <span key={n} className={cx("h-1.5 rounded-full transition-all", n === i ? "w-4 bg-[var(--hsu)]" : "w-1.5 bg-slate-200")} />)}
          </div>
          {!last && <button onClick={() => onClose(false)} className="px-2 py-1.5 text-xs font-semibold text-slate-500 hover:text-slate-700">{t("action.skip")}</button>}
          {i > 0 && (
            <button onClick={back} className="rounded-xl border border-slate-300 px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">{t("action.back")}</button>
          )}
          <button onClick={next} autoFocus className="rounded-xl bg-[var(--hsu)] px-4 py-1.5 text-sm font-semibold text-white hover:bg-[var(--hsu-dark)]">
            {last ? t("action.done") : t("action.next")}
          </button>
        </div>
      </div>
    </div>
  );
}

/** Vistar að kynning/leiðarvísir hafi verið skoðuð (á lækninn; staðbundið fyrir stjórnendur Fjarlækninga). */
export async function markOnboarding(key: string, done = true, persist = true): Promise<void> {
  if (!persist) {
    try { if (done) localStorage.setItem(`hsu-${key}`, "1"); else localStorage.removeItem(`hsu-${key}`); } catch { /* ekkert */ }
    return;
  }
  await fetch("/api/hsu/onboarding", {
    method: "POST", headers: { "Content-Type": "application/json" }, credentials: "same-origin", body: JSON.stringify({ key, done }),
  }).catch(() => {});
}

export function seenLocally(key: string): boolean {
  try { return localStorage.getItem(`hsu-${key}`) === "1"; } catch { return false; }
}
