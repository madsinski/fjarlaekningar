// HSU vaktakerfi — gagnaaðgangur á þjóni.
// Server-only. Allt fer um þjónustulykil; auðkenning er í auth.ts.

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { sendEmail, escapeHtml } from "@/lib/email";
import { getHsuActor, sameOrigin, type HsuActor } from "./auth";
import {
  datesInMonth, minutesOf, monthLabel, monthRange, slotsOfType, typeAppliesOn, holidayName,
  type HsuDoctor, type HsuMonth, type HsuPreference, type HsuShift, type HsuShiftType, type HsuSwap,
} from "./types";

export const HSU_FROM = process.env.HSU_FROM_EMAIL || "HSU vaktakerfi <vaktir@fjarlaekningar.is>";

export const json = (body: unknown, status = 200) => NextResponse.json(body, { status });
export const fail = (error: string, status = 400) => NextResponse.json({ ok: false, error }, { status });

export const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;
export const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function readJson(req: Request): Promise<Record<string, unknown>> {
  try {
    const b = await req.json();
    return b && typeof b === "object" ? (b as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

/** Stjórnandi eða yfirlæknir. Skilar svari til að senda beint ef ekki heimilt. */
export async function requireManager(req: Request): Promise<{ actor: HsuActor } | { res: NextResponse }> {
  if (req.method !== "GET" && !sameOrigin(req)) return { res: fail("Ógild beiðni", 403) };
  const actor = await getHsuActor(req);
  if (!actor) return { res: fail("Ekki innskráð(ur)", 401) };
  if (!actor.canManage) return { res: fail("Aðeins yfirlæknir hefur aðgang", 403) };
  return { actor };
}

export async function requireDoctor(req: Request) {
  if (req.method !== "GET" && !sameOrigin(req)) return { res: fail("Ógild beiðni", 403) } as const;
  const actor = await getHsuActor(req);
  if (!actor || actor.kind !== "doctor") return { res: fail("Ekki innskráð(ur)", 401) } as const;
  return { doctor: actor.doctor } as const;
}

// ── Læknar ──────────────────────────────────────────────────────────────────

export const DOCTOR_COLUMNS =
  "id, name, email, phone, title, role, color, fte, active, password_hash, pin_hash, invited_at, invite_token_hash, invite_expires_at, last_login_at, must_change_password, can_bakvakt, needs_bakvakt, day_weekdays";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function toPublicDoctor(r: any): HsuDoctor {
  return {
    id: r.id, name: r.name, email: r.email, phone: r.phone ?? "", title: r.title ?? "",
    role: r.role, color: r.color, fte: r.fte, active: r.active,
    activated: Boolean(r.password_hash),
    has_pin: Boolean(r.pin_hash),
    invited_at: r.invited_at ?? null,
    invite_pending: Boolean(r.invite_token_hash && r.invite_expires_at && new Date(r.invite_expires_at).getTime() > Date.now()),
    last_login_at: r.last_login_at ?? null,
    must_change_password: Boolean(r.must_change_password),
    can_bakvakt: Boolean(r.can_bakvakt),
    needs_bakvakt: Boolean(r.needs_bakvakt),
    day_weekdays: Array.isArray(r.day_weekdays) ? r.day_weekdays.map(Number) : [],
  };
}

export async function listDoctors(includeInactive = true): Promise<HsuDoctor[]> {
  let q = supabaseAdmin.from("hsu_doctors").select(DOCTOR_COLUMNS).order("name");
  if (!includeInactive) q = q.eq("active", true);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return (data ?? []).map(toPublicDoctor);
}

// ── Mánuður í heild ─────────────────────────────────────────────────────────

export async function loadShiftTypes(activeOnly = false): Promise<HsuShiftType[]> {
  let q = supabaseAdmin.from("hsu_shift_types").select("*").order("sort").order("name");
  if (activeOnly) q = q.eq("active", true);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  const rank: Record<string, number> = { forvakt: 0, other: 1, bakvakt: 2 };
  return (data ?? [])
    .map((t) => ({ ...t, starts: t.starts.slice(0, 5), ends: t.ends.slice(0, 5) }))
    // Dagvaktir fyrst, svo forvakt, almennar vaktir og bakvakt.
    .sort((a, b) => (a.period === "day" ? 0 : 1) - (b.period === "day" ? 0 : 1) || (a.sort ?? 0) - (b.sort ?? 0) || (rank[a.kind] ?? 1) - (rank[b.kind] ?? 1) || String(a.short).localeCompare(String(b.short))) as HsuShiftType[];
}

export const SHIFT_COLUMNS = "id, shift_date, shift_type_id, slot_index, label, starts, ends, doctor_id, status, note, published, confirm_status, requested_by, vinnustund_logged_at";

export async function loadMonthShifts(month: string, publishedOnly = false): Promise<HsuShift[]> {
  const { first, next } = monthRange(month);
  let q = supabaseAdmin.from("hsu_shifts").select(SHIFT_COLUMNS).gte("shift_date", first).lt("shift_date", next).order("shift_date").order("starts");
  if (publishedOnly) q = q.eq("published", true);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return (data ?? []) as HsuShift[];
}

export async function loadMonth(month: string): Promise<HsuMonth | null> {
  const { data, error } = await supabaseAdmin.from("hsu_months").select("month, status, prefs_deadline, note, published_at").eq("month", month).maybeSingle();
  if (error) throw new Error(error.message);
  return (data as HsuMonth) ?? null;
}

export async function loadPreferences(month: string, doctorId?: string): Promise<HsuPreference[]> {
  let q = supabaseAdmin.from("hsu_preferences").select("*").eq("month", month);
  if (doctorId) q = q.eq("doctor_id", doctorId);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return (data ?? []) as HsuPreference[];
}

export async function loadPendingSwaps(): Promise<HsuSwap[]> {
  const { data, error } = await supabaseAdmin
    .from("hsu_swaps")
    .select("id, shift_id, from_doctor, to_doctor, taken_by, note, status, created_at, shift:hsu_shifts(shift_date, starts, ends, label)")
    .in("status", ["pending", "awaiting_approval"])
    .order("created_at");
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as HsuSwap[];
}

/**
 * Tryggja að ein vakt sé til fyrir hverja (dag, vaktategund) sem á við í
 * mánuðinum. Bætir aðeins við — eyðir aldrei vakt sem þegar er til, því á henni
 * getur setið læknir sem hefur þegar skipulagt sig í kringum hana.
 */
export async function ensureSlots(month: string): Promise<number> {
  const types = await loadShiftTypes(true);
  let existing = await loadMonthShifts(month);
  const status = (await loadMonth(month))?.status;

  /** Vaktir sem EIGA að vera til: dagur → tegund → vaktanúmer. */
  const wanted = new Map<string, { typeId: string; starts: string; ends: string; label: string; index: number }>();
  for (const date of datesInMonth(month)) {
    for (const t of types) {
      if (!typeAppliesOn(t, date)) continue;
      for (const slot of slotsOfType(t)) {
        wanted.set(`${date}|${t.id}|${slot.index}`, { typeId: t.id, starts: slot.starts, ends: slot.ends, label: slot.label, index: slot.index });
      }
    }
  }

  // Tómar vaktir sem passa ekki lengur við vaktategundirnar (tegund gerð óvirk,
  // dögum breytt, frídagaregla, skipting um hádegi, fjöldi lækna) eru fjarlægðar
  // — líka í birtum mánuði, enda er enginn læknir á þeim. Vakt með lækni er
  // aldrei snert: hún er hluti af plani sem fólk hefur þegar séð.
  const stale = existing.filter((s) => {
    if (s.doctor_id || !s.shift_type_id) return false;
    const want = wanted.get(`${s.shift_date}|${s.shift_type_id}|${s.slot_index ?? 0}`);
    return !want || want.starts !== s.starts.slice(0, 5) || want.ends !== s.ends.slice(0, 5);
  });
  if (stale.length) {
    const { error } = await supabaseAdmin.from("hsu_shifts").delete().in("id", stale.map((s) => s.id));
    if (error) throw new Error(error.message);
    const gone = new Set(stale.map((s) => s.id));
    existing = existing.filter((s) => !gone.has(s.id));
  }

  const have = new Set(existing.map((s) => `${s.shift_date}|${s.shift_type_id}|${s.slot_index ?? 0}`));
  const rows: Record<string, unknown>[] = [];
  for (const [key, want] of wanted) {
    if (have.has(key)) continue;
    const date = key.split("|")[0];
    // Sé læknir þegar á vakt sem nær yfir þennan tíma (t.d. gömul heil dagvakt
    // eftir að skipting um hádegi var sett á) bætum við ekki hálfri vakt ofan á.
    const covered = existing.some((s) =>
      s.doctor_id && s.shift_date === date && s.shift_type_id === want.typeId && covers(s, want));
    if (covered) continue;
    rows.push({
      shift_date: date, shift_type_id: want.typeId, slot_index: want.index, label: want.label,
      starts: want.starts, ends: want.ends, status: "assigned", published: status === "published",
    });
  }
  if (rows.length) {
    // insert, ekki upsert: einkvæmi (dagur, tegund, númer) er hlutvísir, og
    // ON CONFLICT getur ekki vísað á hlutvísi gegnum PostgREST.
    const { error } = await supabaseAdmin.from("hsu_shifts").insert(rows);
    if (error && error.code !== "23505") throw new Error(error.message);
  }
  return rows.length;
}

/** Nær vaktin `outer` yfir allan tíma `inner`? Vakt yfir miðnætti nær í næsta sólarhring. */
function covers(outer: { starts: string; ends: string }, inner: { starts: string; ends: string }): boolean {
  const range = (x: { starts: string; ends: string }) => {
    const s = minutesOf(x.starts);
    const e = minutesOf(x.ends);
    return [s, e > s ? e : e + 24 * 60] as const;
  };
  const [os, oe] = range(outer);
  const [is, ie] = range(inner);
  return os <= is && ie <= oe;
}

// ── Tölvupóstur ─────────────────────────────────────────────────────────────

export function hsuEmailHtml(opts: { origin: string; heading: string; paragraphs: string[]; cta?: { label: string; url: string }; foot?: string }): string {
  const logo = `${opts.origin}/hsu/hsu-logo-email.png`;
  const p = opts.paragraphs.map((t) => `<p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:#334155;">${escapeHtml(t)}</p>`).join("");
  const cta = opts.cta
    ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:22px 0 8px;"><tr><td style="border-radius:10px;background:#1d4f91;"><a href="${escapeHtml(opts.cta.url)}" style="display:inline-block;padding:12px 22px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;">${escapeHtml(opts.cta.label)}</a></td></tr></table>
       <p style="margin:10px 0 0;font-size:12px;color:#64748b;word-break:break-all;">${escapeHtml(opts.cta.url)}</p>`
    : "";
  return `<!doctype html><html lang="is"><body style="margin:0;background:#f1f5f9;font-family:Arial,Helvetica,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:28px 12px;"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:16px;border:1px solid #e2e8f0;">
<tr><td style="padding:24px 28px 8px;"><table role="presentation" cellpadding="0" cellspacing="0"><tr>
<td><img src="${logo}" width="40" height="40" alt="HSU" style="display:block;"></td>
<td style="padding-left:12px;"><div style="font-size:14px;font-weight:700;color:#0f172a;">Heilsugæslan í Vestmannaeyjum</div><div style="font-size:12px;color:#64748b;">Vaktakerfi lækna · HSU</div></td>
</tr></table></td></tr>
<tr><td style="padding:16px 28px 28px;"><h1 style="margin:0 0 16px;font-size:20px;color:#0f172a;">${escapeHtml(opts.heading)}</h1>${p}${cta}
${opts.foot ? `<p style="margin:22px 0 0;font-size:12px;color:#94a3b8;">${escapeHtml(opts.foot)}</p>` : ""}</td></tr>
</table></td></tr></table></body></html>`;
}

export async function sendHsuEmail(to: string, subject: string, html: string, text: string) {
  return sendEmail({ to, subject, html, text, from: HSU_FROM });
}

/**
 * Uppruni fyrir hlekki í tölvupósti. ALDREI tekinn óséður úr beiðninni: Host-
 * hausinn er í höndum þess sem sendir hana, og "gleymt lykilorð" með fölskum
 * Host myndi senda lækninum ekta endurstillingarhlekk á vef árásaraðila.
 */
const TRUSTED_HOSTS = new Set(["www.fjarlaekningar.is", "fjarlaekningar.is", "localhost:3000", "localhost:3100"]);
export function originOf(req: Request): string {
  const u = new URL(req.url);
  if (TRUSTED_HOSTS.has(u.host)) return u.origin;
  // Forskoðun á Vercel: eigin slóð verkefnisins er treyst, annað ekki.
  if (process.env.VERCEL_URL && u.host === process.env.VERCEL_URL) return u.origin;
  return process.env.HSU_PUBLIC_ORIGIN || "https://www.fjarlaekningar.is";
}

export function monthName(month: string): string {
  return monthLabel(month);
}

export function describeDate(date: string): string {
  const h = holidayName(date);
  return h ? `${date} (${h})` : date;
}
