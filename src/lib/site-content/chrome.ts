// Editable content model for the site CHROME — the header (Navbar) and footer.
// Edited separately from page content so a nav label or footer line can change
// without touching a page.
//
// NOTE: the footer's list of published legal documents stays dynamic (it comes
// from /admin/legal), so it is deliberately NOT a CMS field here.

import { emptyDefaults, type LocaleContent, type SiteField } from "./types";
import { SITE_DESCRIPTION, SITE_KEYWORDS, OG_IMAGE_PATH, SITE_TITLE } from "@/lib/seo";

export const CHROME_FIELDS: SiteField[] = [
  // What search engines and link previews show. The structured data that puts
  // the logo in Google results also reads the footer fields below (company
  // name, address, e-mail), so those stay in one place.
  {
    key: "seo_title",
    label: "Titill í leitarniðurstöðum",
    group: "Leitarvélar (SEO)",
    type: "text",
    help: "Birtist sem bláa fyrirsögnin í Google og í flipanum. Haltu þig við ~60 stafi.",
  },
  {
    key: "seo_description",
    label: "Lýsing í leitarniðurstöðum",
    group: "Leitarvélar (SEO)",
    type: "textarea",
    help: "Gráa textabrotið undir titlinum í Google. Um 150–160 stafir; segðu hvað þjónustan er og fyrir hvern.",
  },
  {
    key: "seo_keywords",
    label: "Leitarorð (aðskilin með kommu)",
    group: "Leitarvélar (SEO)",
    type: "textarea",
    help: "Orðin sem fólk slær inn. Google raðar ekki eftir þessum lista beint — notaðu sömu orð í lýsingunni og á síðunum sjálfum.",
  },
  {
    key: "seo_og_image",
    label: "Deilimynd (slóð)",
    group: "Leitarvélar (SEO)",
    type: "text",
    help: "Myndin sem birtist þegar hlekk er deilt á Facebook, Messenger eða í SMS. 1200×630 px.",
  },
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
  seo_title: SITE_TITLE,
  seo_description: SITE_DESCRIPTION,
  seo_keywords: SITE_KEYWORDS.join(", "),
  seo_og_image: OG_IMAGE_PATH,
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

export const CHROME_DEFAULTS_EN: LocaleContent = emptyDefaults(CHROME_FIELDS);
