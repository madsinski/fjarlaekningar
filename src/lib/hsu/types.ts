// HSU vaktakerfi — sameiginlegar tegundir og hjálparföll.
//
// Hreinn kóði án netkalla: notaður bæði í vafra og á þjóni. Mánaðar- og
// dagsetningaföllin koma úr vaktakerfi Fjarlækninga svo tvö kerfi reikni ekki
// sama mánuðinn á tvo vegu.

export { monthKey, datesInMonth, shiftMonth, monthRange, monthLabel, weekdayShort, hhmm } from "@/lib/roster";
import { monthKey as monthKeyOf, shiftMonth as shiftMonthOf } from "@/lib/roster";

export type HsuRole = "doctor" | "head";

export interface HsuDoctor {
  id: string;
  name: string;
  email: string;
  phone: string;
  title: string;
  role: HsuRole;
  color: string;
  fte: number;
  active: boolean;
  /** Tungumál læknisins (viðmót og tölvupóstar). */
  lang: "is" | "en";
  /** Hefur sett lykilorð (virkjað aðgang). */
  activated: boolean;
  has_pin: boolean;
  invited_at: string | null;
  invite_pending: boolean;
  last_login_at: string | null;
  must_change_password: boolean;
  /** Hefur reynslu til að taka bakvakt (BV). */
  can_bakvakt: boolean;
  /** Þarf bakvakt á bak við sig þegar hann er á forvakt (FV). */
  needs_bakvakt: boolean;
  /** Dagvaktir aðeins þessa vikudaga (0=sun … 6=lau). Tómt = allir dagar. */
  day_weekdays: number[];
}

/** forvakt = mönnuð alla daga; bakvakt = aðeins reyndir, og aðeins þegar þörf er á; other = mönnuð, hver sem er. */
export type ShiftKind = "forvakt" | "bakvakt" | "other";

export const SHIFT_KIND_IS: Record<ShiftKind, string> = { forvakt: "Forvakt", bakvakt: "Bakvakt", other: "Almenn vakt (alltaf mönnuð)" };

/** Hólf á vaktaplani: dagvaktir (t.d. flýtimóttaka) og kvöld-/næturvaktir (forvakt, bakvakt). */
export type ShiftPeriod = "day" | "evening";
export const SHIFT_PERIOD_IS: Record<ShiftPeriod, string> = { day: "Dagvakt", evening: "Kvöld- og næturvakt" };

/** Hólf vaktar. Aukavakt án tegundar: dagvakt ef hún hefst fyrir kl. 15 og nær ekki yfir miðnætti. */
export function periodOf(shift: { shift_type_id: string | null; starts: string; ends: string }, types: { id: string; period?: ShiftPeriod }[]): ShiftPeriod {
  const t = shift.shift_type_id ? types.find((x) => x.id === shift.shift_type_id) : undefined;
  if (t?.period) return t.period;
  return shift.starts.slice(0, 5) < "15:00" && !isOvernight(shift.starts, shift.ends) ? "day" : "evening";
}

export interface HsuShiftType {
  id: string;
  name: string;
  short: string;
  starts: string;
  ends: string;
  /** 0=sun … 6=lau */
  weekdays: number[];
  on_holidays: boolean;
  /** Aldrei á almennum frídögum (t.d. FV1 — frídagur á virkum degi fær FV2). */
  skip_holidays: boolean;
  kind: ShiftKind;
  period: ShiftPeriod;
  /** Hve margir læknar eru samtímis á vaktinni (t.d. tveir á flýtimóttöku). */
  slots_per_day: number;
  /** Klukkan sem vakt af þessari tegund er skipt á þegar hún er tekin í tvennt (sjálfgefið 12:00). */
  split_at: string | null;
  rest_days_after: number;
  color: string;
  sort: number;
  active: boolean;
}

export type MonthStatus = "collecting" | "review" | "planning" | "published";

export interface HsuMonth {
  month: string;
  status: MonthStatus;
  prefs_deadline: string | null;
  note: string;
  published_at: string | null;
}

/** off = get ekki (hörð regla), want = vil gjarnan (ósk). */
export type Mark = "off" | "want";
/** Á ákveðnum degi má líka merkja "ok": laus þrátt fyrir vikudagsreglu. */
export type DayMark = Mark | "ok";
export type PrefStatus = "draft" | "submitted" | "approved" | "changes_requested";

