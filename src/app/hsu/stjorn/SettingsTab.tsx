"use client";

import { Fragment, useCallback, useEffect, useState, type ReactNode } from "react";
import { Plus, RotateCcw, Save, Trash2 } from "lucide-react";
import { Button, Card, Field, Notice, cx, hsuApi, inputCls } from "../_components/ui";
import {
  SHIFT_KIND_IS, SHIFT_PERIOD_IS, WEEKDAY_ORDER, icelandicHolidays, isOvernight, typeAppliesOn,
  type HsuShiftType, type ShiftKind, type ShiftPeriod,
} from "@/lib/hsu/types";
import { useCommon, useT } from "@/lib/hsu/i18n/client";
import { dayLabelL, holidayL, monthLabelL, shiftKindL, shiftPeriodL, weekdayShortL, weekdayShortOf } from "@/lib/hsu/i18n/format";
import { admin } from "@/lib/hsu/i18n/messages/admin";
import type { PlannerCtx } from "./types";

/** Setur íhluti (t.d. feitletrun) í stað {breyta} í þýddum texta. */
function rich(template: string, parts: Record<string, ReactNode>): ReactNode {
  return template.split(/\{(\w+)\}/).map((s, i) => (i % 2 ? <Fragment key={i}>{parts[s] ?? `{${s}}`}</Fragment> : s));
}

