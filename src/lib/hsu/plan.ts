// Sjálfvirk skipting vakta fyrir HSU — og athugun á handvirkum breytingum.
//
// Hreint fall, engin gagnagrunnsköll: sama inntak gefur alltaf sama plan, og það
// má keyra í vafranum til að sýna árekstra jafnóðum og læknar eru dregnir til.
//
// HARÐAR reglur (brjótast aldrei í sjálfvirku skiptingunni):
//   * "Get ekki" — dagur eða vikudagur merktur off
//   * Ein vakt á dag á hvern lækni
//   * Hvíld eftir vakt (rest_days_after á vaktategund)
//   * Hámarksfjöldi vakta læknis í mánuðinum
//
// MJÚKAR reglur (vegnar saman):
//   * Jöfn skipting í hlutfalli við starfshlutfall, innan lágmarks/hámarks
//   * Helgar- og frídagavaktir dreifast jafnt
//   * "Vil gjarnan" dagar virtir þegar hægt er
//   * Vaktir dreifast um mánuðinn frekar en að hrannast upp

import { addDays, isWeekendish, markFor, type HsuPreference } from "./types";

export interface PlanSlot {
  /** Auðkenni vaktar (eða "dagsetning|tegund" fyrir óvistaðar). */
  key: string;
  date: string;
  typeId: string | null;
  restAfter: number;
  doctorId: string | null;
}

export interface PlanDoctor {
  id: string;
  name: string;
  fte: number;
  active: boolean;
}

export type PlanPrefs = Pick<HsuPreference, "day_marks" | "weekday_marks" | "min_shifts" | "max_shifts">;

export interface PlanOptions {
  /** empty = fylla aðeins tómar vaktir; all = skipta öllum mánuðinum upp á nýtt. */
  mode?: "empty" | "all";
}

export type UnfilledReason = "all-off" | "all-busy" | "all-rest" | "all-at-max" | "no-doctors";

export const UNFILLED_REASON_IS: Record<UnfilledReason, string> = {
  "all-off": "Allir læknar hafa merkt „get ekki“ þennan dag",
  "all-busy": "Allir sem geta eru þegar á vakt þennan dag",
  "all-rest": "Allir sem geta eru í hvíld eftir fyrri vakt",
  "all-at-max": "Allir sem geta eru komnir í hámarksfjölda vakta",
  "no-doctors": "Engir virkir læknar",
};

export interface DoctorStat {
  count: number;
  target: number;
  weekend: number;
  wantHit: number;
  wantTotal: number;
  min: number | null;
  max: number | null;
}

export interface PlanResult {
  assignments: Record<string, string | null>;
  unfilled: { key: string; date: string; reason: UnfilledReason }[];
  stats: Record<string, DoctorStat>;
}

interface Held { key: string; date: string; rest: number }

/** Hvenær má læknir EKKI taka vakt vegna annarrar vaktar sem hann heldur. */
function restBlocks(held: Held[], slot: Pick<PlanSlot, "key" | "date" | "restAfter">): "busy" | "rest" | null {
  for (const h of held) {
    if (h.key === slot.key) continue;
    if (h.date === slot.date) return "busy";
    // Fyrri vakt krefst hvíldar sem nær yfir þennan dag.
    if (h.date < slot.date && h.rest > 0 && slot.date <= addDays(h.date, h.rest)) return "rest";
    // Þessi vakt krefst hvíldar sem nær yfir síðari vakt.
    if (h.date > slot.date && slot.restAfter > 0 && h.date <= addDays(slot.date, slot.restAfter)) return "rest";
  }
  return null;
}

/**
 * Markmið hvers læknis: vaktir í hlutfalli við starfshlutfall, en innan
 * lágmarks og hámarks sem hann óskaði. Það sem klemmist af einum dreifist á hina.
 */
