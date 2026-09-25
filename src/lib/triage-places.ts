// Places for the "Hvar ertu núna?" step of the triage popup.
//
// Where you are decides where you can actually go. Four regions, as defined by
// Fjarlækningar' doctors:
//   capital  — Landspítali (bráðamóttaka í Fossvogi), Barnaspítali Hringsins,
//              Læknavaktin
//   akureyri — a drop-in bráðamóttaka (Sjúkrahúsið á Akureyri)
//   selfoss  — a drop-in bráðamóttaka (HSU á Selfossi)
//   rural    — everywhere else: vaktþjónusta heilsugæslunnar through 1700,
//              the health centre in daytime
//
// Towns next to Akureyri and Selfoss share their bráðamóttaka. Every other
// town is "rural" — including towns with a local hospital, which call 1700 to
// reach the on-call doctor. To give one of them its own advice, add a region.

export type RegionId = "capital" | "akureyri" | "selfoss" | "rural";

export const PLACES: { name: string; region: RegionId }[] = [
  // Höfuðborgarsvæðið
  ...["Reykjavík", "Kópavogur", "Hafnarfjörður", "Garðabær", "Mosfellsbær", "Seltjarnarnes",
      "Álftanes", "Kjalarnes", "Kjós", "Breiðholt", "Grafarvogur", "Grafarholt", "Árbær",
      "Úlfarsárdalur", "Norðlingaholt", "Vesturbær", "Hlíðar", "Laugardalur", "Háaleiti",
      "Vatnsendi", "Urriðaholt", "Vellir", "Hvaleyrarholt"]
    .map((name) => ({ name, region: "capital" as const })),
  // Akureyri og nágrenni
  ...["Akureyri", "Hrafnagil", "Svalbarðseyri", "Eyjafjarðarsveit", "Hörgársveit", "Lónsbakki"]
    .map((name) => ({ name, region: "akureyri" as const })),
  // Selfoss og nágrenni
  ...["Selfoss", "Árborg", "Hveragerði", "Þorlákshöfn", "Eyrarbakki", "Stokkseyri", "Ölfus"]
    .map((name) => ({ name, region: "selfoss" as const })),
  // Annars staðar á landinu
  ...["Reykjanesbær", "Keflavík", "Njarðvík", "Ásbrú", "Grindavík", "Sandgerði", "Garður",
      "Suðurnesjabær", "Vogar", "Akranes", "Borgarnes", "Reykholt", "Stykkishólmur",
      "Grundarfjörður", "Ólafsvík", "Hellissandur", "Rif", "Búðardalur", "Reykhólar",
      "Ísafjörður", "Bolungarvík", "Súðavík", "Flateyri", "Suðureyri", "Þingeyri",
      "Patreksfjörður", "Tálknafjörður", "Bíldudalur", "Hólmavík", "Drangsnes",
      "Hvammstangi", "Blönduós", "Skagaströnd", "Sauðárkrókur", "Varmahlíð", "Hofsós",
      "Siglufjörður", "Ólafsfjörður", "Fjallabyggð", "Dalvík", "Hrísey", "Grímsey",
      "Grenivík", "Húsavík", "Reykjahlíð", "Mývatnssveit", "Laugar", "Kópasker",
      "Raufarhöfn", "Þórshöfn", "Bakkafjörður", "Vopnafjörður", "Egilsstaðir", "Fellabær",
      "Seyðisfjörður", "Borgarfjörður eystri", "Reyðarfjörður", "Eskifjörður",
      "Neskaupstaður", "Fjarðabyggð", "Fáskrúðsfjörður", "Stöðvarfjörður", "Breiðdalsvík",
      "Djúpivogur", "Höfn", "Hornafjörður", "Kirkjubæjarklaustur", "Vík", "Hvolsvöllur",
      "Hella", "Flúðir", "Laugarvatn", "Reykholt í Biskupstungum", "Sólheimar",
      "Vestmannaeyjar", "Skaftafell"]
    .map((name) => ({ name, region: "rural" as const })),
];

const FOLD: Record<string, string> = { þ: "th", ð: "d", æ: "ae", ö: "o", á: "a", é: "e", í: "i", ó: "o", ú: "u", ý: "y" };
const fold = (s: string) => s.toLowerCase().replace(/[þðæöáéíóúý]/g, (c) => FOLD[c] ?? c).trim();

/** Places matching what was typed — start of any word, accents optional
 *  ("hafnar", "hofn", "selfos"). Matches at the start of the name first. */
export function searchPlaces(q: string, limit = 6): { name: string; region: RegionId }[] {
  const needle = fold(q);
  if (needle.length < 2) return [];
  // Ties keep list order, which puts the big places first ("reykj" → Reykjavík).
  return PLACES.map((p, order) => {
    const f = fold(p.name);
    const rank = f.startsWith(needle) ? 0 : f.split(/[\s-]+/).some((w) => w.startsWith(needle)) ? 1 : -1;
    return { p, rank, order };
  })
    .filter((x) => x.rank >= 0)
    .sort((a, b) => a.rank - b.rank || a.order - b.order)
    .slice(0, limit)
    .map((x) => x.p);
}
