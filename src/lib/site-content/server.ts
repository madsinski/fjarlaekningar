import { cache } from "react";
import { cookies, headers } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { PATHNAME_HEADER, pathLocale } from "@/lib/locale";
import { englishReady, resolveContent, resolveSections } from "./registry";
import type { Locale, LocaleContent, SiteContentBlob } from "./types";

// Server-side content loading for the public site.
//
// Only `published` is ever read here — drafts stay inside the admin API, so
// unpublished edits can never leak to a visitor. If the table/row is missing
// (e.g. before the migration ran) we fall back to the built-in defaults, so
// every page renders exactly as it did before the CMS existed.

/**
 * The language this request is being rendered in.
 *
 * The URL wins: /en/thjonusta is English, /thjonusta is Icelandic, and no
 * cookie can change either — that is the whole point of having two URLs. The
 * `lang` cookie survives only for the surfaces with a single URL and no English
 * twin (the admin, /kannanir, /skjol), where there is no segment to read.
 *
 * Pages should pass their locale explicitly instead of calling this; it exists
 * for the two layouts, which get no route params and must read the path from
 * the header the proxy stamps on every request.
 */
export async function getLocale(): Promise<Locale> {
  const h = await headers();
  const fromPath = pathLocale(h.get(PATHNAME_HEADER) ?? "");
  if (fromPath) return fromPath;
  const store = await cookies();
  return store.get("lang")?.value === "en" ? "en" : "is";
}

/**
 * Cached per request, so a page that reads its blob in both generateMetadata()
 * and the component itself still makes one round trip.
 */
export const getPublishedBlob = cache(async function getPublishedBlob(
  page: string,
): Promise<SiteContentBlob | null> {
  try {
    const { data } = await supabaseAdmin
      .from("site_content")
      .select("published")
      .eq("page", page)
      .maybeSingle();
    return (data?.published as SiteContentBlob) ?? null;
  } catch {
    return null;
  }
});

/** Resolved content map for a page, in the given locale. */
export async function getPageContent(page: string, locale?: Locale): Promise<LocaleContent> {
  const [loc, blob] = await Promise.all([locale ?? getLocale(), getPublishedBlob(page)]);
  return resolveContent(page, blob, loc);
}

/**
 * Content, the published section order, and whether the English rendering of
 * this page is actually in English — one round trip, so a page that renders
 * reorderable bands doesn't fetch the blob twice.
 *
 * `enReady` is false while a page still falls back to Icelandic for most of its
 * text. Behind a cookie that was merely awkward; on a URL Google can index it
 * is a duplicate of the Icelandic page, so /en pages that are not ready are
 * served `noindex` and left out of the sitemap and the hreflang map.
 */
export async function getPage(
  page: string,
  locale?: Locale,
): Promise<{ c: LocaleContent; order: string[]; locale: Locale; enReady: boolean }> {
  const [loc, blob] = await Promise.all([locale ?? getLocale(), getPublishedBlob(page)]);
  return {
    c: resolveContent(page, blob, loc),
    order: resolveSections(page, blob, loc),
    locale: loc,
    enReady: englishReady(page, blob),
  };
}

/** Whether the English rendering of a page is translated enough to index. */
export async function isEnglishReady(page: string): Promise<boolean> {
  return englishReady(page, await getPublishedBlob(page));
}
