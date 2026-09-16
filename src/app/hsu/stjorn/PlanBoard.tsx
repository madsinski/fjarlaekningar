"use client";

// Vaktaplan mánaðarins: sjálfvirk skipting + handvirk lagfæring.
//
// Þrjár leiðir til að breyta, því hver hentar sínu tæki:
//   * Draga lækni úr listanum á vakt, eða draga vakt ofan á aðra (læknarnir
//     skipta þá á dögum). Draga vakt í ruslið tekur lækninn af henni.
//   * Smella á lækni í listanum og síðan á vaktir — virkar á snertiskjá.
//   * Smella á vakt og velja lækni úr lista sem sýnir hver getur tekið hana.
//
// Meðan læknir er valinn eða dreginn litast dagatalið eftir óskum hans: rautt
// þar sem hann getur ekki, grænt þar sem hann vill.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle, ArrowRight, Ban, Clock, Eraser, Hand, Heart, Loader2, Merge, Plus, RefreshCw, Scissors, Shield, Shuffle, Sparkles, Trash2, Undo2, Wand2, X,
} from "lucide-react";
import { monthWeeks } from "../_components/PrefsEditor";
import { Badge, Button, Card, Field, Modal, Notice, cx, hsuApi, inputCls, shortName } from "../_components/ui";
import {
  CONFLICT_IS, UNFILLED_REASON_IS, bakvaktNeededDates, findConflicts, requiredSlots, statsFor, toPlanDoctors, toPlanSlots,
  type PlanPrefs, type PlanSlot, type UnfilledReason,
} from "@/lib/hsu/plan";
import {
  DAY_PART_IS, SHIFT_PERIOD_IS, WEEKDAY_ORDER, WEEKDAY_SHORT_IS, dayLabel, dayPartFor, hhmm, holidayName, isOvernight, isWeekendish, markFor, minutesOf, monthLabel, partOfShift, periodOf, typeAppliesOn,
  type DayPart, type HsuDoctor, type HsuShift, type HsuShiftType,
} from "@/lib/hsu/types";
import type { PlannerCtx } from "./types";

/** Upphafsstafir læknis — nóg í þröngu hólfi, liturinn segir hitt. */
function initialsOf(name: string): string {
  return name.split(/\s+/).filter(Boolean).map((x) => x[0]).slice(0, 2).join("").toUpperCase();
}

type Change = { id: string; doctor_id: string | null };
type DragPayload = { kind: "doctor"; id: string } | { kind: "shift"; id: string };

