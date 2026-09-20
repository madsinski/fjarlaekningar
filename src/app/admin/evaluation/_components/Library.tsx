"use client";

// The module library — a reference you can read straight through, or hand to
// an advisor before a meeting.
//
// Distinct from the picker on purpose. The picker is for deciding and shows
// one line per card until you open it; this is for reading, shows everything
// at once, and prints. Somebody reviewing a programme wants to see the whole
// catalogue laid out, not click twenty disclosure triangles.
//
// Each entry answers four things in the same order every time: what it
// measures, what you practically get, why it is worth doing, and what it
// cannot show. The last of those is given the same space as the rest, because
// a catalogue that only shows upside is a sales document, not a reference.

import { useMemo, useState } from "react";
import { CheckCircle2, Clock, FileText, Gauge } from "lucide-react";
import { ALL_MODULES } from "@/lib/evaluation/modules";
import { enabledModules, EFFORT_LABEL } from "@/lib/evaluation/programme";
import { CATEGORIES, SOURCES, type Category, type Horizon, type Programme } from "@/lib/evaluation/types";
import { ACCENT, Chip, SOURCE_CHIP, card } from "./ui";

export default function Library({ programme }: { programme: Programme }) {
  const [horizon, setHorizon] = useState<Horizon | "all">("all");
  const [category, setCategory] = useState<Category | "all">("all");

  const on = useMemo(() => new Set(enabledModules(programme).map((m) => m.id)), [programme]);
  const shown = ALL_MODULES.filter(
    (m) => (horizon === "all" || m.horizon === horizon) && (category === "all" || m.category === category),
  );

  const counts = {
    total: ALL_MODULES.length,
    now: ALL_MODULES.filter((m) => m.horizon === "now").length,
    later: ALL_MODULES.filter((m) => m.horizon === "later").length,
  };

  return (
    <div className="space-y-4">
      <div className={`${card} p-4`}>
        <h2 className="text-base font-bold text-slate-900">Module library</h2>
        <p className="mt-1 max-w-3xl text-sm leading-relaxed text-slate-600">
          Everything that could be measured, whether or not it is in the programme. {counts.total} modules —{" "}
          {counts.now} worth doing in the pilot year, {counts.later} that need groundwork first and are better
          suited to a second site, a publication or a tender.
        </p>
        <p className="mt-2 text-xs leading-relaxed text-slate-500">
          Each entry gives what it measures, what you practically get, the argument for it, and — in the same
          space — what it cannot show. Print this or send it ahead of the review meeting.
        </p>

        <div className="mt-3 flex flex-wrap gap-2">
          <div className="flex gap-1 rounded-lg bg-slate-100 p-1">
            {([["all", "All"], ["now", "Do now"], ["later", "Later"]] as const).map(([id, label]) => (
              <button
                key={id}
                onClick={() => setHorizon(id)}
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition ${
                  horizon === id ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-1 rounded-lg bg-slate-100 p-1">
            <button
              onClick={() => setCategory("all")}
              className={`rounded-md px-2.5 py-1 text-xs font-medium transition ${
                category === "all" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Every category
            </button>
            {CATEGORIES.map((c) => (
              <button
                key={c.id}
                onClick={() => setCategory(c.id)}
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition ${
                  category === c.id ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"
                }`}
              >
                {c.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {CATEGORIES.filter((c) => shown.some((m) => m.category === c.id)).map((cat) => {
        const a = ACCENT[cat.id];
        const items = shown.filter((m) => m.category === cat.id);
        return (
          <section key={cat.id}>
            <div className="mb-2 flex flex-wrap items-baseline gap-2">
              <h2 className="text-lg font-bold text-slate-900">{cat.name}</h2>
              <span className="text-sm text-slate-500">{cat.question}</span>
              {cat.gate && <Chip className="bg-slate-800 text-white">Gate</Chip>}
            </div>
            <p className="mb-3 max-w-3xl text-xs leading-relaxed text-slate-500">{cat.note}</p>

            <div className="space-y-3">
              {items.map((m) => (
                <article key={m.id} className={`relative overflow-hidden ${card}`}>
                  <div className={`absolute inset-y-0 left-0 w-1 ${a.bar}`} />
                  <div className="py-4 pl-5 pr-4">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <h3 className="text-sm font-bold text-slate-900">{m.name}</h3>
                      {on.has(m.id) && (
                        <Chip className="bg-emerald-100 text-emerald-800">
                          <CheckCircle2 className="mr-0.5 h-2.5 w-2.5" /> In programme
                        </Chip>
                      )}
                      {m.core && <Chip className="bg-slate-800 text-white">Core</Chip>}
                      {m.horizon === "later" && <Chip className="bg-slate-100 text-slate-600">Later</Chip>}
                      <Chip className="bg-slate-100 text-slate-600">
                        <Gauge className="mr-0.5 h-2.5 w-2.5" /> {EFFORT_LABEL[m.effort]}
                      </Chip>
                    </div>

                    <p className="mt-1.5 text-sm text-slate-700">{m.question}</p>
                    <p className={`mt-0.5 text-xs font-medium ${a.text}`}>{m.benefit}</p>

                    <div className={`mt-2.5 rounded-lg ${a.soft} px-3 py-2`}>
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">The claim it earns</p>
                      <p className="mt-0.5 text-xs leading-relaxed text-slate-700">{m.claim}</p>
                    </div>

                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Why it is worth doing</p>
                        <p className="mt-0.5 text-xs leading-relaxed text-slate-600">{m.rationale}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">What it cannot show</p>
                        <p className="mt-0.5 text-xs leading-relaxed text-slate-600">{m.caveat}</p>
                      </div>
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 border-t border-slate-100 pt-2.5 text-[11px] text-slate-500">
                      <span className="flex flex-wrap items-center gap-1">
                        Data from:
                        {m.sources.map((s) => (
                          <span key={s} className={`rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${SOURCE_CHIP[s]}`}>
                            {SOURCES[s].name}
                          </span>
                        ))}
                      </span>
                      <span><strong className="font-semibold text-slate-700">{m.metrics.length}</strong> metric{m.metrics.length === 1 ? "" : "s"}</span>
                      <span><strong className="font-semibold text-slate-700">{m.fields.length}</strong> field{m.fields.length === 1 ? "" : "s"}</span>
                      <span><strong className="font-semibold text-slate-700">{m.protocol.length}</strong> step{m.protocol.length === 1 ? "" : "s"}</span>
                      {m.documents.length > 0 && (
                        <span className="flex items-center gap-1">
                          <FileText className="h-3 w-3" /> {m.documents.length} document{m.documents.length === 1 ? "" : "s"}
                        </span>
                      )}
                      {m.protocol.some((s) => s.timeCritical) && (
                        <span className="flex items-center gap-1 font-medium text-rose-600">
                          <Clock className="h-3 w-3" /> has time-critical steps
                        </span>
                      )}
                      {m.requires?.length && (
                        <span className="text-slate-500">
                          needs {m.requires.map((r) => ALL_MODULES.find((x) => x.id === r)?.name ?? r).join(", ")}
                        </span>
                      )}
                    </div>

                    <details className="mt-2">
                      <summary className="cursor-pointer text-[11px] font-medium text-slate-500 hover:text-slate-800">
                        What it produces and what it asks of you
                      </summary>
                      <div className="mt-2 grid gap-3 sm:grid-cols-2">
                        <div>
                          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Metrics</p>
                          <ul className="mt-0.5 space-y-1">
                            {m.metrics.map((x) => (
                              <li key={x.id} className="text-[11px] leading-relaxed text-slate-600">
                                <strong className="font-semibold text-slate-800">{x.name}</strong> — {x.why}
                              </li>
                            ))}
                          </ul>
                        </div>
                        <div>
                          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Protocol</p>
                          <ol className="mt-0.5 space-y-1">
                            {m.protocol.map((s, i) => (
                              <li key={i} className="text-[11px] leading-relaxed text-slate-600">
                                {i + 1}. {s.text}
                                {s.timeCritical && <span className="ml-1 font-semibold text-rose-600">time-critical</span>}
                              </li>
                            ))}
                          </ol>
                        </div>
                      </div>
                    </details>
                  </div>
                </article>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
