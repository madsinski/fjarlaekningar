// Registry of every CMS-editable surface: the marketing pages plus the site
// chrome (header + footer). The admin editor and the public pages both read
// from here, so adding a page is a one-entry change.

import {
  resolveFields,
  resolveOrder,
  type Locale,
  type LocaleContent,
  type SiteContentBlob,
  type SiteField,
  type SiteSection,
} from "./types";
import { HOME_FIELDS, HOME_SECTIONS, HOME_DEFAULTS_IS, HOME_DEFAULTS_EN } from "./home";
import { THJONUSTA_FIELDS, THJONUSTA_SECTIONS, THJONUSTA_DEFAULTS_IS, THJONUSTA_DEFAULTS_EN } from "./thjonusta";
import { UM_OKKUR_FIELDS, UM_OKKUR_SECTIONS, UM_OKKUR_DEFAULTS_IS, UM_OKKUR_DEFAULTS_EN, umOkkurSections } from "./um-okkur";
import { HAFA_SAMBAND_FIELDS, HAFA_SAMBAND_SECTIONS, HAFA_SAMBAND_DEFAULTS_IS, HAFA_SAMBAND_DEFAULTS_EN } from "./hafa-samband";
import { CHROME_FIELDS, CHROME_DEFAULTS_IS, CHROME_DEFAULTS_EN } from "./chrome";
import { ERINDI_FIELDS, ERINDI_SECTIONS, ERINDI_DEFAULTS_IS, ERINDI_DEFAULTS_EN } from "./erindi-pages";

export interface SitePage {
  key: string;
  label: string;
  desc: string;
  /** Public path, for the "open page" link in the editor. null for chrome. */
  path: string | null;
  fields: SiteField[];
  /** Reorderable bands. Empty for chrome, which has no movable sections. */
  sections: SiteSection[];
  /**
   * Optional refinement of `sections` for the content at hand — for pages whose
   * own settings can merge or drop a band (see /um-okkur's team layout switch).
   * Both the public page and the CMS order list go through this, so what you
   * can move in the editor is always what actually renders.
   */
  sectionsFor?: (c: LocaleContent) => SiteSection[];
  defaultsIs: LocaleContent;
  defaultsEn: LocaleContent;
}

export const SITE_PAGES: SitePage[] = [
  {
    key: "home",
    label: "Forsíða",
    desc: "Hetjusvæði, þjónusta, tölur, ferlið, HSU, ákall.",
    path: "/",
    fields: HOME_FIELDS,
    sections: HOME_SECTIONS,
    defaultsIs: HOME_DEFAULTS_IS,
    defaultsEn: HOME_DEFAULTS_EN,
  },
  {
    key: "thjonusta",
    label: "Þjónusta",
    desc: "Algeng erindi, hvernig þjónustan virkar, algengar spurningar.",
    path: "/thjonusta",
    fields: THJONUSTA_FIELDS,
    sections: THJONUSTA_SECTIONS,
    defaultsIs: THJONUSTA_DEFAULTS_IS,
    defaultsEn: THJONUSTA_DEFAULTS_EN,
  },
  {
    key: "um-okkur",
    label: "Um okkur",
    desc: "Stoðir, gildin, teymið.",
    path: "/um-okkur",
    fields: UM_OKKUR_FIELDS,
    sections: UM_OKKUR_SECTIONS,
    sectionsFor: umOkkurSections,
    defaultsIs: UM_OKKUR_DEFAULTS_IS,
    defaultsEn: UM_OKKUR_DEFAULTS_EN,
  },
  {
    key: "hafa-samband",
    label: "Hafa samband",
    desc: "Sjúklingagátt, almennar fyrirspurnir, neyðartilfelli.",
    path: "/hafa-samband",
    fields: HAFA_SAMBAND_FIELDS,
    sections: HAFA_SAMBAND_SECTIONS,
    defaultsIs: HAFA_SAMBAND_DEFAULTS_IS,
    defaultsEn: HAFA_SAMBAND_DEFAULTS_EN,
  },
  {
    key: "erindi",
    label: "Erindissíður",
    desc: "Ein síða á hvert erindi (/erindi/…). Falið þar til kveikt er á birtingu.",
    path: null,
    fields: ERINDI_FIELDS,
    sections: ERINDI_SECTIONS,
    defaultsIs: ERINDI_DEFAULTS_IS,
    defaultsEn: ERINDI_DEFAULTS_EN,
  },
  {
    key: "chrome",
    label: "Haus & fótur + SEO",
    desc: "Valmynd efst, fótur og leitarvélastillingar (titill, lýsing, leitarorð, deilimynd, samfélagsmiðlar) — gildir á öllum síðum.",
    path: null,
    fields: CHROME_FIELDS,
    sections: [],
    defaultsIs: CHROME_DEFAULTS_IS,
    defaultsEn: CHROME_DEFAULTS_EN,
  },
];

export function getSitePage(key: string): SitePage | undefined {
  return SITE_PAGES.find((p) => p.key === key);
}

/** Resolve a stored blob for any registered page key. */
export function resolveContent(
  key: string,
  blob: SiteContentBlob | null | undefined,
  locale: Locale,
): LocaleContent {
  const page = getSitePage(key);
  if (!page) return {};
  return resolveFields(page.fields, page.defaultsIs, page.defaultsEn, blob, locale);
}

/**
 * The sections a page renders, for the content it renders them with. Layout
 * switches (see SitePage.sectionsFor) can drop or merge a band, so this is
 * resolved from the content before the order is applied.
 */
export function sectionsOf(key: string, c: LocaleContent): SiteSection[] {
  const page = getSitePage(key);
  if (!page) return [];
  return page.sectionsFor ? page.sectionsFor(c) : page.sections;
}

/** Section ids in display order for a page, honouring any CMS reordering. */
export function resolveSections(
  key: string,
  blob: SiteContentBlob | null | undefined,
  locale: Locale = "is",
): string[] {
  const page = getSitePage(key);
  if (!page) return [];
  // Layout-affecting fields are locale-independent, but resolve in the caller's
  // locale anyway so the fallback chain is the same one the page renders with.
  const sections = page.sectionsFor
    ? page.sectionsFor(resolveFields(page.fields, page.defaultsIs, page.defaultsEn, blob, locale))
    : page.sections;
  return resolveOrder(sections, blob);
}
