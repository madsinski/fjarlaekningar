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
import { DEFAULT_DESIGN_STATE, type DesignState } from "@/lib/evaluation/design";

type Step = "overview" | "library" | "design" | "modules" | "setup" | "data" | "results";

const DESIGN_LABEL: Record<DesignState["design"], string> = {
  "before-after": "Uncontrolled before-and-after",
  its: "Interrupted time series",
  controlled: "Controlled before-and-after",
  "stepped-wedge": "Stepped wedge",
};

const STEPS: { id: Step; label: string; icon: typeof LayoutGrid; n?: number }[] = [
  { id: "overview", label: "Overview", icon: LayoutGrid },
  { id: "library", label: "Library", icon: BookOpen },
  { id: "design", label: "Study design", icon: Microscope, n: 1 },
  { id: "modules", label: "Choose modules", icon: FlaskConical, n: 2 },
  { id: "setup", label: "Set up", icon: ClipboardList, n: 3 },
  { id: "data", label: "Enter data", icon: Table2, n: 4 },
  { id: "results", label: "Results", icon: BarChart3, n: 5 },
];

export default function EvaluationPage() {
  const [step, setStep] = useState<Step>("overview");
  const [months, setMonths] = useState<MonthRow[]>([]);
  const [programme, setProgramme] = useState<Programme>(EMPTY_PROGRAMME);
  const [assumptions, setAssumptions] = useState<Assumptions>(DEFAULT_ASSUMPTIONS);
  const [documents, setDocuments] = useState<UploadedDoc[]>([]);
  const [design, setDesign] = useState<DesignState>(DEFAULT_DESIGN_STATE);
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
    () => months.filter((m) => (station === "__all" || m.station === station) && windowIso.includes(m.month.slice(0, 10))),
    [months, station, windowIso],
  );
  const totals = useMemo(() => total(selected), [selected]);
  // Staffing is service-wide: filtered by period only, never by station,
  // because the same doctor covers every site.
  const roster = useMemo(
    () => (rosterRaw.months.length ? totalRoster(rosterRaw.months.filter((r) => windowIso.includes(r.month)), rosterRaw.activeDoctors) : EMPTY_ROSTER),
    [rosterRaw, windowIso],
  );
  const ctx = useMemo(() => ({ t: totals, roster, a: assumptions, design }), [totals, roster, assumptions, design]);

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
      setToast(j.ok ? { kind: "ok", text: ok } : { kind: "err", text: j.error ?? "Failed" });
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
    setToast(j.ok ? { kind: "ok", text: `${file.name} uploaded.` } : { kind: "err", text: j.error ?? "Upload failed" });
    if (j.ok) await load();
  };

  const openDoc = async (path: string) => {
    const res = await fetch(`/api/admin/evaluation/documents?path=${encodeURIComponent(path)}`, { headers: await authOnly() });
    const j = await res.json();
    if (j.ok) window.open(j.url, "_blank", "noopener");
    else setToast({ kind: "err", text: j.error ?? "Could not open" });
  };

  const deleteDoc = async (id: string) => {
    const res = await fetch(`/api/admin/evaluation/documents?id=${id}`, { method: "DELETE", headers: await authOnly() });
    const j = await res.json();
    setToast(j.ok ? { kind: "ok", text: "Document removed." } : { kind: "err", text: j.error ?? "Failed" });
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

  const periodLabel = `Last ${windowMonths} months`;
  const stationLabel = station === "__all" ? "all stations" : station;

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
        setToast({ kind: "ok", text: `Deck created with ${j.deck.slides} slides.` });
        window.open(`/admin/presentations/${j.deck.id}`, "_blank", "noopener");
      } else {
        setToast({ kind: "err", text: j.error ?? "Could not create the deck" });
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 p-8 text-sm text-slate-500">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading the evaluation…
      </div>
    );
  }

  const modules = enabledModules(programme);
  const docsNeeded = requiredDocuments(programme).filter((d) => d.doc.required).length;
  const docsHave = documents.length;

  return (
    <div className="mx-auto max-w-6xl space-y-5 p-4 sm:p-6">
      <header className="overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-cyan-900 p-6 text-white shadow-lg">
        <h1 className="text-2xl font-bold tracking-tight">Service evaluation</h1>
        <p className="mt-1 max-w-3xl text-sm leading-relaxed text-slate-200">
          What we want to be able to say about the HSU partnership — and the evidence for it. The programme is
          assembled from modules rather than fixed, because what to measure is a clinical decision, not an
          engineering one.
        </p>
        <p className="mt-3 max-w-3xl text-xs leading-relaxed text-slate-400">
          Every figure here is an aggregate. One row is a count, never a person — which is what keeps this quality
          assurance rather than research, and why no patient consent is required.
        </p>
      </header>

      {unavailable && (
        <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            The tables do not exist yet. Run <code className="rounded bg-amber-100 px-1">supabase/evaluation-schema.sql</code>{" "}
            in the Supabase SQL editor — nothing can be saved until then.
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
              <h2 className="text-base font-bold text-slate-900">Where the programme stands</h2>
              <p className="mt-1 text-sm text-slate-600">
                {modules.length} module{modules.length === 1 ? "" : "s"} selected · {docsHave} of {docsNeeded} required
                documents uploaded · {months.length} station-month{months.length === 1 ? "" : "s"} of data
              </p>
              <div className="mt-3">
                <ProgressBars {...prog} />
              </div>
            </div>

            {urgent.length > 0 ? (
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-4">
                <p className="flex items-center gap-2 text-sm font-semibold text-rose-900">
                  <Clock className="h-4 w-4" /> {urgent.length} time-critical step{urgent.length === 1 ? "" : "s"} outstanding
                </p>
                <p className="mt-1 text-xs leading-relaxed text-rose-800">
                  These cannot be recovered later. A baseline not collected while goodwill is fresh is not collected
                  at all, and a study that starts after people have got used to the service no longer measures what
                  it was meant to.
                </p>
                <ul className="mt-2 space-y-0.5 text-xs text-rose-800">
                  {urgent.slice(0, 4).map((t) => <li key={t.key}>· {t.step.text}</li>)}
                  {urgent.length > 4 && <li className="text-rose-600">· and {urgent.length - 4} more</li>}
                </ul>
                <button onClick={() => setStep("setup")} className="mt-2 text-xs font-semibold text-rose-900 underline">
                  Open setup
                </button>
              </div>
            ) : (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                <p className="text-sm font-semibold text-emerald-900">Nothing time-critical outstanding</p>
                <p className="mt-1 text-xs leading-relaxed text-emerald-800">
                  Everything still to do can wait a week without costing you data.
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
                    {category.gate && <Chip className="bg-slate-800 text-white">Gate</Chip>}
                  </div>
                  <p className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
                    {top?.value.value ?? <span className="text-base font-medium text-slate-400">Pending</span>}
                  </p>
                  <p className="text-xs text-slate-500">{top?.metric.name ?? category.question}</p>
                </div>
              );
            })}
          </div>

          <button
            onClick={() => setStep("design")}
            className={`${card} flex w-full items-center gap-3 p-4 text-left transition hover:border-slate-300`}
          >
            <Microscope className="h-5 w-5 shrink-0 text-slate-400" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-slate-900">
                Study design: {DESIGN_LABEL[design.design]}
              </p>
              <p className="text-xs leading-relaxed text-slate-500">
                {design.baselineMonths} months of monthly baseline ·{" "}
                {Object.values(design.sites).filter((x) => x.role === "pre-live").length} pre-live control sites ·{" "}
                {Object.keys(design.decisions).filter((k) => design.decisions[k]?.text).length} of 6 decisions recorded
              </p>
            </div>
            <span className="shrink-0 text-xs font-medium text-cyan-700">Review →</span>
          </button>

          <div className={`${card} p-4`}>
            <h2 className="flex items-center gap-2 text-base font-bold text-slate-900">
              <Settings2 className="h-4 w-4 text-slate-400" /> Module readiness
            </h2>
            <p className="mt-1 max-w-3xl text-sm text-slate-600">
              Which claims you could actually make today, and what is missing from the rest.
            </p>
            <div className="mt-3 space-y-1.5">
              {ready.map((r) => (
                <div key={r.module.id} className="flex flex-wrap items-center gap-2 rounded-lg bg-slate-50 px-3 py-2">
                  <span className={`h-2 w-2 shrink-0 rounded-full ${r.ready ? "bg-emerald-500" : r.blocked ? "bg-slate-300" : "bg-amber-400"}`} />
                  <span className="min-w-0 flex-1 truncate text-sm text-slate-800">{r.module.name}</span>
                  <span className="shrink-0 text-xs tabular-nums text-slate-500">
                    {r.steps.done}/{r.steps.total} steps
                    {r.docs.total > 0 && ` · ${r.docs.done}/${r.docs.total} docs`}
                    {` · ${r.metrics.live}/${r.metrics.total} reporting`}
                  </span>
                </div>
              ))}
              {!ready.length && <p className="py-4 text-center text-sm text-slate-400">No modules selected yet.</p>}
            </div>
          </div>

          <div className={`${card} p-4`}>
            <h2 className="text-base font-bold text-slate-900">Assumptions</h2>
            <p className="mt-1 max-w-3xl text-sm leading-relaxed text-slate-600">
              Workload relief is resolved cases times minutes, so the assumption is part of the claim. It is the
              first thing that will be questioned, so it has to be visible and easy to defend — never buried in
              code.
            </p>
            <div className="mt-3 grid gap-3 sm:grid-cols-4">
              {([
                ["minutesSaved", "Minutes saved per case"],
                ["minutesSpent", "Minutes spent routing"],
                ["hoursPerClinicDay", "Hours in a clinic day"],
                ["responseTargetMinutes", "Response promise (min)"],
              ] as [keyof Assumptions, string][]).map(([key, label]) => (
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
            <label className="mt-3 flex items-start gap-2.5">
              <input
                type="checkbox"
                checked={assumptions.studyDone}
                disabled={!admin}
                onChange={(e) => void saveAssumptions({ ...assumptions, studyDone: e.target.checked })}
                className="mt-0.5 h-4 w-4 rounded border-slate-300 text-cyan-600 focus:ring-cyan-500"
              />
              <span className="text-sm text-slate-700">
                The time-and-motion study has been run
                <span className="mt-0.5 block text-xs text-slate-500">
                  Until this is ticked, workload relief is labelled an estimate and does not belong in a presentation.
                </span>
              </span>
            </label>
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
          onSave={async () => { if (draft) await post({ month: draft }, "Saved."); }}
          onImport={async (rows) => { await post({ action: "import", months: rows }, `${rows.length} station-months imported.`); }}
        />
      )}

      {step === "results" && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-end gap-3">
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-slate-700">Station</span>
              <select className={input} value={station} onChange={(e) => setStation(e.target.value)}>
                <option value="__all">All stations</option>
                {allStations.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-slate-700">Period</span>
              <select className={input} value={windowMonths} onChange={(e) => setWindowMonths(Number(e.target.value))}>
                {[3, 6, 12, 24].map((n) => <option key={n} value={n}>Last {n} months</option>)}
              </select>
            </label>
            <p className="pb-2 text-xs text-slate-500">
              {totals.months} month{totals.months === 1 ? "" : "s"} with data.{" "}
              <span className="text-slate-400">Staffing figures are service-wide and do not change with station.</span>
            </p>
          </div>
          <ResultsView programme={programme} t={totals} roster={roster} a={assumptions} />

          <section className={`${card} p-4`}>
            <h2 className="text-base font-bold text-slate-900">Take it out of here</h2>
            <p className="mt-1 max-w-3xl text-sm leading-relaxed text-slate-600">
              Write the quarterly report as you go rather than saving twelve months and then writing one. Four
              quarterly reports plus a summary <em>are</em> the annual report, and each is a rehearsal at defending
              the figures in front of people who know the service. The one written in a single sitting at the end
              is always worse.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                onClick={() => download(`evaluation-${stationLabel.replace(/\W+/g, "-")}.csv`, toCSV(selected), "text/csv")}
                disabled={!selected.length}
                className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
              >
                <Download className="h-4 w-4" /> Raw data (CSV)
              </button>
              <button
                onClick={() => download(
                  `evaluation-report-${stationLabel.replace(/\W+/g, "-")}.md`,
                  toReport(programme, { t: totals, roster, a: assumptions }, { station: stationLabel, period: periodLabel, documents }),
                  "text/markdown",
                )}
                className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                <FileText className="h-4 w-4" /> Quarterly report (Markdown)
              </button>
              <button
                onClick={makeDeck}
                disabled={saving || !admin}
                className="flex items-center gap-1.5 rounded-lg bg-cyan-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-cyan-700 disabled:opacity-50"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Presentation className="h-4 w-4" />}
                Create presentation
                <ExternalLink className="h-3 w-3 opacity-70" />
              </button>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-slate-500">
              The presentation lands in{" "}
              <Link href="/admin/presentations" className="font-medium text-cyan-700 hover:underline">Presentations</Link>{" "}
              as an ordinary editable deck, charts included. It opens on a limitations slide before the closing one
              — stated by you rather than spotted by the audience.
            </p>
          </section>
        </div>
      )}
    </div>
  );
}
