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

import Link from "next/link";
import { useRef, useState } from "react";
import { CheckCircle2, Download, Loader2, Save, Upload } from "lucide-react";
import { fieldsBySource } from "@/lib/evaluation/programme";
import { SURVEY_FIELDS } from "@/lib/evaluation/surveys";
import type { ImportConfig } from "@/lib/evaluation/medalia";
import Importers from "./Importers";
import { COLUMNS, parse, template, type ImportIssue } from "@/lib/evaluation/import";
import { EXCLUSION_REASONS, GATES, REASON_COLUMNS, parseReasons, reasonTemplate } from "@/lib/evaluation/exclusions";
import { SCOPED_CASE_TYPES, monthName, lastMonths, type MonthRow } from "@/lib/evaluation/totals";
import { SOURCES, type Programme } from "@/lib/evaluation/types";
import { SOURCE_CHIP, card, input, pl } from "./ui";

// Display names for field units; the unit values themselves are keys.
const UNIT_LABEL: Record<string, string> = { percent: "%", minutes: "mínútur", hours: "klst.", isk: "kr." };

function NumberField({
  label, help, value, onChange, nullable, unit, readOnly,
}: {
  label: string; help?: string; value: number | null;
  onChange: (v: number | null) => void; nullable?: boolean; unit?: string; readOnly?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-slate-700">
        {label}
        {unit && unit !== "count" && <span className="ml-1 font-normal text-slate-400">({UNIT_LABEL[unit] ?? unit})</span>}
      </span>
      <input
        type="number"
        min={0}
        className={`${input} ${readOnly ? "bg-slate-50 text-slate-500" : ""}`}
        readOnly={readOnly}
        value={value === null || value === undefined ? "" : value}
        placeholder={readOnly ? "engin svör" : nullable ? "ekki mælt" : "0"}
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
  onSave, onImport, onImportReasons, saving, canEdit, institution,
  importConfig, onSaveImportConfig, onSaveSaga, onSaveMedalia,
}: {
  programme: Programme;
  draft: MonthRow | null;
  setDraft: (patch: Partial<MonthRow>) => void;
  stations: string[];
  station: string; setStation: (v: string) => void;
  month: string; setMonth: (v: string) => void;
  onSave: () => Promise<void>;
  onImport: (rows: MonthRow[]) => Promise<void>;
  onImportReasons: (rows: ReturnType<typeof parseReasons>["rows"]) => Promise<void>;
  saving: boolean;
  canEdit: boolean;
  institution: string;
  importConfig: ImportConfig;
  onSaveImportConfig: (c: ImportConfig) => Promise<void>;
  onSaveSaga: (rows: Partial<MonthRow>[]) => Promise<void>;
  onSaveMedalia: (rows: Partial<MonthRow>[]) => Promise<void>;
}) {
  const [tab, setTab] = useState<"manual" | "import">("import");
  const [rows, setRows] = useState<MonthRow[]>([]);
  const [issues, setIssues] = useState<ImportIssue[]>([]);
  const [lines, setLines] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);
  const reasonRef = useRef<HTMLInputElement>(null);
  const [reasonRows, setReasonRows] = useState<ReturnType<typeof parseReasons>["rows"]>([]);
  const [reasonIssues, setReasonIssues] = useState<{ line: number; text: string }[]>([]);

  const groups = fieldsBySource(programme);

  const downloadTemplate = () => {
    const blob = new Blob([template()], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "snidmat-medalia-manadargogn.csv";
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-1 rounded-lg bg-slate-100 p-1">
        {([["import", "Sækja úr Medalia"], ["manual", "Skrá handvirkt"]] as const).map(([id, label]) => (
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
          <Importers
            config={importConfig}
            stations={stations}
            institution={institution}
            canEdit={canEdit}
            saving={saving}
            onSaveConfig={onSaveImportConfig}
            onSaveSaga={onSaveSaga}
            onSaveMedalia={onSaveMedalia}
          />
          <p className="pt-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Varaleiðir</p>
          <div className={`${card} p-4`}>
            <h2 className="text-base font-bold text-slate-900">Mánaðarskrá (CSV)</h2>
            <div className="mt-2 max-w-3xl space-y-2 text-sm leading-relaxed text-slate-600">
              <p>
                <strong className="text-slate-800">Ein lína fyrir hverja stöð, mánuð og tegund erindis.</strong>{" "}
                Þannig fást bæði tölur eftir erindaflokkum og heildartölur stöðva úr einni skrá. Fyrir allt HSU
                eru þetta 117 línur á mánuði (9 stöðvar × 13 erindaflokkar).
              </p>
              <p>
                <strong className="text-slate-800">Engar persónuupplýsingar.</strong> Hver lína er fjöldatala,
                ekki einstaklingur. Engin kennitala, engin dagsetning, enginn frjáls texti, hvorki aldur né kyn.
                Mánuður dugar, því dagsetning getur bent á einstakling á lítilli stöð. Svartími er gefinn í
                mínútum, aldrei sem tímasetning.
              </p>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <button onClick={downloadTemplate} className="flex items-center gap-1.5 rounded-lg bg-slate-800 px-3 py-2 text-sm font-medium text-white transition hover:bg-slate-900">
                <Download className="h-4 w-4" /> Sækja sniðmát
              </button>
              <label className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50">
                <Upload className="h-4 w-4" /> Velja skrá
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
              <h3 className="font-semibold text-slate-900">{lines} {pl(lines, "lína lesin", "línur lesnar")} → {rows.length} {pl(rows.length, "stöðvarmánuður", "stöðvarmánuðir")}</h3>
              {issues.length > 0 && (
                <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 p-3">
                  <p className="text-sm font-semibold text-amber-900">{issues.length} {pl(issues.length, "athugasemd", "athugasemdir")}</p>
                  <ul className="mt-1 space-y-0.5 text-xs text-amber-800">
                    {issues.slice(0, 12).map((v, i) => <li key={i}>{v.line ? `Lína ${v.line}: ` : ""}{v.text}</li>)}
                    {issues.length > 12 && <li>… og {issues.length - 12} í viðbót</li>}
                  </ul>
                </div>
              )}
              {rows.length > 0 && (
                <>
                  <ul className="mt-3 space-y-1 text-sm">
                    {rows.map((r) => (
                      <li key={`${r.station}${r.month}`} className="flex items-center justify-between rounded-md bg-slate-50 px-3 py-1.5">
                        <span className="text-slate-700">{r.station} · {monthName(r.month)}</span>
                        <span className="tabular-nums text-slate-500">{r.cases_total} erindi</span>
                      </li>
                    ))}
                  </ul>
                  <p className="mt-2 text-[11px] text-slate-500">
                    Innlesturinn skrifar aðeins í dálkana frá Medalia. Tölur frá HSU og úr könnunum haldast
                    óbreyttar.
                  </p>
                  <button
                    onClick={async () => { await onImport(rows); setRows([]); setIssues([]); setLines(0); if (fileRef.current) fileRef.current.value = ""; }}
                    disabled={saving || !canEdit}
                    className="mt-3 flex items-center gap-1.5 rounded-lg bg-cyan-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-cyan-700 disabled:opacity-50"
                  >
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />} Lesa inn
                  </button>
                </>
              )}
            </div>
          )}

          <div className={`${card} p-4`}>
            <h3 className="font-semibold text-slate-900">Hverjum var vísað frá og hvers vegna</h3>
            <div className="mt-2 max-w-3xl space-y-2 text-sm leading-relaxed text-slate-600">
              <p>
                Önnur og mun minni skrá: <strong className="text-slate-800">ein lína fyrir hverja stöð, mánuð,
                síu og ástæðu</strong>. Hún er höfð sér svo mánaðarskráin fái ekki 22 aukadálka. Þetta eru í
                mesta lagi nokkur hundruð línur á mánuði.
              </p>
              <p>
                Síurnar tvær segja ólíka hluti. <strong className="text-slate-800">Spurningalistinn</strong> kostar
                lítið og er alltaf eins. Þegar <strong className="text-slate-800">læknir</strong> vísar frá er
                það dýrt, því sjúklingurinn hefur þegar beðið. Spurningalistinn hefði líklega átt að grípa hvert
                slíkt erindi.
              </p>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                onClick={() => {
                  const blob = new Blob([reasonTemplate()], { type: "text/csv;charset=utf-8" });
                  const a = document.createElement("a");
                  a.href = URL.createObjectURL(blob);
                  a.download = "snidmat-astaedur-fravisunar.csv";
                  a.click();
                  URL.revokeObjectURL(a.href);
                }}
                className="flex items-center gap-1.5 rounded-lg bg-slate-800 px-3 py-2 text-sm font-medium text-white transition hover:bg-slate-900"
              >
                <Download className="h-4 w-4" /> Sniðmát fyrir ástæður
              </button>
              <label className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50">
                <Upload className="h-4 w-4" /> Velja skrá með ástæðum
                <input
                  ref={reasonRef}
                  type="file"
                  accept=".csv,text/csv"
                  className="hidden"
                  onChange={async (e) => {
                    const f = e.target.files?.[0];
                    if (!f) return;
                    const r = parseReasons(await f.text());
                    setReasonRows(r.rows); setReasonIssues(r.issues);
                  }}
                />
              </label>
            </div>

            {(reasonRows.length > 0 || reasonIssues.length > 0) && (
              <div className="mt-3 rounded-lg border border-slate-200 p-3">
                <p className="text-sm font-semibold text-slate-800">{reasonRows.length} {pl(reasonRows.length, "lína með ástæðum lesin", "línur með ástæðum lesnar")}</p>
                {reasonIssues.length > 0 && (
                  <ul className="mt-1 space-y-0.5 text-xs text-amber-800">
                    {reasonIssues.slice(0, 8).map((v, i) => <li key={i}>{v.line ? `Lína ${v.line}: ` : ""}{v.text}</li>)}
                  </ul>
                )}
                {reasonRows.length > 0 && (
                  <button
                    onClick={async () => { await onImportReasons(reasonRows); setReasonRows([]); setReasonIssues([]); if (reasonRef.current) reasonRef.current.value = ""; }}
                    disabled={saving || !canEdit}
                    className="mt-2 flex items-center gap-1.5 rounded-lg bg-cyan-600 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-cyan-700 disabled:opacity-50"
                  >
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />} Lesa inn ástæður
                  </button>
                )}
              </div>
            )}

            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-sm">
                <tbody>
                  {REASON_COLUMNS.map((c) => (
                    <tr key={c.name} className="border-b border-slate-100 align-top last:border-0">
                      <td className="py-1.5 pr-3 font-mono text-xs text-cyan-800">{c.name}</td>
                      <td className="py-1.5 text-xs leading-snug text-slate-600">{c.description}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <p className="mt-3 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
              Fastur listi yfir ástæður, tekinn úr flokkunarreglum þjónustunnar
            </p>
            <ul className="mt-1 grid gap-x-4 gap-y-1 sm:grid-cols-2">
              {EXCLUSION_REASONS.map((r) => (
                <li key={r.id} className="text-[11px] leading-snug text-slate-600">
                  <span className="font-mono text-cyan-800">{r.id}</span> — {r.name}{" "}
                  <span className="text-slate-400">
                    (yfirleitt: {GATES.find((g) => g.id === r.expected)!.name.toLowerCase()})
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className={`${card} p-4`}>
            <h3 className="font-semibold text-slate-900">Dálkar: forskriftin sem Medalia fær</h3>
            <div className="mt-2 overflow-x-auto">
              <table className="w-full text-sm">
                <tbody>
                  {COLUMNS.map((c) => (
                    <tr key={c.name} className="border-b border-slate-100 align-top last:border-0">
                      <td className="py-1.5 pr-3 font-mono text-xs text-cyan-800">{c.name}</td>
                      <td className="py-1.5 text-xs leading-snug text-slate-600">
                        {c.description}
                        {c.optional && <span className="ml-1 text-slate-400">(valkvætt)</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-xs leading-relaxed text-slate-500">
              Auðkenni erindaflokka: {SCOPED_CASE_TYPES.map((e) => e.slug).join(", ")}, almenn-laeknisthjonusta,
              laeknisvottord.
            </p>
          </div>
        </>
      )}

      {tab === "manual" && draft && (
        <>
          <div className="flex flex-wrap items-end gap-3">
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-slate-700">Stöð</span>
              <select className={input} value={station} onChange={(e) => setStation(e.target.value)}>
                {stations.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-slate-700">Mánuður</span>
              <select className={input} value={month} onChange={(e) => setMonth(e.target.value)}>
                {lastMonths(18).slice().reverse().map((m) => <option key={m} value={m}>{monthName(m)}</option>)}
              </select>
            </label>
            <button
              onClick={onSave}
              disabled={saving || !canEdit}
              className="flex items-center gap-1.5 rounded-lg bg-cyan-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-cyan-700 disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Vista
            </button>
          </div>

          <p className="max-w-3xl text-sm leading-relaxed text-slate-600">
            Reitirnir ráðast af rannsóknarþáttunum sem þú valdir. Auður reitur þýðir <em>ekki mælt</em>, sem
            er ekki það sama og núll.
          </p>

          {groups.map(({ source, fields }) => (
            <section key={source} className={`${card} p-4`}>
              <div className="mb-3 flex flex-wrap items-baseline gap-2">
                <h3 className="font-semibold text-slate-900">{SOURCES[source].name}</h3>
                <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${SOURCE_CHIP[source]}`}>
                  {fields.length} {pl(fields.length, "reitur", "reitir")}
                </span>
                <span className="text-xs text-slate-500">{SOURCES[source].who}</span>
              </div>
              {fields.some((f) => SURVEY_FIELDS.has(f.key)) && (
                <p className="-mt-1 mb-3 text-xs leading-relaxed text-slate-500">
                  Gráu reitirnir eru reiknaðir sjálfkrafa úr svörum í{" "}
                  <Link href="/admin/surveys" className="font-medium text-cyan-700 hover:underline">könnunum</Link> og
                  uppfærast um leið og ný svör berast.
                </p>
              )}
              <div className="grid gap-3 sm:grid-cols-3">
                {fields.map((f) => (
                  <NumberField
                    key={f.key as string}
                    label={f.label}
                    help={f.help}
                    unit={f.unit}
                    nullable={f.nullable}
                    readOnly={SURVEY_FIELDS.has(f.key)}
                    value={(draft[f.key] as number | null) ?? (f.nullable ? null : 0)}
                    onChange={(v) => setDraft({ [f.key]: f.nullable ? v : v ?? 0 } as Partial<MonthRow>)}
                  />
                ))}
              </div>
            </section>
          ))}

          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-700">Athugasemd</span>
            <textarea
              className={`${input} min-h-[70px]`}
              value={draft.note}
              placeholder="Hvað skýrir þessar tölur? Skráðu það sem annars gleymist fyrir næstu skýrslu."
              onChange={(e) => setDraft({ note: e.target.value })}
            />
          </label>
        </>
      )}
    </div>
  );
}
