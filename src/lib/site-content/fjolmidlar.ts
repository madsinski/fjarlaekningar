// Editable content model for press coverage — /fjolmidlar plus a compact strip
// on the front page.
//
// We LINK to the coverage, we do not republish it: copying a Vísir article onto
// this site would be someone else's copyright and duplicate content that can
// only rank worse than the original. Each entry is a headline, the outlet, a
// date, the URL, what kind of piece it is, and OUR OWN one-sentence summary of
// what it covers — the summary is written here, not lifted from the article.
//
// With no entries the route 404s, the front-page strip does not render and no
// footer link appears, so the page can be emptied again at any time without
// leaving a dead link behind.

import { type LocaleContent, type SiteField, type SiteSection } from "./types";

export const FJOLMIDLAR_SECTIONS: SiteSection[] = [];

export const FJOLMIDLAR_FIELDS: SiteField[] = [
  { key: "hero_eyebrow", label: "Merki (lítill borði)", group: "Hetjusvæði", type: "text" },
  { key: "hero_heading", label: "Fyrirsögn", group: "Hetjusvæði", type: "heading" },
  { key: "hero_body", label: "Undirtexti", group: "Hetjusvæði", type: "textarea" },
  {
    key: "items",
    label: "Umfjallanir — ein í hverja línu",
    group: "Umfjallanir",
    type: "textarea",
    help:
      "Snið: Fyrirsögn | Miðill | Dagsetning | Slóð | Tegund | Útdráttur. " +
      "Tegund er frett, vidtal eða skodun (má sleppa). Útdrátturinn er okkar eigin lýsing, ekki texti úr greininni. " +
      "Efsta línan birtist stærst. Lóðrétt strik má ekki nota inni í texta.",
  },
  {
    key: "front_heading",
    label: "Forsíða — fyrirsögn ræmunnar",
    group: "Forsíða",
    type: "text",
    help: "Stutt ræma með nýjustu umfjöllunum birtist á forsíðunni um leið og listinn að ofan er ekki tómur.",
  },
  { key: "front_link", label: "Forsíða — texti á hlekk", group: "Forsíða", type: "text" },
  { key: "nav_label", label: "Heiti í fæti", group: "Forsíða", type: "text" },
];

/**
 * The three pieces of coverage published so far, newest first. These are code
 * defaults rather than CMS rows so the page works on a fresh database; editing
 * the list in /admin/website overrides them.
 *
 * Summaries stay descriptive — they say what the coverage is about and, where a
 * figure comes from the announcement itself, they attribute it. No claim about
 * what the service does for anyone's health is made here.
 */
const ITEMS_IS = [
  "HSU og Fjarlækningar hefja samstarf um nýja stafræna læknisþjónustu | Heilbrigðisstofnun Suðurlands | 2026-08-13 | https://island.is/s/hsu/frett/hsu-og-fjarlaekningar-hefja-samstarf-um-nyja-stafraena-laeknisthjonustu | frett | Tilraunaverkefni HSU og Fjarlækninga í Vestmannaeyjum. Í tilkynningu HSU kemur fram að skjólstæðingar 18 ára og eldri geti sent erindi í gegnum gáttina og fengið svar frá lækni innan tveggja klukkustunda á opnunartíma, kl. 10–22.",
  "Stafræn heilbrigðisþjónusta getur dregið úr álagi heilsugæslu | Reykjavík síðdegis · Vísir | 2025-12-02 | https://www.visir.is/k/2186492e-73a1-4448-a85d-894a6b7ea6c8-1764698322723/stafraen-heilbrigdisthjonusta-getur-dregid-ur-alagi-heilsugaeslu | vidtal | Victor Guðmundsson, læknir og framkvæmdastjóri Fjarlækninga, ræðir í útvarpsþættinum Reykjavík síðdegis hvernig stafrænar lausnir geta létt á álagi heilsugæslunnar og bætt aðgengi að lækni.",
  "Heilbrigðiskerfi Íslands — landsbyggðin, lýðheilsa og lækningar | Vísir | 2025-12-02 | https://www.visir.is/g/20252811402d/heilbrigdiskerfi-islands-landsbyggdin-lydheilsa-og-laekningar | skodun | Aðsend grein Victors Guðmundssonar læknis um álagið á fáa lækna á landsbyggðinni, og hvaða hlutverk fjarlækningar og heildræn nálgun á lýðheilsu geta haft í að styðja við heilsugæsluna.",
].join("\n");

