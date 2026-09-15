// Óskir læknisins fyrir mánuð — vista drög eða senda inn.

import { supabaseAdmin } from "@/lib/supabase-admin";
import { audit } from "@/lib/hsu/auth";
import { copyToNextMonth, doctorMayEdit, sanitizePrefs, savePrefs } from "@/lib/hsu/prefs";
import { MONTH_RE, fail, json, loadMonth, loadPreferences, readJson, requireDoctor } from "@/lib/hsu/server";
import { monthKey, shiftMonth, type PrefStatus } from "@/lib/hsu/types";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const auth = await requireDoctor(req);
  if ("res" in auth) return auth.res;
  const month = new URL(req.url).searchParams.get("month") ?? "";
  if (!MONTH_RE.test(month)) return fail("Ógildur mánuður");
  const [pref] = await loadPreferences(month, auth.doctor.id);
  return json({ ok: true, preference: pref ?? null, month: await loadMonth(month) });
}

export async function PUT(req: Request) {
  const auth = await requireDoctor(req);
  if ("res" in auth) return auth.res;
  const body = await readJson(req);
  const month = String(body.month ?? "");
  if (!MONTH_RE.test(month)) return fail("Ógildur mánuður");
  const now = monthKey(new Date());
  if (month < now || month > shiftMonth(now, 6)) return fail("Aðeins má skrá óskir fyrir næstu mánuði.");

  const input = sanitizePrefs(month, body);
  if (typeof input === "string") return fail(input);

  const [m, [existing]] = await Promise.all([loadMonth(month), loadPreferences(month, auth.doctor.id)]);
  if (!doctorMayEdit(m?.status ?? null, existing?.status ?? null)) {
    return fail("Óskum fyrir þennan mánuð hefur verið lokað. Hafðu samband við yfirlækni.", 409);
  }

  const status: PrefStatus = body.submit ? "submitted" : "draft";
  const saved = await savePrefs({ doctorId: auth.doctor.id, month, input, status, enteredBy: "" });
  // Ný innsending hreinsar fyrri beiðni um breytingar.
  if (status === "submitted" && existing?.review_note) {
    await supabaseAdmin.from("hsu_preferences").update({ review_note: "" }).eq("id", saved.id);
  }

  let copiedTo: string | null = null;
  if (body.also_next) copiedTo = await copyToNextMonth(auth.doctor.id, month, input, status, "");

  if (status === "submitted") await audit(auth.doctor.name, "prefs.submit", month, { copiedTo });
  return json({ ok: true, preference: { ...saved, review_note: status === "submitted" ? "" : saved.review_note }, copiedTo });
}
