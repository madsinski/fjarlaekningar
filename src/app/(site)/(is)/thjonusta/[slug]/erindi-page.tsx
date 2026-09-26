import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { erindi, localizeErindi } from "@/erindi";
import { getPage, getPageContent } from "@/lib/site-content/server";
import {
  CONDITION_PAGES, ERINDI_WITH_MEDS, conditionPage, erindiFaq, erindiHrefSlug, erindiKey, erindiNav,
  erindiPagesLive, erindiTitle, erindiSeoTitleKey, erindiReview, splitLive,
} from "@/lib/site-content/erindi-pages";
import { erindiShown } from "@/lib/site-content/thjonusta";
import { ui } from "@/lib/site-content/ui-strings";
import type { Locale } from "@/lib/site-content/types";
import { alternatesFor, personSlug, SITE_URL } from "@/lib/seo";
import { localeHref } from "@/lib/locale";
import ErindiView, { erindiLines } from "./ErindiView";

// One implementation, two URLs: /thjonusta/<slug> and /en/thjonusta/<slug>. The
// is the same in both languages — it is the canonical name of the page.
//
// These pages are DARK by default: until `pages_live` is switched on in the CMS
// both URLs 404, so draft medical text is never public and never indexed.

export type Params = { params: Promise<{ slug: string }> };

/** Content for one erindi or condition page; null when switched off / unknown;
 *  `{ redirect }` when a split service's old URL is asked for. */
