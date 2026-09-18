"use client";

// Vaktaóskir fyrir einn mánuð.
//
// Læknirinn "málar" dagatalið: velur pensil (Get ekki / Vil gjarnan / Laus /
// Hreinsa) og smellir á daga eða dregur yfir þá. "Laus" er jákvæð merking —
// læknirinn getur unnið þann dag — og litar daginn eins og hinar. Vikudagsreglur ("aldrei á mánudögum") eru
// settar í hausnum og gilda allan mánuðinn; einstakur dagur trompar regluna.

import { useEffect, useMemo, useRef, useState } from "react";
import { Ban, Check, CircleCheck, Copy, Heart, Eraser, Send, Save, Sun, Sunrise, Sunset } from "lucide-react";
import {
  WEEKDAY_ORDER, datesInMonth, holidayName, markFor, shiftMonth, weekdayOf,
  type DayMark, type DayPart, type DayPlan, type HsuPreference, type Mark, type PrefStatus,
} from "@/lib/hsu/types";
import { useCommon, useT } from "@/lib/hsu/i18n/client";
import { capFirstL, dayLabelL, holidayL, monthLabelL, weekdayShortL } from "@/lib/hsu/i18n/format";
import { prefs } from "@/lib/hsu/i18n/messages/prefs";
import { Badge, Button, Notice, cx, inputCls } from "./ui";

export interface PrefDraft {
  day_marks: Record<string, DayMark>;
  weekday_marks: Record<string, Mark>;
  /** Kvöld- og næturvaktir aðeins þessa vikudaga. Tómt = alla daga. */
  evening_weekdays: number[];
  /** Dagvaktir: allan daginn, fyrir hádegi eða eftir hádegi — regla mánaðarins. */
  day_part: DayPart;
  /** Stakir dagar á flýtimóttöku sem víkja frá reglunni (þ.m.t. „none“ = ekki þann dag). */
  day_part_marks: Record<string, DayPlan>;
  min_shifts: number | null;
  max_shifts: number | null;
  note: string;
}

type Brush = "off" | "want" | "ok" | "clear";
/** Það sem pensilstroka gerir í raun — ákveðið á fyrsta degi strokunnar. */
type Stroke = Brush;

/** Penslar í skrefi 3 (flýtimóttaka): hluti dagsins, „Ekki“, eða aftur eftir reglu. */
type FmBrush = DayPlan | "rule";

export const PREF_TONE: Record<PrefStatus | "none", "slate" | "blue" | "green" | "amber" | "red"> = {
  none: "slate", draft: "amber", submitted: "blue", approved: "green", changes_requested: "red",
};

function emptyDraft(): PrefDraft {
  return { day_marks: {}, weekday_marks: {}, evening_weekdays: [], day_part: "all", day_part_marks: {}, min_shifts: null, max_shifts: null, note: "" };
}

export function draftFrom(p: Pick<HsuPreference, "day_marks" | "weekday_marks" | "evening_weekdays" | "day_part" | "day_part_marks" | "min_shifts" | "max_shifts" | "note"> | null | undefined): PrefDraft {
  if (!p) return emptyDraft();
  return {
    day_marks: { ...(p.day_marks ?? {}) },
    weekday_marks: { ...(p.weekday_marks ?? {}) },
    evening_weekdays: [...(p.evening_weekdays ?? [])],
    day_part: p.day_part ?? "all",
    day_part_marks: { ...(p.day_part_marks ?? {}) },
    min_shifts: p.min_shifts ?? null,
    max_shifts: p.max_shifts ?? null,
    note: p.note ?? "",
  };
}

