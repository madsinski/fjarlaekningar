// Innleiðing: skrá að notandi hafi séð kynningu eða leiðarvísi (eða endurstilla).
//   POST { key: "tour:doctor" | "tour:head" | "guide:head", done: boolean }

import { supabaseAdmin } from "@/lib/supabase-admin";
import { getDoctorSession, sameOrigin } from "@/lib/hsu/auth";
import { fail, json, readJson } from "@/lib/hsu/server";

export const runtime = "nodejs";

const KEYS = ["tour:doctor", "tour:head", "guide:head"] as const;

export async function POST(req: Request) {
  if (!sameOrigin(req)) return fail("Ógild beiðni", 403);
  const doctor = await getDoctorSession();
  if (!doctor) return fail("Ekki innskráð(ur)", 401);
  const body = await readJson(req);
  const key = body.key as (typeof KEYS)[number];
  if (!KEYS.includes(key)) return fail("Óþekktur lykill");
  const { data } = await supabaseAdmin.from("hsu_doctors").select("onboarding").eq("id", doctor.id).single();
  const next = { ...((data?.onboarding ?? {}) as Record<string, string>) };
  if (body.done === false) delete next[key];
  else next[key] = new Date().toISOString();
  const { error } = await supabaseAdmin.from("hsu_doctors").update({ onboarding: next }).eq("id", doctor.id);
  if (error) return fail(error.message, 500);
  return json({ ok: true, onboarding: next });
}
