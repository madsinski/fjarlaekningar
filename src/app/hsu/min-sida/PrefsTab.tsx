"use client";

import { useMemo, useState } from "react";
import PrefsEditor, { draftFrom, type PrefDraft } from "../_components/PrefsEditor";
import { useState as useReactState } from "react";
import { CalendarClock, Check, Loader2 } from "lucide-react";
import { Button, Card, Notice, cx, hsuApi, capFirst } from "../_components/ui";
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
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold">Vaktaóskir</h1>
        <p className="text-sm text-slate-500">
          Merktu daga sem þú <span className="font-semibold text-red-600">getur ekki</span> unnið, daga sem þú <span className="font-semibold text-emerald-600">vilt gjarnan</span> vinna
          og daga sem þú ert <span className="font-semibold text-[var(--hsu)]">laus</span>. „Get ekki“ er virt skilyrðislaust; „vil gjarnan“ er ósk sem reynt er að verða við.
          Ómerktir dagar teljast lausir.
        </p>
      </div>

      <DayWeekdaysCard initial={data.me.dayWeekdays} refresh={refresh} />

      <div className="flex gap-2 overflow-x-auto pb-1">
        {options.map((m) => {
          const row = data.months.find((x) => x.month === m);
          const p = data.prefs.find((x) => x.month === m);
          return (
            <button key={m} onClick={() => setMonth(m)}
              className={cx("shrink-0 rounded-2xl border px-4 py-2.5 text-left transition", m === month ? "border-[var(--hsu)] bg-[var(--hsu-soft)]" : "border-slate-200 bg-white hover:bg-slate-50")}>
              <div className="text-sm font-bold text-slate-900">{capFirst(monthLabel(m))}</div>
              <div className="text-[11px] text-slate-500">
                {row ? MONTH_STATUS_IS[row.status] : "Ekki opnað"}{p ? ` · ${{ draft: "drög", submitted: "sent", approved: "samþykkt", changes_requested: "breyta" }[p.status]}` : ""}
              </div>
            </button>
          );
        })}
      </div>

      {monthRow?.status === "collecting" && monthRow.prefs_deadline && (
        <p className="text-sm text-slate-600">Skilafrestur: <span className="font-semibold">{dayLabel(monthRow.prefs_deadline)}</span>{monthRow.note ? ` · ${monthRow.note}` : ""}</p>
      )}
      {!monthRow && <p className="text-sm text-slate-500">Yfirlæknir hefur ekki opnað þennan mánuð enn, en þú getur skráð óskir strax — t.d. sumarfrí.</p>}

      <Card className="p-4 sm:p-6">
        <PrefsEditor
          month={month}
          initial={initial}
          status={pref?.status ?? "none"}
          reviewNote={pref?.review_note}
          editable={editable}
          lockedReason={lockedReason}
          onSave={save}
          onLoadPrevious={loadPrevious}
        />
      </Card>
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
    <Card className="p-4 sm:p-5">
      <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
        <CalendarClock className="h-4 w-4 text-[var(--hsu)]" /> Dagvinnudagar (flýtimóttaka)
      </div>
      <p className="mt-1 text-xs text-slate-500">
        Hvaða vikudaga vinnur þú dagvinnu? Þú færð aðeins dagvaktir þá daga. Enginn valinn = allir dagar.
        Þetta gildir þar til þú breytir því — ekki bara þennan mánuð. Kvöld- og næturvaktir ráðast af óskunum hér fyrir neðan.
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
    </Card>
  );
}
