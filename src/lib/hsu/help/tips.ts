// Ráð dagsins: eitt lítið ráð þegar læknirinn opnar vaktakerfið.
//
// Ráðin eru ekki sérstakur texti heldur vísun í hjálparsafnið — þannig er
// aðeins einn staður til að halda við, og „Sýna mér“ fer beint á réttan stað.
// Læknirinn getur slökkt á þeim (hsu_doctors.onboarding["tips:off"]).

/** Leiðbeiningarnar sem gagnast best sem ráð, í þeirri röð sem þær birtast. */
export const TIP_IDS = [
  "swap",
  "brush",
  "calendar",
  "print",
  "fmcap",
  "take",
  "roster",
  "daywork",
  "emails",
  "tomarket",
  "evening",
  "vinnustund",
];

const SEEN_KEY = "hsu-tip-i";

/**
 * Næsta ráð í röðinni. Talan er geymd í vafranum: ráðin eiga að rúlla áfram
 * en það er ekki þess virði að skrifa í gagnagrunninn við hverja innskráningu.
 */
export function nextTip(): { id: string; index: number } {
  let i = 0;
  try { i = Number(localStorage.getItem(SEEN_KEY) ?? "0") || 0; } catch { /* lokað á geymslu */ }
  const index = ((i % TIP_IDS.length) + TIP_IDS.length) % TIP_IDS.length;
  return { id: TIP_IDS[index], index };
}

/** Næst þegar læknirinn opnar kerfið fær hann næsta ráð. */
export function advanceTip(index: number): void {
  try { localStorage.setItem(SEEN_KEY, String((index + 1) % TIP_IDS.length)); } catch { /* lokað á geymslu */ }
}
