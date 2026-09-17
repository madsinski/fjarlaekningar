"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, RotateCcw, Save, Trash2 } from "lucide-react";
import { Button, Card, Field, Notice, cx, hsuApi, inputCls } from "../_components/ui";
import {
  SHIFT_KIND_IS, SHIFT_PERIOD_IS, monthLabel, WEEKDAY_ORDER, WEEKDAY_SHORT_IS, dayLabel, icelandicHolidays, isOvernight, typeAppliesOn, weekdayOf,
  type HsuShiftType, type ShiftKind, type ShiftPeriod,
} from "@/lib/hsu/types";
import type { PlannerCtx } from "./types";

export default function SettingsTab({ ctx }: { ctx: PlannerCtx }) {
  const { data } = ctx;
  const [unit, setUnit] = useState(data.settings.unit_name);
  const [approval, setApproval] = useState(data.settings.market_requires_approval);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ tone: "ok" | "err"; text: string } | null>(null);

  const saveSettings = async () => {
    setBusy("s"); setMsg(null);
    const r = await hsuApi("/api/hsu/admin/settings", { method: "PUT", body: { unit_name: unit, market_requires_approval: approval }, staff: true });
    setBusy(null);
    setMsg(r.ok ? { tone: "ok", text: "Stillingar vistaðar." } : { tone: "err", text: r.error ?? "Mistókst" });
    if (r.ok) await ctx.reload();
  };

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">Stillingar</h1>

      <Card className="space-y-4 p-5">
        <Field label="Heiti starfsstöðvar"><input className={inputCls} value={unit} onChange={(e) => setUnit(e.target.value)} /></Field>
        <label className="flex items-start gap-3">
          <input type="checkbox" className="mt-1 h-4 w-4" checked={approval} onChange={(e) => setApproval(e.target.checked)} />
          <span>
            <span className="block text-sm font-semibold">Yfirlæknir samþykkir vaktaskipti</span>
            <span className="block text-xs text-slate-500">Þegar læknir tekur vakt af vaktamarkaði fer hún ekki á milli fyrr en yfirlæknir hefur samþykkt.</span>
          </span>
        </label>
        {msg && <Notice tone={msg.tone}>{msg.text}</Notice>}
        <Button onClick={saveSettings} busy={busy === "s"}><Save className="h-4 w-4" /> Vista</Button>
      </Card>

      <div>
        <h2 className="text-lg font-bold">Vaktategundir</h2>
        <p className="text-sm text-slate-500">
          Hver tegund býr til eina vakt á hverjum þeim degi sem hún á við. <b>Forvakt</b> er mönnuð alla daga. <b>Bakvakt</b> fá aðeins læknar með
          bakvaktarréttindi, og hún er aðeins mönnuð þá daga sem forvaktarlæknirinn þarf bakvakt (merkt undir Læknar). Hvíld eftir vakt er hörð regla.
        </p>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {data.shiftTypes.map((t) => <ShiftTypeCard key={t.id} ctx={ctx} type={t} />)}
        <ShiftTypeCard ctx={ctx} />
      </div>

      <ResetCard ctx={ctx} />
    </div>
  );
}

type ResetCounts = { shifts: number; preferences: number; months: number; swaps: number; notifications: number };
const RESET_WORD = "HREINSA";

