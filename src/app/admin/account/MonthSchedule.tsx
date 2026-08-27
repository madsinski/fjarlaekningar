"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { monthKey, shiftMonth, monthLabel, datesInMonth, weekdayShort, hhmm, type RosterShift, type RosterDoctor } from "@/lib/roster";

// Read-only month view of the whole roster, with month switching. The caller's
// own shifts are highlighted. Lives on the right of Mín síða.
export default function MonthSchedule({ myDoctorId }: { myDoctorId?: string | null }) {
  const [month, setMonth] = useState(() => monthKey(new Date()));
  const [shifts, setShifts] = useState<RosterShift[]>([]);
  const [doctors, setDoctors] = useState<RosterDoctor[]>([]);
  const [loading, setLoading] = useState(true);

  const listRef = useRef<HTMLUListElement>(null);
  const todayRef = useRef<HTMLLIElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch(`/api/admin/account/month?month=${month}`, {
      headers: { Authorization: session?.access_token ? `Bearer ${session.access_token}` : "" },
    });
    const j = await res.json().catch(() => ({}));
    if (j?.ok) {
      setShifts(j.shifts);
      setDoctors(j.doctors);
    }
    setLoading(false);
  }, [month]);

  useEffect(() => {
    load();
  }, [load]);

  // Bring today into view once the month has rendered. Marking the row is no
  // help if it is below the fold of the card's own scroller. Moved by setting
  // scrollTop rather than scrollIntoView(), which would also drag the page.
  useEffect(() => {
    if (loading) return;
    const list = listRef.current, row = todayRef.current;
    if (!list || !row) return;
    const delta = row.getBoundingClientRect().top - list.getBoundingClientRect().top;
    list.scrollTop += delta - 8;
  }, [loading, month]);

  // Local date, not toISOString(): Iceland is UTC so the two agree at home, but
  // a doctor reading this from another timezone should see their own "today".
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

  const docById = (id: string | null) => (id ? doctors.find((d) => d.id === id) : undefined);
  const byDate: Record<string, RosterShift[]> = {};
  for (const s of shifts) (byDate[s.shift_date] ||= []).push(s);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden lg:sticky lg:top-6">
      <div className="flex items-center justify-between gap-2 border-b border-slate-200 px-3 py-2.5">
        <button onClick={() => setMonth((m) => shiftMonth(m, -1))} className="p-1.5 rounded-lg hover:bg-slate-100"><ChevronLeft className="w-4 h-4" /></button>
        <span className="text-sm font-semibold text-slate-900 capitalize">{monthLabel(month)}</span>
        <button onClick={() => setMonth((m) => shiftMonth(m, 1))} className="p-1.5 rounded-lg hover:bg-slate-100"><ChevronRight className="w-4 h-4" /></button>
      </div>
      {loading ? (
        <p className="p-4 text-sm text-slate-400">Hleð…</p>
      ) : (
        <ul ref={listRef} className="max-h-[70vh] overflow-y-auto divide-y divide-slate-50">
          {datesInMonth(month).map((date) => {
            const rows = byDate[date] || [];
            const isToday = date === today;
            return (
              // Today gets a left rule, a tint and its own label. The transparent
              // border on every other row keeps the dates in one column rather
              // than nudging them across as you scroll past today.
              <li
                key={date}
                ref={isToday ? todayRef : undefined}
                className={`flex items-start gap-3 border-l-2 py-2 pl-2.5 pr-3 text-sm ${
                  isToday ? "border-cyan-600 bg-cyan-50/50" : "border-transparent"
                }`}
              >
                <span className="w-12 shrink-0">
                  <span className={isToday ? "font-semibold text-slate-900" : "text-slate-500"}>
                    <span className="text-[11px] uppercase">{weekdayShort(date)}</span> {Number(date.slice(-2))}.
                  </span>
                  {isToday && (
                    <span className="block text-[10px] font-semibold uppercase tracking-wide text-cyan-700">í dag</span>
                  )}
                </span>
                <div className="flex-1 min-w-0 space-y-1">
                  {rows.length === 0 ? (
                    <span className="text-slate-300">—</span>
                  ) : (
                    rows.map((s) => {
                      const d = docById(s.doctor_id);
                      const mine = !!myDoctorId && s.doctor_id === myDoctorId;
                      // A shift on the market keeps its doctor_id, so the old
                      // "no doctor found" test never caught it and it rendered as
                      // an ordinary assigned shift. Ask the status instead — and
                      // let orange win over the "mine" highlight, because a shift
                      // going spare is the more urgent fact about it.
                      const onMarket = s.status === "open";
                      return (
                        <div key={s.id} className={`flex items-center gap-2 rounded-md px-1.5 py-0.5 ${
                          onMarket ? "bg-orange-50 ring-1 ring-orange-200" : mine ? "bg-cyan-50 ring-1 ring-cyan-200" : ""
                        }`}>
                          <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: onMarket ? "#f97316" : d?.color || "#cbd5e1" }} />
                          <span className={`truncate ${onMarket ? "font-medium text-orange-700" : d ? "text-slate-800" : "text-amber-600"}`}>
                            {onMarket ? "Á markaði" : d?.name || "óúthlutað"}
                          </span>
                          <span className="ml-auto shrink-0 text-[11px] text-slate-400">{hhmm(s.starts)}–{hhmm(s.ends)}</span>
                        </div>
                      );
                    })
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
