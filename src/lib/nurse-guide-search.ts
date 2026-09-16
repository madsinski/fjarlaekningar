// Leit í uppflettiefni hjúkrunarfræðings.
//
// Hjúkrunarfræðingur í símanum slær inn það sem sjúklingurinn sagði — oft án
// íslenskra stafa og með innsláttarvillu. Leitin fellir því niður broddstafi
// (þ→th, ð→d, æ→ae, á→a …) og lágstafar, svo „thvag“ finni „Þvagfærasýkingar“
// og „blodprufa“ finni „blóðprufu“. Hvert orð leitarinnar verður að koma fyrir
// einhvers staðar í færslunni; raðað er eftir því hvar það kom fyrir.
// Íslensk orð beygjast („blóðprufa“, „blóðprufur“, „blóðprufu“), svo langt orð
// sem finnst ekki heilt er reynt aftur án síðustu stafanna — með lægra skori.

import {
  GUIDE_ACCESS, GUIDE_FACTS, GUIDE_MEDS, GUIDE_PROBLEMS, GUIDE_SELFTESTS,
  type GuideAnswer, type GuideFact, type GuideMedGroup, type GuideProblem, type GuideSelftest,
} from "./nurse-guide";

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
    let s = 0;
    for (const [stem, weight] of stems(w)) {
      s = title.includes(stem) ? 10 : keys.includes(stem) ? 6 : body.includes(stem) ? 2 : 0;
      if (s) {
        total += s * weight + (title.startsWith(stem) ? 3 : 0);
        break;
      }
    }
    if (!s) return 0; // öll orð verða að finnast
  }
  return total;
}

/** Orðið sjálft, og fyrir löng orð stofn án beygingarendingar. */
function stems(w: string): [string, number][] {
  const out: [string, number][] = [[w, 1]];
  for (let cut = 1; cut <= 2 && w.length - cut >= 5; cut++) out.push([w.slice(0, -cut), 0.7]);
  return out;
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

// ── Leit í allri vinnustöðinni ──────────────────────────────────────────────

export interface GuideHits {
  problems: GuideProblem[];
  tests: GuideSelftest[];
  answers: GuideAnswer[];
  facts: GuideFact[];
  /** Lyfjaflokkar: allur flokkurinn ef heitið passar, annars aðeins lyfin sem passa. */
  meds: GuideMedGroup[];
  access: boolean;
  empty: boolean;
}

export function searchGuide(q: string, answers: GuideAnswer[]): GuideHits {
  const problems = search(GUIDE_PROBLEMS, q, (p) => ({
    title: p.title, keywords: [...p.keywords, p.titleEn], body: [p.summary, ...p.suitable, ...p.notSuitable, p.reply],
  }));
  const tests = search(GUIDE_SELFTESTS, q, (t) => ({
    title: t.title, keywords: [...t.keywords, "sjálfspróf", "heimapróf", "próf"], body: [t.what, t.when, t.where],
  }));
  const hitAnswers = search(answers, q, (a) => ({ title: a.q, body: [a.a] }));
  const facts = search(GUIDE_FACTS, q, (f) => ({ title: f.label, keywords: f.keywords, body: [f.detail] }));
  const meds = GUIDE_MEDS.flatMap((g) => {
    if (score({ title: g.name, keywords: g.keywords }, q) > 0) return [g];
    const items = search(g.items, q, (i) => ({ title: i }));
    return items.length ? [{ ...g, items }] : [];
  });
  const access = score({ title: "Svona kemst sjúklingur inn", keywords: GUIDE_ACCESS.keywords, body: GUIDE_ACCESS.steps }, q) > 0;
  const empty = !problems.length && !tests.length && !hitAnswers.length && !facts.length && !meds.length && !access;
  return { problems, tests, answers: hitAnswers, facts, meds, access, empty };
}
