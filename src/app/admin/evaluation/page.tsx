"use client";

// Service evaluation — the programme, in the order you actually work through it.
//
// Overview, then four numbered steps. The order matters and is not cosmetic:
// you cannot sensibly set anything up until the modules are chosen, and the
// fields you are asked for each month are derived from that same choice. The
// previous version had four peer tabs with no order, which left no answer to
// the only question a new user has — what do I do first.

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle, BarChart3, BookOpen, ClipboardList, Clock, Download, ExternalLink, FileText,
  FlaskConical, LayoutGrid, Loader2, Microscope, Presentation, Settings2, Table2,
} from "lucide-react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import ModulePicker from "./_components/ModulePicker";
import Setup from "./_components/Setup";
import DataEntry from "./_components/DataEntry";
import ResultsView from "./_components/Results";
import Library from "./_components/Library";
import DesignStep from "./_components/DesignStep";
import NewStation from "./_components/NewStation";
import { EMPTY_IMPORT_CONFIG, type ImportConfig } from "@/lib/evaluation/medalia";
import { ACCENT, Chip, ProgressBars, card, input } from "./_components/ui";
import {
  enabledModules, headlines, progress, readiness, requiredDocuments, timeCriticalOutstanding,
  type UploadedDoc,
} from "@/lib/evaluation/programme";
import {
  DEFAULT_ASSUMPTIONS, EMPTY_PROGRAMME, type Assumptions, type Programme,
} from "@/lib/evaluation/types";
import {
  EMPTY_ROSTER, emptyMonth, lastMonths, monthISO, total, totalRoster,
  type MonthRow, type RosterMonth,
} from "@/lib/evaluation/totals";
import { toCSV, toReport } from "@/lib/evaluation/export";
import { DEFAULT_DESIGN_STATE, codesFor, isPilotRow, type DesignState } from "@/lib/evaluation/design";

type Step = "overview" | "library" | "design" | "modules" | "setup" | "data" | "results";

/** What you actually do. The proper names live on the Study design step, next
 *  to each option, because that is where they are needed — not on a summary
 *  card somebody glances at. */
const DESIGN_LABEL: Record<DesignState["design"], string> = {
  "before-after": "Borið saman við stöðuna áður",
  its: "Fylgst með þróun mánuð fyrir mánuð",
  controlled: "Borið saman við stöð sem er ekki byrjuð",
  "stepped-wedge": "Stöðvar byrja hver á eftir annarri",
};

/** Icelandic singular after numbers ending in 1, except 11. */
const pl = (n: number, one: string, many: string) => (n % 10 === 1 && n % 100 !== 11 ? one : many);

const STEPS: { id: Step; label: string; icon: typeof LayoutGrid; n?: number }[] = [
  { id: "overview", label: "Yfirlit", icon: LayoutGrid },
  { id: "library", label: "Safn", icon: BookOpen },
  { id: "design", label: "Rannsóknarsnið", icon: Microscope, n: 1 },
  { id: "modules", label: "Rannsóknarþættir", icon: FlaskConical, n: 2 },
  { id: "setup", label: "Undirbúningur", icon: ClipboardList, n: 3 },
  { id: "data", label: "Gögn", icon: Table2, n: 4 },
  { id: "results", label: "Niðurstöður", icon: BarChart3, n: 5 },
];

/** The process in one line per step — shown in the header so a first-time
 *  reader knows what the five tabs are for before opening any of them. */
const HOW: { id: Step; text: string }[] = [
  { id: "design", text: "Ákveða við hvað er borið saman" },
  { id: "modules", text: "Velja hvað er mælt" },
  { id: "setup", text: "Gera allt klárt fyrir fyrsta dag" },
  { id: "data", text: "Skrá tölur úr könnun, Sögu og Medalia" },
  { id: "results", text: "Skýrslur eftir 6 og 12 mánuði" },
];

