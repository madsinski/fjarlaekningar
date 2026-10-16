"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowLeftRight, ChevronLeft, ChevronRight, X } from "lucide-react";
import { WeekHead, WeekNo, isWeekCell, monthCellsWithWeeks } from "../_components/PrefsEditor";
import { Button, Card, Field, Modal, Notice, PrintLink, Toggle, cx, hsuApi, inputCls, shortName, useStoredFlag } from "../_components/ui";
import { DayWorkChip } from "./DayWork";
import { useT } from "@/lib/hsu/i18n/client";
import { capFirstL, dayLabelL, holidayL, monthLabelL, weekdayShortL } from "@/lib/hsu/i18n/format";
import { prefs } from "@/lib/hsu/i18n/messages/prefs";
import { WEEKDAY_ORDER, dayWorkOn, holidayName, hhmm, monthKey, periodOf, shiftMonth, weekdayOf, type DayWork, type HsuShift, type HsuSwap, type ShiftPeriod } from "@/lib/hsu/types";

export default function RosterTab({ meId, dayWork, swaps, refresh }: { meId: string; dayWork: DayWork; swaps: HsuSwap[]; refresh: () => void }) {
  const t = useT(prefs);
  const [month, setMonth] = useState(() => monthKey(new Date()));
  const [state, setState] = useState<{ loading: boolean; published: boolean; shifts: HsuShift[]; doctors: { id: string; name: string; color: string }[]; periods: Record<string, ShiftPeriod> }>({ loading: true, published: false, shifts: [], doctors: [], periods: {} });
  const [onlyMine, setOnlyMine] = useStoredFlag("hsu.roster.onlyMine", false);
  const [showWork, setShowWork] = useStoredFlag("hsu.showDayWork", true);
  // Vaktaskipti: valin vakt mín, svo vakt hins læknisins (dragið eða tveir smellir).
  const [pick, setPick] = useState<HsuShift | null>(null);
  const [ask, setAsk] = useState<{ mine: HsuShift; theirs: HsuShift } | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ tone: "ok" | "err"; text: string } | null>(null);
  const dragged = useRef<HsuShift | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setState((s) => ({ ...s, loading: true }));
      const r = await hsuApi<{ published: boolean; shifts: HsuShift[]; doctors: { id: string; name: string; color: string }[]; periods: Record<string, ShiftPeriod> }>(`/api/hsu/me/roster?month=${month}`);
      if (!cancelled) setState({ loading: false, published: Boolean(r.published), shifts: r.shifts ?? [], doctors: r.doctors ?? [], periods: r.periods ?? {} });
    })();
    return () => { cancelled = true; };
  }, [month]);

  const doc = (id: string | null) => state.doctors.find((d) => d.id === id);
  const typeList = Object.entries(state.periods).map(([id, period]) => ({ id, period }));
  const showGroups = new Set(Object.values(state.periods)).size > 1;
  const today = new Date().toISOString().slice(0, 10);

  // ── Vaktaskipti ──
  // Aðeins ókomnar vaktir sem ekki bíða svars; vaktir sem þegar eru í
  // skiptibeiðni eru merktar og ekki hægt að bjóða aftur.
  const swapPending = new Set(
    swaps.filter((w) => w.want_shift_id && (w.status === "pending" || w.status === "awaiting_approval"))
      .flatMap((w) => [w.shift_id, w.want_shift_id as string]),
  );
  const swapable = (s: HsuShift) => s.shift_date >= today && s.confirm_status !== "requested" && !swapPending.has(s.id);
  /** „FV1 mán 10. nóv kl. 16:00–08:00“ — notað í staðfestingu og hjálpartexta. */
  const phrase = (s: HsuShift) =>
    `${s.label ? s.label + " " : ""}${weekdayShortL(weekdayOf(s.shift_date), t.lang)} ${dayLabelL(s.shift_date, t.lang)} ${t("roster.swap.at", { start: hhmm(s.starts), end: hhmm(s.ends) })}`;
  const openAsk = (mine: HsuShift, theirs: HsuShift) => {
    setPick(null);
    setNote("");
    setMsg(null);
    setAsk({ mine, theirs });
  };
  const sendSwap = async () => {
    if (!ask) return;
    setBusy(true);
    const r = await hsuApi("/api/hsu/me/swaps", { body: { shift_id: ask.mine.id, want_shift_id: ask.theirs.id, note } });
    setBusy(false);
    if (!r.ok) { setMsg({ tone: "err", text: r.error ?? t("roster.swap.failed") }); return; }
    const who = doc(ask.theirs.doctor_id);
    setAsk(null);
    setMsg({ tone: "ok", text: t("roster.swap.sent", { name: who ? shortName(who.name) : "" }) });
    refresh();
    // Merkin á vöktunum koma úr nýju gögnunum.
    setState((st) => ({ ...st }));
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">{t("roster.title")}</h1>
          <p className="text-sm text-slate-500">{t("roster.subtitle")}</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setMonth((m) => shiftMonth(m, -1))} aria-label={t("roster.prev")} className="rounded-xl border border-slate-200 bg-white p-2 hover:bg-slate-50"><ChevronLeft className="h-4 w-4" /></button>
          <span className="w-36 text-center text-sm font-bold">{capFirstL(monthLabelL(month, t.lang), t.lang)}</span>
          <button onClick={() => setMonth((m) => shiftMonth(m, 1))} aria-label={t("roster.next")} className="rounded-xl border border-slate-200 bg-white p-2 hover:bg-slate-50"><ChevronRight className="h-4 w-4" /></button>
          {/* Óbirtur mánuður hefur ekkert skjal — þá er hnappurinn ekki sýndur. */}
          {state.published && <PrintLink month={month} label={t("roster.print")} className="ml-1" />}
        </div>
      </div>

      {state.loading ? (
        <div className="h-96 animate-pulse rounded-2xl bg-slate-100" />
      ) : !state.published ? (
        <Card className="p-8 text-center text-sm text-slate-500">{t("roster.notPublished", { month: monthLabelL(month, t.lang) })}</Card>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <Toggle checked={onlyMine} onChange={setOnlyMine} label={t("roster.onlyMine")} />
            <Toggle checked={showWork} onChange={setShowWork} label={t("roster.showDayWork")} />
          </div>
          {msg && <Notice tone={msg.tone}>{msg.text}</Notice>}
          {pick ? (
            <Notice tone="info">
              <span className="flex flex-wrap items-center gap-2">
                <ArrowLeftRight className="h-4 w-4 shrink-0" />
                {t("roster.swap.picked", { shift: phrase(pick) })}
                <button type="button" onClick={() => setPick(null)} className="inline-flex items-center gap-1 font-semibold underline">
                  <X className="h-3.5 w-3.5" />{t("roster.swap.clear")}
                </button>
              </span>
            </Notice>
          ) : (
            <p className="text-xs text-slate-500">{t("roster.swap.hint")}</p>
          )}
          <Card className="overflow-x-auto p-2 sm:p-3">
            <div className="grid min-w-[680px] grid-cols-[1.9rem_repeat(7,minmax(0,1fr))] gap-1">
              <WeekHead />
              {WEEKDAY_ORDER.map((wd) => <div key={wd} className="py-1 text-center text-[11px] font-bold uppercase text-slate-500">{weekdayShortL(wd, t.lang)}</div>)}
              {monthCellsWithWeeks(month).map((cell, i) => {
                if (isWeekCell(cell)) return <WeekNo key={`w${i}`} n={cell.week} />;
                const date = cell;
                if (!date) return <div key={i} />;
                const h = holidayL(holidayName(date), t.lang);
                const shifts = state.shifts.filter((s) => s.shift_date === date && (!onlyMine || s.doctor_id === meId));
                return (
                  <div key={date} className={cx("min-h-24 rounded-xl border p-1.5", date === today ? "border-[var(--hsu)] bg-[var(--hsu-soft)]/40" : "border-slate-100 bg-slate-50/60")}>
                    <div className="flex items-center justify-between text-[11px] font-bold text-slate-500">
                      <span>{Number(date.slice(8))}</span>
                      {h && <span className="truncate pl-1 text-[9px] font-semibold text-amber-600" title={h}>{h}</span>}
                    </div>
                    <div className="mt-1 space-y-1">
                      {/* Dagvinna þín þennan dag — aðeins ef þú átt ekki vakt sama dag. */}
                      {(() => {
                        const kind = showWork ? dayWorkOn(dayWork, date) : null;
                        const mineToday = state.shifts.some((s) => s.shift_date === date && s.doctor_id === meId);
                        return kind && !mineToday ? <DayWorkChip kind={kind} /> : null;
                      })()}
                      {(["day", "evening"] as const).map((period) => {
                        const group = shifts.filter((s) => periodOf(s, typeList) === period);
                        if (!group.length) return null;
                        return (
                          <div key={period} className={cx("space-y-1", showGroups && "rounded-md p-0.5", showGroups && (period === "day" ? "bg-amber-50" : "bg-slate-100"))}>
                      {group.map((s) => {
                        const d = doc(s.doctor_id);
                        const mine = s.doctor_id === meId;
                        const pending = s.confirm_status === "requested";
                        const inSwap = swapPending.has(s.id);
                        const canOffer = mine && swapable(s);
                        const isTarget = Boolean(pick) && !mine && Boolean(d) && swapable(s);
                        const chosen = pick?.id === s.id;
                        const title = inSwap
                          ? t("roster.swap.pendingTitle")
                          : t(pending ? "roster.shiftTitlePending" : "roster.shiftTitle", { label: s.label, start: s.starts.slice(0, 5), end: s.ends.slice(0, 5) });
                        const body = (
                          <>
                            {s.label && <span className="opacity-70">{s.label} </span>}{d ? shortName(d.name) : "—"}
                            {inSwap && <ArrowLeftRight className="ml-1 inline h-3 w-3 align-[-2px]" />}
                          </>
                        );
                        const cls = cx("block w-full truncate rounded-md px-1.5 py-1 text-left text-[11px] font-semibold",
                          pending ? "border border-dashed border-amber-400 bg-amber-50 text-amber-900"
                            : mine ? "text-white" : "bg-white text-slate-700 ring-1 ring-slate-200",
                          inSwap && "ring-2 ring-inset ring-amber-500",
                          chosen && "outline outline-2 outline-offset-1 outline-[var(--hsu)]",
                          isTarget && "ring-2 ring-inset ring-[var(--hsu)] ring-offset-0",
                          (canOffer || isTarget) && "cursor-pointer hover:brightness-95");
                        const style = pending ? undefined : mine ? { background: d?.color ?? "var(--hsu)" } : { borderLeft: `3px solid ${d?.color ?? "#cbd5e1"}` };
                        // Vakt sem ekkert er hægt að gera við er einfaldlega texti.
                        if (!canOffer && !isTarget) {
                          return <div key={s.id} title={title} className={cls} style={style}>{body}</div>;
                        }
                        return (
                          <button key={s.id} type="button" title={title} className={cls} style={style}
                            draggable={canOffer}
                            onDragStart={canOffer ? (e) => { dragged.current = s; setPick(s); e.dataTransfer.effectAllowed = "move"; e.dataTransfer.setData("text/plain", s.id); } : undefined}
                            onDragEnd={() => { dragged.current = null; }}
                            onDragOver={isTarget ? (e) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; } : undefined}
                            onDrop={isTarget ? (e) => { e.preventDefault(); const m = dragged.current ?? pick; if (m) openAsk(m, s); } : undefined}
                            onClick={() => {
                              setMsg(null);
                              if (canOffer) { setPick(chosen ? null : s); return; }
                              if (pick) openAsk(pick, s);
                            }}
                            aria-label={canOffer ? t("roster.swap.offerAria", { shift: phrase(s) }) : t("roster.swap.targetAria", { shift: phrase(s), name: d?.name ?? "" })}>
                            {body}
                          </button>
                        );
                      })}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </>
      )}

      <Modal open={Boolean(ask)} onClose={() => setAsk(null)} title={t("roster.swap.title")}>
        {ask && (
          <div className="space-y-4">
            <div className="space-y-2 text-sm">
              <div className="rounded-xl bg-slate-50 p-3">
                <div className="text-[11px] font-bold uppercase tracking-wide text-slate-500">{t("roster.swap.youGive")}</div>
                <div className="font-semibold text-slate-900">{phrase(ask.mine)}</div>
              </div>
              <div className="flex justify-center"><ArrowLeftRight className="h-4 w-4 text-slate-400" /></div>
              <div className="rounded-xl bg-[var(--hsu-soft)] p-3">
                <div className="text-[11px] font-bold uppercase tracking-wide text-[var(--hsu-dark)]">{t("roster.swap.youGet")}</div>
                <div className="font-semibold text-slate-900">{phrase(ask.theirs)}</div>
                <div className="text-xs text-slate-600">{doc(ask.theirs.doctor_id)?.name ?? ""}</div>
              </div>
            </div>
            <Field label={t("roster.swap.noteLabel")} hint={t("roster.swap.noteHint")}>
              <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} maxLength={300} className={inputCls} />
            </Field>
            <p className="text-xs text-slate-500">{t("roster.swap.who", { name: doc(ask.theirs.doctor_id)?.name ?? "" })}</p>
            {msg?.tone === "err" && <Notice tone="err">{msg.text}</Notice>}
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setAsk(null)}>{t("roster.swap.back")}</Button>
              <Button busy={busy} onClick={sendSwap}><ArrowLeftRight className="h-4 w-4" />{t("roster.swap.send")}</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
