// FAQPage structured data for /thjonusta, built from the same CMS fields the
// page renders — so an edited answer updates the markup with it.
//
// Note on expectations: Google narrowed FAQ *rich results* to government and
// well-known health institutions, so stars are unlikely. The value here is
// comprehension — both engines get an explicit question/answer pairing for
// content patients search in exactly that form ("get ég endurnýjað alla
// lyfseðla?"). Bing still renders FAQ answers.

import type { LocaleContent } from "./site-content/types";

const FAQ_SLOTS = 24;

/** CMS answers carry list markup and a template token; searches want prose. */
function plain(answer: string): string {
  return answer
    .split("\n")
    .map((line) => line.trim())
    // "· Heiti | lýsing" list rows → "Heiti: lýsing"
    .map((line) => (line.startsWith("·") ? line.replace(/^·\s*/, "").replace(/\s*\|\s*/, ": ") : line))
    .filter((line) => line && !line.includes("{{"))
    .join(" ")
    .replace(/==/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function faqJsonLd(c: LocaleContent, url: string) {
  const entries = Array.from({ length: FAQ_SLOTS }, (_, i) => ({
    q: (c[`faq${i + 1}_q`] ?? "").trim(),
    a: plain(c[`faq${i + 1}_a`] ?? ""),
  })).filter((e) => e.q && e.a);

  if (!entries.length) return null;

  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "@id": `${url}#faq`,
    mainEntity: entries.map((e) => ({
      "@type": "Question",
      name: e.q,
      acceptedAnswer: { "@type": "Answer", text: e.a },
    })),
  };
}
