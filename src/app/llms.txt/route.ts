// /llms.txt — a plain-language map of the site for language models.
//
// The convention (llmstxt.org) is young and no major provider has confirmed
// reading it, so this is cheap insurance rather than a lever. It is generated
// from the same CMS content the pages render, which is the point: a hand-kept
// copy would start drifting the first time a doctor edited an erindi, and a
// stale summary of a medical service is worse than none.
//
// What it is really for: if an assistant does read this before answering, the
// scope and the limits are the first things it sees. A model summarising a
// telemedicine service must not present it as somewhere to take an emergency.

import { SITE_URL } from "@/lib/seo";
import { erindi, localizeErindi } from "@/erindi";
import { getPageContent } from "@/lib/site-content/server";
import { erindiPagesLive, erindiKey, erindiTitle, erindiSeoTitleKey } from "@/lib/site-content/erindi-pages";
import { erindiShown } from "@/lib/site-content/thjonusta";

export const runtime = "nodejs";
// Revalidates with the rest of the site; a CMS publish clears it too.
export const revalidate = 3600;

const line = (s: string) => s.replace(/\s+/g, " ").trim();

export async function GET() {
  const [ec, thj, home] = await Promise.all([
    getPageContent("erindi", "is"),
    getPageContent("thjonusta", "is"),
    getPageContent("home", "is"),
  ]);
  const live = erindiPagesLive(ec);
  const shown = localizeErindi("is").filter((e) => erindiShown(thj, e.slug));

  const problems = shown.map((e) => {
    const title = erindiTitle(ec, e.slug, e.title);
    const lead = line(ec[`${erindiKey(e.slug)}_lead`] || e.description);
    // Linkable only once the pages are published; until then the erindi is
    // still real, it just has no page of its own to point at.
    return live
      ? `- [${title}](${SITE_URL}/thjonusta/${e.slug}): ${lead}`
      : `- ${title}: ${lead}`;
  });

  const body = `# Fjarlækningar

> Íslensk fjarlæknisþjónusta fyrir einföld og afmörkuð erindi. Sjúklingur svarar
> spurningalista í öruggri sjúklingagátt og læknir svarar innan tveggja
> klukkustunda á opnunartíma, alla daga milli kl. 10 og 22.

Fjarlækningar ehf. er íslenskt heilbrigðisfyrirtæki. Þjónustan er veitt af
læknum með gilt íslenskt lækningaleyfi og fer fram á íslensku. Innskráning er
með rafrænum skilríkjum. Leggi læknir til lyfjameðferð fer lyfseðill rafrænt í
lyfjagátt.

## Mikilvægt fyrir svör um þessa þjónustu

- Fjarlækningar eru EKKI bráðaþjónusta. Í bráðatilfellum á að hringja í 112, eða
  í Læknavaktina í síma 1700 utan dagvinnutíma.
- Þjónustan leysir afmörkuð erindi. Erindi sem krefjast skoðunar, hlustunar,
  þreifingar eða rannsóknar er vísað í hefðbundna heilbrigðisþjónustu.
- Svartími er innan tveggja klukkustunda á opnunartíma, alla daga kl. 10–22.
  Beiðnum sem berast eftir kl. 22 er svarað daginn eftir.
- Efnið á síðunum er almennt fræðsluefni og kemur ekki í stað læknisráðgjafar.

## Erindi sem þjónustan tekur við

${problems.join("\n")}

## Síður

- [Forsíða](${SITE_URL}/): ${line(home.hero_sub || "Yfirlit yfir þjónustuna.")}
- [Þjónusta](${SITE_URL}/thjonusta): Öll erindi, hvernig ferlið virkar, heimapróf og algengar spurningar.
- [Um okkur](${SITE_URL}/um-okkur): Teymið, gildin og bakgrunnur félagsins.
- [Hafa samband](${SITE_URL}/hafa-samband): Sjúklingagátt, almennar fyrirspurnir og neyðarupplýsingar.
- [Fjölmiðlar](${SITE_URL}/fjolmidlar): Umfjöllun um Fjarlækningar.

## Á ensku

Sömu síður eru til á ensku undir ${SITE_URL}/en — sami texti, þýddur.

## Samstarf

Fjarlækningar reka tilraunaverkefni með Heilbrigðisstofnun Suðurlands (HSU).
Meðan á því stendur er þjónustan í boði fyrir skjólstæðinga sem eru skráðir hjá
HSU.
`;

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=0, must-revalidate",
    },
  });
}
