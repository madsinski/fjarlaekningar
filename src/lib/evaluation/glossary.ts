// Plain meanings for the words this system cannot avoid using.
//
// Some of these terms have to survive: they are what an ethics committee, a
// journal reviewer and a procurement evaluator expect to see, and swapping
// them for friendlier words would make the documents weaker. But nobody should
// have to know what "secular trend" means to read a dashboard.
//
// So the term stays and the meaning is one hover away. Each entry has a plain
// sentence and, where it helps, the reason a clinician should care — not the
// textbook definition, which is usually the least useful thing about a term.
//
// The list is deliberately short. A glossary that explains forty words is one
// nobody opens; this one covers the words that actually appear.

export type Term = {
  /** The word as it appears in the text. Matched case-insensitively as a
   *  whole word. Icelandic inflects, so every form that appears in the text
   *  has to be listed in `also` — "nefnari" does not catch "nefnaranum". */
  term: string;
  /** Other spellings that should resolve to the same entry. */
  also?: string[];
  /** What it means, in a sentence, without using another technical word. */
  plain: string;
  /** Why it matters here. Omitted where the plain meaning is enough. */
  soWhat?: string;
};

export const GLOSSARY: Term[] = [
  {
    term: "baseline",
    plain: "Staðan áður en þjónustan hófst: sömu tölur fyrir tímabilið á undan.",
    soWhat: "Án baseline er ekkert að bera saman við. Tölurnar þurfa að vera mánaðarlegar, því eina ársheildartölu er ekki hægt að brjóta niður eftir á.",
  },
  {
    term: "framskyggn",
    also: ["framskyggna", "framskyggnri", "framskyggnt", "framskyggnar"],
    plain: "Gögn skráð jafnóðum, frá fyrsta degi.",
    soWhat: "Það sem ekki er skráð strax er ekki hægt að sækja eftir á. Þess vegna þarf þjónustukönnunin að vera tilbúin frá fyrsta sjúklingi.",
  },
  {
    term: "afturskyggn",
    also: ["afturskyggna", "afturskyggnri", "afturskyggnt", "afturskyggnar"],
    plain: "Gögn sótt eftir á, úr skrám sem eru þegar til, eins og Sögu.",
    soWhat: "Má gera hvenær sem er, ef skilgreiningin er ákveðin áður en tölurnar eru skoðaðar.",
  },
  {
    term: "nefnari",
    also: ["nefnara", "nefnarann", "nefnaranum", "nefnarinn"],
    plain: "„Af hve mörgum?“ Ef 44 erindi af 52 voru afgreidd er 52 nefnarinn.",
    soWhat: "Okkar tölur ná aðeins til þeirra sem komu til okkar. Heilsugæslan telur alla sem komu til hennar, og þess vegna fáum við töluna frá henni.",
  },
  {
    term: "teljari",
    also: ["teljara", "teljarann", "teljaranum", "teljarinn"],
    plain: "Efri talan í broti: fjöldi þess sem er mælt.",
  },
  {
    term: "rannsóknarþýði",
    also: ["rannsóknarþýðið", "rannsóknarþýðinu", "rannsóknarþýðis", "þýði", "þýðið", "þýðinu", "þýðis"],
    plain: "Hópurinn sem tala á við.",
    soWhat: "Allir sem byrjuðu spurningalistann, eða aðeins þeir sem komust til læknis? Hlutfall afgreiddra erinda verður ólíkt eftir því, svo það þarf að ákveða einu sinni og halda sig við það.",
  },
  {
    term: "undirliggjandi þróun",
    also: ["undirliggjandi þróunar", "undirliggjandi þróunina", "undirliggjandi þróuninni"],
    plain: "Breyting sem var hvort eð er í gangi, af ástæðum sem tengjast þjónustunni ekki.",
    soWhat: "Ef komum á heilsugæslu fækkaði á landsvísu áður en við byrjuðum, eignar einfaldur samanburður fyrir og eftir þjónustunni þá fækkun.",
  },
  {
    term: "aðhvarf að meðaltali",
    plain: "Óvenju slæmt tímabil lagast oft af sjálfu sér, hvað sem gert er.",
    soWhat: "Þjónusta er gjarnan sett af stað þar sem staðan var óvenju slæm. Hluti af batanum hefði orðið án hennar.",
  },
  {
    term: "Hawthorne-áhrif",
    also: ["Hawthorne-áhrifin", "Hawthorne-áhrifum", "Hawthorne-áhrifa", "Hawthorne"],
    plain: "Fólk hegðar sér öðruvísi þegar það veit að fylgst er með því.",
    soWhat: "Stöð sem veit að hún er metin leggur sig aðeins meira fram, og það skilar sér líka í niðurstöðunni.",
  },
  {
    term: "rofin tímaröð",
    also: ["rofinni tímaröð", "rofna tímaröð", "rofinnar tímaraðar", "interrupted time series"],
    plain: "Mánaðartölurnar fyrir og eftir upphaf þjónustunnar settar á graf, og leitað að stökki eða stefnubreytingu nákvæmlega þar.",
    soWhat: "Þetta greinir áhrif þjónustunnar frá þróun sem var þegar í gangi. Það virkar aðeins ef baseline kemur mánuð fyrir mánuð en ekki sem ein ársheildartala.",
  },
  {
    term: "þrepaskipt innleiðing",
    also: ["þrepaskipta innleiðingu", "þrepaskiptri innleiðingu", "þrepaskiptrar innleiðingar", "stepped wedge"],
    plain: "Stöðvarnar byrja ein af annarri. Þar til röðin kemur að henni er hver stöð samanburður fyrir þær sem eru byrjaðar.",
    soWhat: "Innleiðingin er hvort eð er í áföngum, svo þetta kostar ekkert aukalega. En aðeins ef tölum er safnað á stöð áður en hún byrjar.",
  },
  {
    term: "samanburðarstöð",
    also: ["samanburðarstöðvar", "samanburðarstöðina", "samanburðarstöðinni", "samanburðarstöðvum", "samanburðarstöðva"],
    plain: "Stöð sem er ekki byrjuð með þjónustuna og er notuð til samanburðar.",
    soWhat: "Ef sama breyting sést á samanburðarstöðinni stafar hún ekki af þjónustunni.",
  },
  {
    term: "valskekkja",
    also: ["valskekkju", "valskekkjan", "valskekkjuna", "valskekkjunnar"],
    plain: "Hópurinn sem hægt er að mæla er ekki sanngjarnt úrtak úr hópnum sem skiptir máli.",
    soWhat: "Aðeins þá sem leituðu aftur er hægt að skoða í Sögu, svo erindin sem gengu vel koma aldrei fram í þeim samanburði.",
  },
  {
    term: "svarhlutfall",
    also: ["svarhlutfallið", "svarhlutfalli", "svarhlutfalls"],
    plain: "Hlutfall þeirra sem svöruðu könnuninni af þeim sem fengu hana.",
    soWhat: "Lágt svarhlutfall þýðir að svörin geta verið jákvæðari en reynsla hópsins alls. Það á alltaf að birta það með niðurstöðunni.",
  },
  {
    term: "skynsamleg notkun sýklalyfja",
    also: ["skynsamlegrar notkunar sýklalyfja", "skynsamlegri notkun sýklalyfja"],
    plain: "Sýklalyf gefin af varúð: rétt lyf, aðeins þegar þarf og ekki lengur en nauðsyn krefur.",
    soWhat: "Fyrsta mótbáran gegn fjarþjónustu er að hún gefi of auðveldlega sýklalyf. Tölurnar svara henni strax.",
  },
  {
    term: "samræmi greininga",
    also: ["samræmis greininga"],
    plain: "Hvort tvær greiningar á sama sjúklingi komu heim og saman.",
    soWhat: "Hér: stóðst greiningin í fjarþjónustu þegar sjúklingurinn var skoðaður aftur.",
  },
  {
    term: "intention-to-treat",
    plain: "Allir sem hófu ferlið eru taldir með, líka þeir sem ekki var hægt að hjálpa.",
    soWhat: "Hlutfall afgreiddra erinda verður lægra en öryggistalan heiðarlegri, því þeir sem var vísað frá eru enn í heildartölunni.",
  },
  {
    term: "dulkóðun",
    also: ["dulkóðunar", "dulkóðuð", "dulkóðuðu", "dulkóðaðar", "dulkóðuð gögn"],
    plain: "Nafni eða kennitölu skipt út fyrir kóða sem gerir samt kleift að þekkja sama einstakling aftur.",
    soWhat: "Það er ekki nafnleysi. Dulkóðuð gögn eru áfram persónuupplýsingar að lögum.",
  },
  {
    term: "gæðaverkefni",
    also: ["gæðaverkefnis", "gæðaverkefnið", "gæðaverkefninu", "innra gæðaeftirlit", "innra gæðaeftirliti", "innra gæðaeftirlits"],
    plain: "Mat og umbætur á eigin þjónustu. Að lögum allt annað en vísindarannsókn.",
    soWhat: "Það þarf hvorki upplýst samþykki sjúklinga né leyfi Vísindasiðanefndar. Þess vegna eru hér eingöngu samantektartölur en ekki sjúkraskrár.",
  },
  {
    term: "aðlögunartímabil",
    also: ["aðlögunartímabilið", "aðlögunartímabilinu", "aðlögunartímabils"],
    plain: "Fyrstu vikurnar, meðan starfsfólk er að læra á þjónustuna og fæstir vita að hún er til.",
    soWhat: "Oft haldið utan við aðalniðurstöðuna, en það þarf að ákveða það áður en tölurnar sjást, ekki eftir á.",
  },
  {
    term: "aðalendapunktur",
    also: ["aðalendapunkt", "aðalendapunkti", "aðalendapunkts", "aðalendapunktinn", "aðalendapunkturinn"],
    plain: "Eina talan sem er valin fyrir fram og matið stendur og fellur með.",
    soWhat: "Að velja hana eftir á, þegar sést hvað kom best út, er munurinn á niðurstöðu og veiðiferð.",
  },
];

