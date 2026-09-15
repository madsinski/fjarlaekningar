// Handvirkar breytingar á vöktum (draga og sleppa, velja lækni). Server-only.
//
// Tvær reglur gilda umfram sjálfvirku skiptinguna:
//   * Bakvakt fer aðeins á lækni með bakvaktarréttindi. Brot er hafnað.
//   * Vakt á degi sem læknirinn sagðist ekki geta, dagvakt á vikudegi sem hann
//     vinnur ekki dagvinnu, eða vakt umfram hámarkið sem hann skráði, verður BEIÐNI:
//     hún er frátekin fyrir hann, merkt á vaktaplani, og hann fær póst og
//     samþykkir eða hafnar á sinni síðu. Hún fer ekki í dagatal fyrr.

import { after } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { hsuSync } from "./calendar";
import { shiftPhrase } from "./market";
import { notifyDoctors, type DoctorNotice } from "./notify";
import { markFor, monthRange, type ShiftPeriod } from "./types";
import { worksDayShift } from "./plan";

export interface ShiftChange {
  id: string;
  doctor_id: string | null;
}

export class ShiftRuleError extends Error {}

export async function applyShiftChanges(changes: ShiftChange[], opts: { actor: string; origin: string; notify: boolean }) {
  if (!changes.length) return { changed: 0, requested: 0 };
  const ids = changes.map((c) => c.id);
  const { data: before, error } = await supabaseAdmin
    .from("hsu_shifts")
    .select("id, doctor_id, shift_date, starts, ends, label, published, shift_type_id, confirm_status")
    .in("id", ids);
  if (error) throw new Error(error.message);
  const byId = new Map((before ?? []).map((s) => [s.id, s]));

  const real = changes.filter((c) => {
    const s = byId.get(c.id);
    return s && (s.doctor_id ?? null) !== (c.doctor_id ?? null);
  });
  if (!real.length) return { changed: 0, requested: 0 };

  // ── Bakvaktarréttindi ────────────────────────────────────────────────────
  const typeIds = [...new Set((before ?? []).map((s) => s.shift_type_id).filter(Boolean))] as string[];
  const newDocIds = [...new Set(real.map((c) => c.doctor_id).filter(Boolean))] as string[];
  const [{ data: types }, { data: docs }] = await Promise.all([
    typeIds.length ? supabaseAdmin.from("hsu_shift_types").select("id, kind, period").in("id", typeIds) : Promise.resolve({ data: [] as { id: string; kind: string; period: ShiftPeriod }[] }),
    newDocIds.length ? supabaseAdmin.from("hsu_doctors").select("id, name, can_bakvakt, day_weekdays").in("id", newDocIds) : Promise.resolve({ data: [] as { id: string; name: string; can_bakvakt: boolean; day_weekdays: number[] }[] }),
  ]);
  const kindOf = new Map((types ?? []).map((t) => [t.id, t.kind]));
  const periodOfType = new Map((types ?? []).map((t) => [t.id, t.period]));
  const periodOfShift = (s: { shift_type_id: string | null; starts: string; ends: string }): ShiftPeriod =>
    (s.shift_type_id ? periodOfType.get(s.shift_type_id) : undefined)
    ?? (s.starts.slice(0, 5) < "15:00" && s.ends.slice(0, 5) > s.starts.slice(0, 5) ? "day" : "evening");
  const docById = new Map((docs ?? []).map((d) => [d.id, d]));
  for (const c of real) {
    const s = byId.get(c.id)!;
    if (c.doctor_id && s.shift_type_id && kindOf.get(s.shift_type_id) === "bakvakt" && !docById.get(c.doctor_id)?.can_bakvakt) {
      throw new ShiftRuleError(`${docById.get(c.doctor_id)?.name ?? "Læknirinn"} hefur ekki bakvaktarréttindi.`);
    }
  }

  // ── Hvaða nýju vaktir þarf að biðja lækninn um? ─────────────────────────
  // Tvennt kallar á beiðni: dagvakt á vikudegi sem hann vinnur ekki dagvinnu,
  // og vakt umfram hámarkið sem hann skráði.
  const requestIds = new Map<string, "off" | "weekday" | "max">();
  for (const c of real) {
    const s = byId.get(c.id)!;
    if (!c.doctor_id) continue;
    const doc = docById.get(c.doctor_id);
    if (periodOfShift(s) === "day" && !worksDayShift({ dayWeekdays: doc?.day_weekdays ?? [] }, s.shift_date)) {
      requestIds.set(c.id, "weekday");
    }
  }
  const months = [...new Set(real.filter((c) => c.doctor_id).map((c) => byId.get(c.id)!.shift_date.slice(0, 7)))];
  for (const month of months) {
    const inMonth = real.filter((c) => c.doctor_id && byId.get(c.id)!.shift_date.startsWith(month));
    const docsHere = [...new Set(inMonth.map((c) => c.doctor_id!))];
    const { first, next } = monthRange(month);
    const [{ data: prefRows }, { data: held }] = await Promise.all([
      supabaseAdmin.from("hsu_preferences").select("doctor_id, max_shifts, day_marks, weekday_marks").eq("month", month).in("doctor_id", docsHere),
      supabaseAdmin.from("hsu_shifts").select("id, doctor_id").in("doctor_id", docsHere).gte("shift_date", first).lt("shift_date", next),
    ]);
    const maxOf = new Map((prefRows ?? []).map((p) => [p.doctor_id, p.max_shifts as number | null]));
    // „Get ekki“ er ekki hindrun fyrir yfirlækni, en læknirinn þarf að samþykkja.
    const prefOf = new Map((prefRows ?? []).map((p) => [p.doctor_id, p as unknown as Parameters<typeof markFor>[0]]));
    for (const c of inMonth) {
      const s = byId.get(c.id)!;
      if (!requestIds.has(c.id) && markFor(prefOf.get(c.doctor_id!), s.shift_date) === "off") requestIds.set(c.id, "off");
    }
    for (const docId of docsHere) {
      const max = maxOf.get(docId);
      if (max == null) continue;
      const changedIds = new Set(real.map((c) => c.id));
      // Vaktir læknisins eftir breytinguna: þær sem hann heldur og breytast ekki, auk nýrra.
      const kept = (held ?? []).filter((h) => h.doctor_id === docId && !changedIds.has(h.id)).length;
      const added = inMonth.filter((c) => c.doctor_id === docId);
      added.forEach((c, i) => { if (kept + i + 1 > max && !requestIds.has(c.id)) requestIds.set(c.id, "max"); });
    }
  }

  // ── Skrifa ───────────────────────────────────────────────────────────────
  const now = new Date().toISOString();
  const touched = new Set<string>();
  const notices: DoctorNotice[] = [];
  const requests: DoctorNotice[] = [];
  for (const c of real) {
    const s = byId.get(c.id)!;
    const reason = requestIds.get(c.id);
    const isRequest = Boolean(reason);
    const { error: upErr } = await supabaseAdmin
      .from("hsu_shifts")
      .update({
        doctor_id: c.doctor_id,
        status: "assigned",
        confirm_status: isRequest ? "requested" : null,
        requested_by: isRequest ? opts.actor : "",
        requested_at: isRequest ? now : null,
      })
      .eq("id", c.id);
    if (upErr) throw new Error(upErr.message);
    await supabaseAdmin
      .from("hsu_swaps")
      .update({ status: "cancelled", resolved_at: now })
      .eq("shift_id", c.id)
      .in("status", ["pending", "awaiting_approval"]);

    // Fyrri læknir: vissi hann af vaktinni? Aðeins ef hún var birt og staðfest.
    if (s.doctor_id && s.published && s.confirm_status !== "requested") {
      touched.add(s.doctor_id);
      notices.push({ doctorId: s.doctor_id, line: `Þú ert ekki lengur á vaktinni ${shiftPhrase(s)}.` });
    }
    if (s.doctor_id && s.confirm_status === "requested") {
      notices.push({ doctorId: s.doctor_id, line: `Beiðni um vaktina ${shiftPhrase(s)} hefur verið dregin til baka.` });
    }
    if (c.doctor_id) {
      if (isRequest) {
        requests.push({
          doctorId: c.doctor_id,
          line: `${shiftPhrase(s)} — ${
            reason === "off" ? "dagur sem þú merktir „get ekki“"
            : reason === "weekday" ? "dagvakt utan þeirra vikudaga sem þú vinnur dagvinnu"
            : "umfram hámarkið sem þú skráðir"}.`,
        });
      } else if (s.published) {
        touched.add(c.doctor_id);
        notices.push({ doctorId: c.doctor_id, line: `Þú hefur verið sett(ur) á vaktina ${shiftPhrase(s)}.` });
      }
    }
  }

  if (touched.size) after(async () => { await hsuSync.syncDoctors([...touched]); });
  if (opts.notify) {
    notifyDoctors({ origin: opts.origin, subject: "Breyting á vaktaplani", heading: "Breyting á vaktaplani", intro: `${opts.actor} breytti vaktaplaninu:`, notices });
  }
  // Beiðnir fara alltaf út, birt eða ekki: læknirinn þarf að svara þeim.
  notifyDoctors({
    origin: opts.origin,
    subject: "Beiðni um aukavakt",
    heading: "Beiðni um aukavakt",
    intro: `${opts.actor} biður þig um að taka eftirfarandi vakt${requests.length > 1 ? "ir" : ""}. Þær eru fráteknar fyrir þig þar til þú svarar.`,
    notices: requests,
    cta: { label: "Svara beiðni", path: "/hsu/min-sida?t=vaktir" },
  });

  return { changed: real.length, requested: requestIds.size };
}
