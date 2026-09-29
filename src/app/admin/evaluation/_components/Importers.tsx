"use client";

// The two files the study runs on: the Saga baseline (CSV) and the Medalia
// export (JSON). Both are read in the browser; only monthly counts are sent
// to the server. See src/lib/evaluation/saga.ts and medalia.ts.

import { useMemo, useRef, useState } from "react";
import { FileUp, Loader2, Save } from "lucide-react";
import { erindi } from "@/erindi";
import { parseSaga, type SagaResult } from "@/lib/evaluation/saga";
import {
  aggregateMedalia, inventory,
  type ImportConfig, type MedaliaExport, type MedaliaMap, type Outcome,
} from "@/lib/evaluation/medalia";
import type { MonthRow } from "@/lib/evaluation/totals";
import { monthName } from "@/lib/evaluation/totals";
import { card, input, pl } from "./ui";

type Props = {
  config: ImportConfig;
  stations: string[];
  institution: string;
  canEdit: boolean;
  saving: boolean;
  onSaveConfig: (c: ImportConfig) => Promise<void>;
  onSaveSaga: (rows: Partial<MonthRow>[]) => Promise<void>;
  onSaveMedalia: (rows: Partial<MonthRow>[]) => Promise<void>;
};

const btn = "flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold transition disabled:opacity-50";
const primary = `${btn} bg-cyan-600 text-white hover:bg-cyan-700`;
const secondary = `${btn} border border-slate-300 bg-white text-slate-700 hover:bg-slate-50`;

const readText = (f: File) => new Promise<string>((res, rej) => {
  const r = new FileReader();
  r.onload = () => res(String(r.result ?? ""));
  r.onerror = () => rej(r.error);
  r.readAsText(f, "utf-8");
});

export default function Importers(p: Props) {
  return (
    <div className="space-y-4">
      <SagaCard {...p} />
      <MedaliaCard {...p} />
    </div>
  );
}

// ── Saga ────────────────────────────────────────────────────────────────────

