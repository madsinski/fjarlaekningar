"use client";

// Shared visual language for the evaluation module.
//
// Each category carries an accent colour and keeps it everywhere it appears —
// the picker, the setup list, the dashboard. Colour is the thing that lets you
// glance at a board of twenty cards and see the shape of the programme without
// reading any of them, so it has to mean the same thing in every place.

import type { Category, Source, Status } from "@/lib/evaluation/types";
import { gloss } from "@/lib/evaluation/glossary";

export const ACCENT: Record<Category, { bar: string; chip: string; ring: string; soft: string; text: string }> = {
  effectiveness: { bar: "bg-cyan-500", chip: "bg-cyan-100 text-cyan-900", ring: "ring-cyan-400", soft: "bg-cyan-50", text: "text-cyan-700" },
  safety: { bar: "bg-rose-500", chip: "bg-rose-100 text-rose-900", ring: "ring-rose-400", soft: "bg-rose-50", text: "text-rose-700" },
  workload: { bar: "bg-violet-500", chip: "bg-violet-100 text-violet-900", ring: "ring-violet-400", soft: "bg-violet-50", text: "text-violet-700" },
  experience: { bar: "bg-amber-500", chip: "bg-amber-100 text-amber-900", ring: "ring-amber-400", soft: "bg-amber-50", text: "text-amber-700" },
  scalability: { bar: "bg-emerald-500", chip: "bg-emerald-100 text-emerald-900", ring: "ring-emerald-400", soft: "bg-emerald-50", text: "text-emerald-700" },
};

export const STATUS_RING: Record<Status, string> = {
  good: "border-emerald-200 bg-emerald-50/70",
  fair: "border-amber-200 bg-amber-50/70",
  poor: "border-rose-200 bg-rose-50/70",
};

export const SOURCE_CHIP: Record<Source, string> = {
  medalia: "bg-cyan-100 text-cyan-800",
  institution: "bg-violet-100 text-violet-800",
  survey: "bg-amber-100 text-amber-800",
  internal: "bg-slate-200 text-slate-700",
  study: "bg-rose-100 text-rose-800",
  derived: "bg-slate-100 text-slate-500",
};

export const input =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 shadow-sm transition focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/20";

export const card = "rounded-xl border border-slate-200 bg-white shadow-sm";

export function Chip({ className = "", children }: { className?: string; children: React.ReactNode }) {
  return (
    <span className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${className}`}>
      {children}
    </span>
  );
}

/** A thin three-segment bar: setup steps, documents, live metrics. Reads at a
 *  glance and needs no legend once you have seen it twice. */
export function ProgressBars({ steps, docs, metrics }: { steps: number; docs: number; metrics: number }) {
  const rows: [string, number, string][] = [
    ["Setup", steps, "bg-slate-400"],
    ["Documents", docs, "bg-violet-400"],
    ["Reporting", metrics, "bg-emerald-500"],
  ];
  return (
    <div className="space-y-1.5">
      {rows.map(([label, value, colour]) => (
        <div key={label} className="flex items-center gap-2">
          <span className="w-20 shrink-0 text-[11px] font-medium text-slate-500">{label}</span>
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
            <div className={`h-full rounded-full transition-all duration-500 ${colour}`} style={{ width: `${value}%` }} />
          </div>
          <span className="w-9 shrink-0 text-right text-[11px] tabular-nums text-slate-500">{value}%</span>
        </div>
      ))}
    </div>
  );
}

/**
 * Descriptive text with the unavoidable technical words explained in place.
 *
 * The terms stay — an ethics committee and a journal expect them, and
 * softening the wording would weaken those documents — but nobody should need
 * to know what "secular trend" means to read a dashboard. Hover or focus the
 * dotted word and the plain meaning appears.
 *
 * Keyboard reachable on purpose: a tooltip that only responds to a mouse is
 * one half the people reading this cannot get to.
 */
export function Plain({ children }: { children: string }) {
  return (
    <>
      {gloss(children).map((seg, i) =>
        seg.term ? (
          <span key={i} tabIndex={0} className="group relative cursor-help border-b border-dotted border-slate-400 outline-none">
            {seg.text}
            <span
              role="tooltip"
              className="pointer-events-none absolute bottom-full left-0 z-30 mb-1 hidden w-64 rounded-lg bg-slate-900 p-2.5 text-left text-[11px] font-normal leading-relaxed text-white shadow-lg group-hover:block group-focus:block"
            >
              <strong className="block text-white">{seg.term.term}</strong>
              <span className="mt-0.5 block text-slate-200">{seg.term.plain}</span>
              {seg.term.soWhat && <span className="mt-1 block text-slate-400">{seg.term.soWhat}</span>}
            </span>
          </span>
        ) : (
          <span key={i}>{seg.text}</span>
        ),
      )}
    </>
  );
}

/**
 * A twelve-month strip showing what each design actually looks like.
 *
 * Grey means the station is running as usual; green means the service is
 * live there. The staircase is the whole idea behind the strongest option,
 * and it is far quicker to see than to read — which is the point: nobody
 * should have to recognise the phrase "stepped wedge" to pick between four
 * options.
 */
export function DesignDiagram({ design }: { design: string }) {
  const rows: { label: string; startsAt: number | null }[] =
    design === "stepped-wedge"
      ? [
          { label: "Station 1", startsAt: 3 },
          { label: "Station 2", startsAt: 6 },
          { label: "Station 3", startsAt: 9 },
        ]
      : design === "controlled"
      ? [
          { label: "Our station", startsAt: 6 },
          { label: "Comparison", startsAt: null },
        ]
      : [{ label: "Our station", startsAt: 6 }];

  const months = 12;
  return (
    <div className="space-y-1">
      {rows.map((r) => (
        <div key={r.label} className="flex items-center gap-2">
          <span className="w-20 shrink-0 text-right text-[10px] text-slate-500">{r.label}</span>
          <div className="flex flex-1 gap-[2px]">
            {Array.from({ length: months }, (_, i) => {
              const live = r.startsAt !== null && i >= r.startsAt;
              const starts = r.startsAt === i;
              return (
                <div
                  key={i}
                  className={`h-3 flex-1 rounded-[2px] ${live ? "bg-emerald-500" : "bg-slate-200"} ${
                    starts ? "ring-2 ring-emerald-700 ring-offset-1" : ""
                  }`}
                  title={starts ? "service starts here" : live ? "service running" : "as usual"}
                />
              );
            })}
          </div>
        </div>
      ))}
      <div className="flex items-center gap-3 pl-[88px] pt-0.5 text-[10px] text-slate-500">
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-[2px] bg-slate-200" /> as usual</span>
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-[2px] bg-emerald-500" /> service running</span>
        <span className="text-slate-400">← 12 months →</span>
        {design === "its" && <span className="text-slate-400">every month counted separately</span>}
      </div>
    </div>
  );
}
