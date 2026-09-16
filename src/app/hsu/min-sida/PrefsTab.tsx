"use client";

import { useCallback, useMemo, useState } from "react";
import PrefsEditor, { PrefsStepNav, Step, draftFrom, type PrefDraft } from "../_components/PrefsEditor";
import { useState as useReactState } from "react";
import { CalendarClock, Check, Loader2 } from "lucide-react";
import { Button, Notice, cx, hsuApi, capFirst } from "../_components/ui";
import type { PortalData } from "@/lib/hsu/portal";
import { MONTH_STATUS_IS, WEEKDAY_ORDER, WEEKDAY_SHORT_IS, dayLabel, monthKey, monthLabel, shiftMonth, type HsuPreference, type MonthStatus } from "@/lib/hsu/types";

export default function PrefsTab({ data, initialMonth, refresh }: { data: PortalData; initialMonth: string; refresh: () => void }) {
  // Mánuðir sem má skrá óskir fyrir: allir opnir mánuðir, auk næstu tveggja
  // (svo læknir geti skráð sumarfrí áður en yfirlæknir opnar mánuðinn).
  const options = useMemo(() => {
    const now = monthKey(new Date());
    const set = new Set<string>([shiftMonth(now, 1), shiftMonth(now, 2)]);
    for (const m of data.months) if (m.status === "collecting" || m.status === "review") set.add(m.month);
    return [...set].sort();
  }, [data.months]);

  // Opnast á fyrsta mánuði sem hægt er að breyta: mánuður í vaktaplani er
  // læstur, og læknir sem kemur hingað vill skrá óskir, ekki lesa lás.
  const [month, setMonth] = useState(() => {
    if (options.includes(initialMonth)) return initialMonth;
    const collecting = data.months.find((m) => m.status === "collecting");
    if (collecting) return collecting.month;
    const open = options.find((m) => {
      const st = data.months.find((x) => x.month === m)?.status;
      return !st || st === "review";
    });
    return open ?? options[0];
  });

  const monthRow = data.months.find((m) => m.month === month) ?? null;
  const pref = data.prefs.find((p) => p.month === month) ?? null;
  const initial = useMemo(() => draftFrom(pref), [pref]);

  const status: MonthStatus | null = monthRow?.status ?? null;
  const editable = !status || status === "collecting" || (status === "review" && (!pref || pref.status === "draft" || pref.status === "changes_requested"));
  const lockedReason = status === "planning" || status === "published"
    ? "Vaktaplan fyrir þennan mánuð er í vinnslu eða birt. Hafðu samband við yfirlækni ef eitthvað hefur breyst."
    : pref?.status === "approved"
      ? "Yfirlæknir hefur samþykkt óskirnar þínar."
      : "Óskirnar eru hjá yfirlækni til yfirferðar.";

  const [progress, setProgress] = useState({ daysMarked: false, sent: false });
  const onProgress = useCallback((p: { daysMarked: boolean; sent: boolean }) => {
    setProgress((prev) => (prev.daysMarked === p.daysMarked && prev.sent === p.sent ? prev : p));
  }, []);

  const save = async (draft: PrefDraft, opts: { submit: boolean; alsoNext: boolean }) => {
    const r = await hsuApi<{ copiedTo: string | null }>("/api/hsu/me/preferences", {
      method: "PUT",
      body: { month, ...draft, submit: opts.submit, also_next: opts.alsoNext },
    });
    if (r.ok) refresh();
    return r;
  };

  const loadPrevious = async () => {
    const r = await hsuApi<{ preference: HsuPreference | null }>(`/api/hsu/me/preferences?month=${shiftMonth(month, -1)}`);
    return r.ok && r.preference ? draftFrom(r.preference) : null;
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold">Vaktaóskir</h1>
        <p className="text-sm text-slate-500">
          Farðu í gegnum skrefin hér að neðan og sendu óskirnar í lokin.{" "}
          <span className="font-semibold text-red-600">Get ekki</span> er virt skilyrðislaust;{" "}
          <span className="font-semibold text-emerald-600">vil gjarnan</span> er ósk sem reynt er að verða við.
        </p>
      </div>

      {editable && (
        <div className="rounded-2xl border border-slate-200 bg-white px-2 py-1.5 shadow-sm">
          <PrefsStepNav daysMarked={progress.daysMarked} sent={progress.sent} />
        </div>
      )}

      <Step n={1} steps id="skref-1" done title="Veldu mánuð"
        hint="Veldu mánuðinn sem þú skráir óskir fyrir. Þú getur líka skráð óskir fram í tímann, t.d. sumarfrí.">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {options.map((m) => {
            const row = data.months.find((x) => x.month === m);
            const p = data.prefs.find((x) => x.month === m);
            return (
              <button key={m} onClick={() => setMonth(m)} aria-pressed={m === month}
                className={cx("shrink-0 rounded-2xl border px-4 py-2.5 text-left transition", m === month ? "border-[var(--hsu)] bg-[var(--hsu-soft)] ring-2 ring-[var(--hsu)]/30" : "border-slate-200 bg-white hover:bg-slate-50")}>
                <div className="text-sm font-bold text-slate-900">{capFirst(monthLabel(m))}</div>
                <div className="text-[11px] text-slate-500">
                  {row ? MONTH_STATUS_IS[row.status] : "Ekki opnað"}{p ? ` · ${{ draft: "drög", submitted: "sent", approved: "samþykkt", changes_requested: "breyta" }[p.status]}` : ""}
                </div>
              </button>
            );
          })}
        </div>
        {monthRow?.status === "collecting" && monthRow.prefs_deadline && (
          <p className="mt-2 text-sm text-slate-700">Skilafrestur: <span className="font-bold">{dayLabel(monthRow.prefs_deadline)}</span>{monthRow.note ? ` · ${monthRow.note}` : ""}</p>
        )}
        {!monthRow && <p className="mt-2 text-sm text-slate-500">Yfirlæknir hefur ekki opnað þennan mánuð enn, en þú getur skráð óskir strax.</p>}
      </Step>

      <PrefsEditor
        month={month}
        initial={initial}
        status={pref?.status ?? "none"}
        reviewNote={pref?.review_note}
        editable={editable}
        lockedReason={lockedReason}
        onSave={save}
        onLoadPrevious={loadPrevious}
        onProgress={onProgress}
        dayWorkSlot={<DayWeekdaysCard initial={data.me.dayWeekdays} refresh={refresh} />}
      />
    </div>
  );
}