export function computeTargets(total: number, doctors: PlanDoctor[], prefs: Record<string, PlanPrefs | undefined>): Record<string, number> {
  const pool = doctors.filter((d) => d.active && d.fte > 0);
  const targets: Record<string, number> = {};
  let free = new Set(pool.map((d) => d.id));
  let remaining = total;
  for (let iter = 0; iter < 8 && free.size; iter++) {
    const fteSum = pool.filter((d) => free.has(d.id)).reduce((s, d) => s + d.fte, 0);
    if (fteSum <= 0) break;
    let clampedAny = false;
    const next = new Set(free);
    for (const d of pool) {
      if (!free.has(d.id)) continue;
      const t = (remaining * d.fte) / fteSum;
      const p = prefs[d.id];
      if (p?.max_shifts != null && t > p.max_shifts) { targets[d.id] = p.max_shifts; next.delete(d.id); clampedAny = true; }
      else if (p?.min_shifts != null && t < p.min_shifts) { targets[d.id] = p.min_shifts; next.delete(d.id); clampedAny = true; }
      else targets[d.id] = t;
    }
    if (!clampedAny) break;
    remaining = total - pool.filter((d) => !next.has(d.id)).reduce((s, d) => s + targets[d.id], 0);
    remaining = Math.max(0, remaining);
    free = next;
  }
  for (const d of pool) targets[d.id] ??= 0;
  return targets;
}

