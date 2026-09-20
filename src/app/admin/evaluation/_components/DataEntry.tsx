"use client";

// Monthly data entry, and the Medalia import.
//
// The fields are DERIVED from the selected modules, so the form shrinks when a
// module is removed and nobody is ever asked for a number nothing will use.
// They are grouped by where the number comes from rather than by what it
// proves, because that is who you have to ask and it is the order the work
// actually happens in. The dashboard groups the same figures the other way.
//
// A blank field means "not measured" and is stored as null, not zero. "No
// serious incidents" and "we did not look" are different statements.

import { useRef, useState } from "react";
import { CheckCircle2, Download, Loader2, Save, Upload } from "lucide-react";
import { fieldsBySource } from "@/lib/evaluation/programme";
import { COLUMNS, parse, template, type ImportIssue } from "@/lib/evaluation/import";
import { SCOPED_CASE_TYPES, monthName, lastMonths, type MonthRow } from "@/lib/evaluation/totals";
import { SOURCES, type Programme } from "@/lib/evaluation/types";
import { SOURCE_CHIP, card, input } from "./ui";

function NumberField({
  label, help, value, onChange, nullable, unit,
}: {
  label: string; help?: string; value: number | null;
  onChange: (v: number | null) => void; nullable?: boolean; unit?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-slate-700">
        {label}
        {unit && unit !== "count" && <span className="ml-1 font-normal text-slate-400">({unit})</span>}
      </span>
      <input
        type="number"
        min={0}
        className={input}
        value={value === null || value === undefined ? "" : value}
        placeholder={nullable ? "not measured" : "0"}
        onChange={(e) => {
          const raw = e.target.value;
          if (raw === "") return onChange(nullable ? null : 0);
          const v = Number(raw);
          onChange(Number.isFinite(v) ? v : nullable ? null : 0);
        }}
      />
      {help && <span className="mt-1 block text-[11px] leading-snug text-slate-400">{help}</span>}
    </label>
  );
}