export default function PlanBoard({ ctx, goNext }: { ctx: PlannerCtx; goNext: () => void }) {
  const { data, month } = ctx;
  const [shifts, setShifts] = useState<HsuShift[]>(data.shifts);
  const [pick, setPick] = useState<string | null>(null);
  const [drag, setDrag] = useState<DragPayload | null>(null);
  const dragRef = useRef<DragPayload | null>(null);
  const [overKey, setOverKey] = useState<string | null>(null);
  const [slotOpen, setSlotOpen] = useState<string | null>(null);
  const [addFor, setAddFor] = useState<string | null>(null);
  const [addDoctor, setAddDoctor] = useState("");
  const [undo, setUndo] = useState<Change[][]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ tone: "ok" | "err" | "warn"; text: string } | null>(null);
  const [unfilled, setUnfilled] = useState<{ key: string; date: string; reason: UnfilledReason }[]>([]);

  useEffect(() => {
    // Ný gögn frá þjóni (endurhleðsla) koma í stað staðbundinna.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setShifts(data.shifts);
  }, [data.shifts]);

  const published = data.month?.status === "published";
  const doctors = useMemo(() => data.doctors.filter((d) => d.active), [data.doctors]);
  const docById = useMemo(() => new Map(data.doctors.map((d) => [d.id, d])), [data.doctors]);
  const prefs = useMemo<Record<string, PlanPrefs>>(() => Object.fromEntries(data.preferences.map((p) => [p.doctor_id, p])), [data.preferences]);

  const toSlots = useCallback((list: HsuShift[]): PlanSlot[] => toPlanSlots(list, data.shiftTypes), [data.shiftTypes]);
  const planDoctors = useMemo(() => toPlanDoctors(doctors), [doctors]);
  const kindOf = useCallback((s: HsuShift) => data.shiftTypes.find((t) => t.id === s.shift_type_id)?.kind ?? "other", [data.shiftTypes]);

  const slots = useMemo(() => toSlots(shifts), [shifts, toSlots]);
  const conflicts = useMemo(() => findConflicts(slots, prefs, planDoctors), [slots, prefs, planDoctors]);
  const stats = useMemo(() => statsFor(slots, planDoctors, prefs), [slots, planDoctors, prefs]);
  const bvNeeded = useMemo(() => bakvaktNeededDates(slots, planDoctors), [slots, planDoctors]);
  const pendingCount = shifts.filter((s) => s.confirm_status === "requested").length;
  const byDate = useMemo(() => {
    const m = new Map<string, HsuShift[]>();
    for (const s of shifts) (m.get(s.shift_date) ?? m.set(s.shift_date, []).get(s.shift_date)!).push(s);
    const rank = (s: HsuShift) => ({ forvakt: 0, other: 1, bakvakt: 2 })[kindOf(s)];
    for (const list of m.values()) list.sort((a, b) => rank(a) - rank(b) || a.starts.localeCompare(b.starts) || a.label.localeCompare(b.label));
    return m;
  }, [shifts, kindOf]);
  const typeById = useMemo(() => new Map(data.shiftTypes.map((t) => [t.id, t])), [data.shiftTypes]);
  /** Nær vaktin yfir hálfan dag? Þá ber hún merkið f/e. */
  const partTag = useCallback((s: HsuShift) => {
    const p = partOfShift(s, (s.shift_type_id ? typeById.get(s.shift_type_id) : null) ?? null);
    return p === "all" ? null : p;
  }, [typeById]);
  /**
   * Vaktir dagsins í raðir — ein röð á vaktategund, læknarnir hlið við hlið.
   * Þannig lengist dagurinn ekki þótt fleiri læknar séu á flýtimóttöku eða vakt
   * sé skipt um hádegi; hann þéttist til hliðar í staðinn.
   */
  const rowsOf = useCallback((group: HsuShift[]) => {
    const map = new Map<string, HsuShift[]>();
    for (const s of group) {
      const k = s.shift_type_id ?? `x|${s.label}`;
      (map.get(k) ?? map.set(k, []).get(k)!).push(s);
    }
    return [...map.entries()].map(([key, items]) => {
      const t = typeById.get(key);
      return {
        key,
        name: t?.name ?? items[0].label,
        short: (t?.short || t?.name || items[0].label).slice(0, 4),
        items: items.slice().sort((a, b) => a.starts.localeCompare(b.starts) || (a.slot_index ?? 0) - (b.slot_index ?? 0)),
      };
    });
  }, [typeById]);

  // Aðeins vaktir sem á að manna: bakvakt sem enginn þarf er ekki gat.
  const emptyCount = requiredSlots(slots, planDoctors).filter((s) => !s.doctorId).length;
  const conflictCount = Object.keys(conflicts).length;

  // ── Breytingar ───────────────────────────────────────────────────────────
  const apply = async (changes: Change[], record = true) => {
    const current = new Map(shifts.map((s) => [s.id, s.doctor_id]));
    const real = changes.filter((c) => current.has(c.id) && (current.get(c.id) ?? null) !== (c.doctor_id ?? null));
    if (!real.length) return;
    // Bakvakt aðeins á lækni með réttindi — stöðvað strax, ekki eftir ferð á þjóninn.
    for (const c of real) {
      const s = shifts.find((x) => x.id === c.id)!;
      const d = c.doctor_id ? docById.get(c.doctor_id) : null;
      if (d && kindOf(s) === "bakvakt" && !d.can_bakvakt) {
        setMsg({ tone: "err", text: `${d.name} hefur ekki bakvaktarréttindi. Merktu reynda lækna undir Læknar.` });
        return;
      }
    }
    const reverse = real.map((c) => ({ id: c.id, doctor_id: current.get(c.id) ?? null }));
    const next = (list: HsuShift[], ch: Change[]) => {
      const map = new Map(ch.map((c) => [c.id, c.doctor_id]));
      return list.map((s) => (map.has(s.id) ? { ...s, doctor_id: map.get(s.id) ?? null, status: "assigned" as const } : s));
    };
    setShifts((l) => next(l, real));
    if (record) setUndo((u) => [...u.slice(-49), reverse]);
    setMsg(null);
    const r = await hsuApi<{ requested: number }>("/api/hsu/admin/shifts/batch", { body: { changes: real, month, notify: published }, staff: true });
    if (!r.ok) {
      setShifts((l) => next(l, reverse));
      if (record) setUndo((u) => u.slice(0, -1));
      setMsg({ tone: "err", text: r.error ?? "Breytingin vistaðist ekki" });
      return;
    }
    ctx.patch((d) => ({ ...d, shifts: next(d.shifts, real) }));
    if (r.requested) {
      setMsg({ tone: "warn", text: `Umfram hámark læknis: beiðni send til samþykkis. Vaktin er merkt „bíður“ þar til læknirinn svarar.` });
      await ctx.reload();
    } else if (real.some((c) => shifts.find((x) => x.id === c.id)?.confirm_status === "requested")) {
      await ctx.reload();
    }
  };

  const undoLast = async () => {
    const last = undo[undo.length - 1];
    if (!last) return;
    setUndo((u) => u.slice(0, -1));
    await apply(last, false);
  };

  const dropOn = (target: HsuShift, payload: DragPayload | null) => {
    if (!payload) return;
    if (payload.kind === "doctor") { void apply([{ id: target.id, doctor_id: payload.id }]); return; }
    if (payload.id === target.id) return;
    const src = shifts.find((s) => s.id === payload.id);
    if (!src) return;
    // Vakt ofan á vakt: læknarnir skipta. Sé markvaktin tóm er þetta einföld færsla.
    void apply([{ id: target.id, doctor_id: src.doctor_id }, { id: src.id, doctor_id: target.doctor_id }]);
  };

  /**
   * Læknir dreginn á daginn sjálfan (ekki á tiltekna vakt): hann fer á fyrstu
   * lausu vaktina sem hann má taka — dagvakt fyrst. Sé engin laus opnast
   * gluggi til að bæta við vakt með lækninn þegar valinn.
   */
  const dropOnDay = (date: string, payload: DragPayload | null) => {
    if (payload?.kind !== "doctor") return;
    const doc = docById.get(payload.id);
    const free = (byDate.get(date) ?? [])
      .filter((s) => !s.doctor_id && (kindOf(s) !== "bakvakt" || doc?.can_bakvakt))
      .sort((a, b) => Number(periodOf(a, data.shiftTypes) !== "day") - Number(periodOf(b, data.shiftTypes) !== "day"));
    if (free.length) { void apply([{ id: free[0].id, doctor_id: payload.id }]); return; }
    setAddDoctor(payload.id);
    setAddFor(date);
  };

  const generate = async (mode: "empty" | "all", confirmPublished = false) => {
    if (mode === "all" && shifts.some((s) => s.doctor_id) && !confirmPublished && !confirm("Raða öllum mánuðinum upp á nýtt? Handvirkar breytingar fara forgörðum.")) return;
    setBusy(mode); setMsg(null);
    const r = await hsuApi<{ changed: number; created: number; split?: number; unfilled: { key: string; date: string; reason: UnfilledReason }[]; needsConfirm?: string }>(
      "/api/hsu/admin/plan", { body: { month, mode, confirm: confirmPublished }, staff: true },
    );
    setBusy(null);
    if (r.needsConfirm === "published") {
      if (confirm(`${r.error}\n\nHalda áfram?`)) return generate(mode, true);
      return;
    }
    if (!r.ok) { setMsg({ tone: "err", text: r.error ?? "Mistókst" }); return; }
    setUndo([]);
    setUnfilled(r.unfilled ?? []);
    setMsg({
      tone: r.unfilled?.length ? "warn" : "ok",
      text: `${r.created ? `${r.created} vaktir búnar til. ` : ""}${r.split ? `${r.split} vöktum skipt um hádegi fyrir lækna sem vinna hálfan dag. ` : ""}${r.changed} vakt${r.changed === 1 ? "" : "ir"} úthlutað.${r.unfilled?.length ? ` ${r.unfilled.length} tókst ekki að manna — sjá lista.` : " Allar vaktir mannaðar."}`,
    });
    await ctx.reload();
  };

  // ── Hver er "virkur" læknir fyrir litun dagatalsins ──────────────────────
  const focusDoctor = drag?.kind === "doctor" ? drag.id : drag?.kind === "shift" ? shifts.find((s) => s.id === drag.id)?.doctor_id ?? null : pick;

  const startDrag = (e: React.DragEvent, payload: DragPayload) => {
    dragRef.current = payload;
    setDrag(payload);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", JSON.stringify(payload));
  };
  const endDrag = () => { dragRef.current = null; setDrag(null); setOverKey(null); };

  const noTypes = data.shiftTypes.filter((t) => t.active).length === 0;
  // Hólfin eru aðeins sýnd þegar báðar tegundir eru til; annars eru þau hávaði.
  const showGroups = new Set(data.shiftTypes.filter((t) => t.active).map((t) => t.period)).size > 1;

  if (shifts.length === 0) {
    return (
      <Card className="p-8 text-center sm:p-12">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--hsu-soft)]"><Wand2 className="h-7 w-7 text-[var(--hsu)]" /></span>
        <h2 className="mt-4 text-xl font-bold">Búa til vaktaplan fyrir {monthLabel(month)}</h2>
        <p className="mx-auto mt-2 max-w-lg text-sm text-slate-600">
          Kerfið býr til vaktir eftir vaktategundum ({data.shiftTypes.filter((t) => t.active).map((t) => t.name).join(", ") || "engar"}) og skiptir þeim á
          lækna eftir starfshlutfalli. „Get ekki“ er alltaf virt, helgar og frídagar dreifast jafnt og reynt er að verða við óskadögum.
        </p>
        {noTypes && <div className="mx-auto mt-4 max-w-md"><Notice tone="warn">Engar virkar vaktategundir. Settu þær upp undir Stillingar.</Notice></div>}
        {msg && <div className="mx-auto mt-4 max-w-md"><Notice tone={msg.tone}>{msg.text}</Notice></div>}
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Button size="lg" onClick={() => generate("all", true)} busy={busy === "all"} disabled={noTypes || doctors.length === 0}><Sparkles className="h-4 w-4" /> Búa til vaktaplan</Button>
          <Button size="lg" variant="ghost" disabled={noTypes} busy={busy === "slots"} onClick={async () => {
            setBusy("slots");
            const r = await hsuApi("/api/hsu/admin/plan", { body: { month, action: "slots" }, staff: true });
            setBusy(null);
            if (!r.ok) setMsg({ tone: "err", text: r.error ?? "Mistókst" });
            await ctx.reload();
          }}>Tómar vaktir — raða sjálf(ur)</Button>
        </div>
      </Card>
    );
  }

  const slotShift = slotOpen ? shifts.find((s) => s.id === slotOpen) ?? null : null;

  return (
    <div className="space-y-4">
      {/* Verkfærastika */}
      <Card className="flex flex-wrap items-center justify-between gap-3 p-3 sm:p-4">
        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={() => generate("empty")} busy={busy === "empty"} disabled={emptyCount === 0}><Sparkles className="h-4 w-4" /> Fylla í tómar ({emptyCount})</Button>
          <Button variant="ghost" onClick={() => generate("all")} busy={busy === "all"}><Shuffle className="h-4 w-4" /> Raða öllu upp á nýtt</Button>
          <Button variant="ghost" onClick={undoLast} disabled={!undo.length}><Undo2 className="h-4 w-4" /> Afturkalla</Button>
          <Button variant="ghost" busy={busy === "slots"} title="Sækja breytingar á vaktategundum (tímar, skipting um hádegi, fjöldi lækna) inn í þennan mánuð"
            onClick={async () => {
              setBusy("slots"); setMsg(null);
              const r = await hsuApi<{ created: number; split?: number; merged?: number }>("/api/hsu/admin/plan", { body: { month, action: "slots" }, staff: true });
              setBusy(null);
              if (!r.ok) { setMsg({ tone: "err", text: r.error ?? "Mistókst" }); return; }
              const bits = [
                r.created ? `${r.created} vaktir bættust við` : "",
                r.split ? `${r.split} vöktum skipt um hádegi` : "",
                r.merged ? `${r.merged} helmingar sameinaðir` : "",
              ].filter(Boolean);
              setMsg({ tone: "ok", text: bits.length ? `${bits.join(", ")}.` : "Vaktir mánaðarins eru í takt við vaktategundirnar og óskir lækna." });
              await ctx.reload();
            }}><RefreshCw className="h-4 w-4" /> Uppfæra vaktir</Button>
          <Button variant="ghost" onClick={() => {
            if (!confirm("Taka alla lækna af öllum vöktum mánaðarins?")) return;
            void apply(shifts.filter((s) => s.doctor_id).map((s) => ({ id: s.id, doctor_id: null })));
          }} disabled={!shifts.some((s) => s.doctor_id)}><Eraser className="h-4 w-4" /> Hreinsa</Button>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <Badge tone={emptyCount ? "red" : "green"}>{emptyCount} án læknis</Badge>
          <Badge tone={conflictCount ? "amber" : "green"}>{conflictCount} árekstrar</Badge>
          {pendingCount > 0 && <Badge tone="amber"><Clock className="h-3 w-3" /> {pendingCount} bíða samþykkis</Badge>}
          {published && <Badge tone="blue">Birt — breytingar fara strax til lækna</Badge>}
          <Button size="sm" variant="soft" onClick={goNext}>Birta <ArrowRight className="h-3.5 w-3.5" /></Button>
        </div>
      </Card>

      {msg && <Notice tone={msg.tone}>{msg.text}</Notice>}
      {pick && (
        <div className="sticky top-32 z-10">
          <Notice tone="info">
            <span className="flex flex-wrap items-center justify-between gap-2">
              <span><Hand className="mr-1 inline h-4 w-4" /> Smelltu á vaktir til að setja <b>{docById.get(pick)?.name}</b> á þær.</span>
              <button className="font-semibold underline" onClick={() => setPick(null)}>Hætta</button>
            </span>
          </Notice>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[1fr_290px]">
        {/* Dagatal */}
        <Card className="overflow-x-auto p-2 sm:p-3">
          <div className="grid min-w-[940px] grid-cols-7 gap-1.5">
            {WEEKDAY_ORDER.map((wd) => <div key={wd} className="py-1 text-center text-[11px] font-bold uppercase tracking-wide text-slate-500">{WEEKDAY_SHORT_IS[wd]}</div>)}
            {monthWeeks(month).flat().map((date, i) => {
              if (!date) return <div key={`x${i}`} />;
              const list = byDate.get(date) ?? [];
              const h = holidayName(date);
              const mark = focusDoctor ? markFor(prefs[focusDoctor], date) ?? (prefs[focusDoctor]?.day_marks?.[date] === "ok" ? "ok" : null) : null;
              const focusSkilled = focusDoctor ? Boolean(docById.get(focusDoctor)?.can_bakvakt) : true;
              const focusBusy = focusDoctor && list.every((s) => s.doctor_id !== focusDoctor) && shifts.some((s) => s.shift_date === date && s.doctor_id === focusDoctor);
              return (
                <div key={date}
                  onDragOver={(e) => { if (dragRef.current?.kind === "doctor") { e.preventDefault(); e.dataTransfer.dropEffect = "move"; if (overKey !== `day:${date}`) setOverKey(`day:${date}`); } }}
                  onDragLeave={() => setOverKey((k) => (k === `day:${date}` ? null : k))}
                  onDrop={(e) => { e.preventDefault(); dropOnDay(date, dragRef.current); endDrag(); }}
                  className={cx(
                  "group relative min-h-28 rounded-xl border p-1.5 transition-colors",
                  overKey === `day:${date}` && "ring-2 ring-[var(--hsu)] ring-offset-1",
                  mark === "off" ? "border-red-300 bg-red-50" : mark === "want" ? "border-emerald-300 bg-emerald-50" : mark === "ok" ? "border-[var(--hsu)]/40 bg-[var(--hsu-soft)]" : isWeekendish(date) ? "border-slate-200 bg-slate-50" : "border-slate-200 bg-white",
                )}>
                  <div className="mb-1 flex items-center justify-between gap-1">
                    <span className={cx("text-xs font-bold", isWeekendish(date) ? "text-[var(--hsu)]" : "text-slate-600")}>{Number(date.slice(8))}</span>
                    {mark === "off" && <Ban className="h-3 w-3 text-red-500" />}
                    {mark === "want" && <Heart className="h-3 w-3 text-emerald-600" />}
                    {h && <span className="truncate text-[9px] font-semibold text-amber-600" title={h}>{h}</span>}
                    <button onClick={() => setAddFor(date)} title="Bæta við vakt þennan dag" aria-label={`Bæta við vakt ${dayLabel(date)}`}
                      className="ml-auto hidden rounded p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 group-hover:block">
                      <Plus className="h-3 w-3" />
                    </button>
                  </div>
                  <div className="space-y-1">
                    {(["day", "evening"] as const).map((period) => {
                      const group = list.filter((s) => periodOf(s, data.shiftTypes) === period);
                      if (!group.length) return null;
                      return (
                        <div key={period} className={cx("space-y-0.5", showGroups && period === "evening" && "border-t border-dashed border-slate-300 pt-1")}>
                          {rowsOf(group).map((row) => (
                            <div key={row.key} className="flex items-stretch gap-1">
                              <span className="w-5 shrink-0 pt-0.5 text-[9px] font-bold uppercase text-slate-400" title={row.name}>{row.short}</span>
                              <div className="flex min-w-0 flex-1 gap-0.5">
                                {row.items.map((s) => {
                      // Fleiri en einn læknir í röðinni: upphafsstafir og litur
                      // duga, fullt nafn er í smáglugganum.
                      const tight = row.items.length > 1;
                      const doc = s.doctor_id ? docById.get(s.doctor_id) : null;
                      const c = conflicts[s.id];
                      const over = overKey === s.id;
                      const kind = kindOf(s);
                      const part = partTag(s);
                      const requested = s.confirm_status === "requested";
                      const optionalBv = kind === "bakvakt" && !s.doctor_id && !bvNeeded.has(date);
                      const blockedForFocus = kind === "bakvakt" && focusDoctor && !focusSkilled;
                      const when = `${hhmm(s.starts)}–${hhmm(s.ends)}`;
                      return (
                        <div key={s.id}
                          onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); e.dataTransfer.dropEffect = "move"; if (overKey !== s.id) setOverKey(s.id); }}
                          onDragLeave={() => setOverKey((k) => (k === s.id ? null : k))}
                          onDrop={(e) => { e.preventDefault(); e.stopPropagation(); dropOn(s, dragRef.current); endDrag(); }}
                          className={cx("min-w-0 flex-1 rounded-lg transition", over && "ring-2 ring-[var(--hsu)] ring-offset-1", blockedForFocus && "opacity-30")}>
                          {doc ? (
                            <button
                              draggable
                              onDragStart={(e) => startDrag(e, { kind: "shift", id: s.id })}
                              onDragEnd={endDrag}
                              onClick={() => (pick ? void apply([{ id: s.id, doctor_id: pick }]) : setSlotOpen(s.id))}
                              title={`${s.label} ${when} · ${doc.name}${requested ? `\n⏳ Beiðni: bíður samþykkis læknis` : ""}${c ? `\n⚠ ${c.map((k) => CONFLICT_IS[k]).join("\n⚠ ")}` : ""}${s.note ? `\n${s.note}` : ""}`}
                              className={cx(
                                "flex w-full cursor-grab items-center gap-0.5 rounded-lg py-1 text-[11px] font-semibold shadow-sm active:cursor-grabbing",
                                tight ? "justify-center px-0.5" : "px-1.5 text-left",
                                requested ? "border-2 border-dashed bg-amber-50 text-amber-900" : "text-white",
                                c && "ring-2 ring-amber-400 ring-offset-1",
                                focusDoctor && focusDoctor !== doc.id && "opacity-60",
                              )}
                              style={requested ? { borderColor: doc.color } : { background: doc.color }}>
                              {part && !tight && <span className="shrink-0 rounded bg-black/20 px-0.5 text-[8px] font-bold uppercase" title={when}>{part === "am" ? "f" : "e"}</span>}
                              <span className="truncate">
                                {part && tight && <span className="opacity-75" title={when}>{part === "am" ? "f" : "e"}</span>}
                                {tight ? initialsOf(doc.name) : shortName(doc.name)}
                              </span>
                              {requested && <Clock className="ml-auto h-3 w-3 shrink-0 text-amber-600" />}
                              {c && <AlertTriangle className={cx("h-3 w-3 shrink-0", requested ? "text-amber-600" : "ml-auto text-amber-200")} />}
                            </button>
                          ) : (
                            <button onClick={() => (pick ? void apply([{ id: s.id, doctor_id: pick }]) : setSlotOpen(s.id))}
                              title={`${s.label} ${when}${optionalBv ? "\nBakvakt — ekki þörf nema forvaktarlæknir þurfi bakvakt" : "\nEnginn læknir á vaktinni"}`}
                              className={cx(
                                "flex w-full items-center justify-center gap-0.5 rounded-lg border border-dashed py-1 text-[11px] font-semibold",
                                tight ? "px-0.5" : "px-1.5",
                                optionalBv ? "border-slate-200 bg-transparent text-slate-400 hover:bg-slate-50" : "border-red-300 bg-white/70 text-red-600 hover:bg-red-50",
                              )}>
                              {part && <span className="shrink-0 text-[8px] font-bold uppercase opacity-70">{part === "am" ? "f" : "e"}</span>}
                              <span className="truncate">{pick ? "+" : optionalBv ? "—" : tight ? "+" : "vantar"}</span>
                            </button>
                          )}
                        </div>
                      );
                                })}
                              </div>
                            </div>
                          ))}
                        </div>
                      );
                    })}
                    {focusBusy && <div className="text-[9px] font-semibold text-slate-500">á annarri vakt</div>}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 px-1 text-[11px] text-slate-500">
            <span>Dragðu lækni á dag eða á vakt · dragðu vakt ofan á aðra til að skipta · smelltu á vakt til að velja</span>
            {showGroups && <span>Efri hlutinn er {SHIFT_PERIOD_IS.day.toLowerCase()}, sá neðri {SHIFT_PERIOD_IS.evening.toLowerCase()}</span>}
            <span><b className="rounded bg-slate-200 px-0.5">f</b> / <b className="rounded bg-slate-200 px-0.5">e</b> fyrir eða eftir hádegi</span>
            <span className="inline-flex items-center gap-1"><span className="h-2.5 w-2.5 rounded ring-2 ring-amber-400" /> Árekstur</span>
            <span className="inline-flex items-center gap-1"><span className="h-2.5 w-2.5 rounded border-2 border-dashed border-amber-500 bg-amber-50" /> Beiðni — bíður samþykkis læknis</span>
            <span className="inline-flex items-center gap-1"><span className="h-2.5 w-2.5 rounded border border-dashed border-slate-300" /> Bakvakt án þarfar</span>
          </div>
        </Card>

        {/* Læknalisti */}
        <div className="space-y-3 lg:sticky lg:top-32 lg:self-start">
          <Card className="p-3">
            <div className="mb-2 flex items-center justify-between px-1">
              <h3 className="text-sm font-bold">Læknar</h3>
              <span className="text-[10px] uppercase tracking-wide text-slate-400">vaktir / markmið</span>
            </div>
            <ul className="space-y-1.5">
              {doctors.map((d) => {
                const st = stats[d.id];
                const pct = st && st.target ? Math.min(100, (st.count / st.target) * 100) : 0;
                const over = st && st.count > Math.ceil(st.target);
                const pref = data.preferences.find((p) => p.doctor_id === d.id);
                return (
                  <li key={d.id}>
                    <button draggable onDragStart={(e) => startDrag(e, { kind: "doctor", id: d.id })} onDragEnd={endDrag}
                      onClick={() => setPick((p) => (p === d.id ? null : d.id))}
                      className={cx("w-full cursor-grab rounded-xl border px-2.5 py-2 text-left transition active:cursor-grabbing",
                        pick === d.id ? "border-[var(--hsu)] bg-[var(--hsu-soft)] ring-2 ring-[var(--hsu)]/20" : "border-slate-200 bg-white hover:border-slate-300")}>
                      <div className="flex items-center gap-2">
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white" style={{ background: d.color }}>
                          {d.name.split(" ").map((x) => x[0]).slice(0, 2).join("")}
                        </span>
                        <span className="min-w-0 flex-1 truncate text-sm font-semibold">{d.name}</span>
                        {d.can_bakvakt && <span title="Bakvaktarréttindi" className="rounded bg-[var(--hsu-soft)] px-1 text-[9px] font-bold text-[var(--hsu-dark)]">BV</span>}
                        {d.needs_bakvakt && <span title="Þarf bakvakt á forvakt" className="rounded bg-amber-100 px-1 text-[9px] font-bold text-amber-800">+BV</span>}
                        <span className={cx("text-sm font-bold tabular-nums", over ? "text-amber-600" : "text-slate-800")}>{st?.count ?? 0}</span>
                        <span className="text-xs tabular-nums text-slate-400">/ {st ? st.target.toLocaleString("is-IS") : 0}</span>
                      </div>
                      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-100">
                        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: d.color }} />
                      </div>
                      <div className="mt-1 flex flex-wrap gap-x-3 text-[10px] text-slate-500">
                        <span>Helgar {st?.weekend ?? 0}</span>
                        {d.can_bakvakt && <span>Bakvaktir {st?.bakvakt ?? 0}</span>}
                        {st?.wantTotal ? <span>Óskir {st.wantHit}/{st.wantTotal}</span> : null}
                        <span className={cx(pref?.max_shifts == null && "text-slate-400")}>Mest {pref?.max_shifts ?? Math.max(1, Math.ceil((st?.target ?? 0) - 1e-6))}{pref?.max_shifts == null ? " (hlutfall)" : ""}</span>
                        {pref && pref.status !== "approved" && <span className="text-amber-600">Óskir ósamþykktar</span>}
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
            <div
              onDragOver={(e) => { if (dragRef.current?.kind === "shift") { e.preventDefault(); setOverKey("trash"); } }}
              onDragLeave={() => setOverKey((k) => (k === "trash" ? null : k))}
              onDrop={(e) => { e.preventDefault(); const p = dragRef.current; if (p?.kind === "shift") void apply([{ id: p.id, doctor_id: null }]); endDrag(); }}
              className={cx("mt-3 flex items-center justify-center gap-2 rounded-xl border-2 border-dashed px-3 py-3 text-xs font-semibold transition",
                drag?.kind === "shift" ? (overKey === "trash" ? "border-red-400 bg-red-50 text-red-700" : "border-red-200 text-red-500") : "border-slate-200 text-slate-400")}>
              <Trash2 className="h-4 w-4" /> Dragðu vakt hingað til að taka lækni af
            </div>
          </Card>

          {unfilled.length > 0 && (
            <Card className="p-3">
              <h3 className="mb-2 flex items-center gap-1.5 px-1 text-sm font-bold text-red-700"><AlertTriangle className="h-4 w-4" /> Tókst ekki að manna</h3>
              <ul className="space-y-1.5 text-xs">
                {unfilled.map((u) => (
                  <li key={u.key} className="rounded-lg bg-red-50 px-2.5 py-1.5">
                    <span className="font-semibold">{dayLabel(u.date)}</span> — {UNFILLED_REASON_IS[u.reason]}
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>
      </div>

      {slotShift && (
        <SlotModal shift={slotShift} ctx={ctx} shifts={shifts} doctors={doctors} prefs={prefs} toSlots={toSlots}
          stats={stats} onClose={() => setSlotOpen(null)}
          onAssign={async (doc) => { setSlotOpen(null); await apply([{ id: slotShift.id, doctor_id: doc }]); }}
          onChanged={async () => { setSlotOpen(null); await ctx.reload(); }} />
      )}
      {addFor && (
        <AddShiftModal date={addFor} doctors={doctors} types={data.shiftTypes} initialDoctor={addDoctor}
          onClose={() => { setAddFor(null); setAddDoctor(""); }}
          onDone={async () => { setAddFor(null); setAddDoctor(""); await ctx.reload(); }} />
      )}
    </div>
  );
}

// ── Velja lækni á vakt ─────────────────────────────────────────────────────

function SlotModal({ shift, ctx, shifts, doctors, prefs, toSlots, stats, onClose, onAssign, onChanged }: {
  shift: HsuShift; ctx: PlannerCtx; shifts: HsuShift[]; doctors: HsuDoctor[]; prefs: Record<string, PlanPrefs>;
  toSlots: (l: HsuShift[]) => PlanSlot[]; stats: ReturnType<typeof statsFor>;
  onClose: () => void; onAssign: (doctorId: string | null) => void; onChanged: () => void;
}) {
  const [note, setNote] = useState(shift.note);
  const [busy, setBusy] = useState<string | null>(null);

  const type = ctx.data.shiftTypes.find((t) => t.id === shift.shift_type_id) ?? null;
  const isBv = type?.kind === "bakvakt";
  const isDay = (type?.period ?? (hhmm(shift.starts) < "15:00" ? "day" : "evening")) === "day";
  const slotPart = partOfShift(shift, type);
  const wishOf = (id: string): DayPart => dayPartFor(prefs[id], shift.shift_date);
  const options = useMemo(() => {
    const planDocs = toPlanDoctors(doctors);
    return doctors.map((d) => {
      const hypothetical = toSlots(shifts.map((s) => (s.id === shift.id ? { ...s, doctor_id: d.id } : s)));
      const issues = (findConflicts(hypothetical, prefs, planDocs)[shift.id] ?? []).filter((k) => k !== "no_bakvakt");
      // "max" og "day_weekday" eru ekki hindrun heldur beiðni til læknisins.
      const mark = markFor(prefs[d.id], shift.shift_date);
      const rank = issues.includes("skill") ? 5 : issues.includes("off") ? 4 : issues.length ? 3 : mark === "want" ? 0 : 1;
      return { d, issues, mark, rank, st: stats[d.id] };
    }).sort((a, b) => a.rank - b.rank || (a.st?.count ?? 0) - (a.st?.target ?? 0) - ((b.st?.count ?? 0) - (b.st?.target ?? 0)) || a.d.name.localeCompare(b.d.name, "is"));
  }, [doctors, shifts, shift, prefs, toSlots, stats]);

  /**
   * Læknir sem vill hálfan dag settur á heila vakt: vaktin er tekin í tvennt og
   * hann fer á sinn helming. Hinn helmingurinn stendur eftir opinn.
   */
  const splitAndAssign = async (doctorId: string, wish: DayPart) => {
    setBusy(`split:${doctorId}`);
    const r = await hsuApi<{ shift: { id: string }; created: { id: string } }>(
      `/api/hsu/admin/shifts/${shift.id}/split`, { body: { action: "split" }, staff: true });
    if (!r.ok) { setBusy(null); alert(r.error ?? "Mistókst"); return; }
    const targetId = wish === "pm" ? r.created?.id : shift.id;
    if (targetId) {
      await hsuApi("/api/hsu/admin/shifts/batch", {
        body: { changes: [{ id: targetId, doctor_id: doctorId }], month: shift.shift_date.slice(0, 7), notify: ctx.data.month?.status === "published" },
        staff: true,
      });
    }
    setBusy(null);
    onChanged();
  };

  const h = holidayName(shift.shift_date);
  // Hálfur dagur: skipta stakri vakt um hádegi, eða sameina helmingana aftur.
  const siblings = shifts.filter((x) => x.id !== shift.id && x.shift_date === shift.shift_date && x.shift_type_id === shift.shift_type_id);
  const adjacent = siblings.some((x) => hhmm(x.starts) === hhmm(shift.ends) || hhmm(x.ends) === hhmm(shift.starts));
  const canSplit = !isOvernight(shift.starts, shift.ends) && minutesOf(shift.ends) - minutesOf(shift.starts) >= 120;

  return (
    <Modal open onClose={onClose} title={`${shift.label || "Vakt"} · ${dayLabel(shift.shift_date)}`}>
      <div className="-mt-2 mb-4 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-slate-500">
        <span>
          {hhmm(shift.starts)}–{hhmm(shift.ends)}{slotPart !== "all" ? ` · ${DAY_PART_IS[slotPart].toLowerCase()}` : ""}{h ? ` · ${h}` : ""}
          {isBv && <span className="ml-2 inline-flex items-center gap-1 text-[var(--hsu-dark)]"><Shield className="h-3.5 w-3.5" /> Aðeins læknar með bakvaktarréttindi</span>}
        </span>
        {canSplit && (
          <Button size="sm" variant="soft" busy={busy === "split"} onClick={async () => {
            setBusy("split");
            const r = await hsuApi(`/api/hsu/admin/shifts/${shift.id}/split`, { body: { action: "split" }, staff: true });
            setBusy(null);
            if (!r.ok) { alert(r.error ?? "Mistókst"); return; }
            onChanged();
          }}><Scissors className="h-3.5 w-3.5" /> Skipta um hádegi (f.h. + e.h.)</Button>
        )}
        {adjacent && (
          <Button size="sm" variant="ghost" busy={busy === "merge"} onClick={async () => {
            setBusy("merge");
            const r = await hsuApi(`/api/hsu/admin/shifts/${shift.id}/split`, { body: { action: "merge" }, staff: true });
            setBusy(null);
            if (!r.ok) { alert(r.error ?? "Mistókst"); return; }
            onChanged();
          }}><Merge className="h-3.5 w-3.5" /> Sameina í heila vakt</Button>
        )}
      </div>
      {shift.confirm_status === "requested" && (
        <div className="mb-3"><Notice tone="warn">Beiðni send til læknisins — bíður svars. Veldu annan lækni til að draga hana til baka.</Notice></div>
      )}
      <ul className="space-y-1.5">
        {options.map(({ d, issues, mark, st }) => {
          const wish = wishOf(d.id);
          // Heil dagvakt en læknirinn vill hálfan dag: skipta fyrst, svo setja á.
          const wantsSplit = isDay && slotPart === "all" && wish !== "all" && canSplit;
          return (
          <li key={d.id}>
            <button onClick={() => (wantsSplit ? void splitAndAssign(d.id, wish) : onAssign(d.id))} disabled={issues.includes("skill") || busy !== null}
              className={cx("flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition hover:shadow-sm",
                shift.doctor_id === d.id ? "border-[var(--hsu)] bg-[var(--hsu-soft)]" : issues.includes("skill") ? "cursor-not-allowed border-slate-100 bg-slate-50 opacity-50" : issues.includes("off") ? "border-red-200 bg-red-50/40" : "border-slate-200 bg-white")}>
              <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: d.color }} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold">{d.name}</span>
                <span className="block text-[11px] text-slate-500">
                  {st?.count ?? 0} / {st?.target.toLocaleString("is-IS") ?? 0} vaktir · {st?.weekend ?? 0} helgar
                  {isDay && wish !== "all" && <span className="ml-1 font-semibold text-violet-600">· {DAY_PART_IS[wish].toLowerCase()}</span>}
                </span>
              </span>
              {wantsSplit ? (
                <span className="text-right text-[11px] font-semibold text-violet-700">Skiptir vaktinni um hádegi</span>
              ) : issues.length ? (
                <span className={cx("text-right text-[11px] font-semibold", issues.every((k) => k === "max" || k === "day_weekday" || k === "evening_weekday" || k === "day_part") ? "text-amber-700" : "text-red-600")}>
                  {issues.map((k) => ({ off: "Getur ekki", double: "Á vakt á sama tíma dags", rest: "Hvíld", max: "Umfram hámark → beiðni", skill: "Ekki bakvaktarréttindi", day_weekday: "Utan dagvinnudaga → beiðni", evening_weekday: "Óskaði ekki eftir kvöldvöktum þennan dag → beiðni", day_part: "Vill hálfan dag → beiðni", no_bakvakt: "" })[k]).filter(Boolean).join(" · ")}
                </span>
              ) : mark === "want" ? (
                <Badge tone="green"><Heart className="h-3 w-3" /> Vill</Badge>
              ) : (
                <Badge tone="slate">Laus</Badge>
              )}
            </button>
          </li>
          );
        })}
      </ul>
      {shift.doctor_id && (
        <Button variant="ghost" className="mt-3 w-full" onClick={() => onAssign(null)}><X className="h-4 w-4" /> Taka lækni af vaktinni</Button>
      )}
      <div className="mt-4 space-y-2 border-t border-slate-100 pt-4">
        <Field label="Athugasemd við vakt">
          <input className={inputCls} value={note} onChange={(e) => setNote(e.target.value)} placeholder="t.d. „Mæting kl. 9 vegna fundar“" />
        </Field>
        <div className="flex flex-wrap gap-2">
          {note !== shift.note && (
            <Button size="sm" variant="soft" busy={busy === "note"} onClick={async () => {
              setBusy("note");
              await hsuApi(`/api/hsu/admin/shifts/${shift.id}`, { method: "PATCH", body: { note }, staff: true });
              setBusy(null);
              onChanged();
            }}>Vista athugasemd</Button>
          )}
          <Button size="sm" variant="danger" busy={busy === "del"} onClick={async () => {
            if (!confirm(shift.shift_type_id ? "Eyða þessari vakt? Hún verður búin til aftur ef „Fylla í tómar“ er keyrt." : "Eyða aukavaktinni?")) return;
            setBusy("del");
            await hsuApi(`/api/hsu/admin/shifts/${shift.id}`, { method: "DELETE", staff: true });
            setBusy(null);
            onChanged();
          }}><Trash2 className="h-3.5 w-3.5" /> Eyða vakt</Button>
        </div>
      </div>
      {ctx.data.month?.status === "published" && <p className="mt-3 text-[11px] text-slate-500">Mánuðurinn er birtur: læknar sem breytingin snertir fá tölvupóst og dagatölin uppfærast.</p>}
    </Modal>
  );
}

function AddShiftModal({ date, doctors, types, initialDoctor = "", onClose, onDone }: { date: string; doctors: HsuDoctor[]; types: HsuShiftType[]; initialDoctor?: string; onClose: () => void; onDone: () => void }) {
  const usable = types.filter((t) => t.active && typeAppliesOn(t, date));
  const [typeId, setTypeId] = useState(usable[0]?.id ?? "");
  const [label, setLabel] = useState("Aukavakt");
  const [starts, setStarts] = useState("08:00");
  const [ends, setEnds] = useState("16:00");
  const [doctor, setDoctor] = useState(initialDoctor);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  return (
    <Modal open onClose={onClose} title={`Bæta við vakt · ${dayLabel(date)}`}>
      <div className="space-y-3">
        <Field label="Vaktategund" hint={typeId ? "Ein vakt til viðbótar af þessari tegund þennan dag (t.d. þriðji læknir á flýtimóttöku)." : "Eigin tímar og heiti."}>
          <select className={inputCls} value={typeId} onChange={(e) => setTypeId(e.target.value)}>
            {usable.map((t) => <option key={t.id} value={t.id}>{t.name} ({hhmm(t.starts)}–{hhmm(t.ends)})</option>)}
            <option value="">Aukavakt — eigin tímar</option>
          </select>
        </Field>
        {!typeId && <>
        <Field label="Heiti"><input className={inputCls} value={label} onChange={(e) => setLabel(e.target.value)} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Frá"><input type="time" className={inputCls} value={starts} onChange={(e) => setStarts(e.target.value)} /></Field>
          <Field label="Til"><input type="time" className={inputCls} value={ends} onChange={(e) => setEnds(e.target.value)} /></Field>
        </div>
        </>}
        <Field label="Læknir">
          <select className={inputCls} value={doctor} onChange={(e) => setDoctor(e.target.value)}>
            <option value="">— enginn enn —</option>
            {doctors.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </Field>
        {err && <Notice tone="err">{err}</Notice>}
        <Button className="w-full" busy={busy} onClick={async () => {
          setBusy(true); setErr(null);
          const r = await hsuApi("/api/hsu/admin/shifts", {
            body: typeId
              ? { shift_date: date, shift_type_id: typeId, doctor_id: doctor || null }
              : { shift_date: date, label, starts, ends, doctor_id: doctor || null },
            staff: true,
          });
          setBusy(false);
          if (!r.ok) { setErr(r.error ?? "Mistókst"); return; }
          onDone();
        }}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Bæta við</Button>
      </div>
    </Modal>
  );
}
