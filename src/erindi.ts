// Shared list of the medical problems ("erindi") Fjarlækningar handles.
// Order, labels and icons mirror the canonical presentation collateral
// (/admin/presentations/collateral) — icons live in /public/erindi-icons/.
export type Erindi = {
  slug: string;
  title: string;
  description: string;
};

export const erindi: Erindi[] = [
  {
    slug: "kvef-hosti-halsbolga",
    title: "Kvef, hósti og hálsbólga",
    description:
      "CRP heimapróf notað í upplýsingasöfnun ef þarf. Alvarlegum einkennum vísað í annan farveg.",
  },
  {
    slug: "thvagfaera-leggangasykingar",
    title: "Þvagfæra- og leggangasýkingar",
    description:
      "Þvag-stix heimapróf notað í upplýsingasöfnun. Sveppa- og bakteríusýkingar í leggöngum greindar og meðhöndlaðar. Alvarlegum einkennum vísað í annan farveg.",
  },
  {
    slug: "getnadarvorn",
    title: "Getnaðarvörn",
    description:
      "Fyrsta ávísun, endurnýjun eða breyting á getnaðarvörn.",
  },
  {
    slug: "frjokornaofnaemi",
    title: "Frjókornaofnæmi",
    description: "Meðferð við árstíðabundnu ofnæmi.",
  },
  {
    slug: "frunsa",
    title: "Frunsa",
    description:
      "Meðferð við endurtekna frunsu. Frumgreiningu vísað í annan farveg.",
  },
  {
    slug: "ristill",
    title: "Ristill á húð",
    description:
      "Meðferð við endurteknum ristli. Frumgreiningu vísað í annan farveg.",
  },
  {
    slug: "risvandamal",
    title: "Risvandamál",
    description: "Mat og meðferð.",
  },
  {
    slug: "njalgur",
    title: "Njálgur",
    description: "Greining og meðferð.",
  },
  {
    slug: "lyfjuendurnyjun",
    title: "Lyfjaendurnýjun",
    description:
      "Endurnýjun á föstum lyfjum fyrir utan ávanabindandi lyf.",
  },
  {
    slug: "laeknisvottord",
    title: "Læknisvottorð",
    description:
      "Veikindavottorð fyrir vinnu eða skóla, tengt vandamálum sem hafa verið sinnt í gegnum Fjarlækningar.",
  },
];
