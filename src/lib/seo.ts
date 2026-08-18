// Single source of truth for site-wide SEO.
//
// The structured data is what makes Google able to show the Fjarlækningar logo
// beside the result and build a knowledge panel: it needs an Organization with
// a crawlable `logo`, on an absolute URL. Every fact below is taken from the
// site's own published content (footer + service pages) — nothing is invented.

export const SITE_URL = "https://www.fjarlaekningar.is";
export const SITE_NAME = "Fjarlækningar ehf.";
export const OG_IMAGE = `${SITE_URL}/og-fjarlaekningar.png`;
export const LOGO_URL = `${SITE_URL}/fjarlaekningar-logo.png`;
export const EMAIL = "fjarlaekningar@fjarlaekningar.is";

/**
 * The description Google is most likely to show. Leads with what the service
 * IS and who it is for, then the terms people actually search for — "læknir á
 * netinu", "lyfseðill", "læknisvottorð" — in natural sentences rather than a
 * keyword list, which is all modern ranking pays attention to.
 */
export const SITE_DESCRIPTION =
  "Fjarlækningar er íslensk fjarlæknisþjónusta fyrir algeng erindi. Þú sendir erindi í gegnum örugga sjúklingagátt með rafrænum skilríkjum, læknir metur málið og leggur til meðferð — lyfseðill fer rafrænt í lyfjagátt. Engin bið á biðstofu, óháð staðsetningu.";

/** Terms the pages should rank for, kept in one place so they stay consistent. */
export const SITE_KEYWORDS = [
  "fjarlækningar",
  "læknir á netinu",
  "netlæknir",
  "læknisþjónusta á netinu",
  "fjarheilbrigðisþjónusta",
  "sjúklingagátt",
  "endurnýjun lyfseðils",
  "lyfseðill á netinu",
  "læknisvottorð",
  "þvagfærasýking",
  "hálsbólga",
  "frjókornaofnæmi",
  "heilsugæsla á netinu",
  "Heilbrigðisstofnun Suðurlands",
];

/**
 * Organization + WebSite graph. Typed as MedicalClinic as well as Organization
 * so search engines read it as a healthcare provider rather than a generic
 * company.
 */
export function organizationJsonLd(services: { title: string }[]) {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": ["Organization", "MedicalClinic"],
        "@id": `${SITE_URL}/#organization`,
        name: SITE_NAME,
        alternateName: "Fjarlækningar",
        url: SITE_URL,
        logo: {
          "@type": "ImageObject",
          "@id": `${SITE_URL}/#logo`,
          url: LOGO_URL,
          contentUrl: LOGO_URL,
          width: 1920,
          height: 660,
          caption: SITE_NAME,
        },
        image: OG_IMAGE,
        description: SITE_DESCRIPTION,
        email: EMAIL,
        address: {
          "@type": "PostalAddress",
          streetAddress: "Langholtsvegi 111",
          postalCode: "104",
          addressLocality: "Reykjavík",
          addressCountry: "IS",
        },
        areaServed: { "@type": "Country", name: "Ísland" },
        medicalSpecialty: "PrimaryCare",
        availableLanguage: ["is", "en"],
        availableService: services.map((s) => ({
          "@type": "MedicalProcedure",
          name: s.title,
        })),
      },
      {
        "@type": "WebSite",
        "@id": `${SITE_URL}/#website`,
        url: SITE_URL,
        name: SITE_NAME,
        description: SITE_DESCRIPTION,
        publisher: { "@id": `${SITE_URL}/#organization` },
        inLanguage: "is",
      },
    ],
  };
}
