// Registry of every CMS-editable surface: the marketing pages plus the site
// chrome (header + footer). The admin editor and the public pages both read
// from here, so adding a page is a one-entry change.

import { resolveFields, type Locale, type LocaleContent, type SiteContentBlob, type SiteField } from "./types";
import { HOME_FIELDS, HOME_DEFAULTS_IS, HOME_DEFAULTS_EN } from "./home";
import { THJONUSTA_FIELDS, THJONUSTA_DEFAULTS_IS, THJONUSTA_DEFAULTS_EN } from "./thjonusta";
import { UM_OKKUR_FIELDS, UM_OKKUR_DEFAULTS_IS, UM_OKKUR_DEFAULTS_EN } from "./um-okkur";
import { HAFA_SAMBAND_FIELDS, HAFA_SAMBAND_DEFAULTS_IS, HAFA_SAMBAND_DEFAULTS_EN } from "./hafa-samband";
import { CHROME_FIELDS, CHROME_DEFAULTS_IS, CHROME_DEFAULTS_EN } from "./chrome";

export interface SitePage {
  key: string;
  label: string;
  desc: string;
  /** Public path, for the "open page" link in the editor. null for chrome. */
  path: string | null;
  fields: SiteField[];
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
    defaultsIs: HOME_DEFAULTS_IS,
    defaultsEn: HOME_DEFAULTS_EN,
  },
  {
    key: "thjonusta",
    label: "Þjónusta",
    desc: "Algeng erindi, hvernig þjónustan virkar, algengar spurningar.",
    path: "/thjonusta",
    fields: THJONUSTA_FIELDS,
    defaultsIs: THJONUSTA_DEFAULTS_IS,
    defaultsEn: THJONUSTA_DEFAULTS_EN,
  },
  {
    key: "um-okkur",
    label: "Um okkur",
    desc: "Stoðir, gildin, teymið.",
    path: "/um-okkur",
    fields: UM_OKKUR_FIELDS,
    defaultsIs: UM_OKKUR_DEFAULTS_IS,
    defaultsEn: UM_OKKUR_DEFAULTS_EN,
  },
  {
    key: "hafa-samband",
    label: "Hafa samband",
    desc: "Sjúklingagátt, almennar fyrirspurnir, neyðartilfelli.",
    path: "/hafa-samband",
    fields: HAFA_SAMBAND_FIELDS,
    defaultsIs: HAFA_SAMBAND_DEFAULTS_IS,
    defaultsEn: HAFA_SAMBAND_DEFAULTS_EN,
  },
  {
    key: "chrome",
    label: "Haus & fótur",
    desc: "Valmynd efst og fótur — gildir á öllum síðum.",
    path: null,
    fields: CHROME_FIELDS,
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
  return resolveFields(page.fields, page.defaultsIs, blob, locale);
}
