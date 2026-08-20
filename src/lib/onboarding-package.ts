// The innleiðingarpakki — what a station's contact person receives before
// Fjarlækningar opens there.
//
// The package itself is the deck at /present/<INNLEIDINGARPAKKI_SLUG>: the
// service, the HSU agreement, the rollout, the day on site, the printables and
// the self-tests. This module writes the covering email that carries it —
// addressed to one named person, naming their station and their date, and
// ending with the one thing we need back from them.
//
// Pure: no secrets, no env, no network. The API route renders and sends it; the
// admin page renders the same text for a preview, so what you see is what goes.

import { SITE_URL } from "./seo";
import {
  CHECKLIST,
  SELF_TESTS,
  SELF_TEST_TARGET,
  SELF_TEST_PRICE_ISK,
  formatDate,
  type Institution,
  type Station,
} from "./station-onboarding";

/** The deck seeded by scripts/seed-innleidingarpakki.ts. */
export const INNLEIDINGARPAKKI_SLUG = "innleidingarpakki";

export const packageUrl = () => `${SITE_URL}/present/${INNLEIDINGARPAKKI_SLUG}`;

/** The printables page the contact can browse and print from directly. */
export const collateralUrl = () => `${SITE_URL}/present/collateral`;

const REPLY_TO = "fjarlaekningar@fjarlaekningar.is";

export interface PackageEmail {
  subject: string;
  heading: string;
  preheader: string;
  markdown: string;
  ctaLabel: string;
  ctaHref: string;
  footerNote: string;
  replyTo: string;
}

/** First name only — the greeting reads better and the field often holds a title too. */
function firstName(name: string): string {
  return (name || "").trim().split(/\s+/)[0] || "";
}

/**
 * The covering email for one station.
 *
 * `inst` supplies the agreement the station opens under (HSU today, another
 * institution later), so the copy never hard-codes HSU.
 */
export function buildPackageEmail(inst: Institution, station: Station): PackageEmail {
  const who = firstName(station.contact.name);
  const stationName = station.name || "stöðinni";
  const instName = inst.short || inst.name || "stofnunina";
  const date = formatDate(station.goLiveAt);
  const kr = SELF_TEST_PRICE_ISK.toLocaleString("is-IS");

  const print = CHECKLIST.find((s) => s.id === "prentefni")!.items.filter(
    (i) => !i.id.startsWith("frame_"),
  );

  // The date line does double duty: it confirms what is agreed, or it asks for
  // the one thing still missing. Either way the reader knows what to do next.
  //
  // Note on wording: station names are Icelandic place names that decline after
  // a preposition (Selfoss → "á Selfossi", Höfn → "á Höfn"), and there is no way
  // to decline an arbitrary one from a text field. So the copy addresses the
  // reader as "ykkur" wherever a preposition would be needed, and uses the name
  // only where the nominative is correct — as a subject or in apposition.
  const dateLine = date
    ? `Við stefnum á að þjónustan opni hjá ykkur **${date}**.`
    : "Það sem vantar núna er dagsetning: hvenær hentar ykkur að opna þjónustuna?";

  const heading = `Innleiðingarpakki — ${stationName}`;

  const markdown = [
    who ? `Sæl(l) ${who},` : "Sæl og blessuð,",
    "",
    `Fjarlækningar eru að hefja þjónustu á starfsstöð ykkar, ${stationName}, í samstarfi við ${instName}. Hér er innleiðingarpakkinn: allt sem stöðin þarf að vita fyrir opnun, á einum stað.`,
    "",
    dateLine,
    "",
    `[Opna innleiðingarpakkann](${packageUrl()})`,
    "",
    "## Hvað er í pakkanum",
    "",
    "- Hvað Fjarlækningar eru, hvaða erindi þjónustan leysir og að hverju við stefnum.",
    `- Samstarfið við ${instName} og hvað það þýðir fyrir stöðina.`,
    "- Innleiðingaráætlunin — fjögur skref að opnunardegi.",
    "- Dagskrá heimsóknardagsins, klukkutíma fyrir klukkutíma.",
    "- Hönnun veggspjaldsins, A4 verklagsblaðsins og ísskápskortsins.",
    `- Sjálfsprófin þrjú: ${SELF_TESTS.map((t) => t.label).join(", ")} — hvernig þau eru afhent og hvað þau kosta.`,
    "",
    "## Heimsóknardagurinn",
    "",
    "Við komum í einn dag áður en þjónustan opnar og setjumst niður með hverjum hópi fyrir sig — símahjúkrunarfræðingum, móttökuriturum, læknum og heilbrigðisgagnafræðingum. Það er fólkið sem svarar fyrstu spurningunum þegar sjúklingur hringir. Sama dag setjum við upp efnið, teljum sjálfsprófin og staðfestum opnunardaginn.",
    "",
    "## Efnið sem við komum með",
    "",
    ...print.map((i) => `- ${i.qty ? `${i.qty} ` : ""}${i.label}${i.detail ? ` — ${i.detail}` : ""}`),
    "",
    `Þið þurfið hvorki að prenta né panta neitt. Rammar fyrir veggspjöldin fylgja líka. Efnið má skoða hér: [prentefnið](${collateralUrl()}).`,
    "",
    "## Sjálfspróf",
    "",
    `Stöðin opnar með ${SELF_TEST_TARGET} pakkningum af hverju prófi. Sjúklingur biður um prófið með nafni í móttöku og greiðir ${kr} kr. fyrir pakkninguna. Sé prófið ekki til á staðnum er honum vísað á vakthafandi hjúkrunarfræðing sem tekur það — á sama gjaldi, svo enginn fer tómhentur heim.`,
    "",
    "## Það sem við þurfum frá ykkur",
    "",
    date
      ? "- Staðfestingu á að hóparnir fjórir komist á fundina á heimsóknardaginn."
      : "- Dagsetningu sem hentar fyrir heimsóknardaginn og opnun.",
    "- Fundarrými fyrir daginn og leyfi til að hengja upp veggspjöld í móttöku, biðstofu og glugga.",
    "- Pláss í móttöku fyrir sjálfsprófin og ísskápskortin.",
    "",
    `Svaraðu þessum pósti eða hafðu samband á ${REPLY_TO} — við sjáum um afganginn.`,
    "",
    "Bestu kveðjur,  ",
    "Fjarlækningar",
  ].join("\n");

  return {
    subject: `Innleiðingarpakki Fjarlækninga — ${stationName}`,
    heading,
    preheader: date
      ? `${stationName}: opnun ${date} — allt sem stöðin þarf fyrir opnun.`
      : `Allt sem ${stationName} þarf fyrir opnun — og dagsetningin sem okkur vantar.`,
    markdown,
    ctaLabel: "Opna innleiðingarpakkann",
    ctaHref: packageUrl(),
    footerNote: "Þú færð þennan póst sem tengiliður stöðvarinnar vegna innleiðingar Fjarlækninga.",
    replyTo: REPLY_TO,
  };
}

/** Why this station cannot be sent to yet, or null when it can. */
export function packageBlocker(station: Station): string | null {
  const email = (station.contact.email || "").trim();
  if (!email) return "Tengiliður stöðvarinnar er ekki með skráð netfang.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return "Netfang tengiliðar lítur ekki út fyrir að vera gilt.";
  return null;
}
