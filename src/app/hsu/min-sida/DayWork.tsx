"use client";

// Dagvinna læknisins í hans eigin yfirliti: Vaktaplan, Mínar vaktir og Yfirlit.
//
// Þetta eru EKKI vaktir úr vaktaplaninu heldur föst dagvinnuvika læknisins
// (hsu_doctors.day_work). Hún er reiknuð í vafranum út frá vikumynstrinu — sömu
// reglur og í dagatalssamstillingunni: frídagar sleppast og dagur þar sem hann á
// þegar vakt sýnir vaktina eina (ekki hvort tveggja).

import { CalendarDays } from "lucide-react";
import { useT } from "@/lib/hsu/i18n/client";
import { dayLabelL, weekdayShortOf } from "@/lib/hsu/i18n/format";
import { prefs as prefsMsgs } from "@/lib/hsu/i18n/messages/prefs";
import { dayWorkOn, datesInMonth, monthKey, shiftMonth, type DayWork, type DayWorkKind } from "@/lib/hsu/types";

/** Litur hverrar tegundar — sá sami og í skrefi 3. */
export const DAY_WORK_TONE: Record<DayWorkKind, string> = {
  fm: "bg-[var(--hsu-soft)] text-[var(--hsu-dark)] ring-[var(--hsu)]/20",
  mottaka: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  deild: "bg-violet-50 text-violet-800 ring-violet-200",
};

export function useDayWorkLabel() {
  const t = useT(prefsMsgs);
  return (kind: DayWorkKind) => t.dyn(`fm.kind.${kind}`);
}

/**
 * Dagvinnudagar frá og með `from`, `months` mánuði fram í tímann, að frádregnum
 * dögum þar sem læknirinn á þegar vakt.
 */
export function dayWorkDates(work: DayWork, from: string, taken: Set<string>, months = 3): { date: string; kind: DayWorkKind }[] {
  if (!work || !Object.keys(work).length) return [];
  const out: { date: string; kind: DayWorkKind }[] = [];
  const first = monthKey(new Date(`${from}T00:00:00Z`));
  for (let i = 0; i <= months; i++) {
    for (const date of datesInMonth(shiftMonth(first, i))) {
      if (date < from || taken.has(date)) continue;
      const kind = dayWorkOn(work, date);
      if (kind) out.push({ date, kind });
    }
  }
  return out;
}

/** Ein lína í lista (Mínar vaktir, Yfirlit) — hógværari en vaktalína. */
export function DayWorkRow({ date, kind }: { date: string; kind: DayWorkKind }) {
  const t = useT(prefsMsgs);
  const label = t.dyn(`fm.kind.${kind}`);
  return (
    <div className="flex items-center gap-3 px-4 py-2.5">
      <span className="flex h-9 w-9 shrink-0 flex-col items-center justify-center rounded-xl bg-slate-100 text-slate-500">
        <span className="text-[9px] font-bold uppercase leading-none">{weekdayShortOf(date, t.lang)}</span>
        <span className="text-sm font-bold leading-tight">{Number(date.slice(8))}</span>
      </span>
      <span className="min-w-0 flex-1">
        <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ${DAY_WORK_TONE[kind]}`}>
          <CalendarDays className="h-3 w-3" /> {label}
        </span>
        <span className="ml-2 text-xs text-slate-500">{dayLabelL(date, t.lang)}</span>
      </span>
    </div>
  );
}

/** Lítið merki inni í degi á vaktaplaninu. */
export function DayWorkChip({ kind }: { kind: DayWorkKind }) {
  const t = useT(prefsMsgs);
  return (
    <span className={`block truncate rounded-md px-1.5 py-0.5 text-[10px] font-semibold ring-1 ${DAY_WORK_TONE[kind]}`}>
      {t.dyn(`fm.kind.${kind}`)}
    </span>
  );
}
