"use client";

// The design step.
//
// Placed before Choose modules, because it governs everything after it: what
// the figures are allowed to mean, which sites contribute, and what has to be
// requested from the institution.
//
// The page is blunt about one thing in particular — the difference between the
// design you have chosen and the design your data can actually support. A
// design picked in an interface and then described in a report as though it
// were real is worse than admitting to the weaker one.

import { CheckCircle2, ChevronRight, Circle, Clock, TriangleAlert, XCircle } from "lucide-react";
import {
  COHORTS, DECISIONS, DESIGNS, DESIGN_BY_ID, SITE_ROLES, feasibility, supportedDesign,
  type DesignState, type SiteRole,
} from "@/lib/evaluation/design";
import { Chip, card, input, Plain } from "./ui";

const STRENGTH_BAR: Record<number, string> = {
  1: "bg-rose-400", 2: "bg-amber-400", 3: "bg-cyan-500", 4: "bg-emerald-500",
};

export default function DesignStep({
  state, onChange, canEdit, stations, monthsOfData, stationsWithData,
}: {
  state: DesignState;
  onChange: (s: DesignState) => void;
  canEdit: boolean;
  stations: string[];
  monthsOfData: number;
  stationsWithData: Set<string>;
}) {
  const preLiveWithData = Object.entries(state.sites).filter(
    ([name, cfg]) => cfg.role === "pre-live" && stationsWithData.has(name),
  ).length;

  const checks = feasibility(state, { preLiveWithData, monthsOfData });
  const best = supportedDesign(state, { preLiveWithData });
  const chosenIdx = DESIGNS.findIndex((d) => d.id === state.design);
  const bestIdx = DESIGNS.findIndex((d) => d.id === best);
  const overclaiming = bestIdx < chosenIdx;

  const setSite = (name: string, patch: Partial<{ role: SiteRole; goLive: string }>) =>
    onChange({
      ...state,
      sites: { ...state.sites, [name]: { ...(state.sites[name] ?? { role: "excluded" as SiteRole }), ...patch } },
    });

  return (
    <div className="space-y-4">
      <div className={`${card} p-4`}>
        <h2 className="text-base font-bold text-slate-900">What kind of evidence is this?</h2>
        <p className="mt-1 max-w-3xl text-sm leading-relaxed text-slate-600">
          Decide this before the data arrives, not after. Without a stated design the work defaults to the weakest
          one — an uncontrolled before-and-after at a single site — and silently inherits secular trend,
          seasonality and regression to the mean.
        </p>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-600">
          The upgrade is nearly free, and comes in two parts that both have to happen now: ask the institution for
          the baseline <strong className="text-slate-800">month by month</strong> rather than as an annual total,
          and start collecting the same figures at stations that are{" "}
          <strong className="text-slate-800">not live yet</strong>. A staged rollout is a stepped wedge waiting to
          happen — later sites are controls for earlier ones, which rules out anything that changed nationally.
          Neither is possible retrospectively.
        </p>
      </div>

      {overclaiming && (
        <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3">
          <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
          <div>
            <p className="text-sm font-semibold text-rose-900">
              You have chosen {DESIGN_BY_ID[state.design].name.toLowerCase()}, but the data supports only{" "}
              {DESIGN_BY_ID[best].name.toLowerCase()}
            </p>
            <p className="mt-0.5 text-xs leading-relaxed text-rose-800">
              Either collect what the stronger design needs — the checks below say what is missing — or report the
              weaker one. A design that exists only in this interface will still be described in a report as though
              it were real.
            </p>
          </div>
        </div>
      )}

      {/* ── Design ──────────────────────────────────────────────────────── */}
      <section className={`${card} p-4`}>
        <h3 className="font-bold text-slate-900">Design</h3>
        <p className="mb-3 text-xs text-slate-500">Strongest option your rollout could support is highlighted.</p>
        <div className="space-y-2">
          {DESIGNS.map((d) => {
            const chosen = state.design === d.id;
            const achievable = d.id === best;
            return (
              <button
                key={d.id}
                onClick={() => canEdit && onChange({ ...state, design: d.id })}
                disabled={!canEdit}
                className={`w-full overflow-hidden rounded-xl border p-3 text-left transition ${
                  chosen ? "border-slate-900 bg-slate-50 ring-2 ring-slate-900/10" : "border-slate-200 bg-white hover:border-slate-300"
                }`}
              >
                <div className="flex items-start gap-2.5">
                  <div className="mt-0.5 shrink-0">
                    {chosen ? <CheckCircle2 className="h-4 w-4 text-slate-900" /> : <Circle className="h-4 w-4 text-slate-300" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-sm font-semibold text-slate-900">{d.name}</span>
                      <span className="flex gap-0.5" title={`Strength ${d.strength} of 4`}>
                        {[1, 2, 3, 4].map((i) => (
                          <span key={i} className={`h-1.5 w-4 rounded-full ${i <= d.strength ? STRENGTH_BAR[d.strength] : "bg-slate-200"}`} />
                        ))}
                      </span>
                      {achievable && <Chip className="bg-emerald-100 text-emerald-800">Supported by your data</Chip>}
                    </div>
                    <p className="mt-1 text-xs leading-relaxed text-slate-600"><Plain>{d.summary}</Plain></p>
                    <p className="mt-1 text-xs font-medium text-slate-700">Lets you say: <Plain>{d.claim}</Plain></p>

                    <div className="mt-2 grid gap-2 sm:grid-cols-3">
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Needs</p>
                        <ul className="mt-0.5 space-y-0.5">
                          {d.requires.map((r, i) => <li key={i} className="text-[11px] leading-snug text-slate-600">· {r}</li>)}
                        </ul>
                      </div>
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Does not protect against</p>
                        <ul className="mt-0.5 space-y-0.5">
                          {d.threats.map((r, i) => <li key={i} className="text-[11px] leading-snug text-slate-600">· {r}</li>)}
                        </ul>
                      </div>
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Cost, and when to decide</p>
                        <p className="mt-0.5 text-[11px] leading-snug text-slate-600"><Plain>{d.cost}</Plain></p>
                        <p className="mt-1 text-[11px] font-medium leading-snug text-rose-700"><Plain>{d.decideBy}</Plain></p>
                      </div>
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* ── Feasibility ─────────────────────────────────────────────────── */}
      <section className={`${card} p-4`}>
        <h3 className="font-bold text-slate-900">Can the data carry it?</h3>
        <p className="mb-3 max-w-3xl text-xs leading-relaxed text-slate-500">
          Deliberately blunt. Marking a station pre-live does nothing on its own — the institution has to be
          sending its monthly figures for that station too.
        </p>
        <div className="space-y-1.5">
          {checks.map((c, i) => (
            <div key={i} className={`flex items-start gap-2 rounded-lg p-2.5 ${c.ok ? "bg-emerald-50" : "bg-amber-50"}`}>
              {c.ok ? (
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
              ) : (
                <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
              )}
              <div className="min-w-0">
                <p className={`text-sm font-medium ${c.ok ? "text-emerald-900" : "text-amber-900"}`}>{c.label}</p>
                <p className={`text-xs leading-relaxed ${c.ok ? "text-emerald-800" : "text-amber-800"}`}>{c.detail}</p>
              </div>
            </div>
          ))}
        </div>

        <label className="mt-3 block max-w-xs">
          <span className="mb-1 block text-xs font-medium text-slate-700">Months of monthly baseline requested</span>
          <input
            type="number"
            min={0}
            max={36}
            className={input}
            value={state.baselineMonths}
            disabled={!canEdit}
            onChange={(e) => onChange({ ...state, baselineMonths: Number(e.target.value) || 0 })}
          />
          <span className="mt-1 block text-[11px] leading-snug text-slate-500">
            Eight is the practical minimum for interrupted time series, twelve is comfortable, twenty-four also
            gives you the seasonal shape.
          </span>
        </label>
      </section>

      {/* ── Sites ───────────────────────────────────────────────────────── */}
      <section className={`${card} p-4`}>
        <h3 className="font-bold text-slate-900">Sites</h3>
        <p className="mb-3 max-w-3xl text-xs leading-relaxed text-slate-500">
          A station is only a control while it has no service. Marking the stations that have not gone live yet,
          and getting their monthly figures flowing, is what turns a staged rollout into a stepped wedge — and it
          expires the moment each one goes live.
        </p>
        <div className="space-y-1.5">
          {stations.map((name) => {
            const cfg = state.sites[name] ?? { role: "excluded" as SiteRole };
            const hasData = stationsWithData.has(name);
            return (
              <div key={name} className="flex flex-wrap items-center gap-2 rounded-lg bg-slate-50 px-3 py-2">
                <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-800">{name}</span>

                <select
                  className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs text-slate-800"
                  value={cfg.role}
                  disabled={!canEdit}
                  onChange={(e) => setSite(name, { role: e.target.value as SiteRole })}
                >
                  {SITE_ROLES.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>

                {cfg.role === "live" && (
                  <input
                    type="date"
                    className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs text-slate-800"
                    value={cfg.goLive ?? ""}
                    disabled={!canEdit}
                    onChange={(e) => setSite(name, { goLive: e.target.value })}
                    title="Go-live date"
                  />
                )}

                {cfg.role === "pre-live" && (
                  <Chip className={hasData ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}>
                    {hasData ? "data arriving" : "no data yet"}
                  </Chip>
                )}
                {cfg.role === "live" && !cfg.goLive && (
                  <Chip className="bg-amber-100 text-amber-800">
                    <Clock className="mr-0.5 h-2.5 w-2.5" /> no go-live date
                  </Chip>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* ── Cohort ──────────────────────────────────────────────────────── */}
      <section className={`${card} p-4`}>
        <h3 className="font-bold text-slate-900">Cohort — who counts as in?</h3>
        <p className="mb-3 max-w-3xl text-xs leading-relaxed text-slate-500">
          Currently implicit, and the three answers give materially different resolution rates. State it once and
          never quietly change it.
        </p>
        <div className="space-y-2">
          {COHORTS.map((c) => {
            const chosen = state.cohort === c.id;
            return (
              <button
                key={c.id}
                onClick={() => canEdit && c.measurable && onChange({ ...state, cohort: c.id })}
                disabled={!canEdit || !c.measurable}
                className={`w-full rounded-xl border p-3 text-left transition ${
                  chosen ? "border-slate-900 bg-slate-50 ring-2 ring-slate-900/10" : "border-slate-200 bg-white"
                } ${c.measurable ? "hover:border-slate-300" : "opacity-70"}`}
              >
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-semibold text-slate-900">{c.name}</span>
                  {!c.measurable && <Chip className="bg-slate-200 text-slate-600">not measurable</Chip>}
                  {chosen && <Chip className="bg-slate-900 text-white">Chosen</Chip>}
                </div>
                <p className="mt-0.5 text-xs text-slate-600"><Plain>{c.definition}</Plain></p>
                <div className="mt-1.5 grid gap-2 sm:grid-cols-2">
                  <p className="text-[11px] leading-relaxed text-slate-600"><strong className="text-slate-700">For:</strong> <Plain>{c.argument}</Plain></p>
                  <p className="text-[11px] leading-relaxed text-slate-600"><strong className="text-slate-700">Against:</strong> <Plain>{c.problem}</Plain></p>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* ── Pre-specified decisions ─────────────────────────────────────── */}
      <section className={`${card} p-4`}>
        <h3 className="font-bold text-slate-900">Decide now, in writing</h3>
        <p className="mb-3 max-w-3xl text-xs leading-relaxed text-slate-500">
          Each of these is defensible decided in advance and indefensible decided afterwards, however analytically
          correct the late answer is.
        </p>
        <div className="space-y-3">
          {DECISIONS.map((d) => {
            const value = state.decisions[d.id];
            return (
              <div key={d.id} className="rounded-xl border border-slate-200 p-3">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-sm font-semibold text-slate-900">{d.name}</span>
                  {d.timeCritical && !value?.text && <Chip className="bg-rose-100 text-rose-700">Time-critical</Chip>}
                  {value?.decidedAt && <Chip className="bg-emerald-100 text-emerald-800">decided {value.decidedAt}</Chip>}
                </div>
                <p className="mt-0.5 text-xs text-slate-600">{d.question}</p>
                <p className="mt-1 text-[11px] leading-relaxed text-slate-500">{d.why}</p>
                <p className="mt-1 text-[11px] leading-relaxed text-rose-700">If left late: {d.ifLate}</p>

                <div className="mt-2 flex flex-wrap items-start gap-2">
                  <textarea
                    className={`${input} min-h-[54px] flex-1 text-xs`}
                    placeholder={d.suggestion}
                    value={value?.text ?? ""}
                    disabled={!canEdit}
                    onChange={(e) =>
                      onChange({
                        ...state,
                        decisions: {
                          ...state.decisions,
                          [d.id]: { text: e.target.value, decidedAt: value?.decidedAt ?? new Date().toISOString().slice(0, 10) },
                        },
                      })
                    }
                  />
                  {!value?.text && canEdit && (
                    <button
                      onClick={() =>
                        onChange({
                          ...state,
                          decisions: { ...state.decisions, [d.id]: { text: d.suggestion, decidedAt: new Date().toISOString().slice(0, 10) } },
                        })
                      }
                      className="flex shrink-0 items-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
                    >
                      Use suggestion <ChevronRight className="h-3 w-3" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
