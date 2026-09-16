// Efni vinnustöðvarinnar sem kemur af vefnum sjálfum. Server-only.
//
// Algengu spurningarnar eru lesnar úr vefumsjóninni (/thjonusta), svo
// hjúkrunarfræðingur afritar sama orðalag og sjúklingurinn sér á vefnum.
// Verð er ekki nefnt í vinnustöðinni: spurningunni um kostnað er sleppt og
// setningar um komugjald teknar út.

import { cache } from "react";
import { erindi } from "@/erindi";
import { faqEntries } from "@/lib/faq-jsonld";
import type { GuideAnswer } from "@/lib/nurse-guide";
import { erindiPagesLive } from "@/lib/site-content/erindi-pages";
import { erindiShown } from "@/lib/site-content/thjonusta";
import { getPageContent } from "@/lib/site-content/server";

const FEE = /komugjald|\d[\d.]*\s*kr\b/i;

/** Tekur verð út úr svari án þess að brjóta setninguna þar sem það er hægt. */
function withoutFee(a: string): string {
  const fixed = a.replace(/greiðir þú sama og komugjald á heilsugæslu og erindi þitt fer/gi, "fer erindi þitt");
  return fixed
    .split(/(?<=[.!?])\s+/)
    .filter((sentence) => !FEE.test(sentence))
    // Svar sem endar á „…hér er listi:“ vísar í lista sem er á öðrum stað í vinnustöðinni.
    .filter((sentence, i, all) => !(i === all.length - 1 && sentence.trim().endsWith(":")))
    .join(" ")
    .trim();
}

export interface GuideContent {
  answers: GuideAnswer[];
  /** Erindi sem hafa eigin síðu á vefnum núna (hlekkurinn „Á vefnum“). */
  livePages: string[];
}

export const getGuideContent = cache(async (): Promise<GuideContent> => {
  const [thjonusta, pages] = await Promise.all([getPageContent("thjonusta", "is"), getPageContent("erindi", "is")]);
  const answers = faqEntries(thjonusta)
    .filter((e) => !/kosta/i.test(e.q))
    .map((e) => ({ key: `faq${e.slot}`, q: e.q, a: withoutFee(e.a) }))
    .filter((e) => e.a);
  const livePages = erindiPagesLive(pages) ? erindi.filter((e) => erindiShown(thjonusta, e.slug)).map((e) => e.slug) : [];
  return { answers, livePages };
});
