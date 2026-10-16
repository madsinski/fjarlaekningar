// Tilkynningar um nýjungar — það sem skýtur upp kollinum þegar læknir opnar
// vaktakerfið eftir að eitthvað nýtt hefur bæst við.
//
// Þegar ný virkni fer í loftið er EINNI færslu bætt hér fremst og texti
// skrifaður í messages/help.ts undir `news.<id>.t` og `news.<id>.b`. Hver
// læknir sér hverja tilkynningu einu sinni (hsu_doctors.onboarding["news:<id>"]).
//
// `article` tengir tilkynninguna við leiðbeiningu í hjálparsafninu, svo hægt sé
// að fara beint úr „Hvað er nýtt“ í „svona gerirðu þetta“.

export interface HsuNews {
  id: string;
  /** Dagsetning útgáfu (ISO). Nýjast birtist fyrst. */
  date: string;
  /** Leiðbeining í hjálparsafninu sem á við. */
  article?: string;
}

export const HSU_NEWS: HsuNews[] = [
  { id: "dagvinna", date: "2026-10-17", article: "fm" },
  { id: "help", date: "2026-10-16" },
  { id: "swap", date: "2026-10-16", article: "swap" },
  { id: "weeknos", date: "2026-10-16", article: "roster" },
];

/** Nýjasta tilkynningin sem læknirinn hefur ekki séð. */
export function nextNews(onboarding: Record<string, string>): HsuNews | null {
  return [...HSU_NEWS].sort((a, b) => b.date.localeCompare(a.date)).find((n) => !onboarding[`news:${n.id}`]) ?? null;
}