export default function SettingsTab({ ctx }: { ctx: PlannerCtx }) {
  const { data } = ctx;
  const t = useT(admin);
  const c = useCommon();
  const [unit, setUnit] = useState(data.settings.unit_name);
  const [approval, setApproval] = useState(data.settings.market_requires_approval);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ tone: "ok" | "err"; text: string } | null>(null);

  const saveSettings = async () => {
    setBusy("s"); setMsg(null);
    const r = await hsuApi("/api/hsu/admin/settings", { method: "PUT", body: { unit_name: unit, market_requires_approval: approval }, staff: true });
    setBusy(null);
    setMsg(r.ok ? { tone: "ok", text: t("settings.saved") } : { tone: "err", text: r.error ?? t("doctors.failed") });
    if (r.ok) await ctx.reload();
  };

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">{t("settings.title")}</h1>

      <Card className="space-y-4 p-5">
        <Field label={t("settings.unitName")}><input className={inputCls} value={unit} onChange={(e) => setUnit(e.target.value)} /></Field>
        <label className="flex items-start gap-3">
          <input type="checkbox" className="mt-1 h-4 w-4" checked={approval} onChange={(e) => setApproval(e.target.checked)} />
          <span>
            <span className="block text-sm font-semibold">{t("settings.approval")}</span>
            <span className="block text-xs text-slate-500">{t("settings.approvalHint")}</span>
          </span>
        </label>
        {msg && <Notice tone={msg.tone}>{msg.text}</Notice>}
        <Button onClick={saveSettings} busy={busy === "s"}><Save className="h-4 w-4" /> {c("action.save")}</Button>
      </Card>

      <div>
        <h2 className="text-lg font-bold">{t("settings.types")}</h2>
        <p className="text-sm text-slate-500">
          {rich(t("settings.typesIntro"), { forvakt: <b>{t("settings.forvakt")}</b>, bakvakt: <b>{t("settings.bakvakt")}</b> })}
        </p>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {data.shiftTypes.map((st) => <ShiftTypeCard key={st.id} ctx={ctx} type={st} />)}
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
  const t = useT(admin);
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

  const target = scope === "all" ? t("reset.allTarget") : monthLabelL(month, t.lang);
  const reset = async () => {
    if (word.trim().toUpperCase() !== RESET_WORD) return;
    if (!confirm(t("reset.confirm", { target }))) return;
    setBusy(true); setMsg(null);
    const r = await hsuApi<{ cleared: ResetCounts }>("/api/hsu/admin/reset", { body: { scope, month, confirm: word }, staff: true });
    setBusy(false);
    if (!r.ok) { setMsg({ tone: "err", text: r.error ?? t("doctors.failed") }); return; }
    setWord("");
    setMsg({ tone: "ok", text: t("reset.done", { target, shifts: t.n("reset.shifts", r.cleared.shifts), prefs: t.n("reset.prefs", r.cleared.preferences) }) });
    await Promise.all([ctx.reload(), loadCounts()]);
  };

  const empty = counts && Object.values(counts).every((n) => n === 0);
  return (
    <Card className="space-y-4 border-red-200! p-5">
      <div>
        <h2 className="flex items-center gap-2 text-lg font-bold text-red-800"><RotateCcw className="h-5 w-5" /> {t("reset.title")}</h2>
        <p className="text-sm text-slate-600">
          {rich(t("reset.intro"), { kept: <b>{t("reset.kept")}</b> })}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
        <label className="inline-flex items-center gap-2">
          <input type="radio" name="reset-scope" checked={scope === "month"} onChange={() => setScope("month")} /> {t("reset.oneMonth")}
        </label>
        {scope === "month" && (
          <span className="block w-full sm:w-52">
            <select className={inputCls} value={month} onChange={(e) => setMonth(e.target.value)} aria-label={t("reset.month")}>
              {monthOptions.map((m) => <option key={m} value={m}>{monthLabelL(m, t.lang)}</option>)}
            </select>
          </span>
        )}
        <label className="inline-flex items-center gap-2">
          <input type="radio" name="reset-scope" checked={scope === "all"} onChange={() => setScope("all")} /> {t("reset.all")}
        </label>
      </div>
      <div className="rounded-xl bg-slate-50 px-3.5 py-2.5 text-sm text-slate-700">
        {!counts ? t("reset.counting") : empty ? t("reset.nothing", { target }) : rich(t("reset.willDelete"), {
          shifts: <b>{t.n("reset.shifts", counts.shifts)}</b>,
          prefs: <b>{t.n("reset.prefs", counts.preferences)}</b>,
          swaps: <b>{t.n("reset.swaps", counts.swaps)}</b>,
          notifications: <b>{t.n("reset.notifications", counts.notifications)}</b>,
          months: <b>{t.n("reset.months", counts.months)}</b>,
        })}
      </div>
      <Field label={t("reset.typeWord", { word: RESET_WORD })}>
        <input className={cx(inputCls, "max-w-xs uppercase")} value={word} onChange={(e) => setWord(e.target.value)} autoComplete="off" aria-label={t("reset.confirmAria")} />
      </Field>
      {msg && <Notice tone={msg.tone}>{msg.text}</Notice>}
      <Button variant="danger" onClick={() => void reset()} busy={busy} disabled={word.trim().toUpperCase() !== RESET_WORD || Boolean(empty)}>
        <RotateCcw className="h-4 w-4" /> {t("reset.button", { target })}
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
  const t = useT(admin);
  const c = useCommon();
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
        <Plus className="h-4 w-4" /> {t("types.new")}
      </button>
    );
  }

  const save = async () => {
    setBusy("save"); setErr(null);
    const r = type
      ? await hsuApi(`/api/hsu/admin/shift-types/${type.id}`, { method: "PATCH", body: v, staff: true })
      : await hsuApi("/api/hsu/admin/shift-types", { body: v, staff: true });
    setBusy(null);
    if (!r.ok) { setErr(r.error ?? t("doctors.failed")); return; }
    if (!type) { setV(blank); setOpen(false); }
    await ctx.reload();
  };

  return (
    <Card className={cx("space-y-3 p-5", type && !type.active && "opacity-60")}>
      <div className="grid grid-cols-[1fr_90px] gap-3">
        <Field label={t("types.name")}><input className={inputCls} value={v.name} onChange={(e) => set({ name: e.target.value })} placeholder={t("types.namePlaceholder")} /></Field>
        <Field label={t("types.short")}><input className={inputCls} value={v.short} onChange={(e) => set({ short: e.target.value })} placeholder="BV" maxLength={8} /></Field>
      </div>
      <Field label={t("types.period")} hint={t("types.periodHint")}>
        <div className="grid grid-cols-2 gap-2">
          {(Object.keys(SHIFT_PERIOD_IS) as ShiftPeriod[]).map((p) => (
            <button key={p} type="button" onClick={() => set({ period: p })}
              className={cx("rounded-lg border px-3 py-2 text-sm font-medium", v.period === p ? "border-[var(--hsu)] bg-[var(--hsu-soft)] text-[var(--hsu-dark)]" : "border-slate-200 text-slate-600")}>
              {shiftPeriodL(p, t.lang)}
            </button>
          ))}
        </div>
      </Field>
      <Field label={t("types.kind")} hint={v.kind === "forvakt" ? t("types.kindHint.forvakt") : v.kind === "bakvakt" ? t("types.kindHint.bakvakt") : t("types.kindHint.other")}>
        <select className={inputCls} value={v.kind} onChange={(e) => set({ kind: e.target.value as ShiftKind })}>
          {(Object.keys(SHIFT_KIND_IS) as ShiftKind[]).map((k) => <option key={k} value={k}>{shiftKindL(k, t.lang)}</option>)}
        </select>
      </Field>
      <div className="grid grid-cols-3 gap-3">
        <Field label={t("types.from")}><input type="time" className={inputCls} value={v.starts} onChange={(e) => set({ starts: e.target.value })} /></Field>
        <Field label={t("types.to")} hint={isOvernight(v.starts, v.ends) ? t("types.nextDay") : undefined}><input type="time" className={inputCls} value={v.ends} onChange={(e) => set({ ends: e.target.value })} /></Field>
        <Field label={t("types.rest")}><input type="number" min={0} max={7} className={inputCls} value={v.rest_days_after} onChange={(e) => set({ rest_days_after: Number(e.target.value) })} /></Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label={t("types.slots")} hint={v.slots_per_day > 1 ? t("types.slotsMany", { n: v.slots_per_day }) : t("types.slotsOne")}>
          <input type="number" min={1} max={6} className={inputCls} value={v.slots_per_day}
            onChange={(e) => set({ slots_per_day: Math.min(6, Math.max(1, Number(e.target.value) || 1)) })} />
        </Field>
        <Field label={t("types.splitAt")} hint={t("types.splitAtHint")}>
          <input type="time" className={inputCls} value={(v.split_at ?? "12:00").slice(0, 5)}
            onChange={(e) => set({ split_at: e.target.value || null })} />
        </Field>
      </div>
      <div>
        <div className="text-xs font-semibold text-slate-600">{t("types.days")}</div>
        <div className="mt-1 flex flex-wrap gap-1">
          {WEEKDAY_ORDER.map((d) => (
            <button key={d} type="button" onClick={() => set({ weekdays: v.weekdays.includes(d) ? v.weekdays.filter((x) => x !== d) : [...v.weekdays, d] })}
              className={cx("rounded-lg px-2.5 py-1.5 text-xs font-semibold", v.weekdays.includes(d) ? "bg-[var(--hsu)] text-white" : "bg-slate-100 text-slate-500")}>
              {weekdayShortL(d, t.lang)}
            </button>
          ))}
        </div>
        <div className="mt-3 text-xs font-semibold text-slate-600">
          {t("types.holidays")}
        </div>
        <div className="mt-1 grid gap-1">
          {([
            ["always", t("types.hol.always"), t("types.hol.alwaysHint")],
            ["never", t("types.hol.never"), t("types.hol.neverHint")],
            ["weekday", t("types.hol.weekday"), t("types.hol.weekdayHint")],
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
          <span className="font-semibold text-slate-700">{t("types.nextHolidays")}</span>{" "}
          {nextHolidays().map(([date, name]) => (
            <span key={date} className="mr-2 inline-flex items-center gap-1">
              {holidayL(name, t.lang)} {dayLabelL(date, t.lang)} ({weekdayShortOf(date, t.lang).toLocaleLowerCase()}):{" "}
              <b className={typeAppliesOn(v, date) ? "text-emerald-700" : "text-slate-400"}>{typeAppliesOn(v, date) ? t("types.shift") : t("types.noShift")}</b>
            </span>
          ))}
        </div>
      </div>
      {err && <Notice tone="err">{err}</Notice>}
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" onClick={save} busy={busy === "save"} disabled={!dirty || !v.name.trim()}><Save className="h-3.5 w-3.5" /> {type ? c("action.save") : t("types.add")}</Button>
        {type && (
          <label className="ml-1 flex items-center gap-1.5 text-xs text-slate-600">
            <input type="checkbox" checked={v.active} onChange={(e) => set({ active: e.target.checked })} /> {t("types.active")}
          </label>
        )}
        {type ? (
          <Button size="sm" variant="danger" className="ml-auto" busy={busy === "del"} onClick={async () => {
            if (!confirm(t("types.deleteConfirm", { name: type.name }))) return;
            setBusy("del"); await hsuApi(`/api/hsu/admin/shift-types/${type.id}`, { method: "DELETE", staff: true }); setBusy(null); await ctx.reload();
          }}><Trash2 className="h-3.5 w-3.5" /></Button>
        ) : (
          <Button size="sm" variant="ghost" onClick={() => { setOpen(false); setV(blank); }}>{c("action.cancel")}</Button>
        )}
      </div>
    </Card>
  );
}
