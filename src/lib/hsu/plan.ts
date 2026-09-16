// Sjálfvirk skipting vakta fyrir HSU — og athugun á handvirkum breytingum.
//
// Hreint fall, engin gagnagrunnsköll: sama inntak gefur alltaf sama plan, og það
// má keyra í vafranum til að sýna árekstra jafnóðum og læknar eru dregnir til.
//
// VAKTATEGUNDIR
//   * Forvakt (FV1/FV2) — alltaf mönnuð, alla daga.
//   * Bakvakt (BV1/BV2) — aðeins læknar með bakvaktarréttindi. Ekki mönnuð
//     nema forvaktarlæknir dagsins þurfi bakvakt; annars stendur hún tóm og
//     telst ekki gat í planinu.
//   * Annað — alltaf mannað, hver sem er.
//
// HARÐAR reglur (brjótast aldrei í sjálfvirku skiptingunni):
//   * "Get ekki" — dagur eða vikudagur merktur off
//   * Engar tvær vaktir á sama tíma. Sami læknir má taka flýtimóttöku og svo
//     forvakt sama dag, og fyrri og síðari hluta flýtimóttöku, en forvakt og
//     bakvakt sama dag eru alltaf tveir ólíkir læknar (sami tími).
//   * Hvíld eftir vakt (rest_days_after á vaktategund)
//   * Hámarksfjöldi vakta læknis í mánuðinum
//   * Bakvakt aðeins á lækni með bakvaktarréttindi
//   * Dagvakt aðeins á lækni sem vinnur dagvinnu þann vikudag
//   * Kvöld-/næturvakt aðeins á lækni sem óskaði eftir þeim vikudegi
//
// MJÚKAR reglur (vegnar saman):
//   * Jöfn skipting (forvakt + bakvakt saman) í hlutfalli við starfshlutfall
//   * Helgar- og frídagavaktir dreifast jafnt
//   * "Vil gjarnan" dagar virtir þegar hægt er
//   * Læknir sem þarf bakvakt fær helst forvakt þá daga sem reyndur læknir er laus
//   * Vaktir dreifast um mánuðinn frekar en að hrannast upp

import { addDays, isOvernight, isWeekendish, markFor, timesOverlap, wantsEveningOn, weekdayOf, type HsuPreference, type ShiftKind, type ShiftPeriod } from "./types";

export interface PlanSlot {
  /** Auðkenni vaktar (eða "dagsetning|tegund" fyrir óvistaðar). */
  key: string;
  date: string;
  typeId: string | null;
  restAfter: number;
  doctorId: string | null;
  kind: ShiftKind;
  /** Dagvakt eða kvöld-/næturvakt. Sami læknir má hafa eina af hvoru sama dag. */
  period: ShiftPeriod;
  starts: string;
  ends: string;
  /** Haldið óbreyttri líka í "all": t.d. vakt sem bíður samþykkis læknis. */
  locked?: boolean;
  /** Læknirinn samþykkti vaktina umfram hámark sitt — telst ekki árekstur. */
  agreed?: boolean;
  /** Beiðni umfram hámark sem bíður svars — telst heldur ekki árekstur. */
  pending?: boolean;
}

export interface PlanDoctor {
  id: string;
  name: string;
  fte: number;
  active: boolean;
  /** Má taka bakvakt (reynsla). */
  canBakvakt?: boolean;
  /** Þarf bakvakt þegar hann er á forvakt. */
  needsBakvakt?: boolean;
  /** Dagvaktir aðeins þessa vikudaga. Tómt/ósett = allir dagar. */
  dayWeekdays?: number[];
}

/** Má læknirinn taka dagvakt á þessum degi? */
export function worksDayShift(doctor: Pick<PlanDoctor, "dayWeekdays"> | undefined, date: string): boolean {
  const days = doctor?.dayWeekdays ?? [];
  return days.length === 0 || days.includes(weekdayOf(date));
}

