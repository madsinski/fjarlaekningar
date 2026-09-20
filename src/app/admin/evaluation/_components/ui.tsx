"use client";

// Shared visual language for the evaluation module.
//
// Each category carries an accent colour and keeps it everywhere it appears —
// the picker, the setup list, the dashboard. Colour is the thing that lets you
// glance at a board of twenty cards and see the shape of the programme without
// reading any of them, so it has to mean the same thing in every place.

import type { Category, Source, Status } from "@/lib/evaluation/types";

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
