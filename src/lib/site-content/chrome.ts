// Editable content model for the site CHROME — the header (Navbar) and footer.
//
// Search-engine settings used to live here too; they moved to their own page
// (see seo.ts) because they apply site-wide and are tuned far more often than a
// nav label. The footer's company name, address and e-mail stay here and still
// feed the structured data.
// Edited separately from page content so a nav label or footer line can change
// without touching a page.
//
// NOTE: the footer's list of published legal documents stays dynamic (it comes
// from /admin/legal), so it is deliberately NOT a CMS field here.

import { emptyDefaults, type LocaleContent, type SiteField } from "./types";

export const CHROME_FIELDS: SiteField[] = [
  // Site-wide appearance. Applies on every page via a class on <main>.
  {
    key: "show_eyebrows",
    label: "Merkipillur fyrir ofan fyrirsagnir",
    group: "Útlit (allar síður)",
    type: "choice",
    help: "Sýna eða fela litlu merkin (t.d. „Íslensk fjarheilbrigðisþjónusta“) fyrir ofan fyrirsagnir á öllum síðum vefsins.",
    options: [
      { value: "on", label: "Sýna", hint: "Merkin birtast fyrir ofan fyrirsagnir." },
      { value: "off", label: "Fela", hint: "Öll merki eru falin á öllum síðum." },
    ],
  },

  // Header
  { key: "nav_home", label: "Valmynd — Heim", group: "Haus (valmynd)", type: "text" },
  { key: "nav_thjonusta", label: "Valmynd — Þjónusta", group: "Haus (valmynd)", type: "text" },
  { key: "nav_faq", label: "Valmynd — Algengar spurningar", group: "Haus (valmynd)", type: "text", help: "Hlekkur á algengar spurningar (/thjonusta#faq)." },
  { key: "nav_um_okkur", label: "Valmynd — Um okkur", group: "Haus (valmynd)", type: "text" },
  { key: "nav_hafa_samband", label: "Valmynd — Hafa samband", group: "Haus (valmynd)", type: "text" },
  { key: "nav_cta", label: "Hnappur í haus", group: "Haus (valmynd)", type: "text" },

  // Footer — blurb
  { key: "footer_blurb", label: "Kynningartexti", group: "Fótur", type: "textarea" },

  // Footer — columns
  { key: "footer_pages_heading", label: "Fyrirsögn — Síður", group: "Fótur", type: "text" },
  { key: "footer_contact_heading", label: "Fyrirsögn — Samband", group: "Fótur", type: "text" },
  { key: "footer_legal_heading", label: "Fyrirsögn — Lögfræði", group: "Fótur", type: "text" },

  // Footer — contact lines
  { key: "footer_company", label: "Fyrirtæki", group: "Fótur", type: "text" },
  { key: "footer_address", label: "Heimilisfang", group: "Fótur", type: "textarea" },
  { key: "footer_country", label: "Land", group: "Fótur", type: "text" },
  { key: "footer_email", label: "Netfang", group: "Fótur", type: "text" },

  // Footer — bottom bar
  { key: "footer_rights", label: "Réttindi (á eftir ártali)", group: "Fótur — neðst", type: "text" },
  { key: "footer_admin_link", label: "Stjórnborð — hlekkur", group: "Fótur — neðst", type: "text" },
];

export const CHROME_DEFAULTS_IS: LocaleContent = {
  show_eyebrows: "on",

  nav_home: "Heim",
  nav_thjonusta: "Þjónusta",
  nav_faq: "Algengar spurningar",
  nav_um_okkur: "Um okkur",
  nav_hafa_samband: "Hafa samband",
  nav_cta: "Opna sjúklingagátt",

  footer_blurb:
    "Fjarlækningar ehf. leysir einföld og afmörkuð erindi í gegnum örugga sjúklingagátt. Aðgengileg og skilvirk læknisþjónusta, óháð staðsetningu.",

  footer_pages_heading: "Síður",
  footer_contact_heading: "Samband",
  footer_legal_heading: "Lögfræði",

  footer_company: "Fjarlækningar ehf.",
  footer_address: "Langholtsvegi 111\n104 Reykjavík",
  footer_country: "Ísland",
  footer_email: "fjarlaekningar@fjarlaekningar.is",

  footer_rights: "Fjarlækningar ehf. Allur réttur áskilinn.",
  footer_admin_link: "Stjórnborð",
};

// English is empty everywhere except the search fields: a page that falls back
// to Icelandic titles and descriptions describes itself in the wrong language
// to anyone sharing or searching in English.
export const CHROME_DEFAULTS_EN: LocaleContent = {
  ...emptyDefaults(CHROME_FIELDS),
};
