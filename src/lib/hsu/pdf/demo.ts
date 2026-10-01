// Sýnidæmi fyrir prentskjalið: mánuður sem er búinn til í minni svo yfirlæknir
// geti séð útlitið hvenær sem er — líka áður en nokkurt vaktaplan er til.
//
// EKKERT ER VISTAÐ. Vaktirnar eru tilbúnar úr RAUNVERULEGUM vaktategundum og
// RAUNVERULEGUM læknum stöðvarinnar, svo blaðið líti eins út og það mun gera:
// sömu tegundir, sömu nöfn, sömu litir. Ein vakt af hverjum sex er skilin eftir
// ómönnuð svo „vantar“ sjáist líka.

import { datesInMonth, typeAppliesOn, type HsuShift, type HsuShiftType } from "../types";
import type { ShiftPdfDoctor } from "./shared";

export function demoShifts(month: string, types: HsuShiftType[], doctors: ShiftPdfDoctor[]): HsuShift[] {
  const active = types.filter((t) => t.active).sort((a, b) => a.sort - b.sort || a.short.localeCompare(b.short));
  const out: HsuShift[] = [];
  let n = 0;
  for (const date of datesInMonth(month)) {
    for (const ty of active) {
      if (!typeAppliesOn(ty, date)) continue;
      for (let slot = 0; slot < Math.max(1, ty.slots_per_day); slot++) {
        // Sjötta hver vakt er ómönnuð — annars sæist „vantar“ hvergi.
        const doctor = n % 6 === 5 ? null : doctors[n % Math.max(1, doctors.length)];
        out.push({
          id: `demo-${date}-${ty.id}-${slot}`,
          shift_date: date,
          shift_type_id: ty.id,
          label: ty.name,
          starts: ty.starts,
          ends: ty.ends,
          doctor_id: doctor?.id ?? null,
          status: doctor ? "assigned" : "open",
          note: "",
          slot_index: slot,
        });
        n++;
      }
    }
  }
  return out;
}
