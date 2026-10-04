// Bókasmiðjan — yfirlestur íslensku.
//
// Sérhver íslenskur sögutexti fer í gegnum tvö skref áður en hann telst tilbúinn:
//
//   1. GreynirCorrect (Miðeind, sama vél og yfirlestur.is) les textann og
//      merkir málfræði- og stafsetningarvillur. Vélin greinir íslenska
//      setningagerð og fallstjórn, sem almenn mállíkön gera ekki áreiðanlega.
//   2. Ritstjóri (mállíkan með netleit) fer yfir athugasemdirnar, lagar það sem
//      er rangt og ber vafaatriði — beygingar, orðasambönd, orðalag — saman við
//      heimildir á netinu. Leitin er bundin við barnaefni og málfarsheimildir
//      (SOURCES); hún nær aldrei í fræðigreinar, læknisfræði eða lagamál.
//
// Sagan sjálf breytist ekki: sömu síður, sömu nöfn, sami húmor.
//
// Server-only. Þarf OPENAI_API_KEY (ritstjórinn notar netleit OpenAI).

import { openai } from "@ai-sdk/openai";
import { generateText, Output, stepCountIs } from "ai";
import { z } from "zod";

const MODEL = "gpt-5.4";
const GREYNIR_URL = "https://yfirlestur.is/correct.api";

/** Barnaefni og málfarsheimildir. Netleit ritstjórans nær aðeins hingað. */
export const SOURCES = [
  "malid.is", // Árnastofnun: beygingar, orðabók, málfarsráðgjöf
  "bin.arnastofnun.is", // Beygingarlýsing íslensks nútímamáls
  "islenskordabok.arnastofnun.is",
  "arnastofnun.is",
  "snerpa.is", // Netútgáfan: þjóðsögur og ævintýri
  "is.wikisource.org", // þjóðsögur, ævintýri, barnakvæði
  "ruv.is", // KrakkaRÚV
  "krakkaruv.is",
  "mms.is", // námsefni og lestrarbækur grunnskóla
  "skolavefurinn.is",
  "forlagid.is", // barnabækur
  "bokmenntaborgin.is",
];

export const icelandicConfigured = () => !!process.env.OPENAI_API_KEY;

// Stílathugasemdir sem eiga ekki við barnabók (upphrópunarmerki, skammstafanir).
const SKIP_CODES = /^(E007|E006)/;

/** Athugasemdir GreynirCorrect við hverja síðu. Tóm fylki ef þjónustan svarar ekki. */
export async function greynir(pages: string[]): Promise<string[][]> {
  const notes: string[][] = pages.map(() => []);
  try {
    // Ein málsgrein á síðu, svo svarið raðist á síður.
    const text = pages.map((p) => p.replace(/\s*\n+\s*/g, " ").trim() || "-").join("\n\n");
    const res = await fetch(GREYNIR_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ text }),
      signal: AbortSignal.timeout(60_000),
    });
    if (!res.ok) return notes;
    const data = (await res.json()) as { result?: { original?: string; annotations?: { code?: string; text?: string; suggest?: string }[] }[][] };
    (data.result || []).forEach((paragraph, i) => {
      if (i >= notes.length) return;
      for (const sentence of paragraph) {
        for (const a of sentence.annotations || []) {
          if (!a.code || SKIP_CODES.test(a.code)) continue;
          notes[i].push(`In "${(sentence.original || "").trim()}": ${a.text || a.code}${a.suggest ? ` (suggestion: ${a.suggest})` : ""} [${a.code}]`);
        }
      }
    });
  } catch (e) {
    console.error("[bokasmidja] GreynirCorrect unavailable", e instanceof Error ? e.message : e);
  }
  return notes;
}

const PolishedSchema = z.object({
  title: z.string(),
  summary: z.string(),
  pages: z.array(z.string()),
});

const EDITOR_SYSTEM = `You are the Icelandic-language editor and proofreader (ritstjóri og prófarkalesari) at a children's book publisher in Reykjavík. A picture-book story for children arrives on your desk. Your job is to hand it back in flawless, natural Icelandic of the kind found in the best Icelandic children's books — the story itself is not yours to change.

What you correct:
- Grammar: case government (including impersonal verbs that take accusative or dative subjects), agreement in gender, number and case, verb forms and moods, the inflection of names and of compound words.
- Spelling, including every accent and special letter, and Icelandic punctuation: quotation marks are „ and “.
- Unidiomatic phrasing: word-for-word renderings of English constructions, anglicisms, wrong prepositions, collocations a native speaker would not use. Replace them with what an Icelandic children's author would write.
- Words a young child would not know, when a plain everyday word says the same thing.

What you keep:
- The story, page by page: the same number of pages, each page carrying the same moment, at a similar length.
- Character names, invented words, sound effects and refrains, and a character's deliberate way of talking. These are the author's choices, not errors.
- Every sentence that is already correct and natural, exactly as it is. You are proofreading, not rewriting: do not swap a correct word for a synonym you happen to prefer, and do not restyle a sentence that has nothing wrong with it.

The errors that matter most are the ones Icelandic readers notice at once, so check each sentence for them deliberately: a subject in the wrong case with an impersonal verb (langa, vanta, dreyma and the like take the accusative; hlakka til and kvíða fyrir take the nominative), wrong agreement between adjective and noun, and a wrongly inflected name.

You are given notes from GreynirCorrect, an Icelandic grammar checker. It parses Icelandic properly and is usually right about case and agreement, so take each note seriously — but it does not know invented names or sound words and can misread a sentence, so judge every note yourself. It also misses things; read every sentence on your own as well.

Whenever you are not certain — an inflected form, which case a verb or preposition takes, whether a phrase is really said that way — check it with web search before deciding. Look the word up in BÍN or on málið.is, and look for the phrasing in Icelandic children's stories, folk tales, KrakkaRÚV and school reading books. Those are the right models for this text. Writing from medicine, law, science, business or news reporting is not: do not take vocabulary or phrasing from such sources, even when they are correct Icelandic.

Return the full text: title, summary and every page, corrected. Each page is plain story text only — no page numbers, labels or markup.`;

