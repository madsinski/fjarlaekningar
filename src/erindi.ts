// Shared list of the medical problems ("erindi") Fjarlækningar handles.
// Order, labels and icons mirror the canonical presentation collateral
// (/admin/presentations/collateral) — icons live in /public/erindi-icons/.
//
// English lives HERE, not in the CMS: this list is static code, so the admin
// "Þýða" button never sees it — which is exactly why the cards stayed
// Icelandic on the English page. The EN strings are faithful translations of
// the approved Icelandic scope copy, not new claims; they carry the same
// referral caveats and should be reviewed with the rest of the English content.
export type Erindi = {
  slug: string;
  title: string;
  description: string;
  titleEn: string;
  descriptionEn: string;
};

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
      "Endurnýjun á föstum lyfjum fyrir utan ávanabindandi lyf.",
    titleEn: "Prescription renewal",
    descriptionEn: "Renewal of regular medication, excluding addictive medicines.",
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
