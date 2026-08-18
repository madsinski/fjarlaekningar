import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { erindi, localizeErindi } from "@/erindi";
import { getPage, getPageContent } from "@/lib/site-content/server";
import { ERINDI_WITH_MEDS, erindiKey, erindiPagesLive } from "@/lib/site-content/erindi-pages";
import { ui } from "@/lib/site-content/ui-strings";
import type { Locale } from "@/lib/site-content/types";
import { alternatesFor, SITE_URL } from "@/lib/seo";
import { localeHref } from "@/lib/locale";
import ErindiView, { erindiLines } from "./ErindiView";

// One implementation, two URLs: /erindi/<slug> and /en/erindi/<slug>. The slug
// is the same in both languages — it is the canonical name of the page.
//
// These pages are DARK by default: until `pages_live` is switched on in the CMS
// both URLs 404, so draft medical text is never public and never indexed.

export type Params = { params: Promise<{ slug: string }> };

/** Content for one erindi, or null when the pages are switched off / unknown slug. */
async function load(slug: string, locale: Locale) {
  const item = erindi.find((e) => e.slug === slug);
  if (!item) return null;
  const { c, enReady } = await getPage("erindi", locale);
  if (!erindiPagesLive(c)) return null;
  const k = erindiKey(slug);
  const localized = localizeErindi(locale).find((e) => e.slug === slug)!;
  return {
    c,
    locale,
    enReady,
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

export async function erindiMetadata({ params }: Params, locale: Locale): Promise<Metadata> {
  const { slug } = await params;
  const d = await load(slug, locale);
  // Switched off: tell crawlers to stay away even if someone has the URL.
  if (!d) return { title: "Erindi", robots: { index: false, follow: false } };
  return {
    title: d.title,
    description: d.lead.slice(0, 160),
    alternates: alternatesFor(`/erindi/${slug}`, locale, d.enReady),
    ...(locale === "en" && !d.enReady ? { robots: { index: false, follow: true } } : {}),
    openGraph: { title: `${d.title} — Fjarlækningar`, description: d.lead.slice(0, 200) },
  };
}

export default async function ErindiPage({ params, locale }: Params & { locale: Locale }) {
  const { slug } = await params;
  const d = await load(slug, locale);
  if (!d) notFound();
  const t = ui(locale);
  // The medications that cannot be renewed are edited on the Þjónusta page and
  // shown in its FAQ; the lyfjaendurnýjun page shows the very same list rather
  // than keeping a second copy that could fall out of date.
  const meds = ERINDI_WITH_MEDS.includes(slug) ? await getPageContent("thjonusta", locale) : null;
  const medsCategories = meds
    ? [
        { title: meds.meds_a_title, items: meds.meds_a_items },
        { title: meds.meds_b_title, items: meds.meds_b_items },
        { title: meds.meds_c_title, items: meds.meds_c_items },
        { title: meds.meds_d_title, items: meds.meds_d_items },
      ].filter((m) => m.title)
    : [];
  const others = localizeErindi(locale)
    .filter((e) => e.slug !== slug)
    .slice(0, 6)
    .map((e) => ({ slug: e.slug, title: e.title }));

  const url = (path: string) => `${SITE_URL}${localeHref(path, locale)}`;
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "MedicalWebPage",
    name: `${d.title} — Fjarlækningar`,
    description: d.lead,
    url: url(`/erindi/${slug}`),
    inLanguage: locale,
    about: { "@type": "MedicalCondition", name: d.title },
    publisher: { "@id": `${SITE_URL}/#organization` },
    breadcrumb: {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: locale === "en" ? "Home" : "Forsíða", item: url("/") },
        { "@type": "ListItem", position: 2, name: t.services, item: url("/thjonusta") },
        { "@type": "ListItem", position: 3, name: d.title, item: url(`/erindi/${slug}`) },
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
        meds={medsCategories}
        medsIntro={medsCategories.length ? t.medsIntro : ""}
        medsNote={meds?.meds_note ?? ""}
        locale={locale}
      />
    </>
  );
}
