// Bókasmiðjan — the step-by-step idea questionnaire.
// Shared by the client (the cards a child taps) and the server (which turns
// the answers into a brief for the writer). Safe for both.

import type { Idea, Lang } from "./types";

type L = Record<Lang, string>;
export interface WizardOption { key: string; emoji: string; label: L }
export interface WizardStep { key: string; question: L; options: WizardOption[] }

const o = (key: string, emoji: string, en: string, is: string, nb: string, hu: string): WizardOption =>
  ({ key, emoji, label: { en, is, nb, hu } });

export const WIZARD: WizardStep[] = [
  {
    key: "theme",
    question: {
      en: "What is your book about?",
      is: "Um hvað er bókin þín?",
      nb: "Hva handler boken din om?",
      hu: "Miről szól a könyved?",
    },
    options: [
      o("adventure", "🗺️", "A big adventure", "Stórt ævintýri", "Et stort eventyr", "Egy nagy kaland"),
      o("brave", "🦁", "Being brave", "Að vera hugrakkur", "Å være modig", "Bátorság"),
      o("friend", "🤝", "Finding a friend", "Að eignast vin", "Å finne en venn", "Barátra találni"),
      o("mystery", "🔍", "Solving a mystery", "Að leysa ráðgátu", "Å løse et mysterium", "Egy rejtély megfejtése"),
      o("rescue", "🛟", "Helping someone", "Að hjálpa einhverjum", "Å hjelpe noen", "Segíteni valakinek"),
      o("silly", "🤪", "Something very silly", "Eitthvað mjög kjánalegt", "Noe veldig tullete", "Valami nagyon bolondos"),
    ],
  },
  {
    key: "hero",
    question: {
      en: "Who is the hero?",
      is: "Hver er hetjan?",
      nb: "Hvem er helten?",
      hu: "Ki a főhős?",
    },
    options: [
      o("kid", "🧒", "A kid like me", "Krakki eins og ég", "Et barn som meg", "Egy gyerek, mint én"),
      o("animal", "🦊", "An animal", "Dýr", "Et dyr", "Egy állat"),
      o("dragon", "🐲", "A dragon", "Dreki", "En drage", "Egy sárkány"),
      o("robot", "🤖", "A robot", "Vélmenni", "En robot", "Egy robot"),
      o("troll", "🧌", "A troll", "Tröll", "Et troll", "Egy troll"),
      o("monster", "👾", "A friendly monster", "Vingjarnlegt skrímsli", "Et snilt monster", "Egy barátságos szörny"),
    ],
  },
  {
    key: "place",
    question: {
      en: "Where does it happen?",
      is: "Hvar gerist sagan?",
      nb: "Hvor skjer det?",
      hu: "Hol történik?",
    },
    options: [
      o("sea", "🌊", "In the sea", "Í sjónum", "I havet", "A tengerben"),
      o("forest", "🌲", "In a forest", "Í skógi", "I en skog", "Egy erdőben"),
      o("space", "🚀", "In space", "Í geimnum", "I verdensrommet", "Az űrben"),
      o("volcano", "🌋", "By a volcano", "Við eldfjall", "Ved en vulkan", "Egy vulkánnál"),
      o("castle", "🏰", "In a castle", "Í kastala", "I et slott", "Egy várban"),
      o("home", "🏠", "At home", "Heima", "Hjemme", "Otthon"),
    ],
  },
  {
    key: "twist",
    question: {
      en: "What happens?",
      is: "Hvað gerist?",
      nb: "Hva skjer?",
      hu: "Mi történik?",
    },
    options: [
      o("lost", "🧭", "Someone gets lost", "Einhver villist", "Noen går seg bort", "Valaki eltéved"),
      o("treasure", "💎", "A treasure is found", "Fjársjóður finnst", "En skatt blir funnet", "Kincset találnak"),
      o("storm", "⛈️", "A storm is coming", "Óveður er á leiðinni", "En storm er på vei", "Vihar közeleg"),
      o("stranger", "👀", "A scary stranger shows up", "Ógnvekjandi gestur birtist", "En skummel fremmed dukker opp", "Feltűnik egy ijesztő idegen"),
      o("broken", "🔧", "Something breaks", "Eitthvað bilar", "Noe går i stykker", "Valami elromlik"),
      o("race", "🏁", "There is a race", "Það er kapphlaup", "Det er et kappløp", "Verseny lesz"),
    ],
  },
  {
    key: "mood",
    question: {
      en: "How should it feel?",
      is: "Hvernig á sagan að vera?",
      nb: "Hvordan skal den føles?",
      hu: "Milyen legyen a hangulata?",
    },
    options: [
      o("funny", "😂", "Funny", "Fyndin", "Morsom", "Vicces"),
      o("exciting", "⚡", "Exciting", "Spennandi", "Spennende", "Izgalmas"),
      o("cozy", "🧸", "Cozy", "Notaleg", "Koselig", "Meghitt"),
      o("spooky", "👻", "A little spooky", "Smá draugaleg", "Litt skummel", "Egy kicsit ijesztő"),
      o("magic", "✨", "Magical", "Töfrandi", "Magisk", "Varázslatos"),
    ],
  },
];

export const IDEA_MAX = 1200;
const OWN_MAX = 120;

/** Keeps only known step keys; a value is an option key or the child's own words ("own:..."). */
export function cleanAnswers(raw: unknown): Record<string, string> {
  const out: Record<string, string> = {};
  if (!raw || typeof raw !== "object") return out;
  for (const step of WIZARD) {
    const v = (raw as Record<string, unknown>)[step.key];
    if (typeof v !== "string") continue;
    if (v.startsWith("own:")) {
      const own = v.slice(4).replace(/\s+/g, " ").trim().slice(0, OWN_MAX);
      if (own) out[step.key] = `own:${own}`;
    } else if (step.options.some((opt) => opt.key === v)) out[step.key] = v;
  }
  return out;
}

/** The idea as a plain English brief for the writer. */
export function describeIdea(idea: Idea): string {
  if (idea.kind === "prompt") return idea.text;
  const lines: string[] = [];
  for (const step of WIZARD) {
    const v = idea.answers[step.key];
    if (!v) continue;
    const answer = v.startsWith("own:")
      ? `${v.slice(4)} (the child's own words)`
      : step.options.find((opt) => opt.key === v)?.label.en ?? v;
    lines.push(`${step.question.en} ${answer}`);
  }
  if (idea.heroName) lines.push(`The hero's name: ${idea.heroName}`);
  if (idea.extra) lines.push(`The child also wants: ${idea.extra}`);
  return lines.join("\n");
}
