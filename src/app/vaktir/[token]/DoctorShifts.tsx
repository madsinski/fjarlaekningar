"use client";

import { useMemo, useState } from "react";
import { CalendarPlus, Copy, Check } from "lucide-react";
import {
  monthKey,
  monthLabel,
  weekdayShort,
  hhmm,
  formatIsk,
  type RosterShift,
  type RosterSettings,
} from "@/lib/roster";

export default function DoctorShifts({
  token,
  doctorName,
  initialShifts,
  settings,
  calendarUrl,
}: {
  token: string;
  doctorName: string;
  initialShifts: RosterShift[];
  settings: RosterSettings;
  calendarUrl: string;
}) {
  const [shifts, setShifts] = useState<RosterShift[]>(initialShifts);
  const [copied, setCopied] = useState(false);
  const [savedId, setSavedId] = useState<string | null>(null);

  const thisMonth = monthKey(new Date());
  const webcal = calendarUrl.replace(/^https?:/, "webcal:");

  const byMonth = useMemo(() => {
    const m: Record<string, RosterShift[]> = {};
    for (const s of shifts) (m[s.shift_date.slice(0, 7)] ||= []).push(s);
    return Object.entries(m).sort(([a], [b]) => a.localeCompare(b));
  }, [shifts]);

  const summary = useMemo(() => {
    const own = shifts.filter((s) => s.shift_date.slice(0, 7) === thisMonth && s.status !== "open");
    const patients = own.reduce((n, s) => n + (s.patients_seen || 0), 0);
    return { days: own.length, patients, pay: patients * settings.per_patient_salary };
  }, [shifts, thisMonth, settings.per_patient_salary]);

  const savePatients = async (shift: RosterShift, value: number) => {
    if (value === shift.patients_seen) return;
    setShifts((prev) => prev.map((s) => (s.id === shift.id ? { ...s, patients_seen: value } : s)));
    const res = await fetch(`/api/vaktir/${token}/patients`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ shift_id: shift.id, patients_seen: value }),
    });
    if (res.ok) {
      setSavedId(shift.id);
      setTimeout(() => setSavedId((c) => (c === shift.id ? null : c)), 1500);
    }
  };

  const copyUrl = async () => {
    try {
      await navigator.clipboard.writeText(calendarUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <div className="text-[11px] font-semibold uppercase tracking-widest text-[var(--primary-dark)]">Fjarlækningar</div>
        <h1 className="text-2xl font-bold text-slate-900">Mínar vaktir</h1>
        <p className="text-sm text-slate-600">{doctorName}</p>
      </div>

      {/* This month summary */}
      <div className="grid grid-cols-3 gap-3">
        {[
          ["Vaktir í mánuðinum", String(summary.days)],
          ["Sjúklingar", String(summary.patients)],
          ["Laun", formatIsk(summary.pay, settings.currency)],
        ].map(([label, value]) => (
          <div key={label} className="rounded-2xl border border-slate-200 bg-white p-4 text-center">
            <div className="text-lg font-extrabold text-slate-900 tabular-nums">{value}</div>
            <div className="text-[11px] text-slate-500">{label}</div>
          </div>
        ))}
      </div>

      {/* Calendar subscribe */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
          <CalendarPlus className="w-4 h-4 text-[var(--primary-dark)]" /> Bæta vöktum í dagatal
        </div>
        <p className="mt-1 text-sm text-slate-600">Gerðu áskrift í Google eða Apple dagatali — vaktirnar uppfærast sjálfkrafa.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <a href={webcal} className="inline-flex items-center gap-2 rounded-lg bg-[var(--primary-dark)] px-4 py-2 text-sm font-semibold text-white hover:brightness-110">
            Gerast áskrifandi
          </a>
          <button onClick={copyUrl} className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
            {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
            {copied ? "Afritað!" : "Afrita hlekk"}
          </button>
        </div>
      </div>

      {/* Shifts */}
      {byMonth.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">Engar vaktir framundan.</div>
      ) : (
        byMonth.map(([m, rows]) => (
          <div key={m}>
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500 capitalize">{monthLabel(m)}</h2>
            <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[11px] uppercase tracking-wide text-slate-500 border-b border-slate-200">
                    <th className="px-4 py-2 font-medium">Dagur</th>
                    <th className="px-4 py-2 font-medium">Tími</th>
                    <th className="px-4 py-2 font-medium w-28">Sjúklingar</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((s) => (
                    <tr key={s.id} className="border-b border-slate-100 last:border-0">
                      <td className="px-4 py-2 whitespace-nowrap"><span className="text-slate-500">{weekdayShort(s.shift_date)}</span> {Number(s.shift_date.slice(-2))}.</td>
                      <td className="px-4 py-2 whitespace-nowrap text-slate-600">{hhmm(s.starts)}–{hhmm(s.ends)}</td>
                      <td className="px-4 py-2">
                        <span className="inline-flex items-center gap-2">
                          <input
                            type="number" min={0}
                            defaultValue={s.patients_seen}
                            onBlur={(e) => savePatients(s, Math.max(0, Math.floor(Number(e.target.value) || 0)))}
                            className="w-20 px-2 py-1 border border-slate-200 rounded-lg text-sm text-right focus:ring-2 focus:ring-cyan-200 outline-none"
                          />
                          {savedId === s.id && <Check className="w-4 h-4 text-emerald-600" />}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))
      )}

      <p className="text-center text-xs text-slate-400">Skráðu fjölda sjúklinga eftir hverja vakt. Stjórnandi sér yfirlitið.</p>
    </div>
  );
}
