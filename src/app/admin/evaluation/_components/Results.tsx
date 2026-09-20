"use client";

// The dashboard.
//
// Grouped by what each figure PROVES, where data entry is grouped by where the
// number comes from. Same underlying set, two orderings, neither wrong in its
// place.
//
// Two categories are marked as gates rather than scales: safety and
// scalability. They do not average out against a good number somewhere else,
// and the page says so rather than leaving it to be inferred from the colour.

import { Info, TriangleAlert } from "lucide-react";
import { results } from "@/lib/evaluation/programme";
import type { Assumptions, Programme } from "@/lib/evaluation/types";
import { caseTypeRows, pct, type Roster, type Totals } from "@/lib/evaluation/totals";
import { ACCENT, Chip, STATUS_RING, card } from "./ui";

export default function Results({
  programme, t, roster, a,
}: { programme: Programme; t: Totals; roster: Roster; a: Assumptions }) {
  const groups = results(programme, { t, roster, a });
  const showCaseTypes = groups.some((g) => g.modules.some((m) => m.module.id === "case-mix" || m.module.id === "resolution"));
  const showGeneral = groups.some((g) => g.modules.some((m) => m.module.id === "scope-discovery"));
  const rows = caseTypeRows(t);

  return (
    <div className="space-y-6">
      {groups.map(({ category, modules }) => {
        const accent = ACCENT[category.id];
        return (
          <section key={category.id}>
            <div className="mb-2 flex flex-wrap items-baseline gap-2">
              <h2 className="text-lg font-bold text-slate-900">{category.name}</h2>
              <span className="text-sm text-slate-500">{category.question}</span>
              {category.gate && <Chip className="bg-slate-800 text-white">Gate</Chip>}
            </div>
            <p className="mb-3 max-w-3xl text-xs leading-relaxed text-slate-500">{category.note}</p>

            <div className="space-y-3">
              {modules.map(({ module, values }) => {
                const head = values.find((v) => v.metric.headline) ?? values[0];
                const rest = values.filter((v) => v !== head);
                return (
                  <div key={module.id} className={`relative overflow-hidden ${card}`}>
                    <div className={`absolute inset-y-0 left-0 w-1 ${accent.bar}`} />
                    <div className="grid gap-4 py-4 pl-5 pr-4 lg:grid-cols-[minmax(0,250px)_1fr]">
                      <div>
                        <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                          {module.name}
                        </p>
                        <div className={`rounded-lg border p-3 ${head.value.status ? STATUS_RING[head.value.status] : "border-slate-200 bg-slate-50"}`}>
                          <p className="text-xs font-medium text-slate-600">{head.metric.name}</p>
                          <p className="mt-0.5 text-3xl font-bold tracking-tight text-slate-900">
                            {head.value.value ?? <span className="text-lg font-medium text-slate-400">Pending</span>}
                          </p>
                          <p className="mt-1 text-xs leading-snug text-slate-600">{head.value.detail}</p>
                          {head.value.missing && (
                            <p className="mt-1.5 flex items-center gap-1 text-[11px] font-medium text-cyan-700">
                              <Info className="h-3 w-3" /> Needs: {head.value.missing}
                            </p>
                          )}
                        </div>
                        {head.value.assumption && (
                          <p className={`mt-2 rounded-lg border px-2.5 py-1.5 text-[11px] leading-snug ${
                            head.value.assumption.startsWith("ESTIMATE")
                              ? "border-amber-200 bg-amber-50 text-amber-900"
                              : "border-slate-200 bg-slate-50 text-slate-600"
                          }`}>
                            {head.value.assumption}
                          </p>
                        )}
                      </div>

                      <div>
                        <p className="mb-2 text-xs leading-relaxed text-slate-600">{head.metric.why}</p>
                        {rest.length > 0 && (
                          <div className="grid gap-2 sm:grid-cols-2">
                            {rest.map(({ metric, value }) => (
                              <div key={metric.id} className="rounded-lg border border-slate-200 bg-white p-2.5">
                                <p className="text-xs font-medium text-slate-600">{metric.name}</p>
                                <p className="text-lg font-semibold text-slate-900">
                                  {value.value ?? <span className="text-sm font-medium text-slate-400">—</span>}
                                </p>
                                <p className="mt-0.5 text-[11px] leading-snug text-slate-500">{value.detail}</p>
                                {value.missing && <p className="mt-1 text-[11px] font-medium text-cyan-700">Needs: {value.missing}</p>}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}

      {!groups.length && (
        <div className={`${card} flex items-center gap-3 p-6`}>
          <TriangleAlert className="h-5 w-5 text-amber-500" />
          <p className="text-sm text-slate-600">No modules selected. Go to <strong>Choose modules</strong> to start.</p>
        </div>
      )}

      {showCaseTypes && (
        <section className={`${card} p-4`}>
          <h2 className="text-lg font-bold text-slate-900">The eleven case types</h2>
          <p className="mb-3 max-w-3xl text-sm leading-relaxed text-slate-600">
            The aggregate rate hides it when three case types carry the other eight. The aim is not eleven green
            ticks above 95% — nobody believes that — but a table that survives scrutiny, where the weak types are
            visible and you can say what you changed.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="py-2 pr-2 font-semibold">Case type</th>
                  <th className="px-2 py-2 text-right font-semibold">Total</th>
                  <th className="px-2 py-2 text-right font-semibold">Resolved</th>
                  <th className="px-2 py-2 text-right font-semibold">Referred</th>
                  <th className="py-2 pl-2 text-right font-semibold">Resolution rate</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.slug} className="border-b border-slate-100 last:border-0">
                    <td className="py-1.5 pr-2 text-slate-800">{r.name}</td>
                    <td className="px-2 py-1.5 text-right tabular-nums text-slate-600">{r.c.total || "—"}</td>
                    <td className="px-2 py-1.5 text-right tabular-nums text-slate-600">{r.c.resolved || "—"}</td>
                    <td className="px-2 py-1.5 text-right tabular-nums text-slate-600">{r.c.referred || "—"}</td>
                    <td className="py-1.5 pl-2 text-right">
                      {r.rate === null ? (
                        <span className="text-slate-300">—</span>
                      ) : (
                        <span className={`rounded px-1.5 py-0.5 text-xs font-semibold ${
                          r.c.total < 5 ? "bg-slate-100 text-slate-500"
                            : r.rate >= 80 ? "bg-emerald-100 text-emerald-800"
                            : r.rate >= 60 ? "bg-amber-100 text-amber-800"
                            : "bg-rose-100 text-rose-800"
                        }`}>
                          {r.rate}%{r.c.total < 5 && " · few"}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-[11px] text-slate-400">
            Greyed rates have fewer than five cases. Figures like that should not leave the building — suppress or
            combine them in anything you publish.
          </p>
        </section>
      )}

      {showGeneral && t.generalUnresolved.length > 0 && (
        <section className={`${card} p-4`}>
          <h2 className="text-lg font-bold text-slate-900">General practice — what did not get resolved</h2>
          <p className="mb-3 max-w-3xl text-sm leading-relaxed text-slate-600">
            The catch-all is where case types twelve, thirteen and fourteen are hiding. This is the roadmap to the
            next ones — and the slide that sells itself: <em>we started with eleven, and the data told us what the
            next three should be.</em>
          </p>
          <ul className="space-y-1">
            {t.generalUnresolved.map((f) => (
              <li key={f.label} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-1.5 text-sm">
                <span className="text-slate-700">{f.label}</span>
                <span className="font-semibold tabular-nums text-slate-900">{f.count}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {t.entry.total > 0 && (
        <section className={`${card} p-4`}>
          <h2 className="text-lg font-bold text-slate-900">How patients arrived</h2>
          <p className="mb-3 max-w-3xl text-sm text-slate-600">
            A patient who arrives directly costs the health centre nothing. A rising direct share is the service
            becoming self-sufficient.
          </p>
          <div className="flex h-3 overflow-hidden rounded-full">
            {([
              ["Direct", t.entry.direct, "bg-emerald-500"],
              ["Nurse", t.entry.nurse, "bg-cyan-500"],
              ["Reception", t.entry.reception, "bg-violet-400"],
              ["Records", t.entry.records, "bg-amber-400"],
              ["Other", t.entry.other, "bg-slate-300"],
            ] as [string, number, string][]).map(([label, v, colour]) => (
              <div key={label} className={colour} style={{ width: `${(v / t.entry.total) * 100}%` }} title={`${label}: ${v}`} />
            ))}
          </div>
          <div className="mt-2 flex flex-wrap gap-3 text-xs text-slate-600">
            {([
              ["Direct", t.entry.direct, "bg-emerald-500"],
              ["Nurse", t.entry.nurse, "bg-cyan-500"],
              ["Reception", t.entry.reception, "bg-violet-400"],
              ["Records", t.entry.records, "bg-amber-400"],
              ["Other", t.entry.other, "bg-slate-300"],
            ] as [string, number, string][]).map(([label, v, colour]) => (
              <span key={label} className="flex items-center gap-1.5">
                <span className={`h-2 w-2 rounded-full ${colour}`} /> {label} {pct(v, t.entry.total)}%
              </span>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
