// Jöfn skipting vakta milli lækna, með óskir hvers og eins virtar.
//
// Pure functions on purpose: dividing a month of shifts is the kind of thing
// that looks right until the month has an odd number of Saturdays, so it is
// worth being able to run it on paper cases without a database.

export interface AssignDoctor {
  id: string;
  name: string;
  active: boolean;
  /** null = no cap */
  max_shifts_per_month?: number | null;
  /** 0=Sun … 6=Sat. Empty = every day allowed. */
  allowed_weekdays?: number[] | null;
}

export interface AssignShift {
  id: string;
  shift_date: string;      // YYYY-MM-DD
  doctor_id: string | null;
}

export type UnfilledReason = "no-one-free" | "all-at-cap" | "no-one-works-that-day";

export interface AssignPlan {
  /** shift id → doctor id */
  assignments: Record<string, string>;
  /** shifts nobody could take, and why */
  unfilled: { shift_id: string; shift_date: string; reason: UnfilledReason }[];
  /** doctor id → how many shifts they hold after the plan */
  totals: Record<string, number>;
}

export interface AssignOptions {
  /**
   * "empty"    — only fill shifts with nobody on them (default; never moves
   *              anyone off a shift they may already be planning around)
   * "all"      — ignore current assignments and redistribute the whole month
   */
  mode?: "empty" | "all";
  /** Restrict to these doctor ids. Empty/undefined = every active doctor. */
  doctorIds?: string[];
}

/** 0 = Sunday … 6 = Saturday, from a YYYY-MM-DD string (no timezone games). */
export function weekdayOf(date: string): number {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

function worksThatDay(doc: AssignDoctor, date: string): boolean {
  const days = doc.allowed_weekdays ?? [];
  return days.length === 0 || days.includes(weekdayOf(date));
}

/**
 * Spread shifts as evenly as the constraints allow.
 *
 * Greedy, least-loaded-first. The order matters: the most constrained shifts —
 * the ones fewest doctors can take — are placed first, because filling an easy
 * shift with someone who was the only candidate for a hard one is how you end
 * up with a gap nobody can cover.
 *
 * Ties are broken by name so the same input always produces the same roster;
 * an assignment that shuffles on every click is impossible to review.
 */
export function planAssignments(
  shifts: AssignShift[],
  doctors: AssignDoctor[],
  opts: AssignOptions = {},
): AssignPlan {
  const mode = opts.mode ?? "empty";
  const pool = doctors
    .filter((d) => d.active)
    .filter((d) => !opts.doctorIds?.length || opts.doctorIds.includes(d.id))
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name, "is"));

  const totals: Record<string, number> = {};
  for (const d of pool) totals[d.id] = 0;

  // Shifts that keep their current doctor still count toward that person's load,
  // otherwise "fill the empty ones" would pile every gap onto whoever already
  // has the most work.
  const takenDates: Record<string, Set<string>> = {};
  for (const d of pool) takenDates[d.id] = new Set();

  const toPlace: AssignShift[] = [];
  for (const s of shifts) {
    const keep = mode === "empty" && s.doctor_id;
    if (keep) {
      if (totals[s.doctor_id!] !== undefined) {
        totals[s.doctor_id!] += 1;
        takenDates[s.doctor_id!].add(s.shift_date);
      }
    } else {
      toPlace.push(s);
    }
  }

  const capOf = (d: AssignDoctor) =>
    d.max_shifts_per_month == null ? Infinity : Math.max(0, d.max_shifts_per_month);

  // Hardest first: fewest doctors who could ever work that weekday.
  const candidateCount = (s: AssignShift) => pool.filter((d) => worksThatDay(d, s.shift_date)).length;
  const ordered = toPlace.slice().sort((a, b) => {
    const c = candidateCount(a) - candidateCount(b);
    return c !== 0 ? c : a.shift_date.localeCompare(b.shift_date);
  });

  const assignments: Record<string, string> = {};
  const unfilled: AssignPlan["unfilled"] = [];

  for (const s of ordered) {
    const worksToday = pool.filter((d) => worksThatDay(d, s.shift_date));
    if (worksToday.length === 0) {
      unfilled.push({ shift_id: s.id, shift_date: s.shift_date, reason: "no-one-works-that-day" });
      continue;
    }
    const underCap = worksToday.filter((d) => totals[d.id] < capOf(d));
    if (underCap.length === 0) {
      unfilled.push({ shift_id: s.id, shift_date: s.shift_date, reason: "all-at-cap" });
      continue;
    }
    // Nobody takes two shifts on the same day.
    const free = underCap.filter((d) => !takenDates[d.id].has(s.shift_date));
    if (free.length === 0) {
      unfilled.push({ shift_id: s.id, shift_date: s.shift_date, reason: "no-one-free" });
      continue;
    }
    free.sort((a, b) => totals[a.id] - totals[b.id] || a.name.localeCompare(b.name, "is"));
    const pick = free[0];
    assignments[s.id] = pick.id;
    totals[pick.id] += 1;
    takenDates[pick.id].add(s.shift_date);
  }

  unfilled.sort((a, b) => a.shift_date.localeCompare(b.shift_date));
  return { assignments, unfilled, totals };
}

export const WEEKDAY_LABELS_IS = ["Sun", "Mán", "Þri", "Mið", "Fim", "Fös", "Lau"];
/** Monday-first, the way an Icelandic roster is read. */
export const WEEKDAY_ORDER = [1, 2, 3, 4, 5, 6, 0];

export function weekdaySummary(days?: number[] | null): string {
  const d = (days ?? []).slice().sort((a, b) => WEEKDAY_ORDER.indexOf(a) - WEEKDAY_ORDER.indexOf(b));
  if (d.length === 0) return "Alla daga";
  if (d.length === 5 && [1, 2, 3, 4, 5].every((x) => d.includes(x))) return "Virka daga";
  if (d.length === 2 && d.includes(0) && d.includes(6)) return "Helgar";
  return d.map((x) => WEEKDAY_LABELS_IS[x]).join(", ");
}

export const UNFILLED_REASON_IS: Record<UnfilledReason, string> = {
  "no-one-works-that-day": "Enginn læknir tekur þennan vikudag",
  "all-at-cap": "Allir komnir í hámarksfjölda vakta",
  "no-one-free": "Þeir sem mega taka daginn eru þegar á vakt þann dag",
};
