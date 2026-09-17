// Byrja upp á nýtt: hreinsa einn mánuð eða allt vaktakerfið.
//
//   GET  ?scope=month&month=2026-10 | ?scope=all   → hvað yrði hreinsað (fjöldi)
//   POST { scope, month?, confirm: "HREINSA" }     → hreinsar
//
// Hreinsað: vaktir (og vaktaskipti þeirra), óskir, staða mánaðar(a),
// tilkynningar til lækna og áminningalás. Haldið: læknar og innskráning þeirra,
// vaktategundir, stillingar, dagatalstengingar og breytingaskrá (þar bætist við
// færsla um hreinsunina). Læknar fá ekki tilkynningu; vaktir hverfa úr
// dagatölum þeirra við næstu samstillingu, sem er keyrð strax.

import { after } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { audit } from "@/lib/hsu/auth";
import { hsuSync } from "@/lib/hsu/calendar";
import { MONTH_RE, fail, json, readJson, requireManager } from "@/lib/hsu/server";
import { monthRange } from "@/lib/hsu/types";
import { LANGS } from "@/lib/hsu/i18n/core";
import { dayLabelL, monthLabelL } from "@/lib/hsu/i18n/format";
import { tr } from "@/lib/hsu/i18n/server";
import { apiAdmin } from "@/lib/hsu/i18n/messages/api-admin";

export const runtime = "nodejs";

const RESET_WORD = "HREINSA";

type Scope = { scope: "all" } | { scope: "month"; month: string };

function parseScope(scope: unknown, month: unknown): Scope | null {
  if (scope === "all") return { scope: "all" };
  if (scope === "month" && typeof month === "string" && MONTH_RE.test(month)) return { scope: "month", month };
  return null;
}

async function shiftIds(s: Scope): Promise<string[]> {
  let q = supabaseAdmin.from("hsu_shifts").select("id");
  if (s.scope === "month") {
    const { first, next } = monthRange(s.month);
    q = q.gte("shift_date", first).lt("shift_date", next);
  }
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => r.id as string);
}

/** Tilkynningar sem varða mánuðinn: nefna hann eða dag í honum. */
async function notificationIds(s: Scope): Promise<string[]> {
  const { data, error } = await supabaseAdmin.from("hsu_notifications").select("id, title, lines, created_at");
  if (error) throw new Error(error.message);
  const rows = (data ?? []) as { id: string; title: string; lines: string[]; created_at: string }[];
  if (s.scope === "all") return rows.map((r) => r.id);
  // Tilkynningar eru á tungumáli hvers læknis: leita að heiti mánaðarins á öllum málum.
  const labels = LANGS.map((l) => monthLabelL(s.month, l).toLowerCase());
  const esc = (v: string) => v.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  // „5. okt.“ / „5 Oct“: dagsnúmerið og stutta mánaðarheitið úr dayLabelL.
  const days = LANGS.map((l) => new RegExp(`\\b${esc(dayLabelL(`${s.month}-01`, l)).replace(/^1/, "\\d{1,2}")}`));
  // „5. okt.“ ber ekki ár: aðeins tilkynningar frá síðustu mánuðum fyrir lok mánaðarins.
  const { first, next } = monthRange(s.month);
  const from = new Date(new Date(first).getTime() - 180 * 86_400_000).toISOString();
  return rows
    .filter((r) => {
      const text = `${r.title}\n${(r.lines ?? []).join("\n")}`;
      const recent = r.created_at >= from && r.created_at < next;
      return labels.some((label) => text.toLowerCase().includes(label)) || text.includes(s.month) || (recent && days.some((day) => day.test(text)));
    })
    .map((r) => r.id);
}

async function counts(s: Scope) {
  const ids = await shiftIds(s);
  let prefs = supabaseAdmin.from("hsu_preferences").select("id", { count: "exact", head: true });
  let months = supabaseAdmin.from("hsu_months").select("month", { count: "exact", head: true });
  if (s.scope === "month") { prefs = prefs.eq("month", s.month); months = months.eq("month", s.month); }
  const [p, m, notes] = await Promise.all([prefs, months, notificationIds(s)]);
  let swaps = 0;
  for (let i = 0; i < ids.length; i += 200) {
    const { count } = await supabaseAdmin.from("hsu_swaps").select("id", { count: "exact", head: true }).in("shift_id", ids.slice(i, i + 200));
    swaps += count ?? 0;
  }
  return { shifts: ids.length, preferences: p.count ?? 0, months: m.count ?? 0, swaps, notifications: notes.length };
}

export async function GET(req: Request) {
  const auth = await requireManager(req);
  if ("res" in auth) return auth.res;
  const url = new URL(req.url);
  const s = parseScope(url.searchParams.get("scope"), url.searchParams.get("month"));
  if (!s) return fail(tr(req, apiAdmin)("err.badScope"));
  return json({ ok: true, counts: await counts(s) });
}

export async function POST(req: Request) {
  const auth = await requireManager(req);
  if ("res" in auth) return auth.res;
  const t = tr(req, apiAdmin);
  const body = await readJson(req);
  const s = parseScope(body.scope, body.month);
  if (!s) return fail(t("err.badScope"));
  if (String(body.confirm ?? "").trim().toUpperCase() !== RESET_WORD) return fail(t("err.confirmWord", { word: RESET_WORD }));

  const before = await counts(s);
  const ids = await shiftIds(s);
  const notes = await notificationIds(s);

  // Vaktaskipti eyðast með vöktunum (on delete cascade).
  for (let i = 0; i < ids.length; i += 200) {
    const { error } = await supabaseAdmin.from("hsu_shifts").delete().in("id", ids.slice(i, i + 200));
    if (error) return fail(error.message, 500);
  }
  for (let i = 0; i < notes.length; i += 200) {
    const { error } = await supabaseAdmin.from("hsu_notifications").delete().in("id", notes.slice(i, i + 200));
    if (error) return fail(error.message, 500);
  }
  const prefs = supabaseAdmin.from("hsu_preferences").delete();
  const months = supabaseAdmin.from("hsu_months").delete();
  const throttles = supabaseAdmin.from("hsu_auth_throttle").delete();
  const [p, m, th] = s.scope === "month"
    ? await Promise.all([prefs.eq("month", s.month), months.eq("month", s.month), throttles.like("key", `remind:${s.month}:%`)])
    : await Promise.all([prefs.not("id", "is", null), months.not("month", "is", null), throttles.like("key", "remind:%")]);
  const err = p.error ?? m.error ?? th.error;
  if (err) return fail(err.message, 500);

  await audit(auth.actor.label, s.scope === "month" ? "month.reset" : "system.reset", s.scope === "month" ? s.month : null, before);
  if (ids.length) after(async () => { await hsuSync.syncAllConnected(); });
  return json({ ok: true, cleared: before });
}