async function load(slug: string, locale: Locale) {
  const item = erindi.find((e) => e.slug === slug);
  const cond = conditionPage(slug);
  if (!item && !cond) return null;
  const { c, enReady } = await getPage("erindi", locale);
  if (!erindiPagesLive(c)) return null;
  // Condition pages exist only once the split is published.
  if (cond && !splitLive(c)) return null;
  // Hidden in the Þjónusta CMS: the page goes with the card, or the switch
  // would leave an unlinked page in the index. A condition page follows its service.
  const service = cond ? cond.parent : slug;
  if (!erindiShown(await getPageContent("thjonusta", locale), service)) return null;
  // The service's own URL, once split, points permanently at its first page.
  if (!cond && erindiHrefSlug(c, slug) !== slug) return { redirect: erindiHrefSlug(c, slug) } as const;
  const k = erindiKey(slug);
  const localized = localizeErindi(locale).find((e) => e.slug === service)!;
  const parentTitle = erindiTitle(c, service, localized.title);
  return {
    c,
    locale,
    enReady,
    slug,
    service,
    // On a condition page: the service to pick in the portal, and its sibling pages.
    portalChoice: cond ? parentTitle : "",
    siblings: cond
      ? CONDITION_PAGES.filter((p) => p.parent === service && p.slug !== slug).map((p) => ({
          slug: p.slug,
          title: erindiTitle(c, p.slug, locale === "en" ? p.titleEn : p.title),
        }))
      : [],
    title: cond ? erindiTitle(c, slug, locale === "en" ? cond.titleEn : cond.title) : parentTitle,
    lead: c[`${k}_lead`]?.trim() || (cond ? "" : localized.description),
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
  if ("redirect" in d) return {};
  // The search title is written for the result page, so it already carries the
  // brand and must not be run through the "%s — Fjarlækningar" template a
  // second time. Falling back to the heading keeps older erindi working.
  const seoTitle = d.c[erindiSeoTitleKey(slug)]?.trim();
  const shareTitle = seoTitle || `${d.title} — Fjarlækningar`;

  return {
    title: seoTitle ? { absolute: `${seoTitle} | Fjarlækningar` } : d.title,
    description: d.lead.slice(0, 160),
    alternates: alternatesFor(`/thjonusta/${slug}`, locale, d.enReady),
    ...(locale === "en" && !d.enReady ? { robots: { index: false, follow: true } } : {}),
    openGraph: {
      title: shareTitle,
      description: d.lead.slice(0, 200),
      url: `${SITE_URL}${localeHref(`/thjonusta/${slug}`, locale)}`,
      type: "article",
      // Setting openGraph at all replaces the parent's, images included — which
      // is why every erindi page was sharing with no picture at all.
      images: [{ url: `${SITE_URL}/og-fjarlaekningar.png`, width: 1200, height: 630 }],
    },
  };
}

export default async function ErindiPage({ params, locale }: Params & { locale: Locale }) {
  const { slug } = await params;
  const d = await load(slug, locale);
  if (!d) notFound();
  if ("redirect" in d) permanentRedirect(localeHref(`/thjonusta/${d.redirect}`, locale));
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
  const thj = await getPageContent("thjonusta", locale);
  // Every other erindi, not the first six. They render as wrapping pills, so
  // the full list costs a row or two and saves a visitor guessing whether the
  // problem they came for is handled at all.
  // Every visible erindi, current one included — the rail marks where you are.
  // Same resolver as the h1: a link that reads differently from the page it
  // opens is the drift this was all meant to prevent. A split service shows
  // its condition pages instead of itself.
  const nav = erindiNav(d.c, localizeErindi(locale).filter((e) => erindiShown(thj, e.slug)), locale);
  const others = nav.filter((e) => e.slug !== slug);

  const review = erindiReview(d.c, slug);
  const url = (path: string) => `${SITE_URL}${localeHref(path, locale)}`;
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "MedicalWebPage",
    name: `${d.title} — Fjarlækningar`,
    description: d.lead,
    url: url(`/thjonusta/${slug}`),
    inLanguage: locale,
    about: { "@type": "MedicalCondition", name: d.title },
    specialty: "PrimaryCare",
    audience: { "@type": "MedicalAudience", audienceType: "Patient" },
    isPartOf: { "@id": `${SITE_URL}/#website` },
    author: { "@id": `${SITE_URL}/#organization` },
    // Who checked this, and when. The single strongest signal a medical page can
    // carry: assistants and search engines both weigh clinical authorship, and
    // an anonymous health page is indistinguishable from content marketing.
    // Emitted only when both are recorded — claiming a review that did not
    // happen would be worse than carrying none.
    ...(review
      ? {
          reviewedBy: {
            "@type": "Person",
            // One stable id per doctor, so every page points at the same person.
            "@id": `${SITE_URL}/#${personSlug(review.name)}`,
            name: review.name,
            // Their card on the team page (TeamGrid gives each card this id).
            url: url(`/um-okkur#${personSlug(review.name)}`),
            ...(review.credentials ? { jobTitle: review.credentials } : {}),
            worksFor: { "@id": `${SITE_URL}/#organization` },
            knowsAbout: ["PrimaryCare", locale === "en" ? "Family medicine" : "Heimilislækningar"],
          },
          lastReviewed: review.date,
          dateModified: review.date,
        }
      : {}),
    publisher: { "@id": `${SITE_URL}/#organization` },
    breadcrumb: {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: locale === "en" ? "Home" : "Forsíða", item: url("/") },
        { "@type": "ListItem", position: 2, name: t.services, item: url("/thjonusta") },
        { "@type": "ListItem", position: 3, name: d.title, item: url(`/thjonusta/${slug}`) },
      ],
    },
  };

  // FAQPage from the same field the page renders, so they cannot disagree.
  const faq = erindiFaq(d.c[`${erindiKey(slug)}_faq`]);
  const faqLd = faq.length
    ? {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        url: url(`/thjonusta/${slug}`),
        mainEntity: faq.map(({ q, a }) => ({
          "@type": "Question",
          name: q,
          acceptedAnswer: { "@type": "Answer", text: a },
        })),
      }
    : null;

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      {faqLd && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />}
      <ErindiView
        c={d.c}
        slug={slug}
        iconSlug={d.service}
        siblings={d.siblings}
        portalChoice={d.portalChoice}
        title={d.title}
        lead={d.lead}
        about={d.about}
        selftest={d.selftest}
        advice={d.advice}
        suitable={d.suitable}
        refer={d.refer}
        others={others}
        nav={nav}
        meds={medsCategories}
        // CMS line if one is set, otherwise the built-in translation — the
        // English content has no meds defaults, so the fallback has to stay.
        medsIntro={medsCategories.length ? (meds?.meds_intro?.trim() || t.medsIntro) : ""}
        medsNote={meds?.meds_note ?? ""}
        locale={locale}
      />
    </>
  );
}
