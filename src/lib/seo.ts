// Single source of truth for site-wide SEO.
//
// The structured data is what makes Google able to show the Fjarlækningar logo
// beside the result and build a knowledge panel: it needs an Organization with
// a crawlable `logo`, on an absolute URL. Every fact below is taken from the
// site's own published content (footer + service pages) — nothing is invented.

export const SITE_URL = "https://www.fjarlaekningar.is";
export const SITE_NAME = "Fjarlækningar ehf.";
export const OG_IMAGE_PATH = "/og-fjarlaekningar.png";
export const OG_IMAGE = `${SITE_URL}${OG_IMAGE_PATH}`;
export const LOGO_URL = `${SITE_URL}/fjarlaekningar-logo.png`;
export const EMAIL = "fjarlaekningar@fjarlaekningar.is";
export const SITE_TITLE = "Fjarlækningar — læknisþjónusta þar sem þér hentar";

/** Official profiles. Fed to schema.org `sameAs`, which is how a search engine
 *  ties a social account to the organisation behind it. */
export const INSTAGRAM_URL = "https://www.instagram.com/fjarlaekningar";
export const FACEBOOK_URL = "https://www.facebook.com/fjarlaekningar";

/**
 * The description Google is most likely to show. Leads with what the service
 * IS and who it is for, then the terms people actually search for — "læknir á
 * netinu", "lyfseðill", "læknisvottorð" — in natural sentences rather than a
 * keyword list, which is all modern ranking pays attention to.
 */
export const SITE_DESCRIPTION =
  "Íslensk fjarlæknisþjónusta fyrir algeng erindi. Sendu erindi með rafrænum skilríkjum, læknir metur málið og lyfseðill fer rafrænt í lyfjagátt.";

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
export type SeoFacts = {
  title: string;
  description: string;
  ogImage: string;
  company: string;
  email: string;
  /** Footer address, "Langholtsvegi 111\n104 Reykjavík" — street on line 1. */
  address: string;
  country: string;
  /** Official profile URLs, blank entries dropped. */
  sameAs: string[];
};

/** Split the footer's two-line address into the parts schema.org expects. */
function postalAddress(address: string, country: string) {
  const [street = "", cityLine = ""] = address.split("\n").map((l) => l.trim());
  const m = cityLine.match(/^(\d{3})\s+(.*)$/);
  return {
    "@type": "PostalAddress",
    streetAddress: street,
    postalCode: m ? m[1] : undefined,
    addressLocality: m ? m[2] : cityLine || undefined,
    addressCountry: country?.toLowerCase().startsWith("ísl") ? "IS" : country || "IS",
  };
}

export function organizationJsonLd(services: { title: string }[], facts: SeoFacts) {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": ["Organization", "MedicalClinic"],
        "@id": `${SITE_URL}/#organization`,
        name: facts.company || SITE_NAME,
        alternateName: "Fjarlækningar",
        url: SITE_URL,
        logo: {
          "@type": "ImageObject",
          "@id": `${SITE_URL}/#logo`,
          url: LOGO_URL,
          contentUrl: LOGO_URL,
          width: 1920,
          height: 660,
          caption: facts.company || SITE_NAME,
        },
        image: facts.ogImage,
        description: facts.description,
        email: facts.email || EMAIL,
        address: postalAddress(facts.address, facts.country),
        areaServed: { "@type": "Country", name: "Ísland" },
        medicalSpecialty: "PrimaryCare",
        availableLanguage: ["is", "en"],
        ...(facts.sameAs.length ? { sameAs: facts.sameAs } : {}),
        availableService: services.map((s) => ({
          "@type": "MedicalProcedure",
          name: s.title,
        })),
      },
      {
        "@type": "WebSite",
        "@id": `${SITE_URL}/#website`,
        url: SITE_URL,
        name: facts.company || SITE_NAME,
        description: facts.description,
        publisher: { "@id": `${SITE_URL}/#organization` },
        inLanguage: "is",
      },
    ],
  };
}
