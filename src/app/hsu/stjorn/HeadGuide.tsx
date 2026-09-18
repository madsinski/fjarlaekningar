"use client";

// „Fyrstu skref yfirlæknis“: gátlisti efst á Mánaðarplani sem leiðir nýjan
// yfirlækni í gegnum uppsetninguna. Hvert atriði merkist sjálfkrafa lokið út
// frá gögnunum; leiðarvísinum er lokað með „Fela“ og hann opnaður aftur úr valmyndinni.

import { Check, ChevronRight, ListChecks, X } from "lucide-react";
import { useT } from "@/lib/hsu/i18n/client";
import { onboarding } from "@/lib/hsu/i18n/messages/onboarding";
import { Card, cx } from "../_components/ui";
import type { Overview } from "./types";

type Go = "laeknar" | "stillingar" | "plan" | "min-sida";

export function guideItems(data: Overview) {
  const active = data.doctors.filter((d) => d.active);
  const reached = (s: string[]) => data.months.some((m) => s.includes(m.status));
  return [
    { key: "doctors", go: "laeknar" as Go, done: active.length >= 2 && active.every((d) => d.activated || d.invite_pending) },
    { key: "types", go: "stillingar" as Go, done: data.shiftTypes.some((t) => t.active) },
    // Stjórnandi Fjarlækninga á ekkert dagatal hér.
    ...(data.actor.kind === "doctor" ? [{ key: "calendar", go: "min-sida" as Go, done: data.actor.calendarConnected }] : []),
    // Óskir eru opnar sjálfkrafa; verk yfirlæknis er að setja skilafrest.
    { key: "open", go: "plan" as Go, done: data.months.length > 0 },
    { key: "plan", go: "plan" as Go, done: reached(["planning", "published"]) },
    { key: "publish", go: "plan" as Go, done: reached(["published"]) },
  ];
}

export default function HeadGuide({ data, onGo, onHide }: { data: Overview; onGo: (to: Go) => void; onHide: () => void }) {
  const t = useT(onboarding);
  const items = guideItems(data);
  const done = items.filter((i) => i.done).length;
  const nextKey = items.find((i) => !i.done)?.key;
  const support = data.support;

  return (
    <Card className="mb-5 overflow-hidden">
      <div className="flex items-start gap-3 border-b border-slate-100 bg-[var(--hsu-soft)] px-5 py-3">
        <ListChecks className="mt-0.5 h-5 w-5 shrink-0 text-[var(--hsu)]" />
        <div className="min-w-0 flex-1">
          <h2 className="font-bold text-slate-900">{t("guide.title")}</h2>
          <div className="mt-1.5 flex items-center gap-2">
            <div className="h-1.5 w-40 max-w-full overflow-hidden rounded-full bg-white">
              <div className="h-full rounded-full bg-[var(--hsu)] transition-all" style={{ width: `${(done / items.length) * 100}%` }} />
            </div>
            <span className="text-xs font-semibold text-slate-600">{t("guide.progress", { done, total: items.length })}</span>
          </div>
        </div>
        <button onClick={onHide} className="inline-flex shrink-0 items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-slate-600 hover:bg-white">
          <X className="h-3.5 w-3.5" /> {t("guide.hide")}
        </button>
      </div>
      {done === items.length && <p className="px-5 pt-3 text-sm font-semibold text-emerald-700">{t("guide.allDone")}</p>}
      <ol className="divide-y divide-slate-100">
        {items.map((it, n) => {
          const go = it.key === "doctors" || it.key === "types" || it.key === "calendar" || it.key === "open" ? t.dyn(`guide.${it.key}.go`) : null;
          return (
            <li key={it.key} className={cx("flex items-center gap-3 px-5 py-3", it.key === nextKey && "bg-amber-50/60")}>
              <span className={cx("flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                it.done ? "bg-emerald-600 text-white" : it.key === nextKey ? "bg-[var(--hsu)] text-white" : "bg-slate-100 text-slate-500")}>
                {it.done ? <Check className="h-4 w-4" /> : n + 1}
              </span>
              <div className="min-w-0 flex-1">
                <div className={cx("text-sm font-semibold", it.done ? "text-slate-500 line-through decoration-slate-300" : "text-slate-900")}>{t.dyn(`guide.${it.key}.title`)}</div>
                <div className="text-xs text-slate-500">{t.dyn(`guide.${it.key}.body`)}</div>
              </div>
              {go && !it.done && (
                <button onClick={() => onGo(it.go)} className="inline-flex shrink-0 items-center gap-0.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-[var(--hsu)] hover:bg-[var(--hsu-soft)]">
                  {go} <ChevronRight className="h-3.5 w-3.5" />
                </button>
              )}
            </li>
          );
        })}
      </ol>
      {support && (
        <p className="border-t border-slate-100 px-5 py-2.5 text-xs text-slate-500">
          {t("guide.help", { contact: `${support.name} · ${support.phone}` })}
        </p>
      )}
    </Card>
  );
}