/** Byrja upp á nýtt: hreinsa einn mánuð eða allt vaktakerfið. */
function ResetCard({ ctx }: { ctx: PlannerCtx }) {
  const monthOptions = [...new Set([ctx.month, ...ctx.data.months.map((m) => m.month)])].sort();
  const [scope, setScope] = useState<"month" | "all">("month");
  const [month, setMonth] = useState(ctx.month);
  const [counts, setCounts] = useState<ResetCounts | null>(null);
  const [word, setWord] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ tone: "ok" | "err"; text: string } | null>(null);

  const query = scope === "all" ? "scope=all" : `scope=month&month=${month}`;
  const loadCounts = useCallback(async () => {
    setCounts(null);
    const r = await hsuApi<{ counts: ResetCounts }>(`/api/hsu/admin/reset?${query}`, { staff: true });
    if (r.ok) setCounts(r.counts);
  }, [query]);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadCounts();
  }, [loadCounts]);

  const target = scope === "all" ? "allt vaktakerfið" : monthLabel(month);
  const reset = async () => {
    if (word.trim().toUpperCase() !== RESET_WORD) return;
    if (!confirm(`Hreinsa ${target}? Þetta er ekki hægt að afturkalla.`)) return;
    setBusy(true); setMsg(null);
    const r = await hsuApi<{ cleared: ResetCounts }>("/api/hsu/admin/reset", { body: { scope, month, confirm: word }, staff: true });
    setBusy(false);
    if (!r.ok) { setMsg({ tone: "err", text: r.error ?? "Mistókst" }); return; }
    setWord("");
    setMsg({ tone: "ok", text: `Hreinsað: ${target}. Fjarlægt: ${r.cleared.shifts} vakt${r.cleared.shifts === 1 ? "" : "ir"} og ${r.cleared.preferences} ósk${r.cleared.preferences === 1 ? "" : "ir"}.` });
    await Promise.all([ctx.reload(), loadCounts()]);
  };

  const empty = counts && Object.values(counts).every((n) => n === 0);
  return (
    <Card className="space-y-4 border-red-200! p-5">
      <div>
        <h2 className="flex items-center gap-2 text-lg font-bold text-red-800"><RotateCcw className="h-5 w-5" /> Byrja upp á nýtt</h2>
        <p className="text-sm text-slate-600">
          Hreinsar vaktir, vaktaskipti, óskir lækna, stöðu mánaðar og tilkynningar — eins og ekkert hafi verið gert. <b>Haldið:</b> læknar og
          innskráning þeirra, vaktategundir, stillingar, dagatalstengingar og breytingaskrá. Læknar fá ekki tilkynningu; vaktirnar hverfa úr dagatölum þeirra.
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
        <label className="inline-flex items-center gap-2">
          <input type="radio" name="reset-scope" checked={scope === "month"} onChange={() => setScope("month")} /> Einn mánuður
        </label>
        {scope === "month" && (
          <span className="block w-full sm:w-52">
            <select className={inputCls} value={month} onChange={(e) => setMonth(e.target.value)} aria-label="Mánuður">
              {monthOptions.map((m) => <option key={m} value={m}>{monthLabel(m)}</option>)}
            </select>
          </span>
        )}
        <label className="inline-flex items-center gap-2">
          <input type="radio" name="reset-scope" checked={scope === "all"} onChange={() => setScope("all")} /> Allt vaktakerfið (allir mánuðir)
        </label>
      </div>
      <div className="rounded-xl bg-slate-50 px-3.5 py-2.5 text-sm text-slate-700">
        {!counts ? "Tel…" : empty ? `Ekkert til að hreinsa fyrir ${target}.` : (
          <>Verður eytt: <b>{counts.shifts}</b> vakt{counts.shifts === 1 ? "" : "ir"}, <b>{counts.preferences}</b> ósk{counts.preferences === 1 ? "" : "ir"},{" "}
            <b>{counts.swaps}</b> vaktaskipti, <b>{counts.notifications}</b> tilkynning{counts.notifications === 1 ? "" : "ar"} og staða{" "}
            <b>{counts.months}</b> mánaðar{counts.months === 1 ? "" : "a"}.</>
        )}
      </div>
      <Field label={`Skrifaðu ${RESET_WORD} til að staðfesta`}>
        <input className={cx(inputCls, "max-w-xs uppercase")} value={word} onChange={(e) => setWord(e.target.value)} autoComplete="off" aria-label="Staðfesting" />
      </Field>
      {msg && <Notice tone={msg.tone}>{msg.text}</Notice>}
      <Button variant="danger" onClick={() => void reset()} busy={busy} disabled={word.trim().toUpperCase() !== RESET_WORD || Boolean(empty)}>
        <RotateCcw className="h-4 w-4" /> Hreinsa {target}
      </Button>
    </Card>
  );
}

/** Þrír næstu almennu frídagar, til að sýna regluna í verki. */
function nextHolidays(): [string, string][] {
  const today = new Date().toISOString().slice(0, 10);
  const year = Number(today.slice(0, 4));
  return [...Object.entries(icelandicHolidays(year)), ...Object.entries(icelandicHolidays(year + 1))]
    .filter(([d]) => d >= today)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(0, 3);
}

