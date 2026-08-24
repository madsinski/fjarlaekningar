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

/**
 * CMS key holding whether an erindi is shown at all (Þjónusta CMS, group
 * "Algeng erindi"). Absent means shown, so every erindi that existed before the
 * switch did keeps appearing without anyone having to go and enable it.
 */
export const erindiOnKey = (slug: string): string => `erindi_${slug.replace(/-/g, "_")}_on`;

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
    slug: "hudvandamal-utbrot",
    title: "Húðvandamál og útbrot",
    description:
      "Exem, psoriasis, unglingabólur, sveppasýkingar og önnur afmörkuð húðvandamál. Mynd fylgir erindinu. Fæðingarblettum, sárum sem gróa ekki og bráðum útbrotum vísað í annan farveg.",
    titleEn: "Skin problems and rashes",
    descriptionEn:
      "Eczema, psoriasis, acne, fungal infections and other well-defined skin problems. A photograph is submitted with the request. Changing moles, non-healing wounds and acute rashes are referred onwards.",
  },
  {
    slug: "augnsykingar-augnlokavandamal",
    title: "Augnsýkingar og augnlokavandamál",
    description:
      "Hvarmabólga, vogrís og óbrotin tárubólga. Mynd fylgir erindinu. Sjónskerðingu, augnverk og rauðu auga hjá linsunotendum vísað í annan farveg.",
    titleEn: "Eye infections and eyelid problems",
    descriptionEn:
      "Blepharitis, styes and uncomplicated conjunctivitis. A photograph is submitted with the request. Reduced vision, eye pain and a red eye in contact-lens wearers are referred onwards.",
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
    slug: "almenn-laeknisthjonusta",
    title: "Almenn læknisþjónusta",
    description:
      "Erindi sem falla ekki undir hina flokkana. Þú lýsir vandamálinu með eigin orðum og læknir metur málið. Bráðum og alvarlegum einkennum vísað í annan farveg.",
    titleEn: "General medical service",
    descriptionEn:
      "Requests that do not fit the other categories. You describe the problem in your own words and a doctor assesses it. Acute and serious symptoms are referred onwards.",
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
