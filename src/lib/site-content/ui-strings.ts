// UI chrome strings for the public site — labels, affordances and fallbacks
// that live in component code rather than the CMS.
//
// Why this exists: the CMS translator can only translate CMS fields, so every
// hardcoded Icelandic literal in a component silently stays Icelandic on the
// English page (the erindi cards had the same disease). Anything user-visible
// that is not CMS content belongs in this dictionary, keyed once per locale, so
// adding a string forces the English version to exist at the same moment.

import type { Locale } from "./types";

const IS = {
    availableAt: "Fæst hjá",
    appliesTo: "Á við um",
    serviceLive: "Virk þjónusta",
    comingSoon: "Væntanlegt",
    seeRedFlags: "Sjá dæmi um alvarleg einkenni",
    wherePickup: "Hvar fæ ég heimapróf?",
    enlarge: "Stækka",
    enlargeImage: "Stækka mynd",
    clickToClose: "Smelltu hvar sem er til að loka",
    clickToEnlarge: "Smelltu til að stækka",
    newsletter: "Fréttabréf",
    seeHow: "Sjá hvernig þjónustan virkar",
    whereLive: "Hvar er þjónustan virk?",
};

export type UiStrings = { [K in keyof typeof IS]: string };

// Typed against IS's keys, so adding an Icelandic string without its English
// counterpart is a compile error rather than a silent fallback.
const EN: UiStrings = {
    availableAt: "Available at",
    appliesTo: "Applies to",
    serviceLive: "Service live",
    comingSoon: "Coming soon",
    seeRedFlags: "See examples of serious symptoms",
    wherePickup: "Where do I get the home tests?",
    enlarge: "Enlarge",
    enlargeImage: "Enlarge image",
    clickToClose: "Click anywhere to close",
    clickToEnlarge: "Click to enlarge",
    newsletter: "Newsletter",
    seeHow: "See how the service works",
    whereLive: "Where is the service available?",
};

const STRINGS: Record<Locale, UiStrings> = { is: IS, en: EN };

export function ui(locale: Locale): UiStrings {
  return STRINGS[locale];
}