export interface HsuPreference {
  id?: string;
  doctor_id: string;
  month: string;
  day_marks: Record<string, DayMark>;
  weekday_marks: Record<string, Mark>;
  /** Ósk: kvöld- og næturvaktir aðeins þessa vikudaga (0=sun … 6=lau). Tómt = alla daga. */
  evening_weekdays: number[];
  /** Ósk um dagvaktir: allan daginn, fyrir hádegi eða eftir hádegi. Regla mánaðarins. */
  day_part: DayPart;
  /** Undantekningar frá reglunni, dagsetning → hluti dags. */
  day_part_marks: Record<string, DayPlan>;
  min_shifts: number | null;
  max_shifts: number | null;
  note: string;
  status: PrefStatus;
  submitted_at: string | null;
  review_note: string;
  reviewed_at: string | null;
  reviewed_by: string;
  entered_by: string;
}

export type HsuShiftStatus = "assigned" | "open" | "offered";

export interface HsuShift {
  id: string;
  shift_date: string;
  shift_type_id: string | null;
  label: string;
  starts: string;
  ends: string;
  doctor_id: string | null;
  status: HsuShiftStatus;
  note: string;
  /** "requested" = yfirlæknir setti lækni á vakt umfram hámark hans; bíður samþykkis læknisins. */
  confirm_status?: "requested" | null;
  /** Númer vaktar innan dagsins þegar fleiri en ein vakt er af sömu tegund. */
  slot_index?: number;
  /** Hvenær læknirinn merkti að útköll vaktarinnar væru skráð í Vinnustund. */
  vinnustund_logged_at?: string | null;
  /** Hver bað um vaktina. Situr eftir þegar læknir samþykkir: þá er vaktin umfram hámark með samþykki hans. */
  requested_by?: string;
}

export type HsuSwapStatus = "pending" | "awaiting_approval" | "accepted" | "declined" | "cancelled";

export interface HsuSwap {
  id: string;
  shift_id: string;
  from_doctor: string | null;
  to_doctor: string | null;
  taken_by: string | null;
  note: string;
  status: HsuSwapStatus;
  created_at: string;
  shift?: { shift_date: string; starts: string; ends: string; label: string; shift_type_id?: string | null } | null;
}

export const MONTH_STATUS_ORDER: MonthStatus[] = ["collecting", "review", "planning", "published"];

// ── Opinn gluggi ────────────────────────────────────────────────────────────
// Óskir og vaktaskipulag eru opin þrjá mánuði fram í tímann án þess að
// yfirlæknir þurfi að opna mánuðinn; hann setur skilafrest og sendir áminningu.
// Mánuður í glugganum án raðar í hsu_months telst því „collecting“.

export const OPEN_MONTHS_AHEAD = 3;

/** Næstu þrír mánuðir á eftir þessum: ["2026-10", "2026-11", "2026-12"]. */
export function openWindow(now: string = monthKeyOf(new Date())): string[] {
  return Array.from({ length: OPEN_MONTHS_AHEAD }, (_, i) => shiftMonthOf(now, i + 1));
}

export function inOpenWindow(month: string, now?: string): boolean {
  return openWindow(now).includes(month);
}

/** Staða mánaðar: skráð staða, annars „collecting“ ef hann er í opna glugganum. */
export function effectiveStatus(row: { status: MonthStatus } | null | undefined, month: string, now?: string): MonthStatus | null {
  return row?.status ?? (inOpenWindow(month, now) ? "collecting" : null);
}

/** Fyrsti dagur þegar mánuðurinn opnast (þremur mánuðum fyrr). */
export function opensOn(month: string): string {
  return `${shiftMonthOf(month, -OPEN_MONTHS_AHEAD)}-01`;
}

export const MONTH_STATUS_IS: Record<MonthStatus, string> = {
  collecting: "Óskir opnar",
  review: "Yfirferð óska",
  planning: "Vaktaplan í smíðum",
  published: "Birt",
};

export const PREF_STATUS_IS: Record<PrefStatus | "none", string> = {
  none: "Ekki hafið",
  draft: "Í vinnslu",
  submitted: "Sent inn",
  approved: "Samþykkt",
  changes_requested: "Breytinga óskað",
};

export const ROLE_IS: Record<HsuRole, string> = { doctor: "Læknir", head: "Yfirlæknir" };

/** Mánudagur fyrst, eins og íslenskt vaktaplan er lesið. */
export const WEEKDAY_ORDER = [1, 2, 3, 4, 5, 6, 0];
export const WEEKDAY_SHORT_IS = ["Sun", "Mán", "Þri", "Mið", "Fim", "Fös", "Lau"];
export const WEEKDAY_LONG_IS = ["sunnudagur", "mánudagur", "þriðjudagur", "miðvikudagur", "fimmtudagur", "föstudagur", "laugardagur"];

export const DOCTOR_COLORS = ["#1d4f91", "#c62828", "#e0a100", "#2e7d32", "#6a1b9a", "#00838f", "#d84315", "#5d4037", "#ad1457", "#455a64"];

