// Þýðingar vaktakerfis HSU — kjarninn (virkar bæði í vafra og á þjóni).
//
// Hver hluti kerfisins á sína skrá undir messages/ sem skilgreinir íslensku
// (frumtextann) og ensku með defineMessages(). TypeScript krefst þess að enska
// hafi nákvæmlega sömu lykla, svo þýðing getur ekki gleymst. Nýtt tungumál:
// bæta því við LANGS og hverja messages-skrá. Sjá docs/hsu-i18n.md.
//
// Textar:
//   "Halló {name}"                 — breytur í slaufusvigum
//   lykill_one / lykill_other      — eintala/fleirtala, sótt með tn(lykill, n)

export const LANGS = ["is", "en"] as const;
export type Lang = (typeof LANGS)[number];
export const DEFAULT_LANG: Lang = "is";
export const LANG_COOKIE = "hsu_lang";
/** Ekki httpOnly: vafrinn les ekki kökuna, en hún er engin leynd. Eitt ár. */
export const LANG_COOKIE_OPTS = { httpOnly: false, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 365 } as const;
export const LANG_NAMES: Record<Lang, string> = { is: "Íslenska", en: "English" };
/** BCP 47 fyrir Intl/toLocaleString. */
export const LANG_LOCALE: Record<Lang, string> = { is: "is-IS", en: "en-GB" };

export function isLang(v: unknown): v is Lang {
  return typeof v === "string" && (LANGS as readonly string[]).includes(v);
}

export type Messages = Record<string, string>;
export type Catalog<T extends Messages> = { is: T } & { [L in Exclude<Lang, "is">]: { [K in keyof T]: string } };

/** Skilgreinir textasafn: íslenska + sömu lyklar á hverju öðru tungumáli. */
export function defineMessages<const T extends Messages>(is: T, others: { [L in Exclude<Lang, "is">]: { [K in keyof T]: string } }): Catalog<T> {
  return { is, ...others } as Catalog<T>;
}

export type Vars = Record<string, string | number | null | undefined>;

export function format(s: string, vars?: Vars): string {
  if (!vars) return s;
  return s.replace(/\{(\w+)\}/g, (m, k: string) => (vars[k] === undefined || vars[k] === null ? m : String(vars[k])));
}

/** Íslensk eintala: endar á 1 en ekki 11 (1, 21, 31 vakt; 11 vaktir). */
export function pluralForm(lang: Lang, n: number): "one" | "other" {
  const i = Math.abs(Math.trunc(n));
  if (lang === "is") return i % 10 === 1 && i % 100 !== 11 ? "one" : "other";
  return i === 1 ? "one" : "other";
}

type BaseKey<K> = K extends `${infer B}_one` ? B : K extends `${infer B}_other` ? B : never;

export interface Translator<T extends Messages> {
  (key: keyof T & string, vars?: Vars): string;
  /** Fleirtala: tn("shifts", 3) les shifts_one / shifts_other; {n} er fjöldinn. */
  n: (key: BaseKey<keyof T & string>, n: number, vars?: Vars) => string;
  /** Lykill settur saman á keyrslutíma, t.d. `month.${m}`. Óþekktur lykill skilar sér sjálfum. */
  dyn: (key: string, vars?: Vars) => string;
  lang: Lang;
}

export function translator<T extends Messages>(catalog: Catalog<T>, lang: Lang): Translator<T> {
  const table = (catalog[lang] ?? catalog.is) as Messages;
  const base = catalog.is as Messages;
  const t = ((key: string, vars?: Vars) => format(table[key] ?? base[key] ?? key, vars)) as Translator<T>;
  t.n = (key, n, vars) => {
    const k = `${key}_${pluralForm(lang, n)}`;
    return format(table[k] ?? base[k] ?? k, { n, ...vars });
  };
  t.dyn = (key, vars) => format(table[key] ?? base[key] ?? key, vars);
  t.lang = lang;
  return t;
}
