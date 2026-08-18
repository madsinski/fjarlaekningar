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
  // What the service is
  "fjarlækningar", "læknir á netinu", "netlæknir", "læknisþjónusta á netinu",
  "fjarheilbrigðisþjónusta", "heilsugæsla á netinu", "sjúklingagátt",
  "læknisráðgjöf á netinu", "Heilbrigðisstofnun Suðurlands",
  // The erindi, in the words people type
  "kvef", "hósti", "hálsbólga", "ennisholusýking", "kinnholusýking",
  "þvagfærasýking", "blöðrubólga", "sveppasýking í leggöngum",
  "bakteríusýking í leggöngum", "getnaðarvörn", "pillan", "frjókornaofnæmi",
  "ofnæmislyf", "frunsa", "áblástur", "ristill", "risvandamál", "njálgur",
  // Errands rather than symptoms
  "endurnýjun lyfseðils", "lyfseðill á netinu", "læknisvottorð",
  "veikindavottorð", "sýklalyf",
];

/** English equivalents, for the English rendering of the site. */
export const SITE_KEYWORDS_EN = [
  "telemedicine Iceland", "online doctor Iceland", "see a doctor online",
  "remote GP Iceland", "patient portal", "digital healthcare Iceland",
  "cold cough sore throat", "sinus infection", "urinary tract infection",
  "vaginal yeast infection", "bacterial vaginosis", "contraception",
  "birth control prescription", "pollen allergy", "hay fever", "cold sore",
  "shingles", "erectile dysfunction", "pinworm",
  "prescription renewal", "repeat prescription", "medical certificate",
  "sick note",
];

export const SITE_TITLE_EN = "Fjarlækningar — see a doctor from where you are";
export const SITE_DESCRIPTION_EN =
  "Icelandic telemedicine for everyday medical problems. Send your case with electronic ID; a doctor reviews it and any prescription goes to the pharmacy portal.";


/**
 * Canonical + hreflang for a page that exists in both languages.
 *
 * hreflang needs two distinct URLs pointing at each other, in both directions —
 * which is exactly what the /en routes exist to provide. Pass the ICELANDIC
 * path ("/thjonusta", "/" for the front page) and the locale being rendered.
 *
 * `enReady` false means the English page is still mostly Icelandic text; it is
 * then dropped from the map entirely rather than advertised as an English
 * alternative, because pointing hreflang at a `noindex` page is a contradictory
 * signal. x-default stays Icelandic: that is the language of the site.
 */
export function alternatesFor(path: string, locale: "is" | "en", enReady = true) {
  const isUrl = path === "/" ? `${SITE_URL}/` : `${SITE_URL}${path}`;
  const enUrl = path === "/" ? `${SITE_URL}/en` : `${SITE_URL}/en${path}`;
  return {
    canonical: locale === "en" ? enUrl : isUrl,
    languages: {
      is: isUrl,
      ...(enReady ? { en: enUrl } : {}),
      "x-default": isUrl,
    },
  };
}

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

export function organizationJsonLd(
  services: { title: string }[],
  facts: SeoFacts,
  locale: "is" | "en" = "is",
) {
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
        inLanguage: locale,
      },
    ],
  };
}