/** Vikur mánaðarins, mánudagur fyrst; null fyrir daga utan mánaðar. */
export function monthWeeks(month: string): (string | null)[][] {
  const dates = datesInMonth(month);
  const lead = WEEKDAY_ORDER.indexOf(weekdayOf(dates[0]));
  const cells: (string | null)[] = [...Array(lead).fill(null), ...dates];
  while (cells.length % 7) cells.push(null);
  const weeks: (string | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

/**
 * Setur React-hnúta inn í þýddan texta: rich("Skilafrestur {date}", { date: <b>…</b> }).
 * Breytur sem ekki eru gefnar standa óbreyttar.
 */
export function rich(text: string, parts: Record<string, React.ReactNode>): React.ReactNode[] {
  return text.split(/(\{\w+\})/).map((seg, i) => {
    const m = /^\{(\w+)\}$/.exec(seg);
    if (m && m[1] in parts) return <span key={i}>{parts[m[1]]}</span>;
    return seg;
  });
}

export default function PrefsEditor({
  month, initial, status, reviewNote, editable, lockedReason, onSave, mode = "doctor", onLoadPrevious, onProgress, dayWeekdays = [],
}: {
  month: string;
  initial: PrefDraft;
  status: PrefStatus | "none";
  reviewNote?: string;
  editable: boolean;
  lockedReason?: string;
  mode?: "doctor" | "admin";
  onSave: (draft: PrefDraft, opts: { submit: boolean; alsoNext: boolean; approve?: boolean }) => Promise<{ ok: boolean; error?: string; copiedTo?: string | null }>;
  onLoadPrevious?: () => Promise<PrefDraft | null>;
  /** Föstu vikudagarnir á flýtimóttöku (tómt = allir virkir dagar) — sjálfgefið í dagatali skrefs 3. */
  dayWeekdays?: number[];
  /** Hvaða skref eru búin (2 = dagar merktir, 6 = sent) — fyrir yfirlitið efst. */
  onProgress?: (p: { daysMarked: boolean; fmMarked: boolean; sent: boolean }) => void;
}) {
  const t = useT(prefs);
  const c = useCommon();
  const [draft, setDraft] = useState<PrefDraft>(initial);
  const [brush, setBrush] = useState<Brush>("off");
  const [alsoNext, setAlsoNext] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ tone: "ok" | "err"; text: string } | null>(null);
  const [dirty, setDirty] = useState(false);
  const painting = useRef<null | Stroke>(null);
  const [fmBrush, setFmBrush] = useState<FmBrush>("all");
  const fmPainting = useRef<null | FmBrush>(null);

  useEffect(() => {
    // Nýr mánuður eða nýtt upphafsgildi frá þjóni: byrja upp á nýtt.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDraft(initial); setDirty(false); setMsg(null);
  }, [initial]);

  useEffect(() => {
    const stop = () => { painting.current = null; fmPainting.current = null; };
    window.addEventListener("pointerup", stop);
    window.addEventListener("pointercancel", stop);
    return () => { window.removeEventListener("pointerup", stop); window.removeEventListener("pointercancel", stop); };
  }, []);

  const weeks = useMemo(() => monthWeeks(month), [month]);
  const dates = useMemo(() => datesInMonth(month), [month]);
  const next = shiftMonth(month, 1);

  const update = (fn: (d: PrefDraft) => PrefDraft) => { setDraft(fn); setDirty(true); setMsg(null); };

  const applyBrush = (date: string, b: Stroke) => {
    update((d) => {
      const day = { ...d.day_marks };
      // Hreinsa fjarlægir merkingu dagsins; vikudagsregla gildir þá aftur.
      // Flýtimóttakan (skref 3) er sér og breytist ekki hér.
      if (b === "clear") delete day[date]; else day[date] = b;
      return { ...d, day_marks: day };
    });
  };

  // ── Skref 3: stakir dagar á flýtimóttöku ──
  // Sjálfgefið: föstu vikudagarnir og hluti dagsins úr reglu mánaðarins.
  const fmDefault = (date: string): DayPlan =>
    dayWeekdays.length === 0 || dayWeekdays.includes(weekdayOf(date)) ? draft.day_part : "none";
  const fmDay = (date: string) => {
    const wd = weekdayOf(date);
    return wd >= 1 && wd <= 5 && !holidayName(date);
  };
  const fmLocked = (date: string) => !editable || !fmDay(date) || markFor(draft, date) === "off";
  const applyFm = (date: string, b: FmBrush) => {
    if (fmLocked(date)) return;
    update((d) => {
      const parts = { ...d.day_part_marks };
      if (b === "rule") delete parts[date]; else parts[date] = b;
      return { ...d, day_part_marks: parts };
    });
  };
  // Sami pensill á dag sem þegar ber hann: aftur eftir reglu (eins og í skrefi 2).
  const fmStrokeFor = (date: string): FmBrush => (fmBrush !== "rule" && draft.day_part_marks[date] === fmBrush ? "rule" : fmBrush);
  const fmMouse = useRef(false);
  const onFmDown = (e: React.PointerEvent, date: string) => {
    if (fmLocked(date) || e.pointerType !== "mouse") return;
    e.preventDefault();
    const b = fmStrokeFor(date);
    fmPainting.current = b;
    fmMouse.current = true;
    applyFm(date, b);
  };
  const onFmTap = (date: string) => {
    if (fmMouse.current) { fmMouse.current = false; return; }
    applyFm(date, fmStrokeFor(date));
  };
  const onFmEnter = (date: string) => { if (fmPainting.current) applyFm(date, fmPainting.current); };

  // Mús: ýtt niður og dregið málar marga daga. Snerting: aðeins smellur, svo
  // hægt sé að fletta síðunni með fingri yfir dagatalinu án þess að mála.
  const mouseHandled = useRef(false);
  // Smellur á dag sem þegar ber þessa merkingu tekur hana af (toggle).
  const brushFor = (date: string): Stroke => (brush !== "clear" && draft.day_marks[date] === brush ? "clear" : brush);
  const onDown = (e: React.PointerEvent, date: string) => {
    if (!editable || e.pointerType !== "mouse") return;
    e.preventDefault();
    const b = brushFor(date);
    painting.current = b;
    mouseHandled.current = true;
    applyBrush(date, b);
  };
  const onTap = (date: string) => {
    if (!editable) return;
    if (mouseHandled.current) { mouseHandled.current = false; return; }
    applyBrush(date, brushFor(date));
  };
  const onEnter = (date: string) => { if (editable && painting.current) applyBrush(date, painting.current); };

  const cycleWeekday = (wd: number) => {
    if (!editable) return;
    update((d) => {
      const w = { ...d.weekday_marks };
      const cur = w[String(wd)];
      if (!cur) w[String(wd)] = "off"; else if (cur === "off") w[String(wd)] = "want"; else delete w[String(wd)];
      return { ...d, weekday_marks: w };
    });
  };

  const counts = useMemo(() => {
    let off = 0, want = 0, ok = 0;
    for (const dt of dates) {
      const m = markFor(draft, dt);
      if (m === "off") off++; else if (m === "want") want++; else if (draft.day_marks[dt] === "ok") ok++;
    }
    return { off, want, ok, unmarked: dates.length - off - want - ok };
  }, [draft, dates]);

  const steps = mode === "doctor" && editable;
  const daysMarked = counts.off + counts.want + counts.ok > 0 || Object.keys(draft.weekday_marks).length > 0;
  const fmMarked = Object.keys(draft.day_part_marks).length > 0;
  const sent = (status === "submitted" || status === "approved") && !dirty;
  useEffect(() => { onProgress?.({ daysMarked, fmMarked, sent }); }, [onProgress, daysMarked, fmMarked, sent]);

  const save = async (submit: boolean, approve = false) => {
    if (draft.min_shifts != null && draft.max_shifts != null && draft.min_shifts > draft.max_shifts) {
      setMsg({ tone: "err", text: t("error.minMax") });
      return;
    }
    setBusy(approve ? "approve" : submit ? "submit" : "save");
    const r = await onSave(draft, { submit, alsoNext, approve });
    setBusy(null);
    if (!r.ok) { setMsg({ tone: "err", text: r.error ?? t("error.saveFailed") }); return; }
    setDirty(false);
    const main = approve ? t("saved.approved") : submit ? t("saved.submitted") : t("saved.draft");
    const copied = r.copiedTo ? t("saved.copied", { month: monthLabelL(r.copiedTo, t.lang) }) : "";
    setMsg({ tone: "ok", text: copied ? `${main} ${copied}` : main });
  };

  const loadPrev = async () => {
    if (!onLoadPrevious) return;
    setBusy("prev");
    const prev = await onLoadPrevious();
    setBusy(null);
    if (!prev) { setMsg({ tone: "err", text: t("error.noPrevious") }); return; }
    // Aðeins það sem á við milli mánaða; dagsetningar fyrri mánaðar gera það ekki.
    update((d) => ({ ...d, weekday_marks: prev.weekday_marks, evening_weekdays: prev.evening_weekdays, day_part: prev.day_part, min_shifts: prev.min_shifts, max_shifts: prev.max_shifts, note: prev.note }));
  };

  const cellTone = (date: string) => {
    const explicit = draft.day_marks[date];
    const m = markFor(draft, date);
    const fromWeekday = !explicit && m;
    if (m === "off") return fromWeekday ? "bg-red-50 text-red-700 ring-1 ring-inset ring-red-200 [background-image:repeating-linear-gradient(135deg,transparent_0_6px,rgba(220,38,38,.07)_6px_12px)]" : "bg-red-500 text-white";
    if (m === "want") return fromWeekday ? "bg-emerald-50 text-emerald-800 ring-1 ring-inset ring-emerald-200 [background-image:repeating-linear-gradient(135deg,transparent_0_6px,rgba(5,150,105,.08)_6px_12px)]" : "bg-emerald-500 text-white";
    if (explicit === "ok") return "bg-[var(--hsu)] text-white";
    return "bg-white text-slate-800 ring-1 ring-inset ring-slate-200 hover:bg-slate-50";
  };

  const brushes: { key: Brush; label: string; icon: React.ReactNode; cls: string }[] = [
    { key: "off", label: t("brush.off"), icon: <Ban className="h-4 w-4" />, cls: "data-[on=true]:bg-red-500 data-[on=true]:text-white data-[on=true]:ring-red-500" },
    { key: "want", label: t("brush.want"), icon: <Heart className="h-4 w-4" />, cls: "data-[on=true]:bg-emerald-500 data-[on=true]:text-white data-[on=true]:ring-emerald-500" },
    { key: "ok", label: t("brush.ok"), icon: <CircleCheck className="h-4 w-4" />, cls: "data-[on=true]:bg-[var(--hsu)] data-[on=true]:text-white data-[on=true]:ring-[var(--hsu)]" },
    { key: "clear", label: t("brush.clear"), icon: <Eraser className="h-4 w-4" />, cls: "data-[on=true]:bg-slate-700 data-[on=true]:text-white data-[on=true]:ring-slate-700" },
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-bold text-slate-900">{capFirstL(monthLabelL(month, t.lang), t.lang)}</h3>
          <Badge tone={PREF_TONE[status]}>{{ none: t("status.none"), draft: t("status.draft"), submitted: t("status.submitted"), approved: t("status.approved"), changes_requested: t("status.changes_requested") }[status]}</Badge>
        </div>
        {editable && onLoadPrevious && (
          <Button variant="ghost" size="sm" onClick={loadPrev} busy={busy === "prev"}><Copy className="h-3.5 w-3.5" /> {t("loadPrevious")}</Button>
        )}
      </div>

      {status === "changes_requested" && reviewNote && (
        <Notice tone="warn"><span className="font-semibold">{t("reviewNote")}</span> {reviewNote}</Notice>
      )}
      {!editable && lockedReason && <Notice tone="info">{lockedReason}</Notice>}

      <Step n={2} steps={steps} done={daysMarked} id="skref-2" title={t("step2.title")}
        hint={t("step2.hint")}
        plainTitle={editable ? t("step2.plain") : undefined}>
        {editable && (
          <div className="mb-3">
<div className="grid grid-cols-2 gap-2 sm:inline-grid sm:w-auto sm:grid-cols-4">
            {brushes.map((b) => (
              <button key={b.key} type="button" data-on={brush === b.key} onClick={() => setBrush(b.key)}
                className={cx("inline-flex items-center justify-center gap-1.5 rounded-xl bg-white px-3 py-2 text-sm font-semibold text-slate-700 ring-1 ring-slate-300 transition", b.cls)}>
                {b.icon} {b.label}
              </button>
            ))}
          </div>
          </div>
        )}
      <div className="select-none">
        <div className="grid grid-cols-7 gap-1.5">
          {WEEKDAY_ORDER.map((wd) => {
            const m = draft.weekday_marks[String(wd)];
            return (
              <button key={wd} type="button" onClick={() => cycleWeekday(wd)} disabled={!editable}
                title={editable ? t("weekday.ruleTitle") : undefined}
                className={cx(
                  "flex flex-col items-center rounded-lg py-1 text-[11px] font-bold uppercase tracking-wide transition",
                  m === "off" ? "bg-red-100 text-red-700" : m === "want" ? "bg-emerald-100 text-emerald-800" : "text-slate-500",
                  editable && "hover:bg-slate-100",
                )}>
                {weekdayShortL(wd, t.lang)}
                <span className="text-[9px] font-medium normal-case tracking-normal">{m === "off" ? t("weekday.never") : m === "want" ? t("weekday.prefer") : editable ? t("weekday.all") : " "}</span>
              </button>
            );
          })}
        </div>
        <div className="mt-1.5 grid grid-cols-7 gap-1.5">
          {weeks.flat().map((date, i) => {
            if (!date) return <div key={`e${i}`} />;
            const h = holidayL(holidayName(date), t.lang);
            const m = markFor(draft, date);
            const markText = m === "off" ? t("mark.off") : m === "want" ? t("mark.want") : draft.day_marks[date] === "ok" ? t("mark.ok") : t("mark.none");
            return (
              <button key={date} type="button"
                onPointerDown={(e) => onDown(e, date)}
                onPointerEnter={() => onEnter(date)}
                onClick={() => onTap(date)}
                aria-label={h ? t("cell.ariaHoliday", { day: dayLabelL(date, t.lang), holiday: h, mark: markText }) : t("cell.aria", { day: dayLabelL(date, t.lang), mark: markText })}
                className={cx("relative flex aspect-square min-h-11 flex-col items-center justify-center rounded-xl text-sm font-semibold transition sm:aspect-[4/3]", cellTone(date), !editable && "cursor-default")}>
                <span>{Number(date.slice(8))}</span>
                {m === "off" && <Ban className="h-3 w-3 opacity-80" />}
                {m === "want" && <Heart className="h-3 w-3 opacity-80" />}
                {!m && draft.day_marks[date] === "ok" && <CircleCheck className="h-3 w-3 opacity-80" />}
                {h && <span className="absolute left-1 top-1 h-1.5 w-1.5 rounded-full bg-amber-400" title={h} />}
              </button>
            );
          })}
        </div>
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-500">
          <span className="inline-flex items-center gap-1"><span className="h-2.5 w-2.5 rounded bg-red-500" /> {t("legend.off", { n: counts.off })}</span>
          <span className="inline-flex items-center gap-1"><span className="h-2.5 w-2.5 rounded bg-emerald-500" /> {t("legend.want", { n: counts.want })}</span>
          <span className="inline-flex items-center gap-1"><span className="h-2.5 w-2.5 rounded bg-[var(--hsu)]" /> {t("legend.ok", { n: counts.ok })}</span>
          <span className="inline-flex items-center gap-1"><span className="h-2.5 w-2.5 rounded ring-1 ring-slate-300" /> {t("legend.unmarked", { n: counts.unmarked })}</span>
          <span className="inline-flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-amber-400" /> {t("legend.holiday")}</span>
          <span className="inline-flex items-center gap-1"><span className="h-2.5 w-2.5 rounded bg-red-50 ring-1 ring-red-200" /> {t("legend.weekdayRule")}</span>
        </div>
      </div>

      </Step>

      <Step n={3} steps={steps} done={fmMarked} id="skref-3" title={t("step3.title")}
        hint={t("step3.hint")}
        plainTitle={t("step3.title")}>
        {/* Penslar og dagatal: smellt eða dregið yfir daga, eins og í skrefi 2. */}
        <div>
          <p className="text-[11px] text-slate-500">{t("step3.calendarHint")}</p>
          {editable && (
            <div className="mt-2 grid grid-cols-2 gap-2 sm:inline-grid sm:w-auto sm:grid-cols-5">
              {([
                ["all", <Sun key="i" className="h-4 w-4" />, "data-[on=true]:bg-[var(--hsu)] data-[on=true]:text-white data-[on=true]:ring-[var(--hsu)]"],
                ["am", <Sunrise key="i" className="h-4 w-4" />, "data-[on=true]:bg-[var(--hsu)] data-[on=true]:text-white data-[on=true]:ring-[var(--hsu)]"],
                ["pm", <Sunset key="i" className="h-4 w-4" />, "data-[on=true]:bg-[var(--hsu)] data-[on=true]:text-white data-[on=true]:ring-[var(--hsu)]"],
                ["none", <Ban key="i" className="h-4 w-4" />, "data-[on=true]:bg-slate-600 data-[on=true]:text-white data-[on=true]:ring-slate-600"],
                ["rule", <Eraser key="i" className="h-4 w-4" />, "data-[on=true]:bg-slate-700 data-[on=true]:text-white data-[on=true]:ring-slate-700"],
              ] as [FmBrush, React.ReactNode, string][]).map(([k, icon, cls]) => (
                <button key={k} type="button" data-on={fmBrush === k} onClick={() => setFmBrush(k)}
                  className={cx("inline-flex items-center justify-center gap-1.5 rounded-xl bg-white px-3 py-2 text-sm font-semibold text-slate-700 ring-1 ring-slate-300 transition", cls)}>
                  {icon} {t(`step3.brush.${k}` as "step3.brush.all")}
                </button>
              ))}
            </div>
          )}
          <div className="mt-2 grid grid-cols-7 gap-1.5 select-none">
            {WEEKDAY_ORDER.map((wd) => (
              <div key={wd} className="py-1 text-center text-[11px] font-bold uppercase tracking-wide text-slate-500">{weekdayShortL(wd, t.lang)}</div>
            ))}
            {weeks.flat().map((date, i) => {
              if (!date) return <div key={`f${i}`} />;
              const n = Number(date.slice(8));
              if (!fmDay(date)) {
                return <div key={date} className="flex aspect-square min-h-11 items-center justify-center rounded-xl text-sm text-slate-300 sm:aspect-[4/3]">{n}</div>;
              }
              const blocked = markFor(draft, date) === "off";
              const explicit = draft.day_part_marks[date];
              const eff: DayPlan = blocked ? "none" : explicit ?? fmDefault(date);
              const label = blocked ? t("step3.cell.blocked") : t(`step3.cell.${eff}` as "step3.cell.all");
              return (
                <button key={date} type="button" disabled={!editable || blocked}
                  onPointerDown={(e) => onFmDown(e, date)} onPointerEnter={() => onFmEnter(date)} onClick={() => onFmTap(date)}
                  aria-label={t("step3.cell.aria", { day: dayLabelL(date, t.lang), state: label })}
                  className={cx("relative flex aspect-square min-h-11 flex-col items-center justify-center rounded-xl text-sm font-semibold transition sm:aspect-[4/3]",
                    blocked ? "bg-red-50 text-red-300 [background-image:repeating-linear-gradient(135deg,transparent_0_6px,rgba(220,38,38,.07)_6px_12px)]"
                      : eff === "none" ? (explicit ? "bg-slate-200 text-slate-500 ring-2 ring-inset ring-slate-400" : "bg-white text-slate-400 ring-1 ring-inset ring-slate-200")
                      : explicit ? "bg-[var(--hsu)] text-white" : "bg-[var(--hsu-soft)] text-[var(--hsu-dark)] ring-1 ring-inset ring-[var(--hsu)]/20",
                    editable && !blocked && "hover:brightness-95")}>
                  <span>{n}</span>
                  <span className="text-[9px] font-bold leading-none">{label}</span>
                </button>
              );
            })}
          </div>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-500">
            <span className="inline-flex items-center gap-1"><span className="h-2.5 w-2.5 rounded bg-[var(--hsu-soft)] ring-1 ring-[var(--hsu)]/20" /> {t("step3.legend.rule")}</span>
            <span className="inline-flex items-center gap-1"><span className="h-2.5 w-2.5 rounded bg-[var(--hsu)]" /> {t("step3.legend.custom")}</span>
            <span className="inline-flex items-center gap-1"><span className="h-2.5 w-2.5 rounded bg-slate-200 ring-1 ring-slate-400" /> {t("step3.legend.none")}</span>
            <span className="inline-flex items-center gap-1"><span className="h-2.5 w-2.5 rounded bg-red-50 ring-1 ring-red-200" /> {t("step3.legend.blocked")}</span>
          </div>
        </div>
      </Step>

      <Step n={4} steps={steps} id="skref-4" optional title={t("step5.title")}
        hint={t("step5.hint")}
        plainTitle={t("step5.title")}>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <div className="text-xs font-semibold text-slate-600">{t("step5.countLabel")}</div>
          <div className="mt-1 flex items-center gap-2">
            <input type="number" min={0} max={31} placeholder={t("step5.min")} disabled={!editable} value={draft.min_shifts ?? ""}
              onChange={(e) => update((d) => ({ ...d, min_shifts: e.target.value === "" ? null : Math.max(0, Number(e.target.value)) }))}
              className={cx(inputCls, "w-24")} aria-label={t("step5.minAria")} />
            <span className="text-slate-400">–</span>
            <input type="number" min={0} max={31} placeholder={t("step5.max")} disabled={!editable} value={draft.max_shifts ?? ""}
              onChange={(e) => update((d) => ({ ...d, max_shifts: e.target.value === "" ? null : Math.max(0, Number(e.target.value)) }))}
              className={cx(inputCls, "w-24")} aria-label={t("step5.maxAria")} />
          </div>
          <p className="mt-1 text-[11px] text-slate-500">{t("step5.blank")}</p>
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-600">{t("step5.noteLabel")}</div>
          <textarea rows={2} disabled={!editable} value={draft.note} placeholder={t("step5.notePlaceholder")}
            onChange={(e) => update((d) => ({ ...d, note: e.target.value }))} className={cx(inputCls, "mt-1")} />
          </div>
        </div>
      </Step>

      {editable && (
        <Step n={5} steps={steps} done={sent} id="skref-5" title={t("step6.title")}
          hint={t("step6.hint")}>
          <div className="space-y-3">
          <label className="flex items-start gap-2.5 text-sm text-slate-700">
            <input type="checkbox" className="mt-0.5 h-4 w-4" checked={alsoNext} onChange={(e) => setAlsoNext(e.target.checked)} />
            <span>
              {rich(t("step6.alsoNext"), { month: <span className="font-semibold">{monthLabelL(next, t.lang)}</span> })}
              <span className="block text-[11px] text-slate-500">{t("step6.alsoNextHint")}</span>
            </span>
          </label>
          {msg && <Notice tone={msg.tone}>{msg.text}</Notice>}
          <div className="flex flex-wrap gap-2">
            {mode === "doctor" ? (
              <>
                <Button onClick={() => save(true)} busy={busy === "submit"} size="lg"><Send className="h-4 w-4" /> {t("action.submit")}</Button>
                <Button variant="ghost" onClick={() => save(false)} busy={busy === "save"} size="lg" disabled={!dirty}><Save className="h-4 w-4" /> {t("action.saveDraft")}</Button>
              </>
            ) : (
              <>
                <Button variant="success" onClick={() => save(true, true)} busy={busy === "approve"} size="lg"><Check className="h-4 w-4" /> {t("action.saveApprove")}</Button>
                <Button variant="ghost" onClick={() => save(true)} busy={busy === "submit"} size="lg"><Save className="h-4 w-4" /> {c("action.save")}</Button>
              </>
            )}
          </div>
          </div>
        </Step>
      )}
    </div>
  );
}

/**
 * Eitt skref: stórt númer, fyrirsögn og ein setning um hvað á að gera. Hjá
 * yfirlækni (og þegar mánuður er læstur) er það einföld fyrirsögn eins og áður.
 */
export function Step({ n, steps, title, hint, plainTitle, done, optional, id, children }: {
  n: number; steps: boolean; title: string; hint?: string; plainTitle?: string; done?: boolean; optional?: boolean; id?: string; children: React.ReactNode;
}) {
  const t = useT(prefs);
  if (!steps) {
    return (
      <div>
        {plainTitle && <div className="mb-1.5 text-xs font-semibold text-slate-600">{plainTitle}</div>}
        {children}
      </div>
    );
  }
  return (
    <section id={id} aria-labelledby={id ? `${id}-h` : undefined} className={cx("scroll-mt-24 rounded-2xl border bg-white p-4 sm:p-5", done ? "border-emerald-200" : "border-slate-200")}>
      <div className="flex items-start gap-3">
        <span className={cx("flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-base font-bold", done ? "bg-emerald-500 text-white" : "bg-[var(--hsu)] text-white")}
          aria-label={done ? t("step.ariaDone", { n }) : t("step.aria", { n })}>
          {done ? <Check className="h-5 w-5" /> : n}
        </span>
        <div className="min-w-0 flex-1">
          <h3 id={id ? `${id}-h` : undefined} className="flex flex-wrap items-center gap-2 text-base font-bold text-slate-900">
            {title}
            {optional && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">{t("step.optional")}</span>}
          </h3>
          {hint && <p className="mt-0.5 text-sm text-slate-600">{hint}</p>}
          <div className="mt-3">{children}</div>
        </div>
      </div>
    </section>
  );
}

/** Yfirlit skrefanna efst — hvert þeirra er hlekkur á sitt skref. */
export function PrefsStepNav({ daysMarked, fmMarked = false, sent }: { daysMarked: boolean; fmMarked?: boolean; sent: boolean }) {
  const t = useT(prefs);
  const items = [
    { n: 1, label: t("nav.1"), done: true },
    { n: 2, label: t("nav.2"), done: daysMarked },
    { n: 3, label: t("nav.3"), done: fmMarked },
    { n: 4, label: t("nav.5"), done: false, optional: true },
    { n: 5, label: t("nav.6"), done: sent },
  ];
  return (
    <nav aria-label={t("nav.aria")} className="overflow-x-auto">
      <ol className="flex min-w-max items-center gap-1">
        {items.map((it, i) => (
          <li key={it.n} className="flex items-center gap-1">
            <a href={`#skref-${it.n}`} className="flex items-center gap-1.5 rounded-full px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100">
              <span className={cx("flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold",
                it.done ? "bg-emerald-500 text-white" : it.optional ? "bg-slate-200 text-slate-600" : "bg-[var(--hsu)] text-white")}>
                {it.done ? <Check className="h-3.5 w-3.5" /> : it.n}
              </span>
              {it.label}
            </a>
            {i < items.length - 1 && <span aria-hidden className="h-px w-3 bg-slate-300 sm:w-5" />}
          </li>
        ))}
      </ol>
    </nav>
  );
}

/** Lítið, óbreytanlegt yfirlit óska — fyrir yfirferð yfirlæknis. */
export function PrefsMini({ month, pref }: { month: string; pref: Pick<HsuPreference, "day_marks" | "weekday_marks"> | null }) {
  const t = useCommon();
  const weeks = monthWeeks(month);
  return (
    <div className="inline-grid grid-cols-7 gap-0.5" aria-hidden>
      {WEEKDAY_ORDER.map((wd) => <span key={wd} className="text-center text-[8px] font-bold uppercase text-slate-400">{weekdayShortL(wd, t.lang)[0]}</span>)}
      {weeks.flat().map((date, i) => {
        if (!date) return <span key={i} className="h-5 w-5" />;
        const m = markFor(pref, date);
        return (
          <span key={date} title={dayLabelL(date, t.lang)} className={cx(
            "flex h-5 w-5 items-center justify-center rounded text-[9px] font-semibold",
            m === "off" ? "bg-red-500 text-white" : m === "want" ? "bg-emerald-500 text-white" : pref?.day_marks?.[date] === "ok" ? "bg-[var(--hsu)] text-white" : "bg-slate-100 text-slate-500",
          )}>{Number(date.slice(8))}</span>
        );
      })}
    </div>
  );
}
