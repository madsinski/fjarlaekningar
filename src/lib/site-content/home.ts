// Editable content model for the public Home page (src/app/(site)/page.tsx).
//
// The page is rendered from these fields: HOME_DEFAULTS_IS holds the current
// Icelandic copy verbatim (so an empty CMS reproduces the page exactly), and
// the CMS stores per-locale overrides. resolveHome() flattens a stored
// { is:{}, en:{} } blob for one locale, falling back to the Icelandic default.

import {
  resolveFields,
  type Locale,
  type LocaleContent,
  type SiteContentBlob,
  type SiteField,
} from "./types";

// Re-exported so existing importers (HomeView, the editor) keep working.
export type { FieldType, Locale, LocaleContent, SiteContentBlob, SiteField } from "./types";
export type HomeField = SiteField;

// ── Field list (order = editor order) ───────────────────────────────────────
export const HOME_FIELDS: SiteField[] = [
  // Hero
  { key: "hero_eyebrow", label: "Merki (eyebrow)", group: "Hetjusvæði", type: "text" },
  { key: "hero_heading", label: "Fyrirsögn", group: "Hetjusvæði", type: "heading" },
  { key: "hero_heading_highlight", label: "Fyrirsögn — lituð orð", group: "Hetjusvæði", type: "text" },
  { key: "hero_subheading", label: "Undirtexti", group: "Hetjusvæði", type: "textarea" },
  { key: "hero_chip1", label: "Merkimiði 1", group: "Hetjusvæði", type: "text" },
  { key: "hero_chip2", label: "Merkimiði 2", group: "Hetjusvæði", type: "text" },
  { key: "hero_chip3", label: "Merkimiði 3", group: "Hetjusvæði", type: "text" },
  { key: "hero_cta_primary", label: "Aðalhnappur", group: "Hetjusvæði", type: "text" },
  { key: "hero_cta_secondary", label: "Aukahnappur", group: "Hetjusvæði", type: "text" },

  // Services
  { key: "services_heading", label: "Fyrirsögn", group: "Þjónusta", type: "heading" },
  { key: "services_body", label: "Texti", group: "Þjónusta", type: "textarea" },
  { key: "services_footer_pre", label: "Neðanmálstexti", group: "Þjónusta", type: "text" },
  { key: "services_footer_link", label: "Neðanmáls — tengill", group: "Þjónusta", type: "text" },

  // Stats
  { key: "stats_heading", label: "Fyrirsögn", group: "Tölur", type: "heading" },
  { key: "stats_body", label: "Texti", group: "Tölur", type: "textarea" },
  { key: "stat1_value", label: "Tala 1 — gildi", group: "Tölur", type: "text" },
  { key: "stat1_label", label: "Tala 1 — skýring", group: "Tölur", type: "textarea" },
  { key: "stat2_value", label: "Tala 2 — gildi", group: "Tölur", type: "text" },
  { key: "stat2_label", label: "Tala 2 — skýring", group: "Tölur", type: "textarea" },
  { key: "stat3_value", label: "Tala 3 — gildi", group: "Tölur", type: "text" },
  { key: "stat3_label", label: "Tala 3 — skýring", group: "Tölur", type: "textarea" },
  { key: "stats_footer", label: "Neðanmálstexti", group: "Tölur", type: "text" },

  // How it works
  { key: "how_heading", label: "Fyrirsögn", group: "Ferlið", type: "heading" },
  { key: "how_body", label: "Texti", group: "Ferlið", type: "textarea" },
  { key: "step1_title", label: "Skref 1 — titill", group: "Ferlið", type: "text" },
  { key: "step1_desc", label: "Skref 1 — lýsing", group: "Ferlið", type: "textarea" },
  { key: "step2_title", label: "Skref 2 — titill", group: "Ferlið", type: "text" },
  { key: "step2_desc", label: "Skref 2 — lýsing", group: "Ferlið", type: "textarea" },
  { key: "step3_title", label: "Skref 3 — titill", group: "Ferlið", type: "text" },
  { key: "step3_desc", label: "Skref 3 — lýsing", group: "Ferlið", type: "textarea" },
  { key: "step4_title", label: "Skref 4 — titill", group: "Ferlið", type: "text" },
  { key: "step4_desc", label: "Skref 4 — lýsing", group: "Ferlið", type: "textarea" },
  { key: "step5_title", label: "Skref 5 — titill", group: "Ferlið", type: "text" },
  { key: "step5_desc", label: "Skref 5 — lýsing", group: "Ferlið", type: "textarea" },

  // HSU
  { key: "hsu_eyebrow", label: "Merki (eyebrow)", group: "HSU samstarf", type: "text" },
  { key: "hsu_heading", label: "Fyrirsögn", group: "HSU samstarf", type: "heading" },
  { key: "hsu_body1", label: "Texti", group: "HSU samstarf", type: "textarea" },
  { key: "hsu_body2", label: "Áhersla (feitletrað)", group: "HSU samstarf", type: "textarea" },

  // Fréttabréf (newsletter opt-in)
  { key: "news_heading", label: "Fyrirsögn", group: "Fréttabréf", type: "heading" },
  { key: "news_body", label: "Texti", group: "Fréttabréf", type: "textarea" },
  { key: "news_cta", label: "Hnappur", group: "Fréttabréf", type: "text" },
  { key: "news_success", label: "Staðfesting eftir skráningu", group: "Fréttabréf", type: "text" },
  { key: "news_consent", label: "Samþykkistexti (GDPR)", group: "Fréttabréf", type: "textarea" },

  // CTA
  { key: "cta_heading", label: "Fyrirsögn", group: "Ákall (CTA)", type: "heading" },
  { key: "cta_body", label: "Texti", group: "Ákall (CTA)", type: "textarea" },
  { key: "cta_button", label: "Hnappur", group: "Ákall (CTA)", type: "text" },
  { key: "cta_footer", label: "Neðanmálstexti", group: "Ákall (CTA)", type: "textarea" },
];