function SagaCard({ config, stations, institution, canEdit, saving, onSaveConfig, onSaveSaga }: Props) {
  const [codes, setCodes] = useState(config.codeSet.join(", "));
  const [station, setStation] = useState(stations[0] ?? "");
  const [result, setResult] = useState<SagaResult | null>(null);
  const [text, setText] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const codeSet = useMemo(() => codes.split(/[\s,;]+/).map((c) => c.trim()).filter(Boolean), [codes]);
  const run = (t: string) => setResult(parseSaga(t, { codeSet, defaultStation: station, stations }));

  return (
    <section className={`${card} p-4`}>
      <h2 className="text-base font-bold text-slate-900">1. Baseline og samanburður úr Sögu (CSV)</h2>
      <p className="mt-1 max-w-3xl text-sm leading-relaxed text-slate-600">
        Ein skrá úr Sögu með dagsetningu og ICD-10 greiningarkóða fyrir hverja komu, frá 36 mánuðum fyrir upphaf
        þjónustunnar og til dagsins í dag. Hver greiningarkóði er talinn einu sinni á sjúkling á dag. Skráin er
        lesin í vafranum og aðeins mánaðartölur eru vistaðar.
      </p>

      <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_220px]">
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-700">Kóðalisti (ICD-10)</span>
          <textarea
            className={`${input} min-h-[64px] font-mono text-xs`}
            value={codes}
            disabled={!canEdit}
            placeholder="t.d. J02, J03, N30, B00.1"
            onChange={(e) => setCodes(e.target.value)}
          />
          <span className="mt-1 block text-[11px] leading-snug text-slate-500">
            Kóðarnir sem læknisfræðilegur ráðgjafi samþykkti. Forskeyti nægir: J02 nær yfir J02.0–J02.9. Ef listinn
            er tómur teljast allir kóðar í skránni. Sami listi gildir um Medalia.
          </span>
        </label>
        <div className="space-y-2">
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-700">Stöð</span>
            <select className={input} value={station} onChange={(e) => setStation(e.target.value)}>
              {stations.map((s) => <option key={s}>{s}</option>)}
            </select>
            <span className="mt-1 block text-[11px] leading-snug text-slate-500">Notuð ef skráin hefur engan dálk fyrir stöð.</span>
          </label>
          <button
            className={secondary}
            disabled={!canEdit || saving}
            onClick={() => void onSaveConfig({ ...config, codeSet })}
          >
            <Save className="h-4 w-4" /> Vista kóðalista
          </button>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <input
          ref={fileRef}
          type="file"
          accept=".csv,.txt,text/csv"
          className="text-sm"
          disabled={!canEdit}
          onChange={async (e) => {
            const f = e.target.files?.[0];
            if (!f) return;
            const t = await readText(f);
            setText(t);
            run(t);
          }}
        />
        {text && <button className={secondary} onClick={() => run(text)}>Lesa aftur með þessum lista</button>}
      </div>

      {result?.error && <p className="mt-3 rounded-lg bg-rose-50 p-3 text-sm text-rose-800">{result.error}</p>}
      {result && !result.error && (
        <div className="mt-3 space-y-2 rounded-lg bg-slate-50 p-3 text-sm text-slate-700">
          <p>
            <strong>{result.stats.counted.toLocaleString("is-IS")}</strong> greiningarkóðar taldir af{" "}
            {result.stats.lines.toLocaleString("is-IS")} línum, frá {result.stats.first} til {result.stats.last}, í{" "}
            {result.months.length} {pl(result.months.length, "mánuði", "mánuðum")}.
          </p>
          <ul className="space-y-0.5 text-xs text-slate-600">
            <li>· Dálkar: dagsetning „{result.columns.date}“, kóði „{result.columns.code}“
              {result.columns.patient ? `, sjúklingur „${result.columns.patient}“` : ""}
              {result.columns.station ? `, stöð „${result.columns.station}“` : ""}
              {result.columns.antibiotic ? `, sýklalyf „${result.columns.antibiotic}“` : " — enginn sýklalyfjadálkur, svo samanburður á sýklalyfjum bíður"}</li>
            <li>· Utan kóðalista: {result.stats.outsideSet.toLocaleString("is-IS")}</li>
            <li>
              · {result.stats.ruleApplied
                ? `Tvítalningar fjarlægðar (sami sjúklingur, kóði og dagur): ${result.stats.duplicates.toLocaleString("is-IS")}`
                : "Enginn sjúklingadálkur: reglan „einu sinni á sjúkling á dag“ er ekki hægt að beita hér. Hver lína telst einu sinni, svo HSU þarf að hafa beitt reglunni."}
            </li>
            {result.stats.badDates > 0 && <li className="text-amber-700">· Línur með ólæsilegri dagsetningu: {result.stats.badDates}</li>}
            {result.stats.unknownStations.length > 0 && (
              <li className="text-amber-700">· Óþekktar stöðvar, ekki taldar: {result.stats.unknownStations.join(", ")}</li>
            )}
          </ul>
          <button
            className={primary}
            disabled={!canEdit || saving || !result.months.length}
            onClick={async () => {
              await onSaveSaga(result.months.map((m) => ({
                institution, station: m.station, month: m.month,
                institution_contacts: m.codes,
                ...(m.antibiotics !== null ? { institution_antibiotics: m.antibiotics } : {}),
              })));
              setResult(null); setText("");
              if (fileRef.current) fileRef.current.value = "";
            }}
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileUp className="h-4 w-4" />}
            Vista {result.months.length} {pl(result.months.length, "mánuð", "mánuði")}
          </button>
        </div>
      )}
    </section>
  );
}

// ── Medalia ─────────────────────────────────────────────────────────────────

