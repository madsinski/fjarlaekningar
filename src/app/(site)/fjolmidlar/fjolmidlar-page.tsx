import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPage } from "@/lib/site-content/server";
import { pressItems } from "@/lib/site-content/fjolmidlar";
import { renderHighlighted } from "@/lib/site-content/highlight";
import type { Locale } from "@/lib/site-content/types";
import { alternatesFor, SITE_URL, SITE_NAME } from "@/lib/seo";
import { localeHref } from "@/lib/locale";
import PressList from "./PressList";

// One implementation, two URLs: /fjolmidlar and /en/fjolmidlar.
//
// The page does not exist until there is something on it: with an empty list it
// 404s, so there is never an empty page for a visitor to land on or for Google
// to index.

const META = {
  is: { title: "Fjölmiðlaumfjöllun", empty: "Fjölmiðlar" },
  en: { title: "Press coverage", empty: "Press" },
} as const;

export async function fjolmidlarMetadata(locale: Locale): Promise<Metadata> {
  const { c, enReady } = await getPage("fjolmidlar", locale);
  if (!pressItems(c).length) {
    return { title: META[locale].empty, robots: { index: false, follow: false } };
  }
  return {
    title: META[locale].title,
    description: c.hero_body?.slice(0, 160),
    alternates: alternatesFor("/fjolmidlar", locale, enReady),
    ...(locale === "en" && !enReady ? { robots: { index: false, follow: true } } : {}),
  };
}

export default async function FjolmidlarPage({ locale }: { locale: Locale }) {
  const { c } = await getPage("fjolmidlar", locale);
  const items = pressItems(c);
  // Nothing added yet: no empty page for anyone to find or index.
  if (!items.length) notFound();

  // A list of external coverage, not articles we published — so the items point
  // at the original with its own publisher named.
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: `${META[locale].title} — ${SITE_NAME}`,
    url: `${SITE_URL}${localeHref("/fjolmidlar", locale)}`,
    inLanguage: locale,
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
      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-20">
        {c.hero_eyebrow && (
          <p className="site-eyebrow text-xs font-semibold uppercase tracking-widest text-brand-cyan-dark mb-3">
            {c.hero_eyebrow}
          </p>
        )}
        <h1 className="text-3xl sm:text-4xl font-bold text-slate-900">
          {renderHighlighted(c.hero_heading)}
        </h1>
        {c.hero_body && <p className="mt-4 max-w-2xl text-lg text-slate-600">{c.hero_body}</p>}

        <div className="mt-10 sm:mt-12">
          <PressList items={items} locale={locale} />
        </div>
      </section>
    </>
  );
}