function ShiftTypeCard({ ctx, type }: { ctx: PlannerCtx; type?: HsuShiftType }) {
  const blank: Omit<HsuShiftType, "id"> = { name: "", short: "", starts: "08:00", ends: "16:00", weekdays: [1, 2, 3, 4, 5], on_holidays: false, skip_holidays: true, kind: "other", period: "day", slots_per_day: 1, split_at: null, rest_days_after: 0, color: "#1d4f91", sort: 10, active: true };
  const [v, setV] = useState<Omit<HsuShiftType, "id">>(type ?? blank);
  const [open, setOpen] = useState(Boolean(type));
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const set = (p: Partial<HsuShiftType>) => setV((x) => ({ ...x, ...p }));
  const dirty = JSON.stringify(v) !== JSON.stringify(type ?? blank);

  if (!type && !open) {
    return (
      <button onClick={() => setOpen(true)} className="flex min-h-40 items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-300 text-sm font-semibold text-slate-500 hover:border-[var(--hsu)] hover:text-[var(--hsu)]">
        <Plus className="h-4 w-4" /> Ný vaktategund
      </button>
    );
  }

  const save = async () => {
    setBusy("save"); setErr(null);
    const r = type
      ? await hsuApi(`/api/hsu/admin/shift-types/${type.id}`, { method: "PATCH", body: v, staff: true })
      : await hsuApi("/api/hsu/admin/shift-types", { body: v, staff: true });
    setBusy(null);
    if (!r.ok) { setErr(r.error ?? "Mistókst"); return; }
    if (!type) { setV(blank); setOpen(false); }
    await ctx.reload();
  };

  return (
    <Card className={cx("space-y-3 p-5", type && !type.active && "opacity-60")}>
      <div className="grid grid-cols-[1fr_90px] gap-3">
        <Field label="Heiti"><input className={inputCls} value={v.name} onChange={(e) => set({ name: e.target.value })} placeholder="t.d. Bakvakt" /></Field>
        <Field label="Skammstöfun"><input className={inputCls} value={v.short} onChange={(e) => set({ short: e.target.value })} placeholder="BV" maxLength={8} /></Field>
      </div>
      <Field label="Hólf á vaktaplani" hint="Dagvaktir og kvöld-/næturvaktir birtast í sitt hvoru hólfi hvers dags.">
        <div className="grid grid-cols-2 gap-2">
          {(Object.keys(SHIFT_PERIOD_IS) as ShiftPeriod[]).map((p) => (
            <button key={p} type="button" onClick={() => set({ period: p })}
              className={cx("rounded-lg border px-3 py-2 text-sm font-medium", v.period === p ? "border-[var(--hsu)] bg-[var(--hsu-soft)] text-[var(--hsu-dark)]" : "border-slate-200 text-slate-600")}>
              {SHIFT_PERIOD_IS[p]}
            </button>
          ))}
        </div>
      </Field>
      <Field label="Tegund" hint={v.kind === "forvakt" ? "Mönnuð alla daga sem hún á við." : v.kind === "bakvakt" ? "Aðeins læknar með bakvaktarréttindi; mönnuð þegar forvaktarlæknir þarf bakvakt." : "Mönnuð alla daga sem hún á við; hver læknir sem er."}>
        <select className={inputCls} value={v.kind} onChange={(e) => set({ kind: e.target.value as ShiftKind })}>
          {(Object.keys(SHIFT_KIND_IS) as ShiftKind[]).map((k) => <option key={k} value={k}>{SHIFT_KIND_IS[k]}</option>)}
        </select>
      </Field>
      <div className="grid grid-cols-3 gap-3">
        <Field label="Frá"><input type="time" className={inputCls} value={v.starts} onChange={(e) => set({ starts: e.target.value })} /></Field>
        <Field label="Til" hint={isOvernight(v.starts, v.ends) ? "Næsta dag" : undefined}><input type="time" className={inputCls} value={v.ends} onChange={(e) => set({ ends: e.target.value })} /></Field>
        <Field label="Hvíld eftir (dagar)"><input type="number" min={0} max={7} className={inputCls} value={v.rest_days_after} onChange={(e) => set({ rest_days_after: Number(e.target.value) })} /></Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Læknar á vakt" hint={v.slots_per_day > 1 ? `${v.slots_per_day} læknar allan daginn` : "Einn læknir allan daginn"}>
          <input type="number" min={1} max={6} className={inputCls} value={v.slots_per_day}
            onChange={(e) => set({ slots_per_day: Math.min(6, Math.max(1, Number(e.target.value) || 1)) })} />
        </Field>
        <Field label="Hádegi" hint="Notað þegar stakri vakt er skipt í tvennt á vaktaplaninu (hálfur dagur).">
          <input type="time" className={inputCls} value={(v.split_at ?? "12:00").slice(0, 5)}
            onChange={(e) => set({ split_at: e.target.value || null })} />
        </Field>
      </div>
      <div>
        <div className="text-xs font-semibold text-slate-600">Dagar</div>
        <div className="mt-1 flex flex-wrap gap-1">
          {WEEKDAY_ORDER.map((d) => (
            <button key={d} type="button" onClick={() => set({ weekdays: v.weekdays.includes(d) ? v.weekdays.filter((x) => x !== d) : [...v.weekdays, d] })}
              className={cx("rounded-lg px-2.5 py-1.5 text-xs font-semibold", v.weekdays.includes(d) ? "bg-[var(--hsu)] text-white" : "bg-slate-100 text-slate-500")}>
              {WEEKDAY_SHORT_IS[d]}
            </button>
          ))}
        </div>
        <div className="mt-3 text-xs font-semibold text-slate-600">
          Þegar almennur frídagur lendir á vikudegi (jóladagur, 17. júní, páskar …)
        </div>
        <div className="mt-1 grid gap-1">
          {([
            ["always", "Vaktin gildir líka þá", "Hún er búin til á öllum frídögum, líka þótt vikudagurinn sé ekki valinn hér fyrir ofan. Þannig er helgarvakt líka mönnuð á jóladag."],
            ["never", "Vaktin fellur niður þá", "Hún er ekki búin til á frídegi þótt vikudagurinn sé valinn — virkradagavakt víkur fyrir helgar-/frídagavaktinni."],
            ["weekday", "Frídagar breyta engu", "Aðeins vikudagarnir hér fyrir ofan ráða."],
          ] as const).map(([key, label, hint]) => {
            const cur = v.on_holidays ? "always" : v.skip_holidays ? "never" : "weekday";
            return (
              <label key={key} className={cx("flex cursor-pointer items-start gap-2 rounded-lg border px-2.5 py-2 text-sm", cur === key ? "border-[var(--hsu)] bg-[var(--hsu-soft)]" : "border-slate-200")}>
                <input type="radio" className="mt-1" checked={cur === key} onChange={() => set({ on_holidays: key === "always", skip_holidays: key === "never" })} />
                <span><span className="block font-medium">{label}</span><span className="block text-[11px] text-slate-500">{hint}</span></span>
              </label>
            );
          })}
        </div>
        {/* Dæmi með næstu frídögum: fljótlegra að sjá útkomuna en að lesa regluna. */}
        <div className="mt-2 rounded-lg bg-slate-50 px-2.5 py-2 text-[11px] text-slate-600">
          <span className="font-semibold text-slate-700">Næstu frídagar:</span>{" "}
          {nextHolidays().map(([date, name]) => (
            <span key={date} className="mr-2 inline-flex items-center gap-1">
              {name} {dayLabel(date)} ({WEEKDAY_SHORT_IS[weekdayOf(date)].toLowerCase()}):{" "}
              <b className={typeAppliesOn(v, date) ? "text-emerald-700" : "text-slate-400"}>{typeAppliesOn(v, date) ? "vakt" : "engin vakt"}</b>
            </span>
          ))}
        </div>
      </div>
      {err && <Notice tone="err">{err}</Notice>}
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" onClick={save} busy={busy === "save"} disabled={!dirty || !v.name.trim()}><Save className="h-3.5 w-3.5" /> {type ? "Vista" : "Bæta við"}</Button>
        {type && (
          <label className="ml-1 flex items-center gap-1.5 text-xs text-slate-600">
            <input type="checkbox" checked={v.active} onChange={(e) => set({ active: e.target.checked })} /> Virk
          </label>
        )}
        {type ? (
          <Button size="sm" variant="danger" className="ml-auto" busy={busy === "del"} onClick={async () => {
            if (!confirm(`Fjarlægja „${type.name}“? Vaktir sem þegar eru til standa.`)) return;
            setBusy("del"); await hsuApi(`/api/hsu/admin/shift-types/${type.id}`, { method: "DELETE", staff: true }); setBusy(null); await ctx.reload();
          }}><Trash2 className="h-3.5 w-3.5" /></Button>
        ) : (
          <Button size="sm" variant="ghost" onClick={() => { setOpen(false); setV(blank); }}>Hætta við</Button>
        )}
      </div>
    </Card>
  );
}
