// Editable content model for SEARCH ENGINES — what Google shows, and what a
// link preview shows when the site is shared.
//
// These fields used to sit in a group at the top of the chrome page, behind the
// nav labels and the footer address. They apply to every page on the site and
// are the ones most likely to be tuned repeatedly, so they get their own entry
// in /admin/website with a live search-result preview beside them.
//
// The structured data that puts the logo in a Google result still reads the
// FOOTER fields (company name, address, e-mail) from the chrome page — an
// address belongs in one place, and that place is the footer that displays it.

import { type LocaleContent, type SiteField } from "./types";
import {
  SITE_DESCRIPTION,
  SITE_DESCRIPTION_EN,
  SITE_KEYWORDS,
  SITE_KEYWORDS_EN,
  SITE_TITLE,
  SITE_TITLE_EN,
  OG_IMAGE_PATH,
  INSTAGRAM_URL,
  FACEBOOK_URL,
} from "@/lib/seo";

/** Google truncates around these; the editor warns past them. */
export const SEO_LIMITS = { title: 60, description: 160 } as const;

export const SEO_FIELDS: SiteField[] = [
  {
    key: "seo_title",
    label: "Titill í leitarniðurstöðum",
    group: "Leitarniðurstaða",
    type: "text",
    help: "Birtist sem bláa fyrirsögnin í Google og í flipanum. Haltu þig við ~60 stafi.",
  },
  {
    key: "seo_description",
    label: "Lýsing í leitarniðurstöðum",
    group: "Leitarniðurstaða",
    type: "textarea",
    help: "Gráa textabrotið undir titlinum í Google. Um 150–160 stafir; segðu hvað þjónustan er og fyrir hvern.",
  },
  {
    key: "seo_keywords",
    label: "Leitarorð (aðskilin með kommu)",
    group: "Leitarniðurstaða",
    type: "textarea",
    help: "Orðin sem fólk slær inn. Google raðar ekki eftir þessum lista beint — notaðu sömu orð í lýsingunni og á síðunum sjálfum.",
  },
  {
    key: "seo_og_image",
    label: "Deilimynd (slóð)",
    group: "Deiling á samfélagsmiðlum",
    type: "text",
    help: "Myndin sem birtist þegar hlekk er deilt á Facebook, Messenger eða í SMS. 1200×630 px.",
  },
  {
    key: "social_instagram",
    label: "Instagram (slóð)",
    group: "Samfélagsmiðlar fyrirtækisins",
    type: "text",
    help: "Tengir reikninginn við fyrirtækið í leitarniðurstöðum (schema.org sameAs). Skildu eftir autt til að sleppa.",
  },
  {
    key: "social_facebook",
    label: "Facebook (slóð)",
    group: "Samfélagsmiðlar fyrirtækisins",
    type: "text",
    help: "Sama og að ofan — hjálpar Google að tengja síðuna við vörumerkið.",
  },
];

export const SEO_DEFAULTS_IS: LocaleContent = {
  seo_title: SITE_TITLE,
  seo_description: SITE_DESCRIPTION,
  seo_keywords: SITE_KEYWORDS.join(", "),
  seo_og_image: OG_IMAGE_PATH,
  social_instagram: INSTAGRAM_URL,
  social_facebook: FACEBOOK_URL,
};

export const SEO_DEFAULTS_EN: LocaleContent = {
  seo_title: SITE_TITLE_EN,
  seo_description: SITE_DESCRIPTION_EN,
  seo_keywords: SITE_KEYWORDS_EN.join(", "),
  seo_og_image: OG_IMAGE_PATH,
  social_instagram: INSTAGRAM_URL,
  social_facebook: FACEBOOK_URL,
};
