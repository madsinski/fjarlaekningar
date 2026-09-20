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
  /** The word as it appears in the text. Matched case-insensitively on word
   *  boundaries, so "denominator" also catches "denominators". */
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
    term: "denominator",
    plain: "The 'out of how many'. If 44 cases were resolved out of 52, the 52 is the denominator.",
    soWhat: "Ours only counts patients who reached us. The health centre's contact register counts everyone who came to them, which is why we ask them for it rather than making our own.",
  },
  {
    term: "numerator",
    plain: "The top half of a fraction — the count of the thing you are measuring.",
  },
  {
    term: "cohort",
    plain: "The group of patients a figure is about.",
    soWhat: "Everyone who started the questionnaire, or only those who reached a doctor? The two give different resolution rates, so it has to be stated once and not changed.",
  },
  {
    term: "secular trend",
    plain: "A change that was already happening anyway, for reasons nothing to do with you.",
    soWhat: "If GP attendance was falling nationally before you started, a simple before-and-after comparison credits that fall to your service.",
  },
  {
    term: "regression to the mean",
    plain: "An unusually bad patch tends to get better on its own, whatever you do.",
    soWhat: "Services get introduced where things were unusually bad. Some of the improvement you measure would have happened without you.",
  },
  {
    term: "Hawthorne effect",
    also: ["Hawthorne"],
    plain: "People behave differently when they know they are being watched.",
    soWhat: "A site that knows it is being evaluated works a little harder, and that goes into your result too.",
  },
  {
    term: "interrupted time series",
    plain: "Plot the monthly numbers before and after the service started and look for a step, or a change of direction, at that exact point.",
    soWhat: "This is what separates your effect from a trend that was already running — and it only works if the baseline arrives month by month rather than as one annual total.",
  },
  {
    term: "stepped wedge",
    plain: "Sites start the service one at a time. Until its turn comes, each site is a comparison for the ones already running.",
    soWhat: "Your rollout is staged anyway, so this costs nothing extra — but only if you collect figures at a site before it goes live.",
  },
  {
    term: "counterfactual",
    plain: "What would have happened otherwise.",
    soWhat: "Usually answered by asking the patient — 'where would you have gone instead?' — which is an opinion, not a fact, and is labelled that way wherever it appears.",
  },
  {
    term: "selection bias",
    plain: "The group you can measure is not a fair sample of the group you care about.",
    soWhat: "Only referred cases can be checked against an in-person assessment, so the straightforward cases never appear in that comparison.",
  },
  {
    term: "stewardship",
    plain: "Prescribing antibiotics carefully — the right one, only when needed, for no longer than necessary.",
    soWhat: "The first objection to any remote service is that it hands out antibiotics too readily. Having the figures ends that conversation early.",
  },
  {
    term: "concordance",
    plain: "Whether two assessments agreed.",
    soWhat: "Here: did the remote working diagnosis match what was found when the patient was later seen in person.",
  },
  {
    term: "intention-to-treat",
    plain: "Count everyone who entered, including those it turned out you could not help.",
    soWhat: "It gives a lower resolution rate and a more honest safety figure, because the people the service turned away are still in the total.",
  },
  {
    term: "pseudonymisation",
    also: ["pseudonymised", "pseudonymous"],
    plain: "Replacing a name or ID number with a code that still lets you recognise the same person again.",
    soWhat: "It is not anonymity. Data with such a code is still personal data in law, however well the code is scrambled.",
  },
  {
    term: "utilisation",
    plain: "How much of what you have is actually being used.",
  },
  {
    term: "quality assurance",
    plain: "Checking and improving your own service. Legally quite different from research.",
    soWhat: "It needs no patient consent and no ethics committee. That is why everything here is counts rather than patient records.",
  },
  {
    term: "run-in",
    plain: "The first few weeks, when staff are still learning and patients mostly do not know the service exists.",
    soWhat: "Usually left out of the main result — but you have to say so before you see the numbers, not after.",
  },
  {
    term: "primary outcome",
    plain: "The one figure you nominate in advance as the thing the evaluation stands or falls on.",
    soWhat: "Picking it afterwards, once you can see which came out best, is the difference between a finding and a fishing expedition.",
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
  `\\b(${[...BY_TERM.keys()].sort((a, b) => b.length - a.length).map((k) => k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})(s?)\\b`,
  "gi",
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
