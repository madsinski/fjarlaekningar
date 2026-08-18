import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { erindi, localizeErindi } from "@/erindi";
import { getPageContent, getLocale } from "@/lib/site-content/server";
import { erindiKey, erindiPagesLive } from "@/lib/site-content/erindi-pages";
import ErindiView, { erindiLines } from "./ErindiView";
import { SITE_URL } from "@/lib/seo";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ slug: string }> };

/** Content for one erindi, or null when the pages are switched off / unknown slug. */
async function load(slug: string) {
  const item = erindi.find((e) => e.slug === slug);
  if (!item) return null;
  const [c, locale] = await Promise.all([getPageContent("erindi"), getLocale()]);
  if (!erindiPagesLive(c)) return null;
  const k = erindiKey(slug);
  const localized = localizeErindi(locale).find((e) => e.slug === slug)!;
  return {
    c,
    locale,
    slug,
    title: localized.title,
    lead: c[`${k}_lead`]?.trim() || localized.description,
    about: c[`${k}_about`] ?? "",
    selftest: c[`${k}_selftest`] ?? "",
    advice: c[`${k}_advice`] ?? "",
    suitable: erindiLines(c[`${k}_suitable`]),
    refer: erindiLines(c[`${k}_refer`]),
  };
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const d = await load(slug);
  // Switched off: tell crawlers to stay away even if someone has the URL.
  if (!d) return { title: "Erindi", robots: { index: false, follow: false } };
  return {
    title: d.title,
    description: d.lead.slice(0, 160),
    alternates: { canonical: `/erindi/${slug}` },
    openGraph: { title: `${d.title} — Fjarlækningar`, description: d.lead.slice(0, 200) },
  };
}

export default async function ErindiPage({ params }: Params) {
  const { slug } = await params;
  const d = await load(slug);
  if (!d) notFound();
  const others = localizeErindi(d.locale)
    .filter((e) => e.slug !== slug)
    .slice(0, 6)
    .map((e) => ({ slug: e.slug, title: e.title }));

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "MedicalWebPage",
    name: `${d.title} — Fjarlækningar`,
    description: d.lead,
    url: `${SITE_URL}/erindi/${slug}`,
    inLanguage: d.locale,
    about: { "@type": "MedicalCondition", name: d.title },
    publisher: { "@id": `${SITE_URL}/#organization` },
    breadcrumb: {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Forsíða", item: SITE_URL },
        { "@type": "ListItem", position: 2, name: "Þjónusta", item: `${SITE_URL}/thjonusta` },
        { "@type": "ListItem", position: 3, name: d.title, item: `${SITE_URL}/erindi/${slug}` },
      ],
    },
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <ErindiView
        c={d.c}
        slug={slug}
        title={d.title}
        lead={d.lead}
        about={d.about}
        selftest={d.selftest}
        advice={d.advice}
        suitable={d.suitable}
        refer={d.refer}
        others={others}
      />
    </>
  );
}
