// Editable content model for the per-erindi landing pages (/erindi/<slug>).
//
// One page per medical problem, so the site can answer the searches people
// actually make ("þvagfærasýking læknir", "endurnýja lyfseðil") instead of
// putting all ten on /thjonusta.
//
// NOT LIVE BY DEFAULT. `pages_live` starts at "off": until it is switched on
// and published, /erindi/<slug> returns 404, the cards on /thjonusta stay
// plain (not links) and the pages are kept out of the sitemap. That way the
// draft medical text is never public and never indexed.
//
// The intro of each page defaults to the erindi's own approved scope text; the
// two lists are deliberately EMPTY, because what a doctor will and will not
// treat remotely is a clinical statement and must be written or approved by a
// Fjarlækningar doctor rather than drafted here.

import { erindi } from "@/erindi";
import { emptyDefaults, type LocaleContent, type SiteField, type SiteSection } from "./types";

export const erindiKey = (slug: string) => slug.replace(/-/g, "_");

export const ERINDI_SECTIONS: SiteSection[] = [];

/** Extra detail already published in the /thjonusta FAQ, reused verbatim. */
const PUBLISHED_DETAIL: Record<string, string> = {
  "kvef-hosti-halsbolga": "Einfaldar öndunarfærasýkingar, hálsbólga, ennis- og kinnholusýkingar",
  "thvagfaera-leggangasykingar":
    "Þvagfærasýkingar kvenna, sveppasýkingar í leggöngum og bakteríusýkingar í leggöngum",
  njalgur: "Lausn fyrir alla fjölskyldumeðlimi",
  laeknisvottord:
    "Veikindavottorð til vinnuveitanda og skóla, tengt vandamáli sem hefur verið afgreitt í gegnum fjarlækningaþjónustuna",
};

export const ERINDI_FIELDS: SiteField[] = [
  {
    key: "pages_live",
    label: "Birta erindissíður",
    group: "Birting",
    type: "choice",
    help: "Þar til kveikt er á þessu skila /erindi/… síður 404, kortin á /thjonusta eru ekki tenglar og síðurnar eru ekki í sitemap. Kveiktu fyrst þegar texti hvers erindis hefur verið yfirfarinn af lækni.",
    options: [
      { value: "off", label: "Falið (drög)", hint: "Enginn kemst á síðurnar." },
      { value: "on", label: "Birt", hint: "Síðurnar fara í loftið og í sitemap." },
    ],
  },

  // Shared furniture, same on every erindi page.
  { key: "eyebrow", label: "Merki fyrir ofan fyrirsögn", group: "Sameiginlegt", type: "text" },
  { key: "suitable_heading", label: "Fyrirsögn — hvað er hægt að leysa", group: "Sameiginlegt", type: "text" },
  { key: "process_heading", label: "Fyrirsögn — ferlið", group: "Sameiginlegt", type: "text" },
  { key: "refer_heading", label: "Fyrirsögn — hvenær á ekki við", group: "Sameiginlegt", type: "text" },
  { key: "refer_body", label: "Texti — hvenær á ekki við", group: "Sameiginlegt", type: "textarea" },
  { key: "cta_heading", label: "Ákall — fyrirsögn", group: "Sameiginlegt", type: "heading" },
  { key: "cta_body", label: "Ákall — texti", group: "Sameiginlegt", type: "textarea" },
  { key: "cta_label", label: "Ákall — hnappur", group: "Sameiginlegt", type: "text" },
  { key: "related_heading", label: "Fyrirsögn — önnur erindi", group: "Sameiginlegt", type: "text" },

  // Per erindi.
  ...erindi.flatMap((e): SiteField[] => [
    {
      key: `${erindiKey(e.slug)}_lead`,
      label: `${e.title} — inngangur`,
      group: e.title,
      type: "textarea",
      help: "Fyrsta málsgreinin á síðunni og lýsingin sem Google sýnir. 2–3 setningar.",
    },
    {
      key: `${erindiKey(e.slug)}_suitable`,
      label: `${e.title} — hvað er hægt að leysa (ein lína í hverja línu)`,
      group: e.title,
      type: "textarea",
      help: "ÞARF YFIRFERÐ LÆKNIS. Ein setning í hverja línu.",
    },
    {
      key: `${erindiKey(e.slug)}_refer`,
      label: `${e.title} — hvenær er vísað áfram (ein lína í hverja línu)`,
      group: e.title,
      type: "textarea",
      help: "ÞARF YFIRFERÐ LÆKNIS. Skildu eftir autt til að nota almenna textann að ofan.",
    },
  ]),
];

export const ERINDI_DEFAULTS_IS: LocaleContent = {
  pages_live: "off",
  eyebrow: "Algeng erindi",
  suitable_heading: "Hvað er hægt að leysa?",
  process_heading: "Svona virkar það",
  refer_heading: "Hvenær á þjónustan ekki við?",
  // Verbatim from the published /thjonusta "Hvenær hentar ekki" band.
  refer_body:
    "Fjarlækningar leysa einföld og afmörkuð erindi. Sum erindi þarfnast skoðunar, rannsóknar eða bráðaþjónustu — og þeim er vísað í annan farveg. Í bráðatilfellum hringdu í 112.",
  cta_heading: "Sendu inn erindi",
  cta_body:
    "Þú skráir þig inn með rafrænum skilríkjum og svarar stuttum spurningalista. Læknir metur málið og leggur til meðferð.",
  cta_label: "Opna sjúklingagátt",
  related_heading: "Önnur erindi",
  ...Object.fromEntries(
    erindi.flatMap((e) => [
      [`${erindiKey(e.slug)}_lead`, e.description],
      [`${erindiKey(e.slug)}_suitable`, PUBLISHED_DETAIL[e.slug] ?? ""],
      [`${erindiKey(e.slug)}_refer`, ""],
    ]),
  ),
};

export const ERINDI_DEFAULTS_EN: LocaleContent = {
  ...emptyDefaults(ERINDI_FIELDS),
  ...Object.fromEntries(erindi.map((e) => [`${erindiKey(e.slug)}_lead`, e.descriptionEn])),
};

/** Are the pages switched on? Anything but "on" keeps them dark. */
export const erindiPagesLive = (c: LocaleContent) => c.pages_live === "on";
