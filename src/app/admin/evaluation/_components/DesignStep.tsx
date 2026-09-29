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

import { CheckCircle2, ChevronRight, Circle, Clock, FileDown, TriangleAlert, Undo2, XCircle } from "lucide-react";
import {
  COHORTS, DECISIONS, DESIGNS, DESIGN_BY_ID, SITE_ROLES, feasibility, supportedDesign,
  type DesignState, type SiteRole,
} from "@/lib/evaluation/design";
import { baselineRequest } from "@/lib/evaluation/export";
import { Chip, DesignDiagram, Plain, card, input } from "./ui";

const MONTHS_IS = ["janúar", "febrúar", "mars", "apríl", "maí", "júní", "júlí", "ágúst", "september", "október", "nóvember", "desember"];

// "2026-09-29" -> "29. september 2026"
const isDate = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return y && m && d ? `${d}. ${MONTHS_IS[m - 1]} ${y}` : iso;
};

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
        <h2 className="text-base font-bold text-slate-900">Rannsóknarsnið</h2>
        <p className="mt-1 max-w-3xl text-sm leading-relaxed text-slate-600">
          Hér ákveður þú hvernig matið er sett upp, áður en gögnin berast. Sniðið ræður því hvað tölurnar mega
          segja. Ef ekkert er ákveðið verður niðurstaðan samanburður fyrir og eftir á einni stöð, sem er veikasta
          sniðið: undirliggjandi þróun, árstíðasveiflur og aðhvarf að meðaltali geta þá skýrt breytinguna.
        </p>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-600">
          Sterkara snið kostar nánast ekkert, en tvennt þarf að gera strax. Biddu HSU um baseline{" "}
          <strong className="text-slate-800">fyrir hvern mánuð</strong>, ekki sem ársheildartölu. Og byrjaðu að
          safna sömu tölum á stöðvum þar sem þjónustan er{" "}
          <strong className="text-slate-800">ekki enn hafin</strong>. Þá verða þær samanburðarstöðvar fyrir hinar.
          Hvorugt er hægt að gera eftir á.
        </p>
      </div>

      {overclaiming && (
        <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3">
          <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
          <div>
            <p className="text-sm font-semibold text-rose-900">
              Þú valdir &bdquo;{DESIGN_BY_ID[state.design].plainName.toLowerCase()}&ldquo; en gögnin styðja aðeins{" "}
              &bdquo;{DESIGN_BY_ID[best].plainName.toLowerCase()}&ldquo;
            </p>
            <p className="mt-0.5 text-xs leading-relaxed text-rose-800">
              Annaðhvort safnar þú því sem sterkara sniðið þarf (sjá hér að neðan hvað vantar) eða notar veikara
              sniðið í skýrslunni. Snið sem er aðeins valið hér, en ekki stutt gögnum, verður samt kynnt í skýrslu
              eins og það standist.
            </p>
          </div>
        </div>
      )}

      {/* ── Design ──────────────────────────────────────────────────────── */}
      <section className={`${card} p-4`}>
        <h3 className="font-bold text-slate-900">Veldu snið</h3>
        <p className="mb-3 max-w-3xl text-xs leading-relaxed text-slate-500">
          Fjögur hefðbundin snið, það veikasta efst. Fyrirsögnin segir hvað þú gerir í raun. Fræðiheitið stendur
          fyrir neðan, fyrir siðanefnd og tímarit, en þú þarft það ekki til að velja.
        </p>
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
                      <span className="text-sm font-semibold text-slate-900">{d.plainName}</span>
                      <span className="flex gap-0.5" title={`Styrkur ${d.strength} af 4`}>
                        {[1, 2, 3, 4].map((i) => (
                          <span key={i} className={`h-1.5 w-4 rounded-full ${i <= d.strength ? STRENGTH_BAR[d.strength] : "bg-slate-200"}`} />
                        ))}
                      </span>
                      {achievable && <Chip className="bg-emerald-100 text-emerald-800">Gögnin styðja þetta</Chip>}
                    </div>
                    <p className="mt-0.5 text-[11px] text-slate-400">
                      Fræðiheiti, fyrir siðanefnd og greinaskrif: <span className="font-medium text-slate-500">{d.name}</span>
                    </p>

                    <p className="mt-1.5 text-xs leading-relaxed text-slate-600"><Plain>{d.whatYouDo}</Plain></p>

                    <div className="mt-2 rounded-lg bg-slate-50 p-2">
                      <DesignDiagram design={d.id} />
                    </div>

                    <p className="mt-2 text-xs font-medium text-slate-700">Hvað má fullyrða: <Plain>{d.claim}</Plain></p>

                    <div className="mt-2 grid gap-2 sm:grid-cols-3">
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Hvað þarf</p>
                        <ul className="mt-0.5 space-y-0.5">
                          {d.requires.map((r, i) => <li key={i} className="text-[11px] leading-snug text-slate-600">· {r}</li>)}
                        </ul>
                      </div>
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Hvað getur enn blekkt</p>
                        <ul className="mt-0.5 space-y-0.5">
                          {d.threats.map((r, i) => <li key={i} className="text-[11px] leading-snug text-slate-600">· {r}</li>)}
                        </ul>
                      </div>
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Kostnaður og frestur</p>
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
        <h3 className="font-bold text-slate-900">Standa gögnin undir þessu?</h3>
        <p className="mb-3 max-w-3xl text-xs leading-relaxed text-slate-500">
          Að merkja stöð sem samanburðarstöð dugar ekki eitt og sér. HSU þarf líka að senda mánaðartölur fyrir
          þá stöð.
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

        <div className="mt-3 rounded-lg border border-cyan-200 bg-cyan-50/60 p-3">
          <p className="text-sm font-semibold text-slate-900">Tölurnar frá því fyrir upphaf þjónustu eru ekki glataðar</p>
          <p className="mt-1 text-xs leading-relaxed text-slate-600">
            Öll samskipti sem HSU skráði eru í Sögu, kóðuð, mörg ár aftur í tímann. Það má sækja þau afturskyggnt
            hvenær sem er. Það sem rennur út er velviljinn til að keyra fyrirspurnina, og samanburðarstöðvarnar:
            stöð hættir að nýtast til samanburðar daginn sem þjónustan hefst þar.
          </p>
          <button
            onClick={() => {
              const live = stations
                .filter((n) => state.sites[n]?.role === "live")
                .map((n) => ({ name: n, goLive: state.sites[n]?.goLive }));
              const doc = baselineRequest({
                institution: "HSU",
                liveStations: live.length ? live : [{ name: "Vestmannaeyjar", goLive: "2026-08-17" }],
                comparisonStations: stations.filter((n) => state.sites[n]?.role === "pre-live"),
                monthsBefore: state.baselineMonths,
              });
              const blob = new Blob([doc], { type: "text/markdown;charset=utf-8" });
              const a = document.createElement("a");
              a.href = URL.createObjectURL(blob);
              a.download = "beidni-um-baseline-gogn.md";
              a.click();
              URL.revokeObjectURL(a.href);
            }}
            className="mt-2 flex items-center gap-1.5 rounded-lg bg-slate-800 px-3 py-2 text-sm font-medium text-white transition hover:bg-slate-900"
          >
            <FileDown className="h-4 w-4" /> Útbúa beiðni til HSU
          </button>
          <p className="mt-1.5 text-[11px] leading-relaxed text-slate-500">
            Beiðnin er fyllt út sjálfkrafa eftir stöðvum og dagsetningum hér að neðan. Þar kemur fram hvaða tölur,
            mánuði og stöðvar er beðið um, og að aðeins sé beðið um fjöldatölur en engin sjúklingagögn. Þess
            vegna telst þetta gæðaverkefni en ekki vísindarannsókn.
          </p>
        </div>

        <label className="mt-3 block max-w-xs">
          <span className="mb-1 block text-xs font-medium text-slate-700">Fjöldi mánaða í baseline</span>
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
            Átta mánuðir eru lágmark fyrir rofna tímaröð (interrupted time series). Tólf duga vel. Tuttugu og
            fjórir sýna líka árstíðasveiflur.
          </span>
        </label>
      </section>

      {/* ── Sites ───────────────────────────────────────────────────────── */}
      <section className={`${card} p-4`}>
        <h3 className="font-bold text-slate-900">Stöðvar</h3>
        <p className="mb-3 max-w-3xl text-xs leading-relaxed text-slate-500">
          Stöð nýtist aðeins til samanburðar meðan þjónustan er ekki hafin þar. Merktu stöðvarnar sem bíða og
          fáðu mánaðartölur þeirra. Þannig verður áfangaskipt innleiðing að þrepaskiptri innleiðingu (stepped
          wedge). Tækifærið hverfur um leið og þjónustan hefst á hverri stöð.
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
                    title="Upphafsdagur þjónustu"
                  />
                )}

                {cfg.role === "pre-live" && (
                  <Chip className={hasData ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}>
                    {hasData ? "gögn berast" : "engin gögn enn"}
                  </Chip>
                )}
                {cfg.role === "live" && !cfg.goLive && (
                  <Chip className="bg-amber-100 text-amber-800">
                    <Clock className="mr-0.5 h-2.5 w-2.5" /> vantar upphafsdag
                  </Chip>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* ── Cohort ──────────────────────────────────────────────────────── */}
      <section className={`${card} p-4`}>
        <h3 className="font-bold text-slate-900">Rannsóknarþýði: hverjir teljast með?</h3>
        <p className="mb-3 max-w-3xl text-xs leading-relaxed text-slate-500">
          Svörin þrjú gefa ólíkt hlutfall erinda sem eru afgreidd í fjarþjónustu. Ákveddu þetta einu sinni og
          breyttu því ekki í kyrrþey.
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
                  {!c.measurable && <Chip className="bg-slate-200 text-slate-600">ekki mælanlegt</Chip>}
                  {chosen && <Chip className="bg-slate-900 text-white">Valið</Chip>}
                </div>
                <p className="mt-0.5 text-xs text-slate-600"><Plain>{c.definition}</Plain></p>
                <div className="mt-1.5 grid gap-2 sm:grid-cols-2">
                  <p className="text-[11px] leading-relaxed text-slate-600"><strong className="text-slate-700">Með:</strong> <Plain>{c.argument}</Plain></p>
                  <p className="text-[11px] leading-relaxed text-slate-600"><strong className="text-slate-700">Á móti:</strong> <Plain>{c.problem}</Plain></p>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* ── Pre-specified decisions ─────────────────────────────────────── */}
      <section className={`${card} p-4`}>
        <h3 className="font-bold text-slate-900">Ákveða fyrir fram</h3>
        <p className="mb-3 max-w-3xl text-xs leading-relaxed text-slate-500">
          Skráðu þessar ákvarðanir áður en tölurnar berast. Ákvörðun sem er tekin eftir á er ekki trúverðug,
          hversu skynsamleg sem hún er. Þú getur breytt eða dregið ákvörðun til baka, en breytingin er merkt og
          báðar dagsetningar sjást.
        </p>
        <div className="space-y-3">
          {DECISIONS.map((d) => {
            const value = state.decisions[d.id];
            return (
              <div key={d.id} className="rounded-xl border border-slate-200 p-3">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-sm font-semibold text-slate-900">{d.name}</span>
                  {d.timeCritical && !value?.text && <Chip className="bg-rose-100 text-rose-700">Má ekki bíða</Chip>}
                  {value?.decidedAt && <Chip className="bg-emerald-100 text-emerald-800">ákveðið {isDate(value.decidedAt)}</Chip>}
                  {value?.revisedAt && value.revisedAt !== value.decidedAt && (
                    <Chip className="bg-amber-100 text-amber-800">breytt {isDate(value.revisedAt)}</Chip>
                  )}
                </div>
                <p className="mt-0.5 text-xs text-slate-600">{d.question}</p>
                <p className="mt-1 text-[11px] leading-relaxed text-slate-500">{d.why}</p>
                <p className="mt-1 text-[11px] leading-relaxed text-rose-700">Ef þetta bíður: {d.ifLate}</p>

                <div className="mt-2 flex flex-wrap items-start gap-2">
                  <textarea
                    className={`${input} min-h-[54px] flex-1 text-xs`}
                    placeholder={d.suggestion}
                    value={value?.text ?? ""}
                    disabled={!canEdit}
                    onChange={(e) => {
                      const today = new Date().toISOString().slice(0, 10);
                      onChange({
                        ...state,
                        decisions: {
                          ...state.decisions,
                          [d.id]: {
                            text: e.target.value,
                            decidedAt: value?.decidedAt ?? today,
                            // Only counts as a revision if something was
                            // already decided on an earlier day.
                            ...(value?.decidedAt && value.decidedAt !== today ? { revisedAt: today } : {}),
                          },
                        },
                      });
                    }}
                  />
                  {canEdit && !value?.text && (
                    <button
                      onClick={() =>
                        onChange({
                          ...state,
                          decisions: { ...state.decisions, [d.id]: { text: d.suggestion, decidedAt: new Date().toISOString().slice(0, 10) } },
                        })
                      }
                      className="flex shrink-0 items-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
                    >
                      Nota tillögu <ChevronRight className="h-3 w-3" />
                    </button>
                  )}
                  {canEdit && value?.text && (
                    <button
                      onClick={() => {
                        const next = { ...state.decisions };
                        delete next[d.id];
                        onChange({ ...state, decisions: next });
                      }}
                      title="Fjarlægja ákvörðunina. Hún telst þá óákveðin."
                      className="flex shrink-0 items-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-600 transition hover:border-rose-300 hover:bg-rose-50 hover:text-rose-700"
                    >
                      <Undo2 className="h-3 w-3" /> Draga til baka
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
