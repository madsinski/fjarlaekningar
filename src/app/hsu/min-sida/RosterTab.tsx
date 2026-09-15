"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { monthWeeks } from "../_components/PrefsEditor";
import { Card, cx, hsuApi, shortName, capFirst } from "../_components/ui";
import { WEEKDAY_ORDER, WEEKDAY_SHORT_IS, holidayName, monthKey, monthLabel, shiftMonth, type HsuShift } from "@/lib/hsu/types";

export default function RosterTab({ meId }: { meId: string }) {
  const [month, setMonth] = useState(() => monthKey(new Date()));
  const [state, setState] = useState<{ loading: boolean; published: boolean; shifts: HsuShift[]; doctors: { id: string; name: string; color: string }[] }>({ loading: true, published: false, shifts: [], doctors: [] });
  const [onlyMine, setOnlyMine] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setState((s) => ({ ...s, loading: true }));
      const r = await hsuApi<{ published: boolean; shifts: HsuShift[]; doctors: { id: string; name: string; color: string }[] }>(`/api/hsu/me/roster?month=${month}`);
      if (!cancelled) setState({ loading: false, published: Boolean(r.published), shifts: r.shifts ?? [], doctors: r.doctors ?? [] });
    })();
    return () => { cancelled = true; };
  }, [month]);

  const doc = (id: string | null) => state.doctors.find((d) => d.id === id);
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">Vaktaplan</h1>
          <p className="text-sm text-slate-500">Hver er á vakt hvenær.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setMonth((m) => shiftMonth(m, -1))} aria-label="Fyrri mánuður" className="rounded-xl border border-slate-200 bg-white p-2 hover:bg-slate-50"><ChevronLeft className="h-4 w-4" /></button>
          <span className="w-36 text-center text-sm font-bold">{capFirst(monthLabel(month))}</span>
          <button onClick={() => setMonth((m) => shiftMonth(m, 1))} aria-label="Næsti mánuður" className="rounded-xl border border-slate-200 bg-white p-2 hover:bg-slate-50"><ChevronRight className="h-4 w-4" /></button>
        </div>
      </div>

      {state.loading ? (
        <div className="h-96 animate-pulse rounded-2xl bg-slate-100" />
      ) : !state.published ? (
        <Card className="p-8 text-center text-sm text-slate-500">Vaktaplan fyrir {monthLabel(month)} hefur ekki verið birt.</Card>
      ) : (
        <>
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input type="checkbox" checked={onlyMine} onChange={(e) => setOnlyMine(e.target.checked)} /> Aðeins mínar vaktir
          </label>
          <Card className="overflow-x-auto p-2 sm:p-3">
            <div className="grid min-w-[640px] grid-cols-7 gap-1">
              {WEEKDAY_ORDER.map((wd) => <div key={wd} className="py-1 text-center text-[11px] font-bold uppercase text-slate-500">{WEEKDAY_SHORT_IS[wd]}</div>)}
              {monthWeeks(month).flat().map((date, i) => {
                if (!date) return <div key={i} />;
                const h = holidayName(date);
                const shifts = state.shifts.filter((s) => s.shift_date === date && (!onlyMine || s.doctor_id === meId));
                return (
                  <div key={date} className={cx("min-h-24 rounded-xl border p-1.5", date === today ? "border-[var(--hsu)] bg-[var(--hsu-soft)]/40" : "border-slate-100 bg-slate-50/60")}>
                    <div className="flex items-center justify-between text-[11px] font-bold text-slate-500">
                      <span>{Number(date.slice(8))}</span>
                      {h && <span className="truncate pl-1 text-[9px] font-semibold text-amber-600" title={h}>{h}</span>}
                    </div>
                    <div className="mt-1 space-y-1">
                      {shifts.map((s) => {
                        const d = doc(s.doctor_id);
                        const mine = s.doctor_id === meId;
                        const pending = s.confirm_status === "requested";
                        return (
                          <div key={s.id} title={`${s.label} ${s.starts.slice(0, 5)}–${s.ends.slice(0, 5)}${pending ? " · bíður samþykkis" : ""}`}
                            className={cx("truncate rounded-md px-1.5 py-1 text-[11px] font-semibold",
                              pending ? "border border-dashed border-amber-400 bg-amber-50 text-amber-900" : mine ? "text-white" : "bg-white text-slate-700 ring-1 ring-slate-200")}
                            style={pending ? undefined : mine ? { background: d?.color ?? "var(--hsu)" } : { borderLeft: `3px solid ${d?.color ?? "#cbd5e1"}` }}>
                            {s.label && <span className="opacity-70">{s.label} </span>}{d ? shortName(d.name) : "—"}
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
    </div>
  );
}
