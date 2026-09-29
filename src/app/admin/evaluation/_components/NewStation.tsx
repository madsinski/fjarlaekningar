"use client";

// "What must be ready before the next station starts?"
//
// The question that decides whether a new site can open next week or has to
// wait. Answered from the enabled modules rather than written by hand: every
// field carries a timing (see `fieldTiming()`), so switching a module on or
// off changes this list with it.
//
// Prospective data are the only thing that is lost by waiting. Everything in
// Saga can be pulled retrospectively at any time, as long as the definition
// (code set, counting rule) is fixed before anyone looks at the numbers.

import { CalendarCheck, History, Flag } from "lucide-react";
import { fieldsByTiming, timeCriticalOutstanding } from "@/lib/evaluation/programme";
import type { Programme, Timing } from "@/lib/evaluation/types";
import { card } from "./ui";

const COLUMN: Record<Timing, { title: string; sub: string; note: string; icon: typeof Flag; tone: string; dot: string }> = {
  day1: {
    title: "Tilbúið frá fyrsta degi",
    sub: "Framskyggn gagnasöfnun",
    note: "Skráð jafnóðum frá fyrsta sjúklingi. Það sem ekki er skráð strax er ekki hægt að sækja eftir á.",
    icon: Flag,
    tone: "border-rose-200 bg-rose-50/60",
    dot: "bg-rose-500",
  },
  later: {
    title: "Má sækja síðar",
    sub: "Afturskyggn gagnasöfnun úr Sögu",
    note: "Liggur þegar fyrir í Sögu og má sækja hvenær sem er, ef skilgreiningin er ákveðin fyrir fram.",
    icon: History,
    tone: "border-slate-200 bg-slate-50",
    dot: "bg-slate-400",
  },
  end: {
    title: "Í lok tímabils",
    sub: "Spurt einu sinni",
    note: "Lagt fyrir þegar tímabilinu lýkur.",
    icon: CalendarCheck,
    tone: "border-slate-200 bg-slate-50",
    dot: "bg-slate-400",
  },
};

export default function NewStation({ programme, onOpenSetup }: { programme: Programme; onOpenSetup: () => void }) {
  const groups = fieldsByTiming(programme);
  const urgent = timeCriticalOutstanding(programme);

  return (
    <section className={`${card} p-4`}>
      <h2 className="text-base font-bold text-slate-900">Ný stöð: hvað þarf að vera tilbúið?</h2>
      <p className="mt-1 max-w-3xl text-sm leading-relaxed text-slate-600">
        Engin gögn þarf að sækja áður en næsta stöð byrjar. Allt sem er skráð í Sögu má sækja afturskyggnt síðar.
        En þjónustukönnunin og skráningin í Medalia verða að vera tilbúnar frá fyrsta sjúklingi.
      </p>

      <div className="mt-3 grid gap-3 lg:grid-cols-3">
        {groups.map(({ when, modules }) => {
          const c = COLUMN[when];
          const Icon = c.icon;
          return (
            <div key={when} className={`rounded-lg border p-3 ${c.tone}`}>
              <p className="flex items-center gap-1.5 text-sm font-semibold text-slate-900">
                <Icon className="h-4 w-4 text-slate-500" /> {c.title}
              </p>
              <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">{c.sub}</p>
              <p className="mt-1 text-xs leading-relaxed text-slate-600">{c.note}</p>
              <ul className="mt-2 space-y-2">
                {modules.map(({ module, fields }) => (
                  <li key={module.id} className="text-xs">
                    <p className="flex items-center gap-1.5 font-medium text-slate-800">
                      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${c.dot}`} /> {module.name}
                    </p>
                    <p className="pl-3 leading-snug text-slate-500">{fields.map((f) => f.label).join(" · ")}</p>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>

      {urgent.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-900">
          <span className="font-semibold">
            {urgent.length} {urgent.length % 10 === 1 && urgent.length % 100 !== 11 ? "verkþáttur þarf" : "verkþættir þurfa"} að
            klárast fyrir upphafsdag
          </span>
          <span className="text-rose-800">t.d. {urgent.slice(0, 2).map((t) => t.step.text.toLowerCase()).join(", ")}</span>
          <button onClick={onOpenSetup} className="font-semibold underline">Opna undirbúning</button>
        </div>
      )}
    </section>
  );
}
