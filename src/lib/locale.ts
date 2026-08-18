// Where a page's language lives: in the URL.
//
// English used to be a `lang` cookie on the SAME URLs as Icelandic, which meant
// Google had no English page to index, hreflang was impossible (it needs two
// distinct URLs pointing at each other) and a shared English link opened in
// whatever language the recipient's cookie happened to say.
//
// Now the marketing pages exist twice: `/thjonusta` is Icelandic, `/en/thjonusta`
// is English. The Icelandic slugs are kept in both — they are the canonical
// names of the pages, they already rank, and translating slugs would double the
// redirect surface for no gain.
//
// Everything else on the site (admin, surveys, legal documents, the portal-facing
// one-offs) has a single URL and still takes its language from the cookie.

import type { Locale } from "./site-content/types";

/** Path prefix marking the English rendering. Icelandic keeps the bare paths. */
export const EN_PREFIX = "/en";

/**
 * Request header the proxy stamps with the incoming pathname, so a layout —
 * which gets no route params — can still tell which language it is rendering.
 * See src/proxy.ts and getLocale() in site-content/server.ts.
 */
export const PATHNAME_HEADER = "x-pathname";

/** The marketing pages that exist in both languages, by their Icelandic path. */
export const LOCALIZED_ROOTS = [
  "/",
  "/thjonusta",
  "/um-okkur",
  "/hafa-samband",
  "/fjolmidlar",
  "/erindi",
] as const;

/** Trailing slash, query and fragment removed; "" becomes "/". */
function normalize(pathname: string): string {
  const p = (pathname || "/").split("?")[0].split("#")[0] || "/";
  return p.length > 1 && p.endsWith("/") ? p.slice(0, -1) : p;
}

/** Does this Icelandic path have an English twin? */
export function isLocalizedPath(pathname: string): boolean {
  const p = normalize(pathname);
  return LOCALIZED_ROOTS.some((r) => (r === "/" ? p === "/" : p === r || p.startsWith(`${r}/`)));
}

/** The Icelandic sibling of a path: "/en/thjonusta" → "/thjonusta". */
export function stripLocale(pathname: string): string {
  const p = normalize(pathname);
  if (p === EN_PREFIX) return "/";
  return p.startsWith(`${EN_PREFIX}/`) ? p.slice(EN_PREFIX.length) : p;
}

/**
 * Locale carried by the URL itself, or null when the path is not one of the
 * two-language pages — the caller then falls back to the cookie. Returning null
 * rather than "is" is what keeps the cookie working for /kannanir, /skjol and
 * the admin, which have no English URL to switch to.
 */
export function pathLocale(pathname: string): Locale | null {
  const p = normalize(pathname);
  if (p === EN_PREFIX || p.startsWith(`${EN_PREFIX}/`)) {
    return isLocalizedPath(stripLocale(p)) ? "en" : null;
  }
  return isLocalizedPath(p) ? "is" : null;
}

/**
 * The same page in `locale`. Route every internal link through this rather than
 * hand-prefixing call sites: paths without an English twin (/skjol/…, /admin)
 * and absolute URLs are returned untouched, so it is always safe to apply.
 * Query strings and fragments survive — localeHref("/thjonusta#faq", "en")
 * gives "/en/thjonusta#faq".
 */
export function localeHref(path: string, locale: Locale = "is"): string {
  const [, base, tail] = /^([^?#]*)(.*)$/.exec(path) as RegExpExecArray;
  if (locale !== "en" || !base.startsWith("/")) return path;
  if (!isLocalizedPath(base)) return path;
  return `${base === "/" ? EN_PREFIX : `${EN_PREFIX}${normalize(base)}`}${tail}`;
}
