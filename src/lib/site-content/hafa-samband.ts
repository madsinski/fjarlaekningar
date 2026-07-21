// Editable content model for /hafa-samband.
// Defaults are verbatim from the original hard-coded page.

import { emptyDefaults, type LocaleContent, type SiteField } from "./types";

export const HAFA_SAMBAND_FIELDS: SiteField[] = [
  // Hero
  { key: "hero_eyebrow", label: "Merki (lítill borði)", group: "Hetjusvæði", type: "text" },
  { key: "hero_heading", label: "Fyrirsögn", group: "Hetjusvæði", type: "heading" },
  { key: "hero_body", label: "Undirtexti", group: "Hetjusvæði", type: "textarea" },
  { key: "hero_chip1", label: "Staðreynd 1", group: "Hetjusvæði", type: "text" },
  { key: "hero_chip2", label: "Staðreynd 2", group: "Hetjusvæði", type: "text" },
  { key: "hero_chip3", label: "Staðreynd 3", group: "Hetjusvæði", type: "text" },
  { key: "hero_cta", label: "Hnappur", group: "Hetjusvæði", type: "text" },

  // Card 1 — portal
  { key: "card1_heading", label: "Titill", group: "Senda inn erindi", type: "text" },
  { key: "card1_body", label: "Texti", group: "Senda inn erindi", type: "textarea" },
  { key: "card1_button", label: "Hnappur", group: "Senda inn erindi", type: "text" },
  { key: "card1_icon", label: "Tákn", group: "Senda inn erindi", type: "icon" },

  // Card 2 — general enquiries
  { key: "card2_heading", label: "Titill", group: "Almennar fyrirspurnir", type: "text" },
  { key: "card2_body", label: "Texti", group: "Almennar fyrirspurnir", type: "textarea" },
  { key: "card2_email", label: "Netfang", group: "Almennar fyrirspurnir", type: "text" },
  { key: "card2_icon", label: "Tákn", group: "Almennar fyrirspurnir", type: "icon" },

  // Emergency note
  { key: "emergency_label", label: "Feitletruð fyrirsögn", group: "Neyðartilfelli", type: "text" },
  { key: "emergency_body", label: "Texti", group: "Neyðartilfelli", type: "textarea" },
];

export const HAFA_SAMBAND_DEFAULTS_IS: LocaleContent = {
  hero_eyebrow: "Hafa samband",
  hero_heading: "Hafðu samband við ==Fjarlækningar==",
  hero_body:
    "Fyrir læknisþjónustu skaltu opna sjúklingagáttina og velja erindi. Fyrir almennar fyrirspurnir, notaðu upplýsingarnar hér að neðan.",
  hero_chip1: "Svar innan 2 klst.",
  hero_chip2: "Opið alla daga 10–22",
  hero_chip3: "",
  hero_cta: "",

  card1_heading: "Senda inn erindi",
  card1_body:
    "Öll erindi og læknisfræðileg samskipti fara fram í gegnum sjúklingagátt Medalia. Læknir svarar innan tveggja klukkustunda á opnunartíma. Opið alla daga milli 10 og 22 — beiðnum sem berast eftir kl. 22 er svarað daginn eftir.",
  card1_button: "Opna sjúklingagátt",
  card1_icon: "shield-check",

  card2_heading: "Almennar fyrirspurnir",
  card2_body: "Fyrir fyrirspurnir sem ekki tengjast læknisfræðilegum málefnum.",
  card2_email: "fjarlaekningar@fjarlaekningar.is",
  card2_icon: "mail",

  emergency_label: "Neyðartilfelli:",
  emergency_body:
    "Í bráðatilvikum hringdu í 112 eða leitaðu strax á bráðamóttöku. Fjarlækningar eru ekki ætlaðar fyrir bráðaþjónustu.",
};

export const HAFA_SAMBAND_DEFAULTS_EN: LocaleContent = emptyDefaults(HAFA_SAMBAND_FIELDS);