/**
 * Fastir dagvinnudagar læknisins — ekki bundnir mánuði. Sjálfvirka skiptingin
 * setur hann aðeins á dagvaktir (flýtimóttöku) þessa daga; þurfi yfirlæknir hann
 * annan dag kemur það sem beiðni.
 */
function DayWeekdaysCard({ initial, refresh }: { initial: number[]; refresh: () => void }) {
  const [days, setDays] = useReactState<number[]>(initial);
  const [busy, setBusy] = useReactState(false);
  const [saved, setSaved] = useReactState(false);
  const [err, setErr] = useReactState<string | null>(null);
  const dirty = JSON.stringify(days) !== JSON.stringify(initial);

  const save = async () => {
    setBusy(true); setErr(null);
    const r = await hsuApi("/api/hsu/me/day-weekdays", { method: "PUT", body: { day_weekdays: days } });
    setBusy(false);
    if (!r.ok) { setErr(r.error ?? "Vistun mistókst"); return; }
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    refresh();
  };

  return (
    <div className="rounded-xl bg-slate-50 p-3">
      <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
        <CalendarClock className="h-4 w-4 text-[var(--hsu)]" /> Dagvinnudagar — gilda alla mánuði
      </div>
      <p className="mt-0.5 text-[11px] text-slate-500">
        Hvaða vikudaga vinnur þú dagvinnu? Þú færð aðeins dagvaktir þá daga. Allir valdir = allir dagar. Vistast sér, strax.
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-1">
        {WEEKDAY_ORDER.map((d) => (
          <button key={d} type="button"
            onClick={() => setDays((x) => (x.includes(d) ? x.filter((y) => y !== d) : [...x, d].sort()))}
            className={cx("rounded-lg px-3 py-2 text-xs font-semibold transition",
              days.length === 0 || days.includes(d) ? "bg-[var(--hsu)] text-white" : "bg-slate-100 text-slate-500")}>
            {WEEKDAY_SHORT_IS[d]}
          </button>
        ))}
        {days.length > 0 && <button type="button" onClick={() => setDays([])} className="px-2 text-xs font-medium text-slate-500 underline">Alla daga</button>}
        {dirty && <Button size="sm" className="ml-auto" onClick={save} busy={busy}>Vista</Button>}
        {saved && <span className="ml-auto inline-flex items-center gap-1 text-xs font-semibold text-emerald-600"><Check className="h-3.5 w-3.5" /> Vistað</span>}
        {busy && !dirty && <Loader2 className="h-4 w-4 animate-spin text-slate-400" />}
      </div>
      {err && <div className="mt-2"><Notice tone="err">{err}</Notice></div>}
    </div>
  );
}