export function planMonth(
  slots: PlanSlot[],
  doctors: PlanDoctor[],
  prefs: Record<string, PlanPrefs | undefined>,
  opts: PlanOptions = {},
): PlanResult {
  const mode = opts.mode ?? "empty";
  const pool = doctors
    .filter((d) => d.active && d.fte > 0)
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name, "is"));
  const byId = new Map(pool.map((d) => [d.id, d]));

  const targets = computeTargets(slots.length, pool, prefs);
  const weekendSlots = slots.filter((s) => isWeekendish(s.date)).length;
  const fteSum = pool.reduce((s, d) => s + d.fte, 0) || 1;
  const weekendTarget = (id: string) => (weekendSlots * (byId.get(id)?.fte ?? 0)) / fteSum;

  const held: Record<string, Held[]> = {};
  for (const d of pool) held[d.id] = [];
  const assignments: Record<string, string | null> = {};

  const toPlace: PlanSlot[] = [];
  for (const s of slots) {
    if (mode === "empty" && s.doctorId) {
      assignments[s.key] = s.doctorId;
      held[s.doctorId]?.push({ key: s.key, date: s.date, rest: s.restAfter });
    } else {
      assignments[s.key] = null;
      toPlace.push(s);
    }
  }

  const maxOf = (id: string) => prefs[id]?.max_shifts ?? Infinity;
  const isOff = (id: string, date: string) => markFor(prefs[id], date) === "off";
  const wants = (id: string, date: string) => markFor(prefs[id], date) === "want";

  /** Hörð athugun. Skilar ástæðu ef læknirinn getur ekki tekið vaktina. */
  const blocker = (id: string, slot: PlanSlot): "off" | "busy" | "rest" | "max" | null => {
    if (isOff(id, slot.date)) return "off";
    const r = restBlocks(held[id], slot);
    if (r) return r;
    const count = held[id].filter((h) => h.key !== slot.key).length;
    if (count >= maxOf(id)) return "max";
    return null;
  };

  // Erfiðustu vaktirnar fyrst: þær sem fæstir mega taka yfir höfuð.
  const baseCandidates = (s: PlanSlot) => pool.filter((d) => !isOff(d.id, s.date)).length;
  const ordered = toPlace.slice().sort((a, b) => baseCandidates(a) - baseCandidates(b) || a.date.localeCompare(b.date));

  const unfilled: PlanResult["unfilled"] = [];

  const pickCost = (id: string, s: PlanSlot) => {
    const h = held[id];
    const target = Math.max(targets[id] ?? 0, 0.25);
    let cost = ((h.length + 1) / target) * 100;
    if (isWeekendish(s.date)) {
      const wk = h.filter((x) => isWeekendish(x.date)).length;
      cost += ((wk + 1) / Math.max(weekendTarget(id), 0.25)) * 40;
    }
    if (wants(id, s.date)) cost -= 45;
    const min = prefs[id]?.min_shifts;
    if (min != null && h.length < min) cost -= 25;
    // Dreifing: vakt innan tveggja daga frá annarri er síðri kostur.
    if (h.some((x) => x.date !== s.date && Math.abs(daysBetween(x.date, s.date)) <= 2)) cost += 18;
    return cost;
  };

  for (const s of ordered) {
    if (pool.length === 0) { unfilled.push({ key: s.key, date: s.date, reason: "no-doctors" }); continue; }
    const reasons = new Set<string>();
    const ok: PlanDoctor[] = [];
    for (const d of pool) {
      const b = blocker(d.id, s);
      if (b) reasons.add(b); else ok.push(d);
    }
    if (ok.length === 0) {
      const reason: UnfilledReason = reasons.has("max") ? "all-at-max" : reasons.has("rest") ? "all-rest" : reasons.has("busy") ? "all-busy" : "all-off";
      unfilled.push({ key: s.key, date: s.date, reason });
      continue;
    }
    ok.sort((a, b) => pickCost(a.id, s) - pickCost(b.id, s) || a.name.localeCompare(b.name, "is"));
    const pick = ok[0];
    assignments[s.key] = pick.id;
    held[pick.id].push({ key: s.key, date: s.date, rest: s.restAfter });
  }

  // ── Bæting: skipta á vöktum milli lækna ef heildin batnar ────────────────
  // Gráðug úthlutun festist oft í staðbundnu lágmarki — t.d. læknir sem fékk
  // þrjár helgar af því að hann var fyrstur í stafrófsröð þegar jafnt stóð.
  const movable = new Set(toPlace.map((s) => s.key));
  const slotByKey = new Map(slots.map((s) => [s.key, s]));

  const totalCost = () => {
    let c = 0;
    for (const d of pool) {
      const h = held[d.id];
      const t = targets[d.id] ?? 0;
      c += ((h.length - t) ** 2) * 100 / Math.max(t, 1);
      const wk = h.filter((x) => isWeekendish(x.date)).length;
      const wt = weekendTarget(d.id);
      c += ((wk - wt) ** 2) * 60 / Math.max(wt, 1);
      const min = prefs[d.id]?.min_shifts;
      if (min != null && h.length < min) c += (min - h.length) * 80;
      const dates = h.map((x) => x.date).sort();
      for (let i = 1; i < dates.length; i++) if (daysBetween(dates[i - 1], dates[i]) <= 2) c += 18;
      for (const x of h) if (wants(d.id, x.date)) c -= 45;
    }
    return c;
  };

  const move = (key: string, from: string | null, to: string | null) => {
    const s = slotByKey.get(key)!;
    if (from) held[from] = held[from].filter((h) => h.key !== key);
    if (to) held[to].push({ key, date: s.date, rest: s.restAfter });
    assignments[key] = to;
  };

  let best = totalCost();
  const keys = [...movable].filter((k) => assignments[k]).sort();
  for (let pass = 0; pass < 4; pass++) {
    let improved = false;
    // 1) Færa vakt til annars læknis.
    for (const k of keys) {
      const from = assignments[k];
      if (!from) continue;
      const s = slotByKey.get(k)!;
      for (const d of pool) {
        if (d.id === from) continue;
        if (blocker(d.id, s)) continue;
        move(k, from, d.id);
        const c = totalCost();
        if (c < best - 1e-9) { best = c; improved = true; break; }
        move(k, d.id, from);
      }
    }
    // 2) Skipta á tveimur vöktum.
    for (let i = 0; i < keys.length; i++) {
      for (let j = i + 1; j < keys.length; j++) {
        const a = keys[i], b = keys[j];
        const da = assignments[a], db = assignments[b];
        if (!da || !db || da === db) continue;
        const sa = slotByKey.get(a)!, sb = slotByKey.get(b)!;
        // Losa báðar vaktirnar fyrst; þá er hvor læknir athugaður án vaktarinnar
        // sem hann lætur af hendi. Læknarnir eru ólíkir, svo athuganirnar tvær
        // hafa ekki áhrif hvor á aðra.
        move(a, da, null); move(b, db, null);
        if (!blocker(db, sa) && !blocker(da, sb)) {
          move(a, null, db); move(b, null, da);
          const c = totalCost();
          if (c < best - 1e-9) { best = c; improved = true; continue; }
          move(a, db, null); move(b, da, null);
        }
        move(a, null, da); move(b, null, db);
      }
    }
    if (!improved) break;
  }

  unfilled.sort((a, b) => a.date.localeCompare(b.date));
  return { assignments, unfilled, stats: statsFor(slots.map((s) => ({ ...s, doctorId: assignments[s.key] ?? null })), pool, prefs) };
}

