import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { resolveContent } from "./registry";
import type { Locale, LocaleContent, SiteContentBlob } from "./types";

// Server-side content loading for the public site.
//
// Only `published` is ever read here — drafts stay inside the admin API, so
// unpublished edits can never leak to a visitor. If the table/row is missing
// (e.g. before the migration ran) we fall back to the built-in defaults, so
// every page renders exactly as it did before the CMS existed.

export async function getLocale(): Promise<Locale> {
  const store = await cookies();
  return store.get("lang")?.value === "en" ? "en" : "is";
}

export async function getPublishedBlob(page: string): Promise<SiteContentBlob | null> {
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
}

/** Resolved content map for a page, in the visitor's locale. */
export async function getPageContent(page: string): Promise<LocaleContent> {
  const [locale, blob] = await Promise.all([getLocale(), getPublishedBlob(page)]);
  return resolveContent(page, blob, locale);
}