export default function DataEntry({
  programme, draft, setDraft, stations, station, setStation, month, setMonth,
  onSave, onImport, saving, canEdit, institution,
}: {
  programme: Programme;
  draft: MonthRow | null;
  setDraft: (patch: Partial<MonthRow>) => void;
  stations: string[];
  station: string; setStation: (v: string) => void;
  month: string; setMonth: (v: string) => void;
  onSave: () => Promise<void>;
  onImport: (rows: MonthRow[]) => Promise<void>;
  saving: boolean;
  canEdit: boolean;
  institution: string;
}) {
  const [tab, setTab] = useState<"manual" | "import">("import");
  const [rows, setRows] = useState<MonthRow[]>([]);
  const [issues, setIssues] = useState<ImportIssue[]>([]);
  const [lines, setLines] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);

  const groups = fieldsBySource(programme);

  const downloadTemplate = () => {
    const blob = new Blob([template()], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "medalia-monthly-export-template.csv";
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-1 rounded-lg bg-slate-100 p-1">
        {([["import", "Import from Medalia"], ["manual", "Enter by hand"]] as const).map(([id, label]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition ${
              tab === id ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "import" && (
        <>
          <div className={`${card} p-4`}>
            <h2 className="text-base font-bold text-slate-900">Monthly file from Medalia</h2>
            <div className="mt-2 max-w-3xl space-y-2 text-sm leading-relaxed text-slate-600">
              <p>
                <strong className="text-slate-800">One line per station × month × case type.</strong> The finest
                grain that is still entirely non-identifying, and it delivers both things in one file: the
                per-case-type breakdown and the station totals. Nine stations by thirteen case types is 117 lines a
                month for the whole of HSU.
              </p>
              <p>
                <strong className="text-slate-800">No personal data — by design, not by caution.</strong> Every
                line is a count, not a person. No national ID, no date (a month is precise enough and a date at a
                small station is identifying), no free text, no age band, no sex. Response time is a duration in
                minutes, never a timestamp. There is nothing in the file to protect.
              </p>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <button onClick={downloadTemplate} className="flex items-center gap-1.5 rounded-lg bg-slate-800 px-3 py-2 text-sm font-medium text-white transition hover:bg-slate-900">
                <Download className="h-4 w-4" /> Download template
              </button>
              <label className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50">
                <Upload className="h-4 w-4" /> Choose file
                <input
                  ref={fileRef}
                  type="file"
                  accept=".csv,text/csv"
                  className="hidden"
                  onChange={async (e) => {
                    const f = e.target.files?.[0];
                    if (!f) return;
                    const r = parse(await f.text(), institution);
                    setRows(r.months); setIssues(r.issues); setLines(r.linesRead);
                  }}
                />
              </label>
            </div>
          </div>

          {(rows.length > 0 || issues.length > 0) && (
            <div className={`${card} p-4`}>
              <h3 className="font-semibold text-slate-900">{lines} lines read → {rows.length} station-months</h3>
              {issues.length > 0 && (
                <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 p-3">
                  <p className="text-sm font-semibold text-amber-900">{issues.length} issue{issues.length === 1 ? "" : "s"}</p>
                  <ul className="mt-1 space-y-0.5 text-xs text-amber-800">
                    {issues.slice(0, 12).map((v, i) => <li key={i}>{v.line ? `Line ${v.line}: ` : ""}{v.text}</li>)}
                    {issues.length > 12 && <li>… and {issues.length - 12} more</li>}
                  </ul>
                </div>
              )}
              {rows.length > 0 && (
                <>
                  <ul className="mt-3 space-y-1 text-sm">
                    {rows.map((r) => (
                      <li key={`${r.station}${r.month}`} className="flex items-center justify-between rounded-md bg-slate-50 px-3 py-1.5">
                        <span className="text-slate-700">{r.station} · {monthName(r.month)}</span>
                        <span className="tabular-nums text-slate-500">{r.cases_total} cases</span>
                      </li>
                    ))}
                  </ul>
                  <p className="mt-2 text-[11px] text-slate-500">
                    The import writes only the Medalia columns. Figures from the institution and from surveys stay
                    exactly as they are.
                  </p>
                  <button
                    onClick={async () => { await onImport(rows); setRows([]); setIssues([]); setLines(0); if (fileRef.current) fileRef.current.value = ""; }}
                    disabled={saving || !canEdit}
                    className="mt-3 flex items-center gap-1.5 rounded-lg bg-cyan-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-cyan-700 disabled:opacity-50"
                  >
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />} Import
                  </button>
                </>
              )}
            </div>
          )}

          <div className={`${card} p-4`}>
            <h3 className="font-semibold text-slate-900">Columns — this is the specification to send Medalia</h3>
            <div className="mt-2 overflow-x-auto">
              <table className="w-full text-sm">
                <tbody>
                  {COLUMNS.map((c) => (
                    <tr key={c.name} className="border-b border-slate-100 align-top last:border-0">
                      <td className="py-1.5 pr-3 font-mono text-xs text-cyan-800">{c.name}</td>
                      <td className="py-1.5 text-xs leading-snug text-slate-600">
                        {c.description}
                        {c.optional && <span className="ml-1 text-slate-400">(optional)</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-xs leading-relaxed text-slate-500">
              Case-type slugs: {SCOPED_CASE_TYPES.map((e) => e.slug).join(", ")}, almenn-laeknisthjonusta,
              laeknisvottord.
            </p>
          </div>
        </>
      )}

      {tab === "manual" && draft && (
        <>
          <div className="flex flex-wrap items-end gap-3">
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-slate-700">Station</span>
              <select className={input} value={station} onChange={(e) => setStation(e.target.value)}>
                {stations.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-slate-700">Month</span>
              <select className={input} value={month} onChange={(e) => setMonth(e.target.value)}>
                {lastMonths(18).slice().reverse().map((m) => <option key={m} value={m}>{monthName(m)}</option>)}
              </select>
            </label>
            <button
              onClick={onSave}
              disabled={saving || !canEdit}
              className="flex items-center gap-1.5 rounded-lg bg-cyan-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-cyan-700 disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save
            </button>
          </div>

          <p className="max-w-3xl text-sm leading-relaxed text-slate-600">
            These fields come from the modules you selected — remove a module and its fields go with it. A blank
            field means <em>not measured</em> and is stored as such, which is not the same as zero.
          </p>

          {groups.map(({ source, fields }) => (
            <section key={source} className={`${card} p-4`}>
              <div className="mb-3 flex flex-wrap items-baseline gap-2">
                <h3 className="font-semibold text-slate-900">{SOURCES[source].name}</h3>
                <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${SOURCE_CHIP[source]}`}>
                  {fields.length} field{fields.length === 1 ? "" : "s"}
                </span>
                <span className="text-xs text-slate-500">{SOURCES[source].who}</span>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                {fields.map((f) => (
                  <NumberField
                    key={f.key as string}
                    label={f.label}
                    help={f.help}
                    unit={f.unit}
                    nullable={f.nullable}
                    value={(draft[f.key] as number | null) ?? (f.nullable ? null : 0)}
                    onChange={(v) => setDraft({ [f.key]: f.nullable ? v : v ?? 0 } as Partial<MonthRow>)}
                  />
                ))}
              </div>
            </section>
          ))}

          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-700">Note</span>
            <textarea
              className={`${input} min-h-[70px]`}
              value={draft.note}
              placeholder="What explains these figures, and would otherwise be forgotten by the next quarterly report."
              onChange={(e) => setDraft({ note: e.target.value })}
            />
          </label>
        </>
      )}
    </div>
  );
}