// Headlines stay in Icelandic — they are the actual titles of the articles
// being linked to, and rewriting them would misquote the outlet. Everything we
// wrote ourselves (the summaries, the hero, the labels) is translated.
const ITEMS_EN = [
  "HSU og Fjarlækningar hefja samstarf um nýja stafræna læknisþjónustu | Heilbrigðisstofnun Suðurlands | 2026-08-13 | https://island.is/s/hsu/frett/hsu-og-fjarlaekningar-hefja-samstarf-um-nyja-stafraena-laeknisthjonustu | frett | A pilot project between HSU and Fjarlækningar in Vestmannaeyjar. HSU's announcement states that patients aged 18 and over can submit a case through the portal and hear back from a doctor within two hours during opening hours, 10:00–22:00.",
  "Stafræn heilbrigðisþjónusta getur dregið úr álagi heilsugæslu | Reykjavík síðdegis · Vísir | 2025-12-02 | https://www.visir.is/k/2186492e-73a1-4448-a85d-894a6b7ea6c8-1764698322723/stafraen-heilbrigdisthjonusta-getur-dregid-ur-alagi-heilsugaeslu | vidtal | Victor Guðmundsson, physician and CEO of Fjarlækningar, on the radio programme Reykjavík síðdegis, discussing how digital services can ease the load on primary care and improve access to a doctor.",
  "Heilbrigðiskerfi Íslands — landsbyggðin, lýðheilsa og lækningar | Vísir | 2025-12-02 | https://www.visir.is/g/20252811402d/heilbrigdiskerfi-islands-landsbyggdin-lydheilsa-og-laekningar | skodun | An opinion piece by physician Victor Guðmundsson on the pressure carried by the few doctors serving rural Iceland, and the part telemedicine and a broader view of public health can play in supporting primary care.",
].join("\n");

export const FJOLMIDLAR_DEFAULTS_IS: LocaleContent = {
  hero_eyebrow: "Fjölmiðlar",
  hero_heading: "Fjallað um ==Fjarlækningar==",
  hero_body:
    "Umfjöllun íslenskra fjölmiðla og samstarfsstofnana um þjónustuna, og greinar og viðtöl frá teyminu okkar. Smelltu til að lesa eða hlusta hjá viðkomandi miðli.",
  items: ITEMS_IS,
  front_heading: "Fjallað um okkur",
  front_link: "Sjá alla umfjöllun",
  nav_label: "Fjölmiðlar",
};

export const FJOLMIDLAR_DEFAULTS_EN: LocaleContent = {
  hero_eyebrow: "Press",
  hero_heading: "==Fjarlækningar== in the media",
  hero_body:
    "Coverage of the service by Icelandic media and partner institutions, plus articles and interviews from our own team. Follow a link to read or listen at the source.",
  items: ITEMS_EN,
  front_heading: "In the media",
  front_link: "See all coverage",
  nav_label: "Press",
};

/** What kind of piece a link points at. Drives the small badge on each card. */
export type PressKind = "frett" | "vidtal" | "skodun";

const KIND_LABELS: Record<PressKind, { is: string; en: string }> = {
  frett: { is: "Frétt", en: "News" },
  vidtal: { is: "Viðtal", en: "Interview" },
  skodun: { is: "Aðsend grein", en: "Opinion" },
};

/** Badge text for a kind, or "" when the entry did not declare one. */
export function pressKindLabel(kind: string | undefined, locale: "is" | "en" = "is"): string {
  const k = KIND_LABELS[kind as PressKind];
  return k ? k[locale] : "";
}

export type PressItem = {
  title: string;
  outlet: string;
  date: string;
  url: string;
  /** "frett" | "vidtal" | "skodun", or "" when unspecified. */
  kind: string;
  /** Our own one-line description of the piece. May be empty. */
  summary: string;
};

/**
 * Parse "Fyrirsögn | Miðill | Dagsetning | Slóð | Tegund | Útdráttur" rows.
 * The last two columns are optional, so lists written before they existed keep
 * parsing unchanged. Rows without a title or a valid URL are dropped.
 */
export function pressItems(c: LocaleContent): PressItem[] {
  return (c.items ?? "")
    .split("\n")
    .map((line) => line.split("|").map((x) => x.trim()))
    .map(([title, outlet, date, url, kind, summary]) => ({
      title,
      outlet,
      date,
      url,
      kind: (kind ?? "").toLowerCase(),
      summary: summary ?? "",
    }))
    .filter((i): i is PressItem => !!i.title && !!i.url && /^https?:\/\//.test(i.url));
}