function daysBetween(a: string, b: string): number {
  const [ya, ma, da] = a.split("-").map(Number);
  const [yb, mb, db] = b.split("-").map(Number);
  return Math.round((Date.UTC(yb, mb - 1, db) - Date.UTC(ya, ma - 1, da)) / 86400000);
}

export function statsFor(slots: PlanSlot[], doctors: PlanDoctor[], prefs: Record<string, PlanPrefs | undefined>): Record<string, DoctorStat> {
  const pool = doctors.filter((d) => d.active);
  const targets = computeTargets(slots.length, pool, prefs);
  const out: Record<string, DoctorStat> = {};
  const dates = [...new Set(slots.map((s) => s.date))];
  for (const d of pool) {
    const mine = slots.filter((s) => s.doctorId === d.id);
    const wantDates = dates.filter((dt) => markFor(prefs[d.id], dt) === "want");
    out[d.id] = {
      count: mine.length,
      target: Math.round((targets[d.id] ?? 0) * 10) / 10,
      weekend: mine.filter((s) => isWeekendish(s.date)).length,
      wantHit: wantDates.filter((dt) => mine.some((s) => s.date === dt)).length,
      wantTotal: wantDates.length,
      min: prefs[d.id]?.min_shifts ?? null,
      max: prefs[d.id]?.max_shifts ?? null,
    };
  }
  return out;
}

// ── Árekstrar í núverandi plani (fyrir handvirkar breytingar) ──────────────

export type ConflictKind = "off" | "double" | "rest" | "max";

export const CONFLICT_IS: Record<ConflictKind, string> = {
  off: "Læknirinn merkti „get ekki“ þennan dag",
  double: "Læknirinn er á tveimur vöktum sama dag",
  rest: "Of stutt hvíld frá annarri vakt",
  max: "Fleiri vaktir en hámark læknisins",
};

/** Vakt → listi árekstra. Tómt = allt í lagi. */
export function findConflicts(slots: PlanSlot[], prefs: Record<string, PlanPrefs | undefined>): Record<string, ConflictKind[]> {
  const out: Record<string, ConflictKind[]> = {};
  const byDoc: Record<string, PlanSlot[]> = {};
  for (const s of slots) if (s.doctorId) (byDoc[s.doctorId] ||= []).push(s);
  for (const [doc, mine] of Object.entries(byDoc)) {
    const held: Held[] = mine.map((s) => ({ key: s.key, date: s.date, rest: s.restAfter }));
    const max = prefs[doc]?.max_shifts;
    const sorted = mine.slice().sort((a, b) => a.date.localeCompare(b.date));
    sorted.forEach((s, i) => {
      const list: ConflictKind[] = [];
      if (markFor(prefs[doc], s.date) === "off") list.push("off");
      const r = restBlocks(held, s);
      if (r === "busy") list.push("double");
      else if (r === "rest") list.push("rest");
      if (max != null && i >= max) list.push("max");
      if (list.length) out[s.key] = list;
    });
  }
  return out;
}
