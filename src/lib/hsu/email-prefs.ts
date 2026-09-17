// Hvaða tilkynningar fara í tölvupóst. Ein stilling á hvern flokk, geymd í
// hsu_settings.email_prefs. Server-only.
//
//   "now"    — póstur strax
//   "digest" — safnast saman og fer í EINUM pósti þegar 10 mín. eru liðnar án
//              nýrra breytinga (src/lib/hsu/digest.ts, cron á 5 mín. fresti)
//   "off"    — enginn póstur; tilkynningin birtist eftir sem áður í kerfinu
//
// Öryggispóstar (lykilorð, boð um aðgang, gleymt lykilorð) fara alltaf og eru
// ekki í þessum flokkum.

import { supabaseAdmin } from "@/lib/supabase-admin";

export type EmailMode = "now" | "digest" | "off";

export const EMAIL_CATEGORIES = [
  "shifts",     // breytingar á vöktum læknis (færslur, tímar, niðurfelling, úr birtingu)
  "requests",   // beiðni um aukavakt (umfram hámark eða gegn óskum)
  "market",     // ný vakt á vaktamarkaði — fer á ALLA lækna
  "marketMine", // vaktaskipti sem snerta lækninn sjálfan (tekin, hafnað, dregin til baka)
  "prefs",      // vaktaóskir: opnað, áminning, samþykkt, breytinga óskað
  "publish",    // vaktaplan birt
  "head",       // til yfirlæknis: svör við beiðnum, vaktaskipti, dagvinnudagar
] as const;
export type EmailCategory = (typeof EMAIL_CATEGORIES)[number];

/** Flokkar sem hægt er að setja í samantekt (hinir: aðeins strax/slökkt). */
const DIGESTABLE: Record<EmailCategory, boolean> = {
  shifts: true, requests: true, market: true, marketMine: true, prefs: false, publish: false, head: true,
};

/**
 * Sjálfgefið: það sem krefst viðbragða fer í póst, hitt safnast saman eða er
 * slökkt. Vaktamarkaðurinn er slökktur — hann fór áður á alla lækna við hverja
 * vakt sem einhver bauð.
 */
export const DEFAULT_EMAIL_PREFS: Record<EmailCategory, EmailMode> = {
  shifts: "digest",
  requests: "digest",
  market: "off",
  marketMine: "now",
  prefs: "now",
  publish: "now",
  head: "digest",
};

export function canDigest(c: EmailCategory): boolean {
  return DIGESTABLE[c];
}

function clean(raw: unknown): Record<EmailCategory, EmailMode> {
  const v = (raw ?? {}) as Record<string, unknown>;
  const out = { ...DEFAULT_EMAIL_PREFS };
  for (const c of EMAIL_CATEGORIES) {
    const m = v[c];
    if (m === "now" || m === "off" || (m === "digest" && canDigest(c))) out[c] = m;
  }
  return out;
}

export function normalizeEmailPrefs(raw: unknown): Record<EmailCategory, EmailMode> {
  return clean(raw);
}

/**
 * Lesið beint í hvert sinn: tilkynningar eru fáar og stilling sem var breytt í
 * stjórnborðinu á að gilda strax — líka í öðrum þjónsferlum.
 */
export async function emailPrefs(): Promise<Record<EmailCategory, EmailMode>> {
  const { data } = await supabaseAdmin.from("hsu_settings").select("email_prefs").eq("id", 1).maybeSingle();
  return clean(data?.email_prefs);
}

/** Hvernig á að senda þennan flokk núna? */
export async function emailMode(c: EmailCategory): Promise<EmailMode> {
  return (await emailPrefs())[c];
}
