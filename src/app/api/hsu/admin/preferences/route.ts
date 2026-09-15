// Yfirlæknir skráir óskir fyrir hönd læknis (t.d. sem sendi þær í tölvupósti).

import { supabaseAdmin } from "@/lib/supabase-admin";
import { audit } from "@/lib/hsu/auth";
import { copyToNextMonth, sanitizePrefs, savePrefs } from "@/lib/hsu/prefs";
import { MONTH_RE, UUID_RE, fail, json, readJson, requireManager } from "@/lib/hsu/server";
import type { PrefStatus } from "@/lib/hsu/types";

export const runtime = "nodejs";

export async function PUT(req: Request) {
  const auth = await requireManager(req);
  if ("res" in auth) return auth.res;
  const body = await readJson(req);
  const month = String(body.month ?? "");
  const doctorId = String(body.doctor_id ?? "");
  if (!MONTH_RE.test(month) || !UUID_RE.test(doctorId)) return fail("Ógild beiðni");
  const { data: doc } = await supabaseAdmin.from("hsu_doctors").select("id").eq("id", doctorId).maybeSingle();
  if (!doc) return fail("Læknir fannst ekki", 404);

  const input = sanitizePrefs(month, body);
  if (typeof input === "string") return fail(input);
  const status: PrefStatus = body.approve ? "approved" : "submitted";
  const saved = await savePrefs({ doctorId, month, input, status, enteredBy: auth.actor.label });
  if (status === "approved") {
    await supabaseAdmin.from("hsu_preferences").update({ reviewed_by: auth.actor.label, review_note: "" }).eq("id", saved.id);
  }
  let copiedTo: string | null = null;
  if (body.also_next) copiedTo = await copyToNextMonth(doctorId, month, input, "submitted", auth.actor.label);
  await audit(auth.actor.label, "prefs.enter", month, { doctorId, status, copiedTo });
  return json({ ok: true, preference: saved, copiedTo });
}