type ValueRole = "prescription" | "antibiotic" | "homeTest" | "stopped";
const VALUE_ROLES: { id: ValueRole; label: string; help: string }[] = [
  { id: "prescription", label: "Lyfjaávísun", help: "Svör sem þýða að lyfi var ávísað" },
  { id: "antibiotic", label: "Sýklalyf", help: "Svör sem þýða að sýklalyfi var ávísað" },
  { id: "homeTest", label: "Heimapróf notað", help: "Svör sem þýða að heimapróf var notað" },
  { id: "stopped", label: "Stöðvað í skimun", help: "Svör sem þýða að spurningalistinn stöðvaði erindið (rautt flagg)" },
];

const OUTCOME_LABEL: Record<Outcome, string> = {
  resolved: "Afgreitt í fjarþjónustu",
  referred: "Vísað áfram",
  turned_away: "Vísað frá (rautt flagg)",
  ignore: "Ekki talið",
};

function MedaliaCard({ config, stations, institution, canEdit, saving, onSaveConfig, onSaveMedalia }: Props) {
  const [data, setData] = useState<MedaliaExport | null>(null);
  const [error, setError] = useState("");
  const [map, setMap] = useState<MedaliaMap>(config.medalia);
  const [station, setStation] = useState(stations[0] ?? "");
  const fileRef = useRef<HTMLInputElement>(null);

  const inv = useMemo(() => (data ? inventory(data) : null), [data]);
  const withValues = inv?.items.filter((i) => i.values) ?? [];
  const valuesOf = (linkId?: string) => inv?.items.find((i) => i.linkId === linkId)?.values ?? [];
  const result = useMemo(
    () => (data && Object.keys(map.cases).length
      ? aggregateMedalia(data, map, { stations, defaultStation: station, codeSet: config.codeSet, institution })
      : null),
    [data, map, stations, station, config.codeSet, institution],
  );

  const itemSelect = (value: string | undefined, onChange: (v: string) => void, items = withValues) => (
    <select className={input} value={value ?? ""} onChange={(e) => onChange(e.target.value)} disabled={!canEdit}>
      <option value="">— ekki skráð —</option>
      {items.map((i) => (
        <option key={i.linkId} value={i.linkId}>{i.text || i.linkId} ({i.questionnaires[0]})</option>
      ))}
    </select>
  );

  const toggle = (list: string[], v: string) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

  return (
    <section className={`${card} p-4`}>
      <h2 className="text-base font-bold text-slate-900">2. Gögn úr Medalia (JSON), eftir 6 og 12 mánuði</h2>
      <p className="mt-1 max-w-3xl text-sm leading-relaxed text-slate-600">
        Útdráttur úr Medalia er byggður á sjúklingum og spurningalistum, ekki á erindum. Hér segir þú einu sinni
        hvaða spurningalistar eru erindi og hvar niðurstaða, greiningarkóði og lyf eru skráð. Sú vörpun er vistuð
        og notuð aftur næst. Skráin er lesin í vafranum og aðeins mánaðartölur eru vistaðar.
      </p>

      <div className="mt-3 flex flex-wrap items-end gap-3">
        <input
          ref={fileRef}
          type="file"
          accept=".json,application/json"
          className="text-sm"
          disabled={!canEdit}
          onChange={async (e) => {
            const f = e.target.files?.[0];
            if (!f) return;
            try {
              const j = JSON.parse(await readText(f)) as MedaliaExport;
              if (!Array.isArray(j.patients)) throw new Error();
              setData(j); setError("");
            } catch {
              setData(null); setError("Þetta er ekki útdráttur úr Medalia: skráin hefur engan „patients“-lista.");
            }
          }}
        />
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-700">Stöð ef hópur sjúklings segir það ekki</span>
          <select className={input} value={station} onChange={(e) => setStation(e.target.value)}>
            {stations.map((s) => <option key={s}>{s}</option>)}
          </select>
        </label>
      </div>
      {error && <p className="mt-3 rounded-lg bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}

      {inv && (
        <div className="mt-4 space-y-4">
          <p className="text-sm text-slate-600">
            {inv.patients.toLocaleString("is-IS")} sjúklingar, {inv.questionnaires.length} spurningalistar,{" "}
            {inv.items.length} spurningar.
          </p>

          <div>
            <h3 className="text-sm font-semibold text-slate-900">Spurningalistar</h3>
            <p className="text-xs text-slate-500">Merktu þá sem sjúklingur fyllir út fyrir erindi, og þá sem læknir fyllir út (tími svars).</p>
            <div className="mt-2 space-y-1">
              {inv.questionnaires.map(({ title, count }) => {
                const isCase = title in map.cases;
                return (
                  <div key={title} className="flex flex-wrap items-center gap-2 rounded-lg bg-slate-50 px-3 py-1.5 text-sm">
                    <span className="min-w-0 flex-1 truncate text-slate-800">{title} <span className="text-xs text-slate-400">({count})</span></span>
                    <label className="flex items-center gap-1 text-xs">
                      <input
                        type="checkbox" checked={isCase} disabled={!canEdit}
                        onChange={() => setMap((m) => {
                          const cases = { ...m.cases };
                          if (isCase) delete cases[title]; else cases[title] = "";
                          return { ...m, cases };
                        })}
                      /> Erindi
                    </label>
                    {isCase && (
                      <select
                        className="rounded border border-slate-300 px-1.5 py-0.5 text-xs"
                        value={map.cases[title]} disabled={!canEdit}
                        onChange={(e) => setMap((m) => ({ ...m, cases: { ...m.cases, [title]: e.target.value } }))}
                      >
                        <option value="">Tegund erindis…</option>
                        {erindi.map((e) => <option key={e.slug} value={e.slug}>{e.title}</option>)}
                      </select>
                    )}
                    <label className="flex items-center gap-1 text-xs">
                      <input
                        type="checkbox" checked={map.doctorQuestionnaires.includes(title)} disabled={!canEdit}
                        onChange={() => setMap((m) => ({ ...m, doctorQuestionnaires: toggle(m.doctorQuestionnaires, title) }))}
                      /> Svar læknis
                    </label>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-slate-900">Niðurstaða erindis</h3>
              {itemSelect(map.outcome?.linkId, (v) => setMap((m) => ({ ...m, outcome: v ? { linkId: v, values: {} } : undefined })))}
              {map.outcome && valuesOf(map.outcome.linkId).map((v) => (
                <div key={v} className="flex items-center gap-2 text-xs">
                  <span className="min-w-0 flex-1 truncate text-slate-700">{v || "(autt)"}</span>
                  <select
                    className="rounded border border-slate-300 px-1.5 py-0.5"
                    value={map.outcome!.values[v] ?? "ignore"} disabled={!canEdit}
                    onChange={(e) => setMap((m) => ({ ...m, outcome: { ...m.outcome!, values: { ...m.outcome!.values, [v]: e.target.value as Outcome } } }))}
                  >
                    {(Object.keys(OUTCOME_LABEL) as Outcome[]).map((o) => <option key={o} value={o}>{OUTCOME_LABEL[o]}</option>)}
                  </select>
                </div>
              ))}
            </div>

            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-slate-900">Greiningarkóði (ICD-10)</h3>
              {itemSelect(map.icd?.linkId, (v) => setMap((m) => ({ ...m, icd: v ? { linkId: v } : undefined })), inv.items)}
              <p className="text-[11px] text-slate-500">Borinn saman við kóðalistann hér að ofan.</p>
            </div>

            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-slate-900">Ákvörðunartré</h3>
              {itemSelect(map.tree?.linkId, (v) => setMap((m) => ({ ...m, tree: v ? { linkId: v, changed: [], confirmed: [] } : undefined })))}
              {map.tree && valuesOf(map.tree.linkId).map((v) => (
                <div key={v} className="flex items-center gap-2 text-xs">
                  <span className="min-w-0 flex-1 truncate text-slate-700">{v || "(autt)"}</span>
                  <select
                    className="rounded border border-slate-300 px-1.5 py-0.5"
                    disabled={!canEdit}
                    value={map.tree!.changed.includes(v) ? "changed" : map.tree!.confirmed.includes(v) ? "confirmed" : ""}
                    onChange={(e) => setMap((m) => ({
                      ...m,
                      tree: {
                        ...m.tree!,
                        changed: e.target.value === "changed" ? [...m.tree!.changed.filter((x) => x !== v), v] : m.tree!.changed.filter((x) => x !== v),
                        confirmed: e.target.value === "confirmed" ? [...m.tree!.confirmed.filter((x) => x !== v), v] : m.tree!.confirmed.filter((x) => x !== v),
                      },
                    }))}
                  >
                    <option value="">Ekki talið</option>
                    <option value="confirmed">Læknir staðfesti</option>
                    <option value="changed">Læknir breytti</option>
                  </select>
                </div>
              ))}
            </div>

            {VALUE_ROLES.map((role) => {
              const cur = map[role.id];
              return (
                <div key={role.id} className="space-y-1">
                  <h3 className="text-sm font-semibold text-slate-900">{role.label}</h3>
                  {itemSelect(cur?.linkId, (v) => setMap((m) => ({ ...m, [role.id]: v ? { linkId: v, values: [] } : undefined })))}
                  {cur && (
                    <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs">
                      <span className="w-full text-[11px] text-slate-500">{role.help}:</span>
                      {valuesOf(cur.linkId).map((v) => (
                        <label key={v} className="flex items-center gap-1">
                          <input
                            type="checkbox" checked={cur.values.includes(v)} disabled={!canEdit}
                            onChange={() => setMap((m) => ({ ...m, [role.id]: { ...cur, values: toggle(cur.values, v) } }))}
                          /> {v || "(autt)"}
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <button className={secondary} disabled={!canEdit || saving} onClick={() => void onSaveConfig({ ...config, medalia: map })}>
            <Save className="h-4 w-4" /> Vista vörpun
          </button>

          {result && (
            <div className="space-y-2 rounded-lg bg-slate-50 p-3 text-sm text-slate-700">
              <p>
                <strong>{result.stats.cases.toLocaleString("is-IS")}</strong> erindi og {result.stats.stopped} stöðvuð í skimun,
                frá {result.stats.first?.slice(0, 10)} til {result.stats.last?.slice(0, 10)}.
                {result.stats.unknownGroups.length > 0 && (
                  <span className="text-amber-700"> Hópar sem passa ekki við stöð: {result.stats.unknownGroups.join(", ")}.</span>
                )}
              </p>
              <div className="max-h-56 overflow-auto">
                <table className="w-full text-xs">
                  <thead className="text-left text-slate-500">
                    <tr><th className="py-1">Stöð</th><th>Mánuður</th><th className="text-right">Erindi</th><th className="text-right">Afgreidd</th><th className="text-right">Vísað áfram</th><th className="text-right">Miðgildi svartíma</th></tr>
                  </thead>
                  <tbody>
                    {result.rows.map((r) => (
                      <tr key={`${r.station}${r.month}`} className="border-t border-slate-200">
                        <td className="py-1">{r.station}</td>
                        <td>{monthName(r.month!)}</td>
                        <td className="text-right tabular-nums">{r.cases_total}</td>
                        <td className="text-right tabular-nums">{r.cases_resolved ?? "–"}</td>
                        <td className="text-right tabular-nums">{r.cases_referred ?? "–"}</td>
                        <td className="text-right tabular-nums">{r.response_median_min != null ? `${r.response_median_min} mín.` : "–"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <button
                className={primary}
                disabled={!canEdit || saving || !result.rows.length}
                onClick={async () => {
                  await onSaveConfig({ ...config, medalia: map });
                  await onSaveMedalia(result.rows);
                  setData(null);
                  if (fileRef.current) fileRef.current.value = "";
                }}
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileUp className="h-4 w-4" />}
                Vista {result.rows.length} {pl(result.rows.length, "mánuð", "mánuði")}
              </button>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
