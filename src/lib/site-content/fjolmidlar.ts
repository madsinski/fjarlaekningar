// Editable content model for press coverage — /fjolmidlar plus a compact strip
// on the front page.
//
// We LINK to the coverage, we do not republish it: copying a Vísir article onto
// this site would be someone else's copyright and duplicate content that can
// only rank worse than the original. Each entry is a headline, the outlet, a
// date and the URL.
//
// Empty by default. With no entries the route 404s, the front-page strip does
// not render and no footer link appears — so nothing changes on the site until
// the list is filled in and published.

import { emptyDefaults, type LocaleContent, type SiteField, type SiteSection } from "./types";

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
    help: "Snið: Fyrirsögn | Miðill | Dagsetning | Slóð. Dæmi: Fjarlækningar hefja samstarf við HSU | Vísir | 2026-05-14 | https://www.visir.is/g/...",
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

export const FJOLMIDLAR_DEFAULTS_IS: LocaleContent = {
  hero_eyebrow: "Fjölmiðlar",
  hero_heading: "Fjallað um ==Fjarlækningar==",
  hero_body:
    "Umfjöllun íslenskra fjölmiðla um þjónustuna og samstarfið við heilbrigðisstofnanir. Smelltu til að lesa hjá viðkomandi miðli.",
  items: "",
  front_heading: "Fjallað um okkur",
  front_link: "Sjá alla umfjöllun",
  nav_label: "Fjölmiðlar",
};

export const FJOLMIDLAR_DEFAULTS_EN: LocaleContent = emptyDefaults(FJOLMIDLAR_FIELDS);

export type PressItem = { title: string; outlet: string; date: string; url: string };

/** Parse "Fyrirsögn | Miðill | Dagsetning | Slóð" rows; bad rows are dropped. */
export function pressItems(c: LocaleContent): PressItem[] {
  return (c.items ?? "")
    .split("\n")
    .map((line) => line.split("|").map((x) => x.trim()))
    .map(([title, outlet, date, url]) => ({ title, outlet, date, url }))
    .filter((i): i is PressItem => !!i.title && !!i.url && /^https?:\/\//.test(i.url));
}
