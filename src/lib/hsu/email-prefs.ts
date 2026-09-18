// Hvaða tilkynningar fara í tölvupóst. Hver læknir velur sjálfur, einn hamur á
// hvern flokk (hsu_doctors.email_prefs, Mín síða → Stillingar). Server-only.
//
//   "now"    — póstur strax
//   "digest" — safnast saman og fer í EINUM pósti þegar 10 mín. eru liðnar án
//              nýrra breytinga (src/lib/hsu/digest.ts, cron á 5 mín. fresti)
//   "off"    — enginn póstur; tilkynningin birtist eftir sem áður í kerfinu
//
// Öryggispóstar (lykilorð, boð um aðgang, gleymt lykilorð) fara alltaf og eru
// ekki í þessum flokkum.

import { supabaseAdmin } from "@/lib/supabase-admin";

export * from "./email-categories";
import { DEFAULT_EMAIL_PREFS, normalizeEmailPrefs as clean, type EmailCategory, type EmailMode } from "./email-categories";

/** Stillingar eins læknis, með sjálfgefnum gildum þar sem hann hefur ekkert valið. */
export async function doctorEmailPrefs(doctorId: string): Promise<Record<EmailCategory, EmailMode>> {
  const { data } = await supabaseAdmin.from("hsu_doctors").select("email_prefs").eq("id", doctorId).maybeSingle();
  return clean(data?.email_prefs);
}

/** Hamur flokksins fyrir hvern viðtakanda (lesið beint — breyting gildir strax). */
export async function emailModesFor(doctorIds: string[], c: EmailCategory): Promise<Map<string, EmailMode>> {
  const out = new Map<string, EmailMode>();
  const ids = [...new Set(doctorIds.filter(Boolean))];
  if (!ids.length) return out;
  const { data } = await supabaseAdmin.from("hsu_doctors").select("id, email_prefs").in("id", ids);
  for (const r of data ?? []) out.set(r.id as string, clean(r.email_prefs)[c]);
  for (const id of ids) if (!out.has(id)) out.set(id, DEFAULT_EMAIL_PREFS[c]);
  return out;
}

export async function emailModeFor(doctorId: string | null | undefined, c: EmailCategory): Promise<EmailMode> {
  if (!doctorId) return "off";
  return (await emailModesFor([doctorId], c)).get(doctorId) ?? DEFAULT_EMAIL_PREFS[c];
}
