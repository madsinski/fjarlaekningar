// Ráð við innskráningu — nokkur í einu, ekki eitt.
//
// Ráð læknis vísar í hjálparsafnið (`article`): titillinn og fyrsta skrefið
// koma þaðan, svo það er aðeins einn staður til að halda við og „Sýna mér“
// fer beint á réttan stað. Yfirlæknir hefur ekki hjálparsafn og fær því ráð
// með eigin texta (`tip.<id>.t` og `tip.<id>.b` í messages/help.ts).
//
// Röðin skiptir máli: það sem er nýjast stendur fremst og birtist því fyrst.
// Hvor um sig getur slökkt á ráðunum (onboarding["tips:off"]).

export type TipRole = "doctor" | "head";

export interface HsuTip {
  id: string;
  role: TipRole;
  /** Leiðbeining í hjálparsafninu sem ráðið er sótt í (aðeins læknar). */
  article?: string;
  /** Flipi sem „Sýna mér“ opnar hjá yfirlækni. */
  tab?: string;
}

/** Hve mörg ráð eru sýnd í einu. */
export const TIPS_AT_ONCE = 3;

export const HSU_TIPS: HsuTip[] = [
  // ── Læknar: nýjast fremst ──
  { id: "fm", role: "doctor", article: "fm" },
  { id: "swap", role: "doctor", article: "swap" },
  { id: "roster", role: "doctor", article: "roster" },
  { id: "evening", role: "doctor", article: "evening" },
  { id: "fmcap", role: "doctor", article: "fmcap" },
  { id: "brush", role: "doctor", article: "brush" },
  { id: "calendar", role: "doctor", article: "calendar" },
  { id: "print", role: "doctor", article: "print" },
  { id: "take", role: "doctor", article: "take" },
  { id: "tomarket", role: "doctor", article: "tomarket" },
  { id: "daywork", role: "doctor", article: "daywork" },
  { id: "emails", role: "doctor", article: "emails" },
  { id: "vinnustund", role: "doctor", article: "vinnustund" },

  // ── Yfirlæknir ──
  { id: "head.dagvinna", role: "head", tab: "plan" },
  { id: "head.review", role: "head", tab: "plan" },
  { id: "head.swap", role: "head", tab: "markadur" },
  { id: "head.late", role: "head", tab: "plan" },
  { id: "head.weeknos", role: "head", tab: "plan" },
  { id: "head.period", role: "head", tab: "laeknar" },
  { id: "head.exclude", role: "head", tab: "plan" },
];

// Lykillinn breyttist þegar ráðin urðu fleiri í einu: allir byrja þá aftur
// fremst og sjá nýjungarnar, í stað þess að lenda í miðjum eldri lista.
const KEY = "hsu-tips-at";

const listFor = (role: TipRole) => HSU_TIPS.filter((t) => t.role === role);

/** Ráðin sem á að sýna núna — `TIPS_AT_ONCE` í röð, hringinn í kring. */
export function tipsFor(role: TipRole, count = TIPS_AT_ONCE): { tips: HsuTip[]; next: number } {
  const list = listFor(role);
  if (!list.length) return { tips: [], next: 0 };
  let at = 0;
  try { at = Number(localStorage.getItem(`${KEY}:${role}`) ?? "0") || 0; } catch { /* lokað á geymslu */ }
  const start = ((at % list.length) + list.length) % list.length;
  const tips = Array.from({ length: Math.min(count, list.length) }, (_, i) => list[(start + i) % list.length]);
  return { tips, next: (start + tips.length) % list.length };
}

/** Næst þegar viðkomandi opnar kerfið taka næstu ráð við. */
export function advanceTips(role: TipRole, next: number): void {
  try { localStorage.setItem(`${KEY}:${role}`, String(next)); } catch { /* lokað á geymslu */ }
}
