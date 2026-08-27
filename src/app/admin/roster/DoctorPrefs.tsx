"use client";

// Vaktaóskir eins læknis: hámark á mánuði, hvaða vikudaga hann tekur, og
// athugasemd fyrir það sem reglurnar ná ekki utan um.

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { WEEKDAY_LABELS_IS, WEEKDAY_ORDER, weekdaySummary } from "@/lib/roster-assign";
import type { RosterDoctor } from "@/lib/roster";

export default function DoctorPrefs({
  doctor, onChange,
}: {
  doctor: RosterDoctor;
  onChange: (patch: Partial<RosterDoctor>) => void;
}) {
  const [open, setOpen] = useState(false);
  const days = doctor.allowed_weekdays ?? [];

  const toggleDay = (d: number) => {
    const next = days.includes(d) ? days.filter((x) => x !== d) : [...days, d];
    onChange({ allowed_weekdays: next.sort((a, b) => a - b) });
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center gap-2 px-3 py-2 text-left"
      >
        <span
          className="h-3 w-3 shrink-0 rounded-full"
          style={{ backgroundColor: doctor.color }}
          aria-hidden
        />
        <span className="text-sm font-medium text-slate-800">{doctor.name}</span>
        <span className="ml-auto text-[11px] text-slate-500">
          {weekdaySummary(days)}
          {doctor.max_shifts_per_month != null ? ` · hám. ${doctor.max_shifts_per_month}` : ""}
        </span>
        {open ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
      </button>

      {open && (
        <div className="space-y-3 border-t border-slate-100 px-3 py-3">
          <label className="block text-[11px] text-slate-500">
            Hámark vakta á mánuði
            <input
              type="number"
              min={0}
              value={doctor.max_shifts_per_month ?? ""}
              placeholder="ekkert þak"
              onChange={(e) =>
                onChange({ max_shifts_per_month: e.target.value === "" ? null : Math.max(0, Math.floor(Number(e.target.value))) })
              }
              className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-cyan-200"
            />
          </label>

          <div>
            <span className="block text-[11px] text-slate-500">Vikudagar</span>
            <div className="mt-1 flex flex-wrap gap-1">
              {WEEKDAY_ORDER.map((d) => {
                const on = days.includes(d);
                return (
                  <button
                    key={d}
                    type="button"
                    aria-pressed={on}
                    onClick={() => toggleDay(d)}
                    className={`rounded-md border px-2 py-1 text-xs font-medium transition-colors ${
                      on
                        ? "border-cyan-600 bg-cyan-600 text-white"
                        : "border-slate-200 bg-white text-slate-600 hover:border-cyan-400"
                    }`}
                  >
                    {WEEKDAY_LABELS_IS[d]}
                  </button>
                );
              })}
            </div>
            <p className="mt-1 text-[11px] text-slate-400">
              Enginn valinn = allir dagar. Veldu bara til að takmarka.
            </p>
          </div>

          <label className="block text-[11px] text-slate-500">
            Athugasemd
            <input
              value={doctor.shift_note ?? ""}
              placeholder="t.d. ekki fyrstu vikuna í júlí"
              onChange={(e) => onChange({ shift_note: e.target.value })}
              className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-cyan-200"
            />
            <span className="mt-1 block text-[11px] text-slate-400">
              Sýnd þeim sem raðar niður — hún er ekki keyrð sjálfvirkt.
            </span>
          </label>
        </div>
      )}
    </div>
  );
}
