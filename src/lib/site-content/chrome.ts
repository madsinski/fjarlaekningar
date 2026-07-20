// Editable content model for the site CHROME — the header (Navbar) and footer.
// Edited separately from page content so a nav label or footer line can change
// without touching a page.
//
// NOTE: the footer's list of published legal documents stays dynamic (it comes
// from /admin/legal), so it is deliberately NOT a CMS field here.

import { emptyDefaults, type LocaleContent, type SiteField } from "./types";

export const CHROME_FIELDS: SiteField[] = [
  // Header
  { key: "nav_home", label: "Valmynd — Heim", group: "Haus (valmynd)", type: "text" },
  { key: "nav_thjonusta", label: "Valmynd — Þjónusta", group: "Haus (valmynd)", type: "text" },
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
  { key: "footer_country", label: "Land", group: "Fótur", type: "text" },
  { key: "footer_email", label: "Netfang", group: "Fótur", type: "text" },

  // Footer — bottom bar
  { key: "footer_rights", label: "Réttindi (á eftir ártali)", group: "Fótur — neðst", type: "text" },
  { key: "footer_portal_note", label: "Sjúklingagátt — texti", group: "Fótur — neðst", type: "text" },
  { key: "footer_admin_link", label: "Stjórnborð — hlekkur", group: "Fótur — neðst", type: "text" },
];

export const CHROME_DEFAULTS_IS: LocaleContent = {
  nav_home: "Heim",
  nav_thjonusta: "Þjónusta",
  nav_um_okkur: "Um okkur",
  nav_hafa_samband: "Hafa samband",
  nav_cta: "Opna sjúklingagátt",

  footer_blurb:
    "Fjarlækningar ehf. leysir einföld og afmörkuð erindi í gegnum örugga sjúklingagátt Medalia. Aðgengileg og skilvirk læknisþjónusta, óháð staðsetningu.",

  footer_pages_heading: "Síður",
  footer_contact_heading: "Samband",
  footer_legal_heading: "Lögfræði",

  footer_company: "Fjarlækningar ehf.",
  footer_country: "Ísland",
  footer_email: "fjarlaekningar@fjarlaekningar.is",

  footer_rights: "Fjarlækningar ehf. Allur réttur áskilinn.",
  footer_portal_note: "Sjúklingagátt rekin af",
  footer_admin_link: "Stjórnborð",
};

export const CHROME_DEFAULTS_EN: LocaleContent = emptyDefaults(CHROME_FIELDS);