export type PlanPrefs = Pick<HsuPreference, "day_marks" | "weekday_marks" | "evening_weekdays" | "min_shifts" | "max_shifts">;

export interface PlanOptions {
  /** empty = fylla aðeins tómar vaktir; all = skipta öllum mánuðinum upp á nýtt. */
  mode?: "empty" | "all";
}

export type UnfilledReason = "all-off" | "all-busy" | "all-rest" | "all-at-max" | "no-doctors" | "no-bakvakt-doctor" | "no-day-doctor" | "no-evening-doctor";

export const UNFILLED_REASON_IS: Record<UnfilledReason, string> = {
  "all-off": "Allir læknar hafa merkt „get ekki“ þennan dag",
  "all-busy": "Allir sem geta eru þegar á vakt þennan dag",
  "all-rest": "Allir sem geta eru í hvíld eftir fyrri vakt",
  "all-at-max": "Allir sem geta eru komnir í hámarksfjölda vakta",
  "no-doctors": "Engir virkir læknar",
  "no-bakvakt-doctor": "Forvaktarlæknir þarf bakvakt en enginn með bakvaktarréttindi er laus",
  "no-day-doctor": "Enginn laus læknir vinnur dagvinnu á þessum vikudegi",
  "no-evening-doctor": "Enginn laus læknir óskaði eftir kvöldvöktum á þessum vikudegi",
};

