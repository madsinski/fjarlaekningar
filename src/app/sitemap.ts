import type { MetadataRoute } from "next";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { SITE_URL } from "@/lib/seo";
import { erindi } from "@/erindi";
import { getPage } from "@/lib/site-content/server";
import { erindiPagesLive } from "@/lib/site-content/erindi-pages";
import { pressItems } from "@/lib/site-content/fjolmidlar";

// Public marketing pages plus every published legal document, so the same
// single source of truth that fills the footer also feeds the sitemap.
//
// Bilingual pages are listed at BOTH URLs, each carrying the same
// alternates.languages map — that map is the hreflang signal, and it only works
// if every URL in it agrees with every other. An English page that is still
// mostly Icelandic is left out entirely rather than listed as an alternative;
// see englishReady() in the content registry.
export const dynamic = "force-dynamic";

const PAGES: { path: string; priority: number; changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"] }[] = [
  { path: "/", priority: 1, changeFrequency: "weekly" },
  { path: "/thjonusta", priority: 0.9, changeFrequency: "weekly" },
  { path: "/um-okkur", priority: 0.6, changeFrequency: "monthly" },
  { path: "/hafa-samband", priority: 0.6, changeFrequency: "monthly" },
];

/** CMS page key backing each localized path, for the English-readiness check. */
const PAGE_KEYS: Record<string, string> = {
  "/": "home",
  "/thjonusta": "thjonusta",
  "/um-okkur": "um-okkur",
  "/hafa-samband": "hafa-samband",
  "/fjolmidlar": "fjolmidlar",
};

const isUrl = (path: string) => (path === "/" ? `${SITE_URL}/` : `${SITE_URL}${path}`);
const enUrl = (path: string) => (path === "/" ? `${SITE_URL}/en` : `${SITE_URL}/en${path}`);

/** The Icelandic entry, plus the English one when it is worth indexing. */
function localizedEntries(
  path: string,
  enReady: boolean,
  rest: Omit<MetadataRoute.Sitemap[number], "url" | "alternates">,
): MetadataRoute.Sitemap {
  const languages = { is: isUrl(path), ...(enReady ? { en: enUrl(path) } : {}), "x-default": isUrl(path) };
  const entries: MetadataRoute.Sitemap = [{ url: isUrl(path), alternates: { languages }, ...rest }];
  if (enReady) entries.push({ url: enUrl(path), alternates: { languages }, ...rest });
  return entries;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const base: MetadataRoute.Sitemap = [];

  for (const p of PAGES) {
    let enReady = false;
    try {
      ({ enReady } = await getPage(PAGE_KEYS[p.path], "is"));
    } catch {
      // A content lookup must never take the sitemap down; the Icelandic URL is
      // listed either way, just without an English alternative.
    }
    base.push(
      ...localizedEntries(p.path, enReady, {
        lastModified: now,
        changeFrequency: p.changeFrequency,
        priority: p.priority,
      }),
    );
  }

  // The changelog has one URL and no English twin.
  base.push({ url: `${SITE_URL}/breytingaskra`, lastModified: now, changeFrequency: "monthly", priority: 0.3 });

  try {
    const { c, enReady } = await getPage("fjolmidlar", "is");
    if (pressItems(c).length) {
      base.push(
        ...localizedEntries("/fjolmidlar", enReady, {
          lastModified: now,
          changeFrequency: "monthly",
          priority: 0.5,
        }),
      );
    }
  } catch {
    // best effort
  }

  try {
    // Erindi landing pages are listed only once they are published.
    const { c, enReady } = await getPage("erindi", "is");
    if (erindiPagesLive(c)) {
      for (const e of erindi) {
        base.push(
          ...localizedEntries(`/erindi/${e.slug}`, enReady, {
            lastModified: now,
            changeFrequency: "monthly",
            priority: 0.8,
          }),
        );
      }
    }
  } catch {
    // Sitemap must never fail; the static pages above are enough.
  }

  try {
    const { data } = await supabaseAdmin
      .from("legal_documents")
      .select("slug, updated_at")
      .eq("status", "published");
    for (const d of data ?? []) {
      base.push({
        url: `${SITE_URL}/skjol/${d.slug}`,
        lastModified: d.updated_at ? new Date(d.updated_at) : now,
        changeFrequency: "yearly",
        priority: 0.3,
      });
    }
  } catch {
    // Sitemap must never fail the build; the static pages above are enough.
  }

  return base;
}
