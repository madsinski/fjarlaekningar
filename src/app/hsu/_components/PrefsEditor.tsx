"use client";

// Vaktaóskir fyrir einn mánuð.
//
// Læknirinn "málar" dagatalið: velur pensil (Get ekki / Vil gjarnan / Laus /
// Hreinsa) og smellir á daga eða dregur yfir þá. "Laus" er jákvæð merking —
// læknirinn getur unnið þann dag — og litar daginn eins og hinar. Vikudagsreglur ("aldrei á mánudögum") eru
// settar í hausnum og gilda allan mánuðinn; einstakur dagur trompar regluna.

import { useEffect, useMemo, useRef, useState } from "react";
import { Ban, Check, CircleCheck, Copy, Heart, Eraser, Send, Save, Sunrise, Sunset } from "lucide-react";
import {
  DAY_PART_IS, WEEKDAY_ORDER, WEEKDAY_SHORT_IS, datesInMonth, dayLabel, holidayName, markFor, monthLabel, shiftMonth, weekdayOf,
  type DayMark, type DayPart, type HsuPreference, type Mark, type PrefStatus,
} from "@/lib/hsu/types";
import { Badge, Button, Notice, cx, inputCls, capFirst } from "./ui";

export interface PrefDraft {
  day_marks: Record<string, DayMark>;
  weekday_marks: Record<string, Mark>;
  /** Kvöld- og næturvaktir aðeins þessa vikudaga. Tómt = alla daga. */
  evening_weekdays: number[];
  /** Dagvaktir: allan daginn, fyrir hádegi eða eftir hádegi — regla mánaðarins. */
  day_part: DayPart;
  /** Stakir dagar sem víkja frá reglunni. */
  day_part_marks: Record<string, DayPart>;
  min_shifts: number | null;
  max_shifts: number | null;
  note: string;
}

type Brush = "off" | "want" | "ok" | "am" | "pm" | "clear";
/** Það sem pensilstroka gerir í raun — ákveðið á fyrsta degi strokunnar. */
type Stroke = Brush | "unpart";

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