const FIXER_SYSTEM = `You are an Icelandic proofreader finishing a children's picture-book text. A grammar checker (GreynirCorrect) still reports the notes below after a first edit. For each note, decide: if it points at a real error in grammar, case, agreement, inflection or spelling, correct it in the text; if it is a false alarm (an invented name, a sound effect, a deliberate refrain, or a sentence the checker misread), leave the text alone. Change nothing else: every other word stays exactly as it is. Return every page you were given, in the same order, as plain story text with no labels or markup.`;

const FixedSchema = z.object({ pages: z.array(z.string()) });

/** Removes any page markup the model echoed back. */
const plain = (v: string) => v.replace(/<\/?(page|title|summary)\b[^>]*>/gi, "").replace(/^\s*\[(Page|Title|Summary)[^\]]*\]\s*/i, "").trim();

export interface PolishInput { title: string; summary: string; pages: string[] }
export interface PolishResult extends PolishInput { notesBefore: number; notesAfter: number }

/** Les yfir og lagar íslenskan sögutexta. Skilar textanum óbreyttum að efni, réttum að máli. */
export async function polishIcelandic(input: PolishInput): Promise<PolishResult> {
  // Titill og samantekt fara með, sem tvær fyrstu „síðurnar“.
  const all = [input.title, input.summary, ...input.pages];
  const notes = await greynir(all);
  const label = (i: number) => (i === 0 ? "Title" : i === 1 ? "Summary" : `Page ${i - 1}`);
  const noteText = notes.flatMap((list, i) => list.map((n) => `- ${label(i)}: ${n}`)).join("\n");

  const res = await generateText({
    model: openai(MODEL),
    system: EDITOR_SYSTEM,
    prompt: `[Title]
${input.title}

[Summary]
${input.summary}

${input.pages.map((p, i) => `[Page ${i + 1}]\n${p}`).join("\n\n")}

Notes from GreynirCorrect:
${noteText || "(none)"}

The story has ${input.pages.length} pages; return exactly ${input.pages.length} pages in the same order.`,
    tools: {
      web_search: openai.tools.webSearch({
        filters: { allowedDomains: SOURCES },
        searchContextSize: "medium",
        userLocation: { type: "approximate", country: "IS" },
      }),
    },
    output: Output.object({ schema: PolishedSchema }),
    stopWhen: stepCountIs(12),
    maxOutputTokens: 32000,
    providerOptions: { openai: { store: false, reasoningEffort: "medium" } },
  });
  const out = res.output;
  if (!out || out.pages.length !== input.pages.length || !plain(out.title)) throw new Error("polish: bad shape");
  let texts = [plain(out.title), plain(out.summary), ...out.pages.map(plain)];

  // Önnur umferð: það sem GreynirCorrect merkir enn er lagað markvisst, án
  // þess að annað breytist. Mistakist hún stendur fyrri umferðin.
  let after = await greynir(texts);
  const flagged = after.map((list, i) => (list.length ? i : -1)).filter((i) => i >= 0);
  if (flagged.length) {
    try {
      const fix = await generateText({
        model: openai(MODEL),
        system: FIXER_SYSTEM,
        prompt: flagged.map((i, k) => `[Text ${k + 1}]\n${texts[i]}\nNotes:\n${after[i].map((n) => `- ${n}`).join("\n")}`).join("\n\n")
          + `\n\nThere are ${flagged.length} texts; return exactly ${flagged.length} pages in the same order.`,
        output: Output.object({ schema: FixedSchema }),
        maxOutputTokens: 16000,
        providerOptions: { openai: { store: false, reasoningEffort: "medium" } },
      });
      if (fix.output?.pages.length === flagged.length) {
        texts = texts.map((t, i) => { const k = flagged.indexOf(i); return k >= 0 && plain(fix.output.pages[k]) ? plain(fix.output.pages[k]) : t; });
        after = await greynir(texts);
      }
    } catch (e) {
      console.error("[bokasmidja] second proofreading pass failed", e instanceof Error ? e.message : e);
    }
  }

  return {
    title: texts[0],
    summary: texts[1],
    pages: texts.slice(2),
    notesBefore: notes.reduce((n, l) => n + l.length, 0),
    notesAfter: after.reduce((n, l) => n + l.length, 0),
  };
}
