import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPageContent, getLocale } from "@/lib/site-content/server";
import { pressItems } from "@/lib/site-content/fjolmidlar";
import { SITE_URL, SITE_NAME } from "@/lib/seo";
import PressList from "./PressList";

export const dynamic = "force-dynamic";

// Highlight ==words== the same way the other page heroes do.
function renderHeading(text: string) {
  return text.split(/==(.+?)==/g).map((part, i) =>
    i % 2 === 1 ? (
      <span key={i} className="text-brand-cyan-dark">{part}</span>
    ) : (
      <span key={i}>{part}</span>
    ),
  );
}

export async function generateMetadata(): Promise<Metadata> {
  const c = await getPageContent("fjolmidlar");
  if (!pressItems(c).length) return { title: "Fjölmiðlar", robots: { index: false, follow: false } };
  return {
    title: "Fjölmiðlaumfjöllun",
    description: c.hero_body?.slice(0, 160),
    alternates: { canonical: "/fjolmidlar" },
  };
}

export default async function FjolmidlarPage() {
  const [c, locale] = await Promise.all([getPageContent("fjolmidlar"), getLocale()]);
  const items = pressItems(c);
  // Nothing added yet: no empty page for anyone to find or index.
  if (!items.length) notFound();

  // A list of external coverage, not articles we published — so the items point
  // at the original with its own publisher named.
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: `Fjölmiðlaumfjöllun — ${SITE_NAME}`,
    url: `${SITE_URL}/fjolmidlar`,
    about: { "@id": `${SITE_URL}/#organization` },
    mainEntity: {
      "@type": "ItemList",
      itemListElement: items.map((item, i) => ({
        "@type": "ListItem",
        position: i + 1,
        item: {
          "@type": "NewsArticle",
          headline: item.title,
          url: item.url,
          ...(item.date ? { datePublished: item.date } : {}),
          ...(item.outlet ? { publisher: { "@type": "Organization", name: item.outlet } } : {}),
        },
      })),
    },
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <section className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-20">
        {c.hero_eyebrow && (
          <p className="text-xs font-semibold uppercase tracking-widest text-brand-cyan-dark mb-3">
            {c.hero_eyebrow}
          </p>
        )}
        <h1 className="text-3xl sm:text-4xl font-bold text-slate-900">{renderHeading(c.hero_heading ?? "")}</h1>
        {c.hero_body && <p className="mt-4 text-lg text-slate-600 max-w-2xl">{c.hero_body}</p>}

        <div className="mt-10">
          <PressList items={items} locale={locale} />
        </div>
      </section>
    </>
  );
}