export default function PrefsEditor({
  month, initial, status, reviewNote, editable, lockedReason, onSave, mode = "doctor", onLoadPrevious, dayWorkSlot, onProgress,
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
  /** Fastir dagvinnudagar læknisins (gilda alla mánuði) — birtast í skrefi 3. */
  dayWorkSlot?: React.ReactNode;
  /** Hvaða skref eru búin (2 = dagar merktir, 6 = sent) — fyrir yfirlitið efst. */
  onProgress?: (p: { daysMarked: boolean; sent: boolean }) => void;
}) {
  const [draft, setDraft] = useState<PrefDraft>(initial);
  const [brush, setBrush] = useState<Brush>("off");
  const [alsoNext, setAlsoNext] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ tone: "ok" | "err"; text: string } | null>(null);
  const [dirty, setDirty] = useState(false);
  const painting = useRef<null | Stroke>(null);

  useEffect(() => {
    // Nýr mánuður eða nýtt upphafsgildi frá þjóni: byrja upp á nýtt.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDraft(initial); setDirty(false); setMsg(null);
  }, [initial]);

  useEffect(() => {
    const stop = () => { painting.current = null; };
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
      // Hálfur dagur er sjálfstæð merking: dagurinn getur bæði verið „vil
      // gjarnan" og „aðeins fyrir hádegi".
      if (b === "am" || b === "pm" || b === "unpart") {
        const parts = { ...d.day_part_marks };
        if (b === "unpart") delete parts[date]; else parts[date] = b;
        return { ...d, day_part_marks: parts };
      }
      const day = { ...d.day_marks };
      const parts = { ...d.day_part_marks };
      // Hreinsa fjarlægir merkingu dagsins; vikudagsregla gildir þá aftur.
      if (b === "clear") { delete day[date]; delete parts[date]; } else day[date] = b;
      return { ...d, day_marks: day, day_part_marks: parts };
    });
  };

  // Mús: ýtt niður og dregið málar marga daga. Snerting: aðeins smellur, svo
  // hægt sé að fletta síðunni með fingri yfir dagatalinu án þess að mála.
  const mouseHandled = useRef(false);
  // Smellur á dag sem þegar ber þessa merkingu tekur hana af (toggle).
  const brushFor = (date: string): Stroke => {
    if (brush === "am" || brush === "pm") return draft.day_part_marks[date] === brush ? "unpart" : brush;
    return brush !== "clear" && draft.day_marks[date] === brush ? "clear" : brush;
  };
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
  const sent = (status === "submitted" || status === "approved") && !dirty;
  useEffect(() => { onProgress?.({ daysMarked, sent }); }, [onProgress, daysMarked, sent]);

  const save = async (submit: boolean, approve = false) => {
    if (draft.min_shifts != null && draft.max_shifts != null && draft.min_shifts > draft.max_shifts) {
      setMsg({ tone: "err", text: "Lágmark getur ekki verið hærra en hámark." });
      return;
    }
    setBusy(approve ? "approve" : submit ? "submit" : "save");
    const r = await onSave(draft, { submit, alsoNext, approve });
    setBusy(null);
    if (!r.ok) { setMsg({ tone: "err", text: r.error ?? "Vistun mistókst" }); return; }
    setDirty(false);
    const copied = r.copiedTo ? ` Sömu óskir (vikudagar, fjöldi og athugasemd) skráðar fyrir ${monthLabel(r.copiedTo)}.` : "";
    setMsg({ tone: "ok", text: (approve ? "Vistað og samþykkt." : submit ? "Óskirnar hafa verið sendar yfirlækni." : "Drög vistuð.") + copied });
  };

  const loadPrev = async () => {
    if (!onLoadPrevious) return;
    setBusy("prev");
    const prev = await onLoadPrevious();
    setBusy(null);
    if (!prev) { setMsg({ tone: "err", text: "Engar óskir fundust fyrir fyrri mánuð." }); return; }
    // Aðeins það sem á við milli mánaða; dagsetningar fyrri mánaðar gera það ekki.
    update((d) => ({ ...d, weekday_marks: prev.weekday_marks, evening_weekdays: prev.evening_weekdays, day_part: prev.day_part, min_shifts: prev.min_shifts, max_shifts: prev.max_shifts, note: prev.note }));
  };

  const cellTone = (date: string) => {
    const explicit = draft.day_marks[date];
    const m = markFor(draft, date);
    const fromWeekday = !explicit && m;
    // Hálfur dagur er sjálfstæð merking: fjólublá fylling ef dagurinn er annars
    // ómerktur, fjólublár rammi ofan á hinar merkingarnar.
    const part = draft.day_part_marks[date];
    const halfRing = part ? " ring-[3px] ring-inset ring-violet-500" : "";
    if (m === "off") return (fromWeekday ? "bg-red-50 text-red-700 ring-1 ring-inset ring-red-200 [background-image:repeating-linear-gradient(135deg,transparent_0_6px,rgba(220,38,38,.07)_6px_12px)]" : "bg-red-500 text-white") + halfRing;
    if (m === "want") return (fromWeekday ? "bg-emerald-50 text-emerald-800 ring-1 ring-inset ring-emerald-200 [background-image:repeating-linear-gradient(135deg,transparent_0_6px,rgba(5,150,105,.08)_6px_12px)]" : "bg-emerald-500 text-white") + halfRing;
    if (explicit === "ok") return "bg-[var(--hsu)] text-white" + halfRing;
    if (part) return "bg-violet-500 text-white";
    return "bg-white text-slate-800 ring-1 ring-inset ring-slate-200 hover:bg-slate-50";
  };

  const brushes: { key: Brush; label: string; icon: React.ReactNode; cls: string }[] = [
    { key: "off", label: "Get ekki", icon: <Ban className="h-4 w-4" />, cls: "data-[on=true]:bg-red-500 data-[on=true]:text-white data-[on=true]:ring-red-500" },
    { key: "want", label: "Vil gjarnan", icon: <Heart className="h-4 w-4" />, cls: "data-[on=true]:bg-emerald-500 data-[on=true]:text-white data-[on=true]:ring-emerald-500" },
    { key: "ok", label: "Laus", icon: <CircleCheck className="h-4 w-4" />, cls: "data-[on=true]:bg-[var(--hsu)] data-[on=true]:text-white data-[on=true]:ring-[var(--hsu)]" },
    { key: "am", label: "Aðeins f.h.", icon: <Sunrise className="h-4 w-4" />, cls: "data-[on=true]:bg-violet-500 data-[on=true]:text-white data-[on=true]:ring-violet-500" },
    { key: "pm", label: "Aðeins e.h.", icon: <Sunset className="h-4 w-4" />, cls: "data-[on=true]:bg-violet-500 data-[on=true]:text-white data-[on=true]:ring-violet-500" },
    { key: "clear", label: "Hreinsa", icon: <Eraser className="h-4 w-4" />, cls: "data-[on=true]:bg-slate-700 data-[on=true]:text-white data-[on=true]:ring-slate-700" },
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-bold text-slate-900">{capFirst(monthLabel(month))}</h3>
          <Badge tone={PREF_TONE[status]}>{{ none: "Ekki hafið", draft: "Drög", submitted: "Sent inn", approved: "Samþykkt", changes_requested: "Breytinga óskað" }[status]}</Badge>
        </div>
        {editable && onLoadPrevious && (
          <Button variant="ghost" size="sm" onClick={loadPrev} busy={busy === "prev"}><Copy className="h-3.5 w-3.5" /> Sækja frá síðasta mánuði</Button>
        )}
      </div>

      {status === "changes_requested" && reviewNote && (
        <Notice tone="warn"><span className="font-semibold">Yfirlæknir biður um breytingar:</span> {reviewNote}</Notice>
      )}
      {!editable && lockedReason && <Notice tone="info">{lockedReason}</Notice>}

      <Step n={2} steps={steps} done={daysMarked} id="skref-2" title="Merktu dagana"
        hint="Veldu pensil og smelltu eða dragðu yfir dagana. Smelltu á vikudag efst til að setja reglu fyrir alla þá daga. Ómerktir dagar teljast lausir."
        plainTitle={editable ? "Veldu pensil og smelltu eða dragðu yfir daga" : undefined}>
        {editable && (
          <div className="mb-3">
<div className="grid grid-cols-2 gap-2 sm:inline-grid sm:w-auto sm:grid-cols-3">
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
                title={editable ? "Smelltu til að setja reglu fyrir alla þessa vikudaga" : undefined}
                className={cx(
                  "flex flex-col items-center rounded-lg py-1 text-[11px] font-bold uppercase tracking-wide transition",
                  m === "off" ? "bg-red-100 text-red-700" : m === "want" ? "bg-emerald-100 text-emerald-800" : "text-slate-500",
                  editable && "hover:bg-slate-100",
                )}>
                {WEEKDAY_SHORT_IS[wd]}
                <span className="text-[9px] font-medium normal-case tracking-normal">{m === "off" ? "aldrei" : m === "want" ? "helst" : editable ? "allir" : " "}</span>
              </button>
            );
          })}
        </div>
        <div className="mt-1.5 grid grid-cols-7 gap-1.5">
          {weeks.flat().map((date, i) => {
            if (!date) return <div key={`e${i}`} />;
            const h = holidayName(date);
            const m = markFor(draft, date);
            return (
              <button key={date} type="button"
                onPointerDown={(e) => onDown(e, date)}
                onPointerEnter={() => onEnter(date)}
                onClick={() => onTap(date)}
                aria-label={`${dayLabel(date)}${h ? `, ${h}` : ""}: ${m === "off" ? "get ekki" : m === "want" ? "vil gjarnan" : draft.day_marks[date] === "ok" ? "laus" : "ómerkt"}`}
                className={cx("relative flex aspect-square min-h-11 flex-col items-center justify-center rounded-xl text-sm font-semibold transition sm:aspect-[4/3]", cellTone(date), !editable && "cursor-default")}>
                <span>{Number(date.slice(8))}</span>
                {m === "off" && <Ban className="h-3 w-3 opacity-80" />}
                {m === "want" && <Heart className="h-3 w-3 opacity-80" />}
                {!m && draft.day_marks[date] === "ok" && <CircleCheck className="h-3 w-3 opacity-80" />}
                {h && <span className="absolute left-1 top-1 h-1.5 w-1.5 rounded-full bg-amber-400" title={h} />}
                {draft.day_part_marks[date] && (
                  <span className={cx("absolute bottom-0.5 right-1 rounded px-0.5 text-[9px] font-bold",
                    m ? "bg-violet-600 text-white" : "text-white")}>
                    {draft.day_part_marks[date] === "am" ? "f.h." : "e.h."}
                  </span>
                )}
              </button>
            );
          })}
        </div>
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-500">
          <span className="inline-flex items-center gap-1"><span className="h-2.5 w-2.5 rounded bg-red-500" /> Get ekki: {counts.off}</span>
          <span className="inline-flex items-center gap-1"><span className="h-2.5 w-2.5 rounded bg-emerald-500" /> Vil gjarnan: {counts.want}</span>
          <span className="inline-flex items-center gap-1"><span className="h-2.5 w-2.5 rounded bg-[var(--hsu)]" /> Laus: {counts.ok}</span>
          <span className="inline-flex items-center gap-1"><span className="h-2.5 w-2.5 rounded ring-1 ring-slate-300" /> Ómerkt: {counts.unmarked}</span>
          <span className="inline-flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-amber-400" /> Almennur frídagur</span>
          <span className="inline-flex items-center gap-1"><span className="h-2.5 w-2.5 rounded bg-violet-500" /> Aðeins f.h. / e.h.: {Object.keys(draft.day_part_marks).length}</span>
          <span className="inline-flex items-center gap-1"><span className="h-2.5 w-2.5 rounded bg-red-50 ring-1 ring-red-200" /> Strikað = vikudagsregla</span>
        </div>
      </div>

      </Step>

      <Step n={3} steps={steps} id="skref-3" optional title="Dagvaktir á flýtimóttöku"
        hint="Hvaða daga vinnur þú dagvinnu, og allan daginn eða hálfan? Þurfi einn dagur að vera öðruvísi merkirðu hann með penslinum „Aðeins f.h.“ eða „Aðeins e.h.“ í skrefi 2."
        plainTitle="Dagvaktir á flýtimóttöku">
        {dayWorkSlot}
        <div className={dayWorkSlot ? "mt-4" : ""}>
          <div className="text-xs font-semibold text-slate-600">Allan daginn eða hálfan — gildir um alla daga mánaðarins</div>
        <div className="mt-1.5 flex flex-wrap items-center gap-1">
          {(["all", "am", "pm"] as const).map((v) => (
            <button key={v} type="button" disabled={!editable} onClick={() => update((x) => ({ ...x, day_part: v }))}
              className={cx("rounded-lg px-3 py-1.5 text-xs font-semibold transition",
                draft.day_part === v ? "bg-[var(--hsu)] text-white" : "bg-slate-100 text-slate-500")}>
              {DAY_PART_IS[v]}
            </button>
          ))}
          {Object.keys(draft.day_part_marks).length > 0 && (
            <span className="ml-1 text-[11px] text-slate-500">
              {Object.keys(draft.day_part_marks).length} dagar merktir sér
              {editable && <button type="button" className="ml-1 underline" onClick={() => update((x) => ({ ...x, day_part_marks: {} }))}>hreinsa</button>}
            </span>
          )}
        </div>
        </div>
      </Step>

      <Step n={4} steps={steps} id="skref-4" optional title="Kvöld- og næturvaktir (forvakt og bakvakt)"
        hint="Viltu aðeins kvöldvaktir á ákveðnum vikudögum — t.d. eingöngu fimmtudaga? Veldu þá hér. Allir dagar valdir = engin takmörkun."
        plainTitle="Kvöld- og næturvaktir (forvakt og bakvakt)">
        <div className="mt-1.5 flex flex-wrap items-center gap-1">
          {WEEKDAY_ORDER.map((d) => {
            const on = draft.evening_weekdays.length === 0 || draft.evening_weekdays.includes(d);
            return (
              <button key={d} type="button" disabled={!editable}
                onClick={() => update((x) => ({ ...x, evening_weekdays: x.evening_weekdays.includes(d) ? x.evening_weekdays.filter((y) => y !== d) : [...x.evening_weekdays, d].sort() }))}
                className={cx("rounded-lg px-3 py-1.5 text-xs font-semibold transition", on ? "bg-[var(--hsu)] text-white" : "bg-slate-100 text-slate-500")}>
                {WEEKDAY_SHORT_IS[d]}
              </button>
            );
          })}
          {draft.evening_weekdays.length > 0 && editable && (
            <button type="button" onClick={() => update((x) => ({ ...x, evening_weekdays: [] }))} className="px-2 text-xs font-medium text-slate-500 underline">Allir dagar</button>
          )}
        </div>
      </Step>

      <Step n={5} steps={steps} id="skref-5" optional title="Fjöldi vakta og athugasemd"
        hint="Hve margar vaktir viltu í mánuðinum, og er eitthvað sem yfirlæknir ætti að vita?"
        plainTitle="Fjöldi vakta og athugasemd">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <div className="text-xs font-semibold text-slate-600">Fjöldi vakta í mánuðinum</div>
          <div className="mt-1 flex items-center gap-2">
            <input type="number" min={0} max={31} placeholder="Minnst" disabled={!editable} value={draft.min_shifts ?? ""}
              onChange={(e) => update((d) => ({ ...d, min_shifts: e.target.value === "" ? null : Math.max(0, Number(e.target.value)) }))}
              className={cx(inputCls, "w-24")} aria-label="Minnst vaktir" />
            <span className="text-slate-400">–</span>
            <input type="number" min={0} max={31} placeholder="Mest" disabled={!editable} value={draft.max_shifts ?? ""}
              onChange={(e) => update((d) => ({ ...d, max_shifts: e.target.value === "" ? null : Math.max(0, Number(e.target.value)) }))}
              className={cx(inputCls, "w-24")} aria-label="Mest vaktir" />
          </div>
          <p className="mt-1 text-[11px] text-slate-500">Autt = eftir starfshlutfalli.</p>
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-600">Athugasemd til yfirlæknis</div>
          <textarea rows={2} disabled={!editable} value={draft.note} placeholder="t.d. „Get tekið aukavaktir um Þjóðhátíð“"
            onChange={(e) => update((d) => ({ ...d, note: e.target.value }))} className={cx(inputCls, "mt-1")} />
          </div>
        </div>
      </Step>

      {editable && (
        <Step n={6} steps={steps} done={sent} id="skref-6" title="Sendu óskirnar"
          hint="Óskirnar berast yfirlækni þegar þú smellir á „Senda óskir“. „Vista drög“ geymir þær án þess að senda.">
          <div className="space-y-3">
          <label className="flex items-start gap-2.5 text-sm text-slate-700">
            <input type="checkbox" className="mt-0.5 h-4 w-4" checked={alsoNext} onChange={(e) => setAlsoNext(e.target.checked)} />
            <span>
              Nota sömu óskir líka fyrir <span className="font-semibold">{monthLabel(next)}</span>
              <span className="block text-[11px] text-slate-500">Vikudagareglur, fjöldi vakta og athugasemd. Ákveðnir dagar merkjast sér í hverjum mánuði.</span>
            </span>
          </label>
          {msg && <Notice tone={msg.tone}>{msg.text}</Notice>}
          <div className="flex flex-wrap gap-2">
            {mode === "doctor" ? (
              <>
                <Button onClick={() => save(true)} busy={busy === "submit"} size="lg"><Send className="h-4 w-4" /> Senda óskir</Button>
                <Button variant="ghost" onClick={() => save(false)} busy={busy === "save"} size="lg" disabled={!dirty}><Save className="h-4 w-4" /> Vista drög</Button>
              </>
            ) : (
              <>
                <Button variant="success" onClick={() => save(true, true)} busy={busy === "approve"} size="lg"><Check className="h-4 w-4" /> Vista og samþykkja</Button>
                <Button variant="ghost" onClick={() => save(true)} busy={busy === "submit"} size="lg"><Save className="h-4 w-4" /> Vista</Button>
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
          aria-label={done ? `Skref ${n}, lokið` : `Skref ${n}`}>
          {done ? <Check className="h-5 w-5" /> : n}
        </span>
        <div className="min-w-0 flex-1">
          <h3 id={id ? `${id}-h` : undefined} className="flex flex-wrap items-center gap-2 text-base font-bold text-slate-900">
            {title}
            {optional && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">Valfrjálst</span>}
          </h3>
          {hint && <p className="mt-0.5 text-sm text-slate-600">{hint}</p>}
          <div className="mt-3">{children}</div>
        </div>
      </div>
    </section>
  );
}

/** Yfirlit skrefanna efst — hvert þeirra er hlekkur á sitt skref. */
export function PrefsStepNav({ daysMarked, sent }: { daysMarked: boolean; sent: boolean }) {
  const items = [
    { n: 1, label: "Mánuður", done: true },
    { n: 2, label: "Dagar", done: daysMarked },
    { n: 3, label: "Dagvaktir", done: false, optional: true },
    { n: 4, label: "Kvöld og nætur", done: false, optional: true },
    { n: 5, label: "Fjöldi og athugasemd", done: false, optional: true },
    { n: 6, label: "Senda", done: sent },
  ];
  return (
    <nav aria-label="Skref" className="overflow-x-auto">
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
  const weeks = monthWeeks(month);
  return (
    <div className="inline-grid grid-cols-7 gap-0.5" aria-hidden>
      {WEEKDAY_ORDER.map((wd) => <span key={wd} className="text-center text-[8px] font-bold uppercase text-slate-400">{WEEKDAY_SHORT_IS[wd][0]}</span>)}
      {weeks.flat().map((date, i) => {
        if (!date) return <span key={i} className="h-5 w-5" />;
        const m = markFor(pref, date);
        return (
          <span key={date} title={dayLabel(date)} className={cx(
            "flex h-5 w-5 items-center justify-center rounded text-[9px] font-semibold",
            m === "off" ? "bg-red-500 text-white" : m === "want" ? "bg-emerald-500 text-white" : pref?.day_marks?.[date] === "ok" ? "bg-[var(--hsu)] text-white" : "bg-slate-100 text-slate-500",
          )}>{Number(date.slice(8))}</span>
        );
      })}
    </div>
  );
}