const BY_TERM = new Map<string, Term>();
for (const t of GLOSSARY) {
  BY_TERM.set(t.term.toLowerCase(), t);
  for (const a of t.also ?? []) BY_TERM.set(a.toLowerCase(), t);
}

/** Longest first, so "interrupted time series" wins over any single word
 *  inside it. */
const PATTERN = new RegExp(
  `(?<!\\p{L})(${[...BY_TERM.keys()].sort((a, b) => b.length - a.length).map((k) => k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})(?!\\p{L})`,
  "giu",
);

export type Segment = { text: string; term?: Term };

/**
 * Splits text into plain runs and glossed terms.
 *
 * Done by scanning rather than by hand-marking every occurrence, because there
 * are twenty-nine modules and a term added to the glossary later should light
 * up everywhere it already appears without anyone editing the module text.
 */
export function gloss(text: string): Segment[] {
  const out: Segment[] = [];
  let last = 0;
  for (const m of text.matchAll(PATTERN)) {
    const at = m.index ?? 0;
    if (at > last) out.push({ text: text.slice(last, at) });
    out.push({ text: m[0], term: BY_TERM.get(m[1].toLowerCase()) });
    last = at + m[0].length;
  }
  if (last < text.length) out.push({ text: text.slice(last) });
  return out;
}

/** Terms actually present in a piece of text — for a "words on this page"
 *  panel that stays short instead of listing the whole glossary. */
export function termsIn(text: string): Term[] {
  const found = new Map<string, Term>();
  for (const s of gloss(text)) if (s.term) found.set(s.term.term, s.term);
  return [...found.values()];
}
