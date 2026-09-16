// Leit í uppflettiefni hjúkrunarfræðings.
//
// Hjúkrunarfræðingur í símanum slær inn það sem sjúklingurinn sagði — oft án
// íslenskra stafa og með innsláttarvillu. Leitin fellir því niður broddstafi
// (þ→th, ð→d, æ→ae, á→a …) og lágstafar, svo „thvag“ finni „Þvagfærasýkingar“
// og „blodprufa“ finni „blóðprufu“. Hvert orð leitarinnar verður að koma fyrir
// einhvers staðar í færslunni; raðað er eftir því hvar það kom fyrir.

const FOLD: Record<string, string> = { þ: "th", ð: "d", æ: "ae", ö: "o", á: "a", é: "e", í: "i", ó: "o", ú: "u", ý: "y" };

/** Lágstafir og broddstafir felldir niður. */
export function fold(s: string): string {
  return s.toLowerCase().replace(/[þðæöáéíóúý]/g, (c) => FOLD[c] ?? c).replace(/\s+/g, " ").trim();
}

export interface Searchable {
  /** Mikilvægast — nafn erindis eða spurning. */
  title: string;
  /** Samheiti og algeng orð sjúklinga, t.d. „pissa“, „sviði“. */
  keywords?: string[];
  /** Allt annað sem má finna: skýringar, listar, svör. */
  body?: string[];
}

/**
 * Skor færslu fyrir leitarstreng. 0 = passar ekki. Hærra = betra.
 * Heiti vegur mest, síðan samheiti, síðan meginmál.
 */
export function score(item: Searchable, query: string): number {
  const words = fold(query).split(" ").filter((w) => w.length > 1);
  if (!words.length) return 1;
  const title = fold(item.title);
  const keys = fold((item.keywords ?? []).join(" | "));
  const body = fold((item.body ?? []).join(" | "));
  let total = 0;
  for (const w of words) {
    const s = title.includes(w) ? 10 : keys.includes(w) ? 6 : body.includes(w) ? 2 : 0;
    if (!s) return 0; // öll orð verða að finnast
    total += s + (title.startsWith(w) ? 3 : 0);
  }
  return total;
}

/** Síar og raðar lista eftir leit. Tóm leit skilar listanum óbreyttum. */
export function search<T>(items: T[], query: string, toSearchable: (t: T) => Searchable): T[] {
  if (!fold(query)) return items;
  return items
    .map((item, i) => ({ item, i, s: score(toSearchable(item), query) }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s || a.i - b.i)
    .map((x) => x.item);
}