export default function EvaluationPage() {
  const [step, setStep] = useState<Step>("overview");
  const [months, setMonths] = useState<MonthRow[]>([]);
  const [programme, setProgramme] = useState<Programme>(EMPTY_PROGRAMME);
  const [assumptions, setAssumptions] = useState<Assumptions>(DEFAULT_ASSUMPTIONS);
  const [documents, setDocuments] = useState<UploadedDoc[]>([]);
  const [design, setDesign] = useState<DesignState>(DEFAULT_DESIGN_STATE);
  const [importConfig, setImportConfig] = useState<ImportConfig>(EMPTY_IMPORT_CONFIG);
  const [stations, setStations] = useState<{ institution: string; short: string; stations: string[] }[]>([]);
  const [rosterRaw, setRosterRaw] = useState<{ months: RosterMonth[]; activeDoctors: number }>({ months: [], activeDoctors: 0 });
  const [loading, setLoading] = useState(true);
  const [unavailable, setUnavailable] = useState(false);
  const [admin, setAdmin] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  const [station, setStation] = useState("");
  const [windowMonths, setWindowMonths] = useState(12);
  const [entryStation, setEntryStation] = useState("");
  const [entryMonth, setEntryMonth] = useState(monthISO(-1));
  const [draft, setDraft] = useState<MonthRow | null>(null);

  const headers = async (): Promise<Record<string, string>> => {
    const { data: { session } } = await supabase.auth.getSession();
    return { "Content-Type": "application/json", Authorization: session?.access_token ? `Bearer ${session.access_token}` : "" };
  };
  const authOnly = async (): Promise<Record<string, string>> => {
    const { data: { session } } = await supabase.auth.getSession();
    return { Authorization: session?.access_token ? `Bearer ${session.access_token}` : "" };
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/evaluation", { headers: await headers() });
      const j = await res.json();
      if (j.ok) {
        setMonths(j.months ?? []);
        setProgramme({ ...EMPTY_PROGRAMME, ...(j.programme ?? {}) });
        setAssumptions({ ...DEFAULT_ASSUMPTIONS, ...(j.assumptions ?? {}) });
        setDocuments(j.documents ?? []);
        setDesign({ ...DEFAULT_DESIGN_STATE, ...(j.design ?? {}) });
        setImportConfig({ ...EMPTY_IMPORT_CONFIG, ...(j.importConfig ?? {}) });
        setStations(j.stations ?? []);
        setRosterRaw(j.roster ?? { months: [], activeDoctors: 0 });
        setUnavailable(!!j.unavailable);
        setAdmin(!!j.admin);
        const first = j.stations?.[0]?.stations?.[0] ?? "";
        setStation((s) => s || first);
        setEntryStation((s) => s || first);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(null), 4000); return () => clearTimeout(t); }, [toast]);

  const allStations = useMemo(() => stations.flatMap((i) => i.stations), [stations]);
  const institutionOf = useCallback(
    (s: string) => stations.find((i) => i.stations.includes(s))?.institution ?? "hsu",
    [stations],
  );

  const windowIso = useMemo(() => lastMonths(windowMonths), [windowMonths]);
  const selected = useMemo(
    () => months.filter((m) =>
      (station === "__all" || m.station === station) && windowIso.includes(m.month.slice(0, 10)) && isPilotRow(m, design)),
    [months, station, windowIso, design],
  );
  const totals = useMemo(() => total(selected), [selected]);
  // Staffing is service-wide: filtered by period only, never by station,
  // because the same doctor covers every site.
  const roster = useMemo(
    () => (rosterRaw.months.length ? totalRoster(rosterRaw.months.filter((r) => windowIso.includes(r.month)), rosterRaw.activeDoctors) : EMPTY_ROSTER),
    [rosterRaw, windowIso],
  );
  const codes = useMemo(() => codesFor(months, station, design), [months, station, design]);
  const ctx = useMemo(() => ({ t: totals, roster, a: assumptions, design, codes }), [totals, roster, assumptions, design, codes]);

  const ready = useMemo(() => readiness(programme, documents, ctx), [programme, documents, ctx]);
  const prog = useMemo(() => progress(ready), [ready]);
  const urgent = useMemo(() => timeCriticalOutstanding(programme), [programme]);
  const tops = useMemo(() => headlines(programme, ctx), [programme, ctx]);

  useEffect(() => {
    if (!entryStation || !entryMonth) return;
    const existing = months.find((m) => m.station === entryStation && m.month.slice(0, 10) === entryMonth);
    setDraft(existing ? { ...existing } : emptyMonth(institutionOf(entryStation), entryStation, entryMonth));
  }, [entryStation, entryMonth, months, institutionOf]);

  const post = async (body: unknown, ok: string) => {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/evaluation", { method: "POST", headers: await headers(), body: JSON.stringify(body) });
      const j = await res.json();
      setToast(j.ok ? { kind: "ok", text: ok } : { kind: "err", text: j.error ?? "Mistókst" });
      if (j.ok) await load();
      return !!j.ok;
    } finally {
      setSaving(false);
    }
  };

  const saveProgramme = async (p: Programme) => {
    setProgramme(p);
    await fetch("/api/admin/evaluation", { method: "POST", headers: await headers(), body: JSON.stringify({ action: "programme", programme: p }) });
  };

  const saveDesign = async (d: DesignState) => {
    setDesign(d);
    await fetch("/api/admin/evaluation", { method: "POST", headers: await headers(), body: JSON.stringify({ action: "design", design: d }) });
  };

  const saveAssumptions = async (a: Assumptions) => {
    setAssumptions(a);
    await fetch("/api/admin/evaluation", { method: "POST", headers: await headers(), body: JSON.stringify({ action: "assumptions", assumptions: a }) });
  };

  const upload = async (moduleId: string, docId: string, file: File) => {
    const fd = new FormData();
    fd.append("file", file);
    fd.append("module_id", moduleId);
    fd.append("doc_id", docId);
    const res = await fetch("/api/admin/evaluation/documents", { method: "POST", headers: await authOnly(), body: fd });
    const j = await res.json();
    setToast(j.ok ? { kind: "ok", text: `${file.name} hlaðið upp.` } : { kind: "err", text: j.error ?? "Ekki tókst að hlaða upp" });
    if (j.ok) await load();
  };

  const openDoc = async (path: string) => {
    const res = await fetch(`/api/admin/evaluation/documents?path=${encodeURIComponent(path)}`, { headers: await authOnly() });
    const j = await res.json();
    if (j.ok) window.open(j.url, "_blank", "noopener");
    else setToast({ kind: "err", text: j.error ?? "Ekki tókst að opna skjalið" });
  };

  const deleteDoc = async (id: string) => {
    const res = await fetch(`/api/admin/evaluation/documents?id=${id}`, { method: "DELETE", headers: await authOnly() });
    const j = await res.json();
    setToast(j.ok ? { kind: "ok", text: "Skjali eytt." } : { kind: "err", text: j.error ?? "Mistókst" });
    if (j.ok) await load();
  };

  const download = (name: string, body: string, mime: string) => {
    const blob = new Blob([body], { type: `${mime};charset=utf-8` });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = name;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const periodLabel = `Síðustu ${windowMonths} mánuðir`;
  const stationLabel = station === "__all" ? "allar stöðvar" : station;

  const makeDeck = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/evaluation", {
        method: "POST",
        headers: await headers(),
        body: JSON.stringify({ action: "deck", deck: { station, period: periodLabel, monthsIso: windowIso } }),
      });
      const j = await res.json();
      if (j.ok) {
        setToast({ kind: "ok", text: `Kynning búin til, ${j.deck.slides} glærur.` });
        window.open(`/admin/presentations/${j.deck.id}`, "_blank", "noopener");
      } else {
        setToast({ kind: "err", text: j.error ?? "Ekki tókst að búa til kynninguna" });
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 p-8 text-sm text-slate-500">
        <Loader2 className="h-4 w-4 animate-spin" /> Hleð inn matinu…
      </div>
    );
  }

  const modules = enabledModules(programme);
  const timeStudyOn = modules.some((m) => m.id === "time-study");
  const docsNeeded = requiredDocuments(programme).filter((d) => d.doc.required).length;
  const docsHave = documents.length;

  return (
    <div className="mx-auto max-w-6xl space-y-5 p-4 sm:p-6">
      <header className="overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-cyan-900 p-6 text-white shadow-lg">
        <h1 className="text-2xl font-bold tracking-tight">Mat á þjónustunni</h1>
        <p className="mt-1 max-w-3xl text-sm leading-relaxed text-slate-200">
          Mat á fjarlækningum HSU áður en þjónustan nær til næstu stöðvar. Matið svarar þremur spurningum
          læknisfræðilegs ráðgjafa: Virkar þjónustan fyrir sjúklinginn? Virkar hún fyrir heilbrigðiskerfið? Er hún örugg?
        </p>
        <ol className="mt-4 grid gap-2 sm:grid-cols-5">
          {HOW.map((h, i) => (
            <li key={h.id}>
              <button
                onClick={() => setStep(h.id)}
                className="flex h-full w-full items-start gap-2 rounded-lg bg-white/10 p-2.5 text-left text-xs leading-snug text-slate-100 transition hover:bg-white/20"
              >
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/20 text-[11px] font-bold">{i + 1}</span>
                <span>
                  <span className="block font-semibold text-white">{STEPS.find((x) => x.id === h.id)!.label}</span>
                  {h.text}
                </span>
              </button>
            </li>
          ))}
        </ol>
        <p className="mt-3 max-w-3xl text-xs leading-relaxed text-slate-400">
          Allar tölur hér eru samantektartölur: hver lína er fjöldi, aldrei einstaklingur. Þess vegna er matið
          gæðaverkefni en ekki vísindarannsókn og ekki þarf upplýst samþykki sjúklinga.
        </p>
      </header>

      {unavailable && (
        <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            Töflurnar eru ekki til enn. Keyrðu <code className="rounded bg-amber-100 px-1">supabase/evaluation-schema.sql</code>{" "}
            í SQL-ritli Supabase. Ekkert vistast fyrr en það hefur verið gert.
          </span>
        </div>
      )}

      <nav className="flex flex-wrap gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
        {STEPS.map((s) => {
          const Icon = s.icon;
          const active = step === s.id;
          return (
            <button
              key={s.id}
              onClick={() => setStep(s.id)}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition ${
                active ? "bg-slate-900 text-white shadow-sm" : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              {s.n && (
                <span className={`flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-bold ${
                  active ? "bg-white/20" : "bg-slate-200 text-slate-600"
                }`}>
                  {s.n}
                </span>
              )}
              <Icon className="h-4 w-4" />
              <span className="hidden sm:inline">{s.label}</span>
            </button>
          );
        })}
      </nav>

      {toast && (
        <div className={`rounded-xl p-3 text-sm ${toast.kind === "ok" ? "bg-emerald-50 text-emerald-800" : "bg-rose-50 text-rose-800"}`}>
          {toast.text}
        </div>
      )}

      {/* ── OVERVIEW ───────────────────────────────────────────────────────── */}
      {step === "overview" && (
        <div className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-[1fr_minmax(0,320px)]">
            <div className={`${card} p-4`}>
              <h2 className="text-base font-bold text-slate-900">Staðan</h2>
              <p className="mt-1 text-sm text-slate-600">
                {modules.length} {pl(modules.length, "rannsóknarþáttur valinn", "rannsóknarþættir valdir")} · {docsHave} af{" "}
                {docsNeeded} nauðsynlegum skjölum komin · gögn fyrir {months.length}{" "}
                {pl(months.length, "mánuð", "mánuði")} (stöð × mánuður)
              </p>
              <div className="mt-3">
                <ProgressBars {...prog} />
              </div>
            </div>

            {urgent.length > 0 ? (
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-4">
                <p className="flex items-center gap-2 text-sm font-semibold text-rose-900">
                  <Clock className="h-4 w-4" /> {urgent.length} {pl(urgent.length, "verkþáttur þolir", "verkþættir þola")} ekki bið
                </p>
                <p className="mt-1 text-xs leading-relaxed text-rose-800">
                  Þetta verður að gera áður en þjónustan hefst. Það sem ekki er skráð frá fyrsta degi er ekki hægt
                  að sækja eftir á.
                </p>
                <ul className="mt-2 space-y-0.5 text-xs text-rose-800">
                  {urgent.slice(0, 4).map((t) => <li key={t.key}>· {t.step.text}</li>)}
                  {urgent.length > 4 && <li className="text-rose-600">· og {urgent.length - 4} í viðbót</li>}
                </ul>
                <button onClick={() => setStep("setup")} className="mt-2 text-xs font-semibold text-rose-900 underline">
                  Opna undirbúning
                </button>
              </div>
            ) : (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                <p className="text-sm font-semibold text-emerald-900">Ekkert sem þolir ekki bið</p>
                <p className="mt-1 text-xs leading-relaxed text-emerald-800">
                  Það sem er eftir má bíða í viku án þess að gögn glatist.
                </p>
              </div>
            )}
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {tops.map(({ category, top }) => {
              const a = ACCENT[category.id];
              return (
                <div key={category.id} className={`relative overflow-hidden ${card} p-4`}>
                  <div className={`absolute inset-x-0 top-0 h-1 ${a.bar}`} />
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{category.name}</p>
                    {category.gate && <Chip className="bg-slate-800 text-white">Skilyrði</Chip>}
                  </div>
                  <p className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
                    {top?.value.value ?? <span className="text-base font-medium text-slate-400">Bíður gagna</span>}
                  </p>
                  <p className="text-xs text-slate-500">{top?.metric.name ?? category.question}</p>
                </div>
              );
            })}
          </div>

          <NewStation programme={programme} onOpenSetup={() => setStep("setup")} />

          <button
            onClick={() => setStep("design")}
            className={`${card} flex w-full items-center gap-3 p-4 text-left transition hover:border-slate-300`}
          >
            <Microscope className="h-5 w-5 shrink-0 text-slate-400" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-slate-900">
                Rannsóknarsnið: {DESIGN_LABEL[design.design]}
              </p>
              <p className="text-xs leading-relaxed text-slate-500">
                {design.baselineMonths} mánaða baseline ·{" "}
                {Object.values(design.sites).filter((x) => x.role === "pre-live").length} samanburðarstöðvar ·{" "}
                {Object.keys(design.decisions).filter((k) => design.decisions[k]?.text).length} af 6 ákvörðunum skráðar
              </p>
            </div>
            <span className="shrink-0 text-xs font-medium text-cyan-700">Skoða →</span>
          </button>

          <div className={`${card} p-4`}>
            <h2 className="flex items-center gap-2 text-base font-bold text-slate-900">
              <Settings2 className="h-4 w-4 text-slate-400" /> Staða rannsóknarþátta
            </h2>
            <p className="mt-1 max-w-3xl text-sm text-slate-600">
              Hvað er hægt að fullyrða í dag og hvað vantar upp á hitt.
            </p>
            <div className="mt-3 space-y-1.5">
              {ready.map((r) => (
                <div key={r.module.id} className="flex flex-wrap items-center gap-2 rounded-lg bg-slate-50 px-3 py-2">
                  <span className={`h-2 w-2 shrink-0 rounded-full ${r.ready ? "bg-emerald-500" : r.blocked ? "bg-slate-300" : "bg-amber-400"}`} />
                  <span className="min-w-0 flex-1 truncate text-sm text-slate-800">{r.module.name}</span>
                  <span className="shrink-0 text-xs tabular-nums text-slate-500">
                    {r.steps.done}/{r.steps.total} verkþættir
                    {r.docs.total > 0 && ` · ${r.docs.done}/${r.docs.total} skjöl`}
                    {` · ${r.metrics.live}/${r.metrics.total} mælikvarðar með gögn`}
                  </span>
                </div>
              ))}
              {!ready.length && <p className="py-4 text-center text-sm text-slate-400">Engir rannsóknarþættir valdir enn.</p>}
            </div>
          </div>

          <div className={`${card} p-4`}>
            <h2 className="text-base font-bold text-slate-900">Forsendur</h2>
            <p className="mt-1 max-w-3xl text-sm leading-relaxed text-slate-600">
              {timeStudyOn
                ? "Vinnuléttir er reiknaður sem afgreidd erindi sinnum mínútur, svo forsendan er hluti af fullyrðingunni. Hún verður að vera sýnileg og auðvelt að verja hana."
                : "Viðmiðið sem svartími er borinn saman við."}
            </p>
            <div className="mt-3 grid gap-3 sm:grid-cols-4">
              {(([
                ["responseTargetMinutes", "Loforð um svartíma (mín.)"],
                ...(timeStudyOn ? [
                  ["minutesSaved", "Mínútur sparaðar á erindi"],
                  ["minutesSpent", "Mínútur í að beina erindi til okkar"],
                  ["hoursPerClinicDay", "Klukkustundir í vinnudegi"],
                ] : []),
              ]) as [keyof Assumptions, string][]).map(([key, label]) => (
                <label key={key} className="block">
                  <span className="mb-1 block text-xs font-medium text-slate-700">{label}</span>
                  <input
                    type="number"
                    min={0}
                    className={input}
                    value={assumptions[key] as number}
                    disabled={!admin}
                    onChange={(e) => void saveAssumptions({ ...assumptions, [key]: Number(e.target.value) || 0 })}
                  />
                </label>
              ))}
            </div>
            {timeStudyOn && (
              <label className="mt-3 flex items-start gap-2.5">
                <input
                  type="checkbox"
                  checked={assumptions.studyDone}
                  disabled={!admin}
                  onChange={(e) => void saveAssumptions({ ...assumptions, studyDone: e.target.checked })}
                  className="mt-0.5 h-4 w-4 rounded border-slate-300 text-cyan-600 focus:ring-cyan-500"
                />
                <span className="text-sm text-slate-700">
                  Tímamælingin hefur farið fram
                  <span className="mt-0.5 block text-xs text-slate-500">
                    Þar til hakað er hér er vinnuléttir merktur sem ágiskun og á ekki heima í kynningu.
                  </span>
                </span>
              </label>
            )}
          </div>
        </div>
      )}

      {step === "library" && <Library programme={programme} />}

      {step === "design" && (
        <DesignStep
          state={design}
          onChange={saveDesign}
          canEdit={admin}
          stations={allStations}
          monthsOfData={new Set(months.map((m) => m.month.slice(0, 10))).size}
          stationsWithData={new Set(months.map((m) => m.station))}
        />
      )}

      {step === "modules" && <ModulePicker programme={programme} onChange={saveProgramme} canEdit={admin} />}

      {step === "setup" && (
        <Setup
          programme={programme}
          documents={documents}
          canEdit={admin}
          onToggleStep={(key, done) => void saveProgramme({ ...programme, done: { ...programme.done, [key]: done } })}
          onUpload={upload}
          onDeleteDoc={deleteDoc}
          onOpenDoc={openDoc}
        />
      )}

      {step === "data" && (
        <DataEntry
          programme={programme}
          draft={draft}
          setDraft={(patch) => setDraft((d) => (d ? { ...d, ...patch } : d))}
          stations={allStations}
          station={entryStation}
          setStation={setEntryStation}
          month={entryMonth}
          setMonth={setEntryMonth}
          institution={institutionOf(entryStation)}
          saving={saving}
          canEdit={admin && !unavailable}
          onSave={async () => { if (draft) await post({ month: draft }, "Vistað."); }}
          onImport={async (rows) => { await post({ action: "import", months: rows }, `${rows.length} ${pl(rows.length, "mánuður fluttur", "mánuðir fluttir")} inn.`); }}
          importConfig={importConfig}
          onSaveImportConfig={async (c) => { setImportConfig(c); await post({ action: "import-config", importConfig: c }, "Stillingar vistaðar."); }}
          onSaveSaga={async (rows) => { await post({ action: "saga", months: rows }, `Tölur úr Sögu vistaðar fyrir ${rows.length} ${pl(rows.length, "mánuð", "mánuði")}.`); }}
          onSaveMedalia={async (rows) => { await post({ action: "import", months: rows }, `Tölur úr Medalia vistaðar fyrir ${rows.length} ${pl(rows.length, "mánuð", "mánuði")}.`); }}
          onImportReasons={async (rows) => { await post({ action: "reasons", reasons: rows }, `${rows.length} ${pl(rows.length, "ástæða frávísunar flutt", "ástæður frávísunar fluttar")} inn.`); }}
        />
      )}

      {step === "results" && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-end gap-3">
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-slate-700">Stöð</span>
              <select className={input} value={station} onChange={(e) => setStation(e.target.value)}>
                <option value="__all">Allar stöðvar</option>
                {allStations.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-slate-700">Tímabil</span>
              <select className={input} value={windowMonths} onChange={(e) => setWindowMonths(Number(e.target.value))}>
                {[3, 6, 12, 24].map((n) => <option key={n} value={n}>Síðustu {n} mánuðir</option>)}
              </select>
            </label>
            <p className="pb-2 text-xs text-slate-500">
              Gögn fyrir {totals.months} {pl(totals.months, "mánuð", "mánuði")}.{" "}
              <span className="text-slate-400">Mönnunartölur eiga við alla þjónustuna og breytast ekki eftir stöð.</span>
            </p>
          </div>
          <ResultsView programme={programme} ctx={ctx} />

          <section className={`${card} p-4`}>
            <h2 className="text-base font-bold text-slate-900">Skýrslur og útdráttur</h2>
            <p className="mt-1 max-w-3xl text-sm leading-relaxed text-slate-600">
              Áfangaskýrsla eftir 6 mánuði og lokaskýrsla eftir 12 mánuði. Veldu tímabilið hér að ofan og sæktu
              skýrsluna, hráu gögnin eða kynningu fyrir HSU.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                onClick={() => download(`mat-${stationLabel.replace(/\W+/g, "-")}.csv`, toCSV(selected), "text/csv")}
                disabled={!selected.length}
                className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
              >
                <Download className="h-4 w-4" /> Hrá gögn (CSV)
              </button>
              <button
                onClick={() => download(
                  `matsskyrsla-${stationLabel.replace(/\W+/g, "-")}.md`,
                  toReport(programme, ctx, { station: stationLabel, period: periodLabel, documents }),
                  "text/markdown",
                )}
                className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                <FileText className="h-4 w-4" /> Skýrsla (Markdown)
              </button>
              <button
                onClick={makeDeck}
                disabled={saving || !admin}
                className="flex items-center gap-1.5 rounded-lg bg-cyan-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-cyan-700 disabled:opacity-50"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Presentation className="h-4 w-4" />}
                Búa til kynningu
                <ExternalLink className="h-3 w-3 opacity-70" />
              </button>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-slate-500">
              Kynningin birtist í{" "}
              <Link href="/admin/presentations" className="font-medium text-cyan-700 hover:underline">Kynningum</Link>{" "}
              sem venjuleg glærusýning sem má breyta, með gröfum. Á undan lokaglærunni er glæra um takmarkanir, svo
              þær komi frá okkur en ekki áheyrendum.
            </p>
          </section>
        </div>
      )}
    </div>
  );
}
