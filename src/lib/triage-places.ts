// Places for the "Hvar ertu núna?" step of the triage popup.
//
// Where you are decides where you can actually go. A place gets its own region
// only if it has a bráðamóttaka that is open 24 hours and takes walk-ins —
// no calling 1700 first to get the on-call doctor out (the doctors' rule,
// 2026-09-25). Checked against the institutions' official pages that day:
//   capital       — Landspítali Fossvogi, Barnaspítali Hringsins, Læknavaktin
//   akureyri      — Sjúkrahúsið á Akureyri
//   selfoss       — HSU á Selfossi
//   reykjanesbaer — HSS í Reykjanesbæ ("opin allan sólarhringinn")
//   rural         — everywhere else: vaktþjónusta heilsugæslunnar through 1700,
//                   the health centre in daytime
//
// NOT regions (do not meet the rule on their published pages): Akranes (HVE
// walk-in weekdays 8–16, after that via the ward/1700 — unconfirmed),
// Ísafjörður, Neskaupstaður and Vestmannaeyjar (staff on call, 1700 first),
// and the rest. Towns next to a region's hospital share its region.

export type RegionId = "capital" | "akureyri" | "selfoss" | "reykjanesbaer" | "rural";

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
  // Reykjanesbær og Suðurnes (HSS)
  ...["Reykjanesbær", "Keflavík", "Njarðvík", "Ásbrú", "Grindavík", "Sandgerði", "Garður",
      "Suðurnesjabær", "Vogar"]
    .map((name) => ({ name, region: "reykjanesbaer" as const })),
  // Annars staðar á landinu
  ...["Akranes", "Borgarnes", "Reykholt", "Stykkishólmur",
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
