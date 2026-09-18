// Tilkynningar í tölvupósti — flokkar, sjálfgefin gildi og hreinsun.
// Hreinn kóði án netkalla: notaður bæði í vafra og á þjóni (sjá email-prefs.ts).

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

/**
 * Flokkar sem hægt er að setja í samantekt (hinir: aðeins strax/slökkt).
 * Samantekt nær aðeins til tilkynninga sem fara um notifyDoctors.
 */
const DIGESTABLE: Record<EmailCategory, boolean> = {
  shifts: true, requests: true, market: false, marketMine: false, prefs: false, publish: false, head: true,
};

/** Flokkar sem læknir sér í stillingum sínum („head“ aðeins yfirlæknar). */
export function categoriesFor(role: string): EmailCategory[] {
  return EMAIL_CATEGORIES.filter((c) => c !== "head" || role === "head");
}

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