export interface DoctorStat {
  count: number;
  target: number;
  weekend: number;
  bakvakt: number;
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

interface Held { key: string; date: string; rest: number; period: ShiftPeriod; starts: string; ends: string }

/** Hvenær má læknir EKKI taka vakt vegna annarrar vaktar sem hann heldur. */
function restBlocks(held: Held[], slot: Pick<PlanSlot, "key" | "date" | "restAfter" | "period" | "starts" | "ends">): "busy" | "rest" | null {
  for (const h of held) {
    if (h.key === slot.key) continue;
    // Sama dag: aðeins vaktir sem skarast í tíma útiloka hvor aðra. Þannig má
    // sami læknir taka fyrir og eftir hádegi, og dagvakt og svo kvöldvakt.
    if (h.date === slot.date) {
      if (timesOverlap(h, slot)) return "busy";
      continue;
    }
    // Fyrri vakt krefst hvíldar sem nær yfir þennan dag.
    if (h.date < slot.date && h.rest > 0 && slot.date <= addDays(h.date, h.rest)) return "rest";
    // Þessi vakt krefst hvíldar sem nær yfir síðari vakt.
    if (h.date > slot.date && slot.restAfter > 0 && h.date <= addDays(slot.date, slot.restAfter)) return "rest";
  }
  return null;
}

/** Dagar þar sem forvaktarlæknirinn þarf bakvakt. */
export function bakvaktNeededDates(slots: PlanSlot[], doctors: Pick<PlanDoctor, "id" | "needsBakvakt">[]): Set<string> {
  const needs = new Set(doctors.filter((d) => d.needsBakvakt).map((d) => d.id));
  const out = new Set<string>();
  for (const s of slots) if (s.kind === "forvakt" && s.doctorId && needs.has(s.doctorId)) out.add(s.date);
  return out;
}

/**
 * Vaktir sem eiga að vera mannaðar: allar nema bakvaktir sem enginn þarf.
 * Bakvakt sem læknir hefur verið settur á telst með, þörf eða ekki.
 */
export function requiredSlots(slots: PlanSlot[], doctors: Pick<PlanDoctor, "id" | "needsBakvakt">[]): PlanSlot[] {
  const needed = bakvaktNeededDates(slots, doctors);
  return slots.filter((s) => s.kind !== "bakvakt" || s.doctorId || needed.has(s.date));
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
  const fteSum = pool.reduce((s, d) => s + d.fte, 0) || 1;
  const skilled = pool.filter((d) => d.canBakvakt);
  const skilledFte = skilled.reduce((s, d) => s + d.fte, 0);
  const needsFte = pool.filter((d) => d.needsBakvakt).reduce((s, d) => s + d.fte, 0);

  // ── Hversu margar vaktir alls? ─────────────────────────────────────────────
  // Bakvaktaþörfin ræðst af því hver fær forvaktirnar, sem er ekki vitað fyrr en
  // skiptingin hefur gengið. Áætlun: forvaktir á lækna sem þurfa bakvakt í
  // hlutfalli við starfshlutfall þeirra.
  const bvSlots = slots.filter((s) => s.kind === "bakvakt");
  const nonBv = slots.filter((s) => s.kind !== "bakvakt");
  const bvDates = new Set(bvSlots.map((s) => s.date));
  const fvOnBvDays = nonBv.filter((s) => s.kind === "forvakt" && bvDates.has(s.date)).length;
  const estimatedBv = skilled.length ? Math.round((fvOnBvDays * needsFte) / fteSum) : 0;
  const targets = computeTargets(nonBv.length + estimatedBv, pool, prefs);

  // Reyndir læknar taka bakvaktirnar, svo forvaktarhlutur þeirra er minni sem því nemur.
  const expectedBv = (id: string) => (byId.get(id)?.canBakvakt && skilledFte ? (estimatedBv * (byId.get(id)!.fte)) / skilledFte : 0);

  const weekendRequired = nonBv.filter((s) => isWeekendish(s.date)).length * (1 + needsFte / fteSum * (skilled.length ? 1 : 0));
  const weekendTarget = (id: string) => (weekendRequired * (byId.get(id)?.fte ?? 0)) / fteSum;

  const held: Record<string, Held[]> = {};
  for (const d of pool) held[d.id] = [];
  const assignments: Record<string, string | null> = {};

  const toPlace: PlanSlot[] = [];
  for (const s of slots) {
    if ((mode === "empty" && s.doctorId) || (s.locked && s.doctorId)) {
      assignments[s.key] = s.doctorId;
      held[s.doctorId]?.push({ key: s.key, date: s.date, rest: s.restAfter, period: s.period, starts: s.starts, ends: s.ends });
    } else {
      assignments[s.key] = null;
      toPlace.push(s);
    }
  }

  // Þak: hámarkið sem læknirinn skráði. Hafi hann ekkert skráð er þakið hans
  // sanngjarni hlutur (starfshlutfall, rúnnað upp) — sjálfvirka skiptingin
  // setur engan á fleiri vaktir en hann hefur fallist á. Vanti þá í vaktir
  // stendur hún tóm og yfirlæknir getur beðið lækni um að taka hana.
  const maxOf = (id: string) => prefs[id]?.max_shifts ?? capFromTarget(targets[id] ?? 0);
  const isOff = (id: string, date: string) => markFor(prefs[id], date) === "off";
  const wants = (id: string, date: string) => markFor(prefs[id], date) === "want";

  /** Hörð athugun. Skilar ástæðu ef læknirinn getur ekki tekið vaktina. */
  const blocker = (id: string, slot: PlanSlot): "skill" | "dayweek" | "eveningweek" | "off" | "busy" | "rest" | "max" | null => {
    if (slot.kind === "bakvakt" && !byId.get(id)?.canBakvakt) return "skill";
    if (slot.period === "day" && !worksDayShift(byId.get(id), slot.date)) return "dayweek";
    if (slot.period === "evening" && !wantsEveningOn(prefs[id], slot.date)) return "eveningweek";
    if (isOff(id, slot.date)) return "off";
    const r = restBlocks(held[id], slot);
    if (r) return r;
    const count = held[id].filter((h) => h.key !== slot.key).length;
    if (count >= maxOf(id)) return "max";
    return null;
  };

  const slotByKey = new Map(slots.map((s) => [s.key, s]));
  const bvByDate = new Map<string, PlanSlot[]>();
  for (const s of bvSlots) (bvByDate.get(s.date) ?? bvByDate.set(s.date, []).get(s.date)!).push(s);

  /** Getur einhver reyndur (annar en `except`) tekið bakvakt þennan dag? */
  const backupPossible = (date: string, except: string): boolean => {
    const bv = bvByDate.get(date);
    if (!bv?.length) return false;
    return bv.some((slot) =>
      (assignments[slot.key] && assignments[slot.key] !== except) ||
      skilled.some((d) => d.id !== except && !blocker(d.id, slot)),
    );
  };

  const unfilled: PlanResult["unfilled"] = [];

  const pickCost = (id: string, s: PlanSlot) => {
    const h = held[id];
    const doc = byId.get(id)!;
    // Forvaktir: miðað við það sem eftir er þegar áætlaðar bakvaktir eru frátaldar.
    const target = Math.max((targets[id] ?? 0) - (s.kind === "bakvakt" ? 0 : expectedBv(id)), 0.25);
    const load = s.kind === "bakvakt" ? h.length : h.filter((x) => slotByKey.get(x.key)?.kind !== "bakvakt").length;
    let cost = ((load + 1) / target) * 100;
    if (isWeekendish(s.date)) {
      const wk = h.filter((x) => isWeekendish(x.date)).length;
      cost += ((wk + 1) / Math.max(weekendTarget(id), 0.25)) * 40;
    }
    if (wants(id, s.date)) cost -= 45;
    const min = prefs[id]?.min_shifts;
    if (min != null && h.length < min) cost -= 25;
    if (h.some((x) => x.date !== s.date && Math.abs(daysBetween(x.date, s.date)) <= 2)) cost += 18;
    // Forvakt á lækni sem þarf bakvakt: aðeins þá daga sem einhver getur verið
    // á bakvakt á bak við hann.
    if (s.kind === "forvakt" && doc.needsBakvakt && !backupPossible(s.date, id)) cost += 400;
    return cost;
  };

  const place = (list: PlanSlot[]) => {
    const baseCandidates = (s: PlanSlot) =>
      pool.filter((d) => !isOff(d.id, s.date) && (s.kind !== "bakvakt" || d.canBakvakt)
        && (s.period !== "day" || worksDayShift(d, s.date)) && (s.period !== "evening" || wantsEveningOn(prefs[d.id], s.date))).length;
    const ordered = list.slice().sort((a, b) => baseCandidates(a) - baseCandidates(b) || a.date.localeCompare(b.date));
    for (const s of ordered) {
      if (assignments[s.key]) continue;
      if (pool.length === 0) { unfilled.push({ key: s.key, date: s.date, reason: "no-doctors" }); continue; }
      const reasons = new Set<string>();
      const ok: PlanDoctor[] = [];
      for (const d of pool) {
        const b = blocker(d.id, s);
        if (b) reasons.add(b); else ok.push(d);
      }
      if (ok.length === 0) {
        const reason: UnfilledReason = s.kind === "bakvakt" && !skilled.length ? "no-bakvakt-doctor"
          : reasons.has("max") ? "all-at-max" : reasons.has("rest") ? "all-rest" : reasons.has("busy") ? "all-busy"
          : s.kind === "bakvakt" ? "no-bakvakt-doctor"
          : s.period === "day" && reasons.has("dayweek") ? "no-day-doctor"
          : s.period === "evening" && reasons.has("eveningweek") ? "no-evening-doctor" : "all-off";
        unfilled.push({ key: s.key, date: s.date, reason });
        continue;
      }
      ok.sort((a, b) => pickCost(a.id, s) - pickCost(b.id, s) || a.name.localeCompare(b.name, "is"));
      assignments[s.key] = ok[0].id;
      held[ok[0].id].push({ key: s.key, date: s.date, rest: s.restAfter, period: s.period, starts: s.starts, ends: s.ends });
    }
  };

  const currentSlots = () => slots.map((s) => ({ ...s, doctorId: assignments[s.key] ?? null }));
  const neededBvToPlace = () => {
    const needed = bakvaktNeededDates(currentSlots(), pool);
    return toPlace.filter((s) => s.kind === "bakvakt" && !assignments[s.key] && needed.has(s.date))
      // Ein bakvakt á dag nægir; sé fleiri en ein tegund sama dag er sú fyrsta tekin.
      .filter((s, i, arr) => arr.findIndex((x) => x.date === s.date) === i)
      .filter((s) => !bvSlots.some((x) => x.date === s.date && assignments[x.key]));
  };

  // 1) Forvaktir og aðrar skyldar vaktir.  2) Bakvaktir þar sem þeirra er þörf.
  place(toPlace.filter((s) => s.kind !== "bakvakt"));
  place(neededBvToPlace());

  // ── Bæting: færa og skipta á vöktum ef heildin batnar ────────────────────
  const movable = new Set(toPlace.map((s) => s.key));

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
    // Forvaktarlæknir sem þarf bakvakt en hefur enga: stórt gat í planinu.
    const cur = currentSlots();
    for (const date of bakvaktNeededDates(cur, pool)) {
      if (!cur.some((s) => s.kind === "bakvakt" && s.date === date && s.doctorId)) c += 600;
    }
    return c;
  };