/** 0 = sunnudagur … 6 = laugardagur, án tímabeltaleikja. */
export function weekdayOf(date: string): number {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

export function addDays(date: string, n: number): string {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}

/** "2026-10-03" → "3. okt." */
const IS_MONTH_SHORT = ["jan.", "feb.", "mar.", "apr.", "maí", "jún.", "júl.", "ágú.", "sep.", "okt.", "nóv.", "des."];
export function dayLabel(date: string): string {
  return `${Number(date.slice(8, 10))}. ${IS_MONTH_SHORT[Number(date.slice(5, 7)) - 1]}`;
}

/** Mínútur frá miðnætti. */
export function minutesOf(t: string): number {
  const [h, m] = (t || "00:00").slice(0, 5).split(":").map(Number);
  return h * 60 + (m || 0);
}

/**
 * Skarast vaktirnar tvær í tíma? Vakt yfir miðnætti nær inn í næsta sólarhring,
 * svo endatíminn er framlengdur. Notað til að leyfa lækni bæði fyrir og eftir
 * hádegi sama dag en aldrei tvær vaktir á sama tíma.
 */
export function timesOverlap(a: { starts: string; ends: string }, b: { starts: string; ends: string }): boolean {
  const range = (x: { starts: string; ends: string }) => {
    const s = minutesOf(x.starts);
    const e = minutesOf(x.ends);
    return [s, e > s ? e : e + 24 * 60] as const;
  };
  const [as, ae] = range(a);
  const [bs, be] = range(b);
  return as < be && bs < ae;
}

/**
 * Vaktir dagsins af einni tegund: ein heil vakt fyrir hvern lækni sem á að vera
 * á vaktinni. Hálfur dagur er undantekning sem yfirlæknir býr til á einstakri
 * vakt („skipta um hádegi“), ekki regla á tegundinni.
 */
export function slotsOfType(t: Pick<HsuShiftType, "starts" | "ends" | "short" | "name" | "slots_per_day">): { index: number; starts: string; ends: string; label: string }[] {
  const per = Math.max(1, Math.min(6, t.slots_per_day ?? 1));
  return Array.from({ length: per }, (_, i) => ({ index: i, starts: t.starts, ends: t.ends, label: (t.short || t.name).slice(0, 30) }));
}

/** Klukkan sem vakt er skipt á þegar hún er tekin í tvennt. */
export const splitTimeOf = (t: { split_at?: string | null }) => (t.split_at ?? "12:00").slice(0, 5);

// ── Hálfur dagur ────────────────────────────────────────────────────────────
// Flýtimóttakan er oftast heill dagur, en sumir læknar taka aðeins fyrri eða
// síðari hlutann. Óskin er á lækninum (day_part), skiptingin á vaktinni.

export type DayPart = "all" | "am" | "pm";
/**
 * Stakur dagur á flýtimóttöku: allan daginn, fyrri eða síðari hluta — eða
 * „none“, ekki á flýtimóttöku þann dag. Dagur með all/am/pm gildir líka utan
 * föstu vikudaganna (day_weekdays); „none“ tekur daginn út þótt vikudagurinn gildi.
 */
export type DayPlan = DayPart | "none";

export const DAY_PART_IS: Record<DayPart, string> = { all: "Allan daginn", am: "Fyrir hádegi", pm: "Eftir hádegi" };
export const DAY_PART_SHORT_IS: Record<DayPart, string> = { all: "", am: "f.h.", pm: "e.h." };

/** Ósk læknisins um þennan dag: undantekning dagsins, annars regla mánaðarins. */
export function dayPartFor(
  pref: { day_part?: DayPart | null; day_part_marks?: Record<string, DayPlan> | null } | null | undefined,
  date: string,
): DayPart {
  const mark = pref?.day_part_marks?.[date];
  // „none“ segir hvort læknirinn vinnur daginn (worksDayShiftOn), ekki hvaða hluta.
  return (mark && mark !== "none" ? mark : null) ?? pref?.day_part ?? "all";
}

/** Hvaða hluta dagsins nær vaktin yfir, miðað við tímana sem tegundin gefur. */
export function partOfShift(
  shift: { starts: string; ends: string },
  type: { starts: string; ends: string; split_at?: string | null } | null | undefined,
): DayPart {
  if (!type) return "all";
  const at = splitTimeOf(type);
  const [s, e] = [shift.starts.slice(0, 5), shift.ends.slice(0, 5)];
  if (s === type.starts.slice(0, 5) && e === at) return "am";
  if (s === at && e === type.ends.slice(0, 5)) return "pm";
  return "all";
}

/**
 * Passar vaktin við óskina? Læknir sem vill allan daginn tekur hvað sem er;
 * læknir sem vill hálfan dag tekur aðeins sinn helming — heil vakt er of mikið
 * fyrir hann og þarf þá að skiptast fyrst.
 */
export function fitsDayPart(wish: DayPart, slotPart: DayPart): boolean {
  return wish === "all" || wish === slotPart;
}

/** Vakt yfir miðnætti (t.d. 08–08 eða 16–08) endar næsta dag. */
export function isOvernight(starts: string, ends: string): boolean {
  return (ends || "").slice(0, 5) <= (starts || "").slice(0, 5);
}

// ── Almennir frídagar á Íslandi ─────────────────────────────────────────────
// Skipta máli fyrir sanngjarna skiptingu: vakt á páskadag vegur eins og
// helgarvakt, hvaða vikudagur sem það er.

/** Páskadagur (gregoríska reglan, "anonymous Gregorian algorithm"). */
function easter(year: number): string {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

const holidayCache = new Map<number, Record<string, string>>();

/** Dagsetning → heiti frídags, fyrir heilt ár. */
export function icelandicHolidays(year: number): Record<string, string> {
  const hit = holidayCache.get(year);
  if (hit) return hit;
  const e = easter(year);
  const y = String(year);
  // Sumardagurinn fyrsti: fyrsti fimmtudagur eftir 18. apríl.
  let summer = `${y}-04-19`;
  while (weekdayOf(summer) !== 4) summer = addDays(summer, 1);
  // Frídagur verslunarmanna: fyrsti mánudagur í ágúst.
  let merchants = `${y}-08-01`;
  while (weekdayOf(merchants) !== 1) merchants = addDays(merchants, 1);

  const out: Record<string, string> = {
    [`${y}-01-01`]: "Nýársdagur",
    [addDays(e, -3)]: "Skírdagur",
    [addDays(e, -2)]: "Föstudagurinn langi",
    [e]: "Páskadagur",
    [addDays(e, 1)]: "Annar í páskum",
    [summer]: "Sumardagurinn fyrsti",
    [`${y}-05-01`]: "1. maí",
    [addDays(e, 39)]: "Uppstigningardagur",
    [addDays(e, 49)]: "Hvítasunnudagur",
    [addDays(e, 50)]: "Annar í hvítasunnu",
    [`${y}-06-17`]: "Þjóðhátíðardagurinn",
    [merchants]: "Frídagur verslunarmanna",
    [`${y}-12-24`]: "Aðfangadagur",
    [`${y}-12-25`]: "Jóladagur",
    [`${y}-12-26`]: "Annar í jólum",
    [`${y}-12-31`]: "Gamlársdagur",
  };
  holidayCache.set(year, out);
  return out;
}

export function holidayName(date: string): string | null {
  return icelandicHolidays(Number(date.slice(0, 4)))[date] ?? null;
}

/** Laugardagur, sunnudagur eða frídagur — vegur þyngra í skiptingunni. */
export function isWeekendish(date: string): boolean {
  const w = weekdayOf(date);
  return w === 0 || w === 6 || holidayName(date) !== null;
}

/** Á vaktategund við þennan dag? */
export function typeAppliesOn(t: Pick<HsuShiftType, "weekdays" | "on_holidays" | "skip_holidays">, date: string): boolean {
  const holiday = holidayName(date) !== null;
  if (holiday && t.skip_holidays) return false;
  if (holiday && t.on_holidays) return true;
  return (t.weekdays ?? []).includes(weekdayOf(date));
}

/** Er dagurinn merktur "off"/"want" — sérstakur dagur trompar vikudag. */
export function markFor(pref: Pick<HsuPreference, "day_marks" | "weekday_marks"> | null | undefined, date: string): Mark | null {
  if (!pref) return null;
  const day = pref.day_marks?.[date];
  if (day === "ok") return null;
  if (day) return day;
  return pref.weekday_marks?.[String(weekdayOf(date))] ?? null;
}

/** Tekur læknirinn kvöld-/næturvaktir á þessum degi? Tómt val = alla daga. */
export function wantsEveningOn(pref: { evening_weekdays?: number[] | null } | null | undefined, date: string): boolean {
  const days = pref?.evening_weekdays ?? [];
  return days.length === 0 || days.includes(weekdayOf(date));
}

export function normalizeEmail(input: string): string {
  const v = (input || "").trim().toLowerCase();
  // Notandanafn án léns: "jon.jonsson" → "jon.jonsson@hsu.is".
  return v && !v.includes("@") ? `${v}@${HSU_EMAIL_DOMAIN}` : v;
}

export const HSU_EMAIL_DOMAIN = "hsu.is";