// ── Icelandic defaults (verbatim from the current page) ─────────────────────
export const HOME_DEFAULTS_IS: LocaleContent = {
  hero_eyebrow: "Íslensk fjarlækningaþjónusta",
  hero_heading: "Aðgengileg og skilvirk",
  hero_heading_highlight: "læknisþjónusta",
  hero_subheading:
    "Fjarlækningar er íslensk fjarlækningaþjónusta fyrir einföld og afmörkuð erindi. Sama þjónusta og á læknastofu — sömu spurningar og sömu vandamál — en skilvirkari leið til að leysa þau og styttri biðlistar. Þú svarar spurningalista heima og læknir svarar innan tveggja klukkustunda.",
  hero_chip1: "Svar innan 2 klst.",
  hero_chip2: "Opið alla daga 10–22",
  hero_chip3: "Óháð staðsetningu",
  hero_cta_primary: "Opna sjúklingagátt",
  hero_cta_secondary: "Sjá þjónustu",

  services_heading: "Algeng erindi leyst innan tveggja klukkustunda",
  services_body:
    "Spurningalistar sérhannaðir í samstarfi við íslenska sérfræðilækna, með innbyggðum öryggisspurningum. Ferlið er hannað eins og viðtal við lækni.",
  services_footer_pre: "Listinn lengist jafnt og þétt eftir því sem þjónustan þróast — sjá",
  services_footer_link: "alla þjónustu",

  stats_heading: "Aukið aðgengi fyrir sjúklinga, hagræðing fyrir kerfið",
  stats_body:
    "Þú sækir þjónustuna hvar sem þú ert stödd eða staddur. Markmiðið er að stytta biðlista heilsugæslunnar með því að leysa algengustu erindin í gegnum Fjarlækningar.",
  stat1_value: "2 klst.",
  stat1_label: "Flest erindi afgreidd innan tveggja klukkustunda á opnunartíma.",
  stat2_value: "0 km",
  stat2_label:
    "Engin óþarfa ferðalög — þú sækir þjónustuna þangað sem þú ert. Markmiðið er aðgengi um land allt.",
  stat3_value: "10–22",
  stat3_label: "Opið alla daga. Beiðnum sem berast eftir kl. 22 er svarað daginn eftir.",
  stats_footer: "Alvarleg einkenni fá strax leiðbeiningar um rétt úrræði.",

  how_heading: "Ferlið frá upphafi til enda",
  how_body:
    "Þú svarar spurningalista heima eða þar sem þú ert stödd eða staddur — læknir svarar erindum innan tveggja klukkustunda á opnunartíma.",
  step1_title: "Þú velur erindi af vandamálalista",
  step1_desc: "Skráðu þig inn með rafrænum skilríkjum og farðu í viðeigandi ferli eftir einkennum.",
  step2_title: "Svarar spurningalista",
  step2_desc: "Markvissar spurningar um einkenni — ásamt sjálfsprófi heima þegar það á við.",
  step3_title: "Öryggisnetið metur svörin",
  step3_desc: "Ef svör benda til alvarlegra veikinda færð þú strax leiðbeiningar um rétt úrræði.",
  step4_title: "Læknir metur og leggur til meðferð",
  step4_desc: "Læknir fer yfir svörin og leggur til viðeigandi meðferð út frá sínu læknisfræðilega mati.",
  step5_title: "Niðurstaða, ráðleggingar og lyfseðill",
  step5_desc:
    "Þú færð skriflega niðurstöðu og ráðleggingar — og lyfseðill fer rafrænt í lyfjagátt ef þörf er á.",

  hsu_eyebrow: "Tilraunaverkefni til eins árs",
  hsu_heading: "Í samstarfi við Heilbrigðisstofnun Suðurlands",
  hsu_body1:
    "Heilbrigðisstofnun Suðurlands (HSU) er fyrsti samstarfsaðili Fjarlækninga meðal opinberra heilbrigðisstofnana. Saman keyrum við tilraunaverkefni til eins árs þar sem einföld erindi eru leyst í gegnum sjúklingagáttina — svo heilsugæslan geti einbeitt sér að flóknari málum.",
  hsu_body2: "Þjónustan er nú aðeins í boði fyrir skjólstæðinga sem eru skráðir hjá HSU.",

  news_heading: "Fylgstu með því sem er að ==gerast==",
  news_body:
    "Fáðu fréttir af Fjarlækningum, nýju samstarfi við heilsugæslur um land allt og nýrri þjónustu þegar hún bætist við. Engin læknisfræðileg ráðgjöf — bara fréttir, sjaldan og stutt.",
  news_cta: "Skrá mig",
  news_success: "Takk! Þú ert komin(n) á listann.",
  news_consent:
    "Með því að skrá þig samþykkir þú að fá tölvupóst frá Fjarlækningum ehf. um fréttir, nýtt samstarf og nýja þjónustu. Þú getur afskráð þig hvenær sem er með einum smelli.",

  cta_heading: "Tilbúin(n) að senda inn erindi?",
  cta_body:
    "Skráðu þig inn í sjúklingagáttina og veldu erindi. Einfalt, öruggt og flest erindi afgreidd innan tveggja klukkustunda á opnunartíma.",
  cta_button: "Opna sjúklingagátt",
  cta_footer:
    "Meðan á tilraunaverkefninu stendur er þjónustan aðeins í boði fyrir skjólstæðinga sem eru skráðir hjá HSU.",
};

// English starts empty — Mads translates (or uses the Þýða button).
export const HOME_DEFAULTS_EN: LocaleContent = Object.fromEntries(
  HOME_FIELDS.map((f) => [f.key, ""]),
);

/**
 * Flatten a stored { is, en } blob for one locale (locale → Icelandic → default).
 */
export function resolveHome(
  content: SiteContentBlob | null | undefined,
  locale: Locale,
): LocaleContent {
  return resolveFields(HOME_FIELDS, HOME_DEFAULTS_IS, content, locale);
}
