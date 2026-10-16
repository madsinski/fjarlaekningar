// Hjálparsafn læknisins: hvaða leiðbeiningar eru til og hvert þær vísa.
//
// Textinn sjálfur er í i18n (messages/help.ts) undir lyklunum `<id>.t` (titill),
// `<id>.w` (hvenær þetta á við), `<id>.s` (skrefin, eitt í línu) og `<id>.k`
// (leitarorð sem koma ekki fyrir í textanum). Hér er aðeins uppbyggingin:
// flokkur, hvaða flipa „Sýna mér" opnar og hvort skýringarmynd fylgir.
//
// Ráðin sem skjóta upp kollinum við innskráningu eru valin úr þessum sama lista
// (sjá tips.ts), svo hjálp og ráð haldast alltaf í hendur.

export type HelpCat = "start" | "oskir" | "vaktir" | "skipti" | "dagatal";

/** Flipi í Mín síða sem leiðbeiningin á við. */
export type HelpTab = "yfirlit" | "vaktir" | "oskir" | "markadur" | "plan" | "stillingar";

/** Einfaldar skýringarmyndir fyrir það sem erfitt er að lýsa í orðum. */
export type HelpArt = "swap" | "brush" | "dayparts" | "calendar";

export interface HelpArticle {
  id: string;
  cat: HelpCat;
  /** „Sýna mér“ opnar þennan flipa. */
  tab?: HelpTab;
  art?: HelpArt;
  /** Ræsir kynninguna á kerfinu í stað þess að opna flipa. */
  tour?: boolean;
}

export const HELP_CATS: HelpCat[] = ["start", "oskir", "vaktir", "skipti", "dagatal"];

export const HELP_ARTICLES: HelpArticle[] = [
  // ── Fyrstu skref ──
  { id: "tour", cat: "start", tour: true },
  { id: "login", cat: "start", tab: "stillingar" },
  { id: "lang", cat: "start" },
  { id: "overview", cat: "start", tab: "yfirlit" },

  // ── Óskir ──
  { id: "prefs", cat: "oskir", tab: "oskir" },
  { id: "brush", cat: "oskir", tab: "oskir", art: "brush" },
  { id: "evening", cat: "oskir", tab: "oskir" },
  { id: "fm", cat: "oskir", tab: "oskir", art: "dayparts" },
  { id: "fmcap", cat: "oskir", tab: "oskir" },
  { id: "maxshifts", cat: "oskir", tab: "oskir" },
  { id: "deadline", cat: "oskir", tab: "oskir" },
  { id: "afterprefs", cat: "oskir", tab: "oskir" },

  // ── Vaktir ──
  { id: "roster", cat: "vaktir", tab: "plan" },
  { id: "myshifts", cat: "vaktir", tab: "vaktir" },
  { id: "vinnustund", cat: "vaktir", tab: "vaktir" },
  { id: "request", cat: "vaktir", tab: "vaktir" },
  { id: "print", cat: "vaktir", tab: "plan" },

  // ── Vaktaskipti og markaður ──
  { id: "swap", cat: "skipti", tab: "plan", art: "swap" },
  { id: "swapanswer", cat: "skipti", tab: "markadur" },
  { id: "tomarket", cat: "skipti", tab: "vaktir" },
  { id: "offer", cat: "skipti", tab: "vaktir" },
  { id: "take", cat: "skipti", tab: "markadur" },

  // ── Dagatal og tilkynningar ──
  { id: "calendar", cat: "dagatal", tab: "stillingar", art: "calendar" },
  { id: "daywork", cat: "dagatal", tab: "oskir" },
  { id: "emails", cat: "dagatal", tab: "stillingar" },
  { id: "sms", cat: "dagatal", tab: "stillingar" },
];

/**
 * Leitarsamanburður: lágstafir og íslenskir sérstafir felldir niður svo
 * „oskir" finni „Óskir" og „flytimottaka" finni „flýtimóttöku".
 */
export function fold(s: string): string {
  return s
    .toLowerCase()
    .replace(/[áà]/g, "a").replace(/[éè]/g, "e").replace(/[íì]/g, "i")
    .replace(/[óò]/g, "o").replace(/[úù]/g, "u").replace(/[ýỳ]/g, "y")
    .replace(/æ/g, "ae").replace(/ö/g, "o").replace(/þ/g, "th").replace(/ð/g, "d");
}
