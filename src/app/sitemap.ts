import type { MetadataRoute } from "next";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { SITE_URL } from "@/lib/seo";
import { erindi } from "@/erindi";
import { getPageContent } from "@/lib/site-content/server";
import { erindiPagesLive } from "@/lib/site-content/erindi-pages";
import { pressItems } from "@/lib/site-content/fjolmidlar";

// Public marketing pages plus every published legal document, so the same
// single source of truth that fills the footer also feeds the sitemap.
export const dynamic = "force-dynamic";

const PAGES: { path: string; priority: number; changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"] }[] = [
  { path: "/", priority: 1, changeFrequency: "weekly" },
  { path: "/thjonusta", priority: 0.9, changeFrequency: "weekly" },
  { path: "/um-okkur", priority: 0.6, changeFrequency: "monthly" },
  { path: "/hafa-samband", priority: 0.6, changeFrequency: "monthly" },
  { path: "/breytingaskra", priority: 0.3, changeFrequency: "monthly" },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const base: MetadataRoute.Sitemap = PAGES.map((p) => ({
    url: `${SITE_URL}${p.path}`,
    lastModified: now,
    changeFrequency: p.changeFrequency,
    priority: p.priority,
  }));

  try {
    if (pressItems(await getPageContent("fjolmidlar")).length) {
      base.push({ url: `${SITE_URL}/fjolmidlar`, lastModified: now, changeFrequency: "monthly", priority: 0.5 });
    }
  } catch {
    // best effort
  }

  try {
    // Erindi landing pages are listed only once they are published.
    if (erindiPagesLive(await getPageContent("erindi"))) {
      for (const e of erindi) {
        base.push({
          url: `${SITE_URL}/erindi/${e.slug}`,
          lastModified: now,
          changeFrequency: "monthly",
          priority: 0.8,
        });
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