  const move = (key: string, from: string | null, to: string | null) => {
    const s = slotByKey.get(key)!;
    if (from) held[from] = held[from].filter((h) => h.key !== key);
    if (to) held[to].push({ key, date: s.date, rest: s.restAfter, period: s.period, starts: s.starts, ends: s.ends });
    assignments[key] = to;
  };

  let best = totalCost();
  const keys = () => [...movable].filter((k) => assignments[k]).sort();
  for (let pass = 0; pass < 4; pass++) {
    let improved = false;
    for (const k of keys()) {
      const from = assignments[k];
      if (!from) continue;
      const s = slotByKey.get(k)!;
      for (const d of pool) {
        if (d.id === from || blocker(d.id, s)) continue;
        move(k, from, d.id);
        const c = totalCost();
        if (c < best - 1e-9) { best = c; improved = true; break; }
        move(k, d.id, from);
      }
    }
    const ks = keys();
    for (let i = 0; i < ks.length; i++) {
      for (let j = i + 1; j < ks.length; j++) {
        const a = ks[i], b = ks[j];
        const da = assignments[a], db = assignments[b];
        if (!da || !db || da === db) continue;
        const sa = slotByKey.get(a)!, sb = slotByKey.get(b)!;
        // Losa báðar vaktirnar fyrst; þá er hvor læknir athugaður án vaktarinnar
        // sem hann lætur af hendi.
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

  // Bætingin getur hafa fært forvaktir: bakvakt sem enginn þarf lengur losnar,
  // og bakvakt sem nú vantar er mönnuð.
  {
    const needed = bakvaktNeededDates(currentSlots(), pool);
    for (const s of toPlace) {
      if (s.kind === "bakvakt" && assignments[s.key] && !needed.has(s.date)) move(s.key, assignments[s.key], null);
    }
  }
  unfilled.length = 0;
  place(toPlace.filter((s) => s.kind !== "bakvakt" && !assignments[s.key]));
  place(neededBvToPlace());

  // Viðgerð: bakvakt sem vantar en enginn reyndur getur tekið. Þá er betra að
  // forvaktin fari til læknis sem þarf ekki bakvakt, ef einhver getur tekið hana.
  for (const u of unfilled.filter((x) => slotByKey.get(x.key)?.kind === "bakvakt")) {
    const fv = toPlace.find((x) => x.kind === "forvakt" && x.date === u.date && assignments[x.key] && byId.get(assignments[x.key]!)?.needsBakvakt);
    if (!fv) continue;
    const from = assignments[fv.key]!;
    const alt = pool
      .filter((d) => d.id !== from && !d.needsBakvakt && !blocker(d.id, fv))
      .sort((x, y) => pickCost(x.id, fv) - pickCost(y.id, fv) || x.name.localeCompare(y.name, "is"))[0];
    if (!alt) continue;
    move(fv.key, from, alt.id);
    unfilled.splice(unfilled.indexOf(u), 1);
  }

  unfilled.sort((a, b) => a.date.localeCompare(b.date));
  return { assignments, unfilled, stats: statsFor(currentSlots(), pool, prefs) };
}

/** Sjálfgefið þak læknis sem hefur ekki skráð hámark. */
export function capFromTarget(target: number): number {
  return Math.max(1, Math.ceil(target - 1e-6));
}

/** Vaktir úr gagnagrunni → vaktir fyrir skiptinguna. */
export function toPlanSlots(
  shifts: { id: string; shift_date: string; shift_type_id: string | null; doctor_id: string | null; starts: string; ends: string; confirm_status?: string | null; requested_by?: string | null }[],
  types: { id: string; rest_days_after: number; kind: ShiftKind; period?: ShiftPeriod }[],
): PlanSlot[] {
  const byId = new Map(types.map((t) => [t.id, t]));
  return shifts.map((s) => {
    const t = s.shift_type_id ? byId.get(s.shift_type_id) : undefined;
    return {
      key: s.id, date: s.shift_date, typeId: s.shift_type_id, restAfter: t?.rest_days_after ?? 0,
      starts: s.starts.slice(0, 5), ends: s.ends.slice(0, 5),
      doctorId: s.doctor_id, kind: t?.kind ?? "other",
      // Aukavakt án tegundar: dagvakt ef hún hefst fyrir kl. 15 og nær ekki yfir miðnætti.
      period: t?.period ?? (s.starts.slice(0, 5) < "15:00" && !isOvernight(s.starts, s.ends) ? "day" : "evening"),
      // Beiðni sem bíður er læst; samþykkt beiðni er bæði læst og samþykkt umfram hámark.
      locked: s.confirm_status === "requested" || Boolean(s.requested_by),
      agreed: !s.confirm_status && Boolean(s.requested_by),
      pending: s.confirm_status === "requested",
    };
  });
}

export function toPlanDoctors(doctors: { id: string; name: string; fte: number; active: boolean; can_bakvakt?: boolean; needs_bakvakt?: boolean; day_weekdays?: number[] }[]): PlanDoctor[] {
  return doctors.map((d) => ({
    id: d.id, name: d.name, fte: d.fte, active: d.active,
    canBakvakt: Boolean(d.can_bakvakt), needsBakvakt: Boolean(d.needs_bakvakt), dayWeekdays: d.day_weekdays ?? [],
  }));
}

function daysBetween(a: string, b: string): number {
  const [ya, ma, da] = a.split("-").map(Number);
  const [yb, mb, db] = b.split("-").map(Number);
  return Math.round((Date.UTC(yb, mb - 1, db) - Date.UTC(ya, ma - 1, da)) / 86400000);
}

export function statsFor(slots: PlanSlot[], doctors: PlanDoctor[], prefs: Record<string, PlanPrefs | undefined>): Record<string, DoctorStat> {
  const pool = doctors.filter((d) => d.active);
  const targets = computeTargets(requiredSlots(slots, pool).length, pool, prefs);
  const out: Record<string, DoctorStat> = {};
  const dates = [...new Set(slots.map((s) => s.date))];
  for (const d of pool) {
    const mine = slots.filter((s) => s.doctorId === d.id);
    const wantDates = dates.filter((dt) => markFor(prefs[d.id], dt) === "want");
    out[d.id] = {
      count: mine.length,
      target: Math.round((targets[d.id] ?? 0) * 10) / 10,
      weekend: mine.filter((s) => isWeekendish(s.date)).length,
      bakvakt: mine.filter((s) => s.kind === "bakvakt").length,
      wantHit: wantDates.filter((dt) => mine.some((s) => s.date === dt)).length,
      wantTotal: wantDates.length,
      min: prefs[d.id]?.min_shifts ?? null,
      max: prefs[d.id]?.max_shifts ?? null,
    };
  }
  return out;
}

// ── Árekstrar í núverandi plani (fyrir handvirkar breytingar) ──────────────

export type ConflictKind = "off" | "double" | "rest" | "max" | "skill" | "no_bakvakt" | "day_weekday" | "evening_weekday";

export const CONFLICT_IS: Record<ConflictKind, string> = {
  off: "Læknirinn merkti „get ekki“ þennan dag",
  double: "Læknirinn er á tveimur vöktum á sama tíma",
  rest: "Of stutt hvíld frá annarri vakt",
  max: "Fleiri vaktir en hámark læknisins",
  skill: "Læknirinn hefur ekki bakvaktarréttindi",
  no_bakvakt: "Læknirinn þarf bakvakt en enginn er á bakvakt þennan dag",
  day_weekday: "Læknirinn vinnur ekki dagvinnu á þessum vikudegi",
  evening_weekday: "Læknirinn óskaði ekki eftir kvöldvöktum á þessum vikudegi",
};

/** Vakt → listi árekstra. Tómt = allt í lagi. */
export function findConflicts(
  slots: PlanSlot[],
  prefs: Record<string, PlanPrefs | undefined>,
  doctors: Pick<PlanDoctor, "id" | "canBakvakt" | "needsBakvakt" | "dayWeekdays">[] = [],
): Record<string, ConflictKind[]> {
  const out: Record<string, ConflictKind[]> = {};
  const docs = new Map(doctors.map((d) => [d.id, d]));
  const staffedBv = new Set(slots.filter((s) => s.kind === "bakvakt" && s.doctorId).map((s) => s.date));
  const byDoc: Record<string, PlanSlot[]> = {};
  for (const s of slots) if (s.doctorId) (byDoc[s.doctorId] ||= []).push(s);
  for (const [doc, mine] of Object.entries(byDoc)) {
    const held: Held[] = mine.map((s) => ({ key: s.key, date: s.date, rest: s.restAfter, period: s.period, starts: s.starts, ends: s.ends }));
    const max = prefs[doc]?.max_shifts;
    const info = docs.get(doc);
    const sorted = mine.slice().sort((a, b) => a.date.localeCompare(b.date));
    // Vaktir umfram hámark sem fóru um beiðni (samþykktar eða í bið) teljast ekki með:
    // það er einmitt leiðin til að fara yfir hámarkið.
    let counted = 0;
    sorted.forEach((s) => {
      const viaRequest = s.agreed || s.pending;
      if (!viaRequest) counted++;
      const list: ConflictKind[] = [];
      if (markFor(prefs[doc], s.date) === "off") list.push("off");
      const r = restBlocks(held, s);
      if (r === "busy") list.push("double");
      else if (r === "rest") list.push("rest");
      if (max != null && !viaRequest && counted > max) list.push("max");
      if (info && s.kind === "bakvakt" && !info.canBakvakt) list.push("skill");
      // Dagvakt á röngum vikudegi telst ekki árekstur hafi læknirinn samþykkt hana.
      if (info && s.period === "day" && !viaRequest && !worksDayShift(info, s.date)) list.push("day_weekday");
      if (s.period === "evening" && !viaRequest && !wantsEveningOn(prefs[doc], s.date)) list.push("evening_weekday");
      if (info && s.kind === "forvakt" && info.needsBakvakt && !staffedBv.has(s.date)) list.push("no_bakvakt");
      if (list.length) out[s.key] = list;
    });
  }
  return out;
}
