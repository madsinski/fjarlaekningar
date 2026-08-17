// Shared list of the medical problems ("erindi") Fjarlækningar handles.
// Order, labels and icons mirror the canonical presentation collateral
// (/admin/presentations/collateral) — icons live in /public/erindi-icons/.
//
// The strings below are the DEFAULTS. On /thjonusta each card's subtext is
// CMS-editable (group "Algeng erindi") and overrides `description` here; the
// titles stay code, because the home page and /admin/clinical render the same
// list and would drift apart otherwise.
//
// The EN strings are faithful translations of the approved Icelandic scope
// copy, not new claims; they carry the same referral caveats and should be
// reviewed with the rest of the English content.
export type Erindi = {
  slug: string;
  title: string;
  description: string;
  titleEn: string;
  descriptionEn: string;
};

/**
 * CMS key holding an erindi card's subtext on /thjonusta. Derived from the
 * slug, so adding an erindi gives it an editable field with no further wiring.
 */
export const erindiDescKey = (slug: string): string => `erindi_${slug.replace(/-/g, "_")}_desc`;

/** The list with the requested locale's strings in `title`/`description`. */
export function localizeErindi(locale: "is" | "en"): { slug: string; title: string; description: string }[] {
  return erindi.map((e) =>
    locale === "en"
      ? { slug: e.slug, title: e.titleEn, description: e.descriptionEn }
      : { slug: e.slug, title: e.title, description: e.description },
  );
}

export const erindi: Erindi[] = [
  {
    slug: "kvef-hosti-halsbolga",
    title: "Kvef, hósti og hálsbólga",
    description:
      "CRP heimapróf notað í upplýsingasöfnun ef þarf. Alvarlegum einkennum vísað í annan farveg.",
    titleEn: "Cold, cough and sore throat",
    descriptionEn: "CRP home test used to gather information if needed. Serious symptoms are referred onwards.",
  },
  {
    slug: "thvagfaera-leggangasykingar",
    title: "Þvagfæra- og leggangasýkingar",
    description:
      "Þvag-stix heimapróf notað í upplýsingasöfnun. Sveppa- og bakteríusýkingar í leggöngum greindar og meðhöndlaðar. Alvarlegum einkennum vísað í annan farveg.",
    titleEn: "Urinary tract and vaginal infections",
    descriptionEn: "Urine dipstick home test used to gather information. Yeast and bacterial vaginal infections diagnosed and treated. Serious symptoms are referred onwards.",
  },
  {
    slug: "getnadarvorn",
    title: "Getnaðarvörn",
    description:
      "Fyrsta ávísun, endurnýjun eða breyting á getnaðarvörn.",
    titleEn: "Contraception",
    descriptionEn: "First prescription, renewal or change of contraception.",
  },
  {
    slug: "frjokornaofnaemi",
    title: "Frjókornaofnæmi",
    description: "Meðferð við árstíðabundnu ofnæmi.",
    titleEn: "Pollen allergy",
    descriptionEn: "Treatment of seasonal allergy.",
  },
  {
    slug: "frunsa",
    title: "Frunsa",
    description:
      "Meðferð við endurtekna frunsu. Frumgreiningu vísað í annan farveg.",
    titleEn: "Cold sore",
    descriptionEn: "Treatment of recurring cold sores. First-time diagnosis is referred onwards.",
  },
  {
    slug: "ristill",
    title: "Ristill á húð",
    description:
      "Meðferð við endurteknum ristli. Frumgreiningu vísað í annan farveg.",
    titleEn: "Shingles",
    descriptionEn: "Treatment of recurring shingles. First-time diagnosis is referred onwards.",
  },
  {
    slug: "risvandamal",
    title: "Risvandamál",
    description: "Mat og meðferð.",
    titleEn: "Erectile problems",
    descriptionEn: "Assessment and treatment.",
  },
  {
    slug: "njalgur",
    title: "Njálgur",
    description: "Greining og meðferð.",
    titleEn: "Pinworm",
    descriptionEn: "Diagnosis and treatment.",
  },
  {
    slug: "lyfjuendurnyjun",
    title: "Lyfjaendurnýjun",
    description:
      "Skjót endurnýjun á föstum lyfjum sem þolir ekki bið.",
    titleEn: "Prescription renewal",
    descriptionEn: "Fast renewal of regular medication that cannot wait.",
  },
  {
    slug: "laeknisvottord",
    title: "Læknisvottorð",
    description:
      "Veikindavottorð fyrir vinnu eða skóla, tengt vandamálum sem hafa verið sinnt í gegnum Fjarlækningar.",
    titleEn: "Medical certificate",
    descriptionEn: "Sick-leave certificate for work or school, related to problems handled through Fjarlækningar.",
  },
];
