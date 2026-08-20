// Seed (or refresh) the "Innleiðingarpakki" deck — what a new heilsugæslustöð
// gets sent before Fjarlækningar opens there.
//
// The deck is the package itself: what the service is and why, the HSU
// agreement it sits under, the rollout plan, the schedule for the day we spend
// on site, the artwork that goes on the walls, and how the self-tests reach a
// patient. It is a sibling of the HSU/HSN pitch deck rather than a copy of it —
// same brand and voice, but written for the people who will run the service
// rather than for the people deciding whether to buy it.
//
// Run: npx tsx scripts/seed-innleidingarpakki.ts   (reads .env.local)
// Idempotent: re-running REPLACES the deck's slides in place, keeping the slug
// and id (so uploaded artwork under presentation-assets/<id>/ stays valid).

import { readFileSync, existsSync } from "node:fs";
import {
  CHECKLIST,
  SELF_TESTS,
  SELF_TEST_TARGET,
  SELF_TEST_PRICE_ISK,
  SELF_TEST_FLOW,
} from "../src/lib/station-onboarding";
import type { PresentationData, Slide } from "../src/lib/presentations/types";

// Minimal .env.local loader (same as scripts/seed-fjar-decks.ts).
try {
  const raw = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
  for (const line of raw.split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
} catch {}

const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("✗ Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}
const headers = { apikey: key!, Authorization: `Bearer ${key}`, "Content-Type": "application/json" };

export const DECK_SLUG = "innleidingarpakki";
const DECK_TITLE = "Innleiðingarpakki — ný heilsugæslustöð";

/** Reused from the HSU/HSN deck so both decks open on the same photograph. */
const TITLE_BG =
  "https://atpgtvzyqibsoalzrctb.supabase.co/storage/v1/object/public/presentation-assets/ea74ffa8-a82d-4925-a724-7a464e636926/title-bg.png";

const kr = SELF_TEST_PRICE_ISK.toLocaleString("is-IS");

// Artwork uploaded by scripts/upload-innleidingarpakki-art.ts into this deck's
// own storage folder. Empty on the very first run — the deck is seeded, the art
// is uploaded against its id, and this seed is run again to fill the slides in.
function art(): { poster: string; sheet: string; fridge: string } {
  const manifest = new URL("./innleidingarpakki-art.json", import.meta.url);
  const blank = { poster: "", sheet: "", fridge: "" };
  if (!existsSync(manifest)) return blank;
  try {
    return { ...blank, ...(JSON.parse(readFileSync(manifest, "utf8")) as Record<string, string>) };
  } catch {
    return blank;
  }
}
const ART = art();

const B = "fjarlaekningar" as const;

/**
 * The day on site. Written as clock times rather than "morning/afternoon"
 * because the station has to fit it around its own clinics, and a contact
 * person needs something they can put straight into a calendar.
 */
const DAY_SCHEDULE = [
  "09:00 · Stutt kynning fyrir stjórnendur stöðvarinnar — yfirferð dagsins og hvað breytist.",
  "09:30 · Símahjúkrunarfræðingar — hverjum er vísað á Fjarlækningar og hvað er sagt í símann.",
  "10:45 · Móttökuritarar — ísskápskortin, sjálfsprófin, verðið og hvað er gert ef prófið er ekki til.",
  "12:00 · Hádegishlé.",
  "13:00 · Læknar — vandamálalistinn, rauð flögg og hvað kemur til baka í sjúkraskrá.",
  "14:15 · Heilbrigðisgagnafræðingar — skráning, greiningarkóðar og tölfræði.",
  "15:00 · Efnið upp á vegg — veggspjöld römmuð og hengd, gluggaspjöld sett upp, verklagsblöð plastuð.",
  "16:00 · Sjálfspróf talin og gengið frá birgðum í móttöku.",
  "16:30 · Yfirferð dagsins og opnunardagur staðfestur.",
];

/** The print run, read straight off the onboarding checklist so the two agree. */
const PRINT_ITEMS = CHECKLIST.find((s) => s.id === "prentefni")!
  .items.filter((i) => !i.id.startsWith("frame_"))
  .map((i) => `${i.qty ?? ""} ${i.label}${i.detail ? ` — ${i.detail}` : ""}`.trim());

const SLIDES: Slide[] = [
  {
    id: "ip-title",
    type: "title",
    theme: "dark",
    brand: B,
    kicker: "Fjarlækningar × HSU · Innleiðingarpakki",
    heading: "Þjónustan opnar á ==þinni stöð.==",
    lead:
      "Allt sem stöðin þarf að vita áður en Fjarlækningar fara í loftið: hvað þjónustan er, hvað gerist á heimsóknardaginn, hvaða efni kemur upp á vegg og hvernig sjálfsprófin ganga fyrir sig.",
    tagline: "www.fjarlaekningar.is",
    bg: TITLE_BG,
  },
  {
    id: "ip-um",
    type: "bullets",
    theme: "dark",
    brand: B,
    kicker: "Um Fjarlækningar",
    heading: "Íslensk fjarlækningaþjónusta fyrir ==einföld og afmörkuð erindi.==",
    lead:
      "Sama þjónusta og á læknastofu, sömu spurningar og sömu vandamál, en skilvirkari leið til að leysa þau og styttri biðlistar.",
    bullets: [
      "Sjúklingur svarar spurningalista heima eða þar sem hann er staddur — læknir svarar erindum innan tveggja klukkustunda.",
      "Spurningalistar eru sérhannaðir í samstarfi við íslenska sérfræðilækna. Ferlið er hannað eins og viðtal við lækni.",
      "Læknir leggur til meðferð út frá svörum og læknisfræðilegu mati — lyfseðill fer rafrænt í lyfjagátt sjúklings.",
      "Sjálfspróf heima þegar þau bæta greiningu. Niðurstaðan er skráð beint í kerfið og styður við greiningu læknis.",
    ],
    footnote: "Erindin eru afmörkuð og skýr. Allt annað fer áfram í hefðbundna þjónustu stöðvarinnar.",
  },
  {
    id: "ip-markmid",
    type: "cards",
    theme: "dark",
    brand: B,
    kicker: "Að hverju við stefnum",
    heading: "Léttum álagi af stöðinni,\n==án þess að missa yfirsýn.==",
    columns: 3,
    cards: [
      {
        icon: "list-checks",
        title: "Minna álag á heilsugæsluna",
        body: "Einföld erindi færast úr símatímum og af dagskrá lækna. Tími losnar fyrir flóknari mál sem krefjast skoðunar.",
      },
      {
        icon: "timer-reset",
        title: "Styttri bið",
        body: "Flest erindi eru afgreidd innan tveggja klukkustunda. Biðlistar eftir lækni og símatímar styttast.",
      },
      {
        icon: "locate-fixed",
        title: "Óháð staðsetningu",
        body: "Erindin eru leyst í gegnum sjúklingagáttina. Mönnun á einstökum starfsstöðvum hættir að vera flöskuháls.",
      },
      {
        icon: "file-warning",
        title: "Innbyggt öryggisnet",
        body: "Rauð flögg í spurningalistunum vísa sjúklingum með alvarleg einkenni strax í rétta þjónustu hjá heilsugæslunni.",
      },
      {
        icon: "shield-check",
        title: "Skráning í sjúkraskrá",
        body: "Hvert erindi er skráð með greiningarkóða svo hægt sé að fylgjast með svörum, meðferð og árangri.",
      },
      {
        icon: "spark",
        title: "Engin tæknileg innleiðing",
        body: "Kerfið er tilbúið. Stöðin þarf hvorki nýjan hugbúnað né uppsetningu — aðeins fólkið upplýst og efnið upp á vegg.",
      },
    ],
    footnote: "Markmiðið er ekki að taka verkefni af stöðinni, heldur að taka af henni þau sem þurfa ekki að vera þar.",
  },
  {
    id: "ip-erindi",
    type: "cards",
    theme: "light",
    brand: B,
    kicker: "Vandamálalistinn",
    heading: "Erindin sem sjúklingar geta ==sent inn.==",
    columns: 4,
    cards: [
      { icon: "lungs", title: "Kvef, hósti og hálsbólga", body: "CRP- eða strep-sjálfspróf notað þegar það bætir greiningu." },
      { icon: "flower-2", title: "Frjókornaofnæmi", body: "Árstíðabundið ofnæmi." },
      { icon: "circle-dot", title: "Frunsa", body: "Meðferð við endurtekinni frunsu." },
      { icon: "circle-dot-dashed", title: "Ristill á húð", body: "Meðferð við endurteknum ristli." },
      { icon: "tablets", title: "Getnaðarvörn", body: "Fyrsta ávísun, endurnýjun eða breyting." },
      { icon: "venus", title: "Þvagfærasýkingar", body: "Þvagstix notað í upplýsingasöfnun." },
      { icon: "venus", title: "Sveppasýking í leggöngum", body: "Greining og meðferð." },
      { icon: "venus", title: "Bakteríusýking í leggöngum", body: "Greining og meðferð." },
      { icon: "mars", title: "Risvandamál", body: "Mat og meðferð." },
      { icon: "worm", title: "Njálgur", body: "Greining og meðferð." },
      { icon: "file-check", title: "Læknisvottorð", body: "Vottorð tengt erindi sem leyst hefur verið hjá Fjarlækningum." },
      { icon: "pill", title: "Lyfjaendurnýjun", body: "Föst lyf, að ávanabindandi lyfjum undanskildum." },
    ],
    footnote: "Frumgreining nýrra vandamála, bráð einkenni og allt sem krefst skoðunar fer áfram í hefðbundna þjónustu.",
  },
  {
    id: "ip-tolur",
    type: "stats",
    theme: "light",
    brand: B,
    kicker: "Hverju sjúklingurinn tekur eftir",
    heading: "Aukið aðgengi fyrir sjúklinga,\n==hagræðing== fyrir stöðina.",
    stats: [
      { value: "2 klst.", label: "Flest erindi afgreidd innan tveggja klukkustunda á opnunartíma." },
      { value: "0 km", label: "Engin óþarfa ferðalög — þjónustan er sótt þar sem sjúklingurinn er." },
      { value: "10–22", label: "Opið alla daga. Beiðnum sem berast eftir kl. 22 er svarað daginn eftir." },
    ],
    footnote: "Sjúklingur greiðir ekki ef honum er vísað frá.",
  },
  {
    id: "ip-ferli",
    type: "steps",
    theme: "light",
    brand: B,
    kicker: "Ferlið",
    heading: "Frá erindi til ==niðurstöðu.==",
    steps: [
      { title: "Sjúklingur velur erindi af vandamálalista", body: "Skráir sig inn með rafrænum skilríkjum og fer í viðeigandi ferli eftir einkennum." },
      { title: "Sjúklingur svarar spurningalista", body: "Markvissar spurningar um einkenni, ásamt sjálfsprófi þegar það á við." },
      { title: "Öryggisnetið metur svörin", body: "Bendi svörin til alvarlegra veikinda fær sjúklingur strax leiðbeiningar um rétt úrræði og erindinu er lokað." },
      { title: "Læknir metur erindið", body: "Fer yfir svörin og leggur til viðeigandi meðferð út frá sínu mati. Engin meðferð án mats læknis." },
      { title: "Niðurstaða, ráðleggingar og lyfseðill", body: "Sjúklingur fær skriflega niðurstöðu og fræðsluefni. Lyfseðill fer rafrænt í lyfjagátt." },
    ],
  },
  {
    id: "ip-hsu",
    type: "fan",
    theme: "light",
    brand: B,
    kicker: "Samstarfið",
    heading: "Undir samningnum við ==HSU.==",
    lead:
      "Fjarlækningar starfa í eins árs tilraunasamstarfi við Heilbrigðisstofnun Suðurlands. Stöðvarnar opna ein af annarri undir sama samningi — hver stöð þarf því hvorki eigin samning né eigin uppsetningu.",
    fan1Title: "Það sem liggur fyrir",
    fan1Icon: "handshake",
    fan1: [
      {
        value: "Samningurinn er í gildi",
        body: "HSU er fyrsti samstarfsaðili Fjarlækninga meðal opinberra heilbrigðisstofnana. Vestmannaeyjar eru fyrsta stöðin sem opnaði.",
      },
      {
        value: "Erindum létt af heilsugæslunni",
        body: "Sjúklingum er vísað í sjúklingagátt Fjarlækninga fyrir erindi af vandamálalistanum. Læknar Fjarlækninga afgreiða þau þar.",
      },
    ],
    fan2Title: "Það sem stöðin gerir",
    fan2Icon: "hospital",
    fan2: [
      {
        value: "Þrennt, og ekkert umfram það",
        body: "Innleiðingin á hverri stöð snýst um þrjá hluti.",
        points:
          "Einn dagur með starfsfólkinu sem svarar fyrstu spurningunum.\nEfnið upp á vegg og ísskápskort í móttöku.\nSjálfspróf á hillu og móttökuritarar sem þekkja ferlið.",
      },
    ],
  },
  {
    id: "ip-plan",
    type: "timeline",
    theme: "dark",
    brand: B,
    kicker: "Innleiðingin",
    heading: "Fjögur skref að ==opnunardegi.==",
    nodes: [
      { icon: "calendar-check", title: "Dagsetning valin", body: "Stöðin og Fjarlækningar velja heimsóknardag og opnunardag. Tengiliður stöðvarinnar skráður." },
      { icon: "printer", title: "Efni og birgðir pantað", body: "Prentefnið framleitt og rammar keyptir. Sjálfspróf pöntuð frá Heilsu og send á stöðina." },
      { icon: "users", title: "Heimsóknardagurinn", body: "Einn dagur á staðnum með hverjum starfshópi fyrir sig. Efnið sett upp og birgðir taldar." },
      { icon: "rocket", title: "Opnun", body: "Þjónustan opnar fyrir skjólstæðinga stöðvarinnar. Fjarlækningar fylgjast með fyrstu vikunum og svara spurningum." },
    ],
    lead: "Frá því dagsetning er valin þar til stöðin opnar líða að jafnaði tvær til fjórar vikur — mest af því er afgreiðslutími á prentun og birgðum.",
  },
  {
    id: "ip-dagur",
    type: "checklist",
    theme: "dark",
    brand: B,
    kicker: "Heimsóknardagurinn",
    heading: "Dagskrá dagsins á ==stöðinni.==",
    // One column: the checklist grid fills row-wise, so two columns would read
    // 09:00, 10:45, 13:00 … down the left and the rest down the right. A
    // schedule has to read in order.
    columns: 1,
    items: DAY_SCHEDULE,
  },
  {
    id: "ip-hopar",
    type: "cards",
    theme: "light",
    brand: B,
    kicker: "Heimsóknardagurinn",
    heading: "Fjórir hópar, ==fjögur samtöl.==",
    columns: 2,
    cards: [
      {
        icon: "phone-call",
        title: "Símahjúkrunarfræðingar",
        body: "Fyrsta röddin sem sjúklingur heyrir. Farið yfir hvaða erindi eiga heima hjá Fjarlækningum, hvernig þeim er vísað þangað og hvað er sagt þegar sjúklingur spyr hvort þetta kosti eitthvað.",
      },
      {
        icon: "clipboard-list",
        title: "Móttökuritarar",
        body: `Afhenda ísskápskortin og sjálfsprófin. Farið yfir prófin þrjú, verðið (${kr} kr. pakkningin) og hvað er gert þegar prófið er ekki til á staðnum.`,
      },
      {
        icon: "stethoscope",
        title: "Læknar",
        body: "Vandamálalistinn, rauð flögg og hvað telst afmarkað erindi. Farið yfir hvað kemur til baka í sjúkraskrá og hvenær erindi er vísað aftur á stöðina.",
      },
      {
        icon: "database",
        title: "Heilbrigðisgagnafræðingar",
        body: "Skráning erinda, ICD-greiningarkóðar og hvernig gögnin nýtast í gæðaeftirlit, tölfræði og uppgjör tilraunaverkefnisins.",
      },
    ],
    footnote: "Sest niður með hverjum hópi fyrir sig — það er fólkið sem svarar fyrstu spurningunum þegar sjúklingur hringir.",
  },
  {
    id: "ip-prentefni",
    type: "checklist",
    theme: "dark",
    brand: B,
    kicker: "Prentefni",
    heading: "Efnið sem kemur með ==í ferðinni.==",
    columns: 2,
    items: [
      ...PRINT_ITEMS,
      "4× svartir rammar 30×40 cm og 4× 40×50 cm frá JYSK — keyptir og settir upp á staðnum.",
    ],
  },
  {
    id: "ip-veggspjald",
    type: "story",
    theme: "light",
    brand: B,
    kicker: "Prentefni · Veggspjald",
    heading: "Veggspjaldið fyrir ==biðstofuna.==",
    lead:
      "Fyrir sjúklinga. Segir hvað þjónustan er, hvaða erindi hún nær yfir og hvernig maður byrjar — með QR-kóða sem opnar sjúklingagáttina beint.",
    bullets: [
      "Prentað í tveimur stærðum: 30×40 cm og 40×50 cm, fjögur eintök af hvorri.",
      "Sett í svartan ramma og hengt upp í móttöku, biðstofu og á gangi.",
      "A4-útgáfa af sama spjaldi fer í glugga þar sem við á — fjögur eintök.",
      "Merkt HSU, svo sjúklingur sjái strax að þetta er þjónusta á vegum stöðvarinnar.",
    ],
    photo: ART.poster,
    caption: "Veggspjald 40×50 cm — sama hönnun í öllum stærðum.",
  },
  {
    id: "ip-verklagsblad",
    type: "story",
    theme: "light",
    brand: B,
    kicker: "Prentefni · Verklagsblað",
    heading: "A4 verklagsblaðið fyrir ==starfsfólkið.==",
    lead:
      "Fyrir heilbrigðisstarfsfólk, ekki sjúklinga. Prentað og plastað, geymt við símann og í móttökunni. Svarar spurningunni sem kemur oftast: á þetta erindi heima hjá Fjarlækningum?",
    bullets: [
      "Framhlið: græni listinn með erindunum sem henta vel og rauði listinn með því sem á ekki heima hjá okkur.",
      "Bakhlið: lyfin sem eru ekki endurnýjuð hjá Fjarlækningum — eftirritunarskyld lyf, benzódíazepín, ADHD-lyf og fleira.",
      "Þrjár leiðir til að vísa sjúklingi á þjónustuna — vefslóð, beinn tengill og QR-kóði.",
      "Sérstakt blað fylgir fyrir móttökuritara um afhendingu sjálfsprófa.",
    ],
    photo: ART.sheet,
    caption: "A4 verklagsblað — prentað tvíhliða og plastað.",
  },
  {
    id: "ip-isskapskort",
    type: "story",
    theme: "light",
    brand: B,
    kicker: "Prentefni · Ísskápskort",
    heading: "Ísskápskortið sem sjúklingur ==tekur með sér heim.==",
    lead:
      "A6, tvíhliða og plastað. Fimmtíu eintök liggja frammi í móttöku. Kortið fer á ísskápinn heima og er þar þegar á þarf að halda — sem er sjaldnast sama dag og það var tekið.",
    bullets: [
      "Framhliðin: merkið og QR-kóðinn sem opnar sjúklingagáttina.",
      "Bakhliðin: vandamálalistinn með myndmerkjum, svo hann sé lesinn í einu augnkasti.",
      "Neðst er skýr viðvörun um að alvarleg einkenni eigi að fara í hefðbundna læknisþjónustu, 1700 eða 112.",
      "Endurpantað frá Fjarlækningum þegar birgðir klárast.",
    ],
    photo: ART.fridge,
    caption: "A6 ísskápskort — framhlið og bakhlið.",
  },
  {
    id: "ip-sjalfsprof",
    type: "cards",
    theme: "light",
    brand: B,
    kicker: "Sjálfspróf",
    heading: "Þrjú próf á ==hillunni í móttöku.==",
    columns: 3,
    cards: [
      {
        icon: "droplet",
        title: SELF_TESTS[0].label,
        body: "Notað við kvef, hósta og hálsbólgu þegar læknir þarf að vita hvort um bakteríusýkingu sé að ræða.",
      },
      {
        icon: "swatch-book",
        title: SELF_TESTS[1].label,
        body: "Hraðpróf við streptókokkum í hálsi. Styður ákvörðun læknis um sýklalyf.",
      },
      {
        icon: "flask-conical",
        title: SELF_TESTS[2].label,
        body: "Notað við grun um þvagfærasýkingu. Sjúklingur skráir niðurstöðuna beint í sjúklingagáttina.",
      },
    ],
    footnote: `Stöðin opnar með ${SELF_TEST_TARGET} pakkningum af hverju prófi. Prófin eru pöntuð frá Heilsu og birgðastaðan skráð hjá Fjarlækningum.`,
  },
  {
    id: "ip-sjalfsprof-ferli",
    type: "steps",
    theme: "dark",
    brand: B,
    kicker: "Sjálfspróf",
    heading: `Hvernig prófið kemst til ==sjúklings.==`,
    steps: SELF_TEST_FLOW.map((line, i) => ({
      title: [
        "Læknir metur hvort próf þurfi",
        "Sjúklingur biður um prófið með nafni",
        "Móttökuritari afhendir og innheimtir",
        "Sé prófið ekki til — hjúkrunarfræðingur tekur það",
        "Niðurstaðan skráð og erindinu lokið",
      ][i],
      body: line,
    })),
  },
  {
    id: "ip-fra-stodinni",
    type: "checklist",
    theme: "light",
    brand: B,
    kicker: "Það sem við þurfum",
    heading: "Fjögur atriði frá ==stöðinni.==",
    columns: 1,
    items: [
      "Tengiliður á stöðinni — sá sem við hringjum í og sem svarar spurningum starfsfólksins eftir opnun.",
      "Dagsetning fyrir heimsóknardaginn, og staðfesting á að hóparnir fjórir komist á fundina.",
      "Fundarrými fyrir daginn og leyfi til að hengja upp veggspjöld í móttöku, biðstofu og glugga.",
      "Pláss í móttöku fyrir sjálfsprófin og ísskápskortin, og móttökuritari sem heldur utan um birgðirnar.",
    ],
  },
  {
    id: "ip-closing",
    type: "closing",
    theme: "dark",
    brand: B,
    kicker: "Næstu skref",
    heading: "Veljum ==opnunardaginn.==",
    lead:
      "Þegar dagsetningin liggur fyrir sjáum við um afganginn: prentefnið, rammana, sjálfsprófin og daginn á staðnum. Svaraðu þessum pósti með dagsetningu sem hentar stöðinni.",
    tagline: "fjarlaekningar@fjarlaekningar.is · www.fjarlaekningar.is",
    bg: TITLE_BG,
  },
];

async function main() {
  const existing = (await fetch(
    `${url}/rest/v1/presentation_decks?slug=eq.${DECK_SLUG}&select=id`,
    { headers },
  ).then((r) => r.json())) as { id: string }[];

  const data: PresentationData = { slides: SLIDES, design: "fjarlaekningar", tIs: {} };

  if (Array.isArray(existing) && existing.length) {
    const id = existing[0].id;
    const res = await fetch(`${url}/rest/v1/presentation_decks?id=eq.${id}`, {
      method: "PATCH",
      headers: { ...headers, Prefer: "return=representation" },
      body: JSON.stringify({ title: DECK_TITLE, data, is_published: true }),
    });
    if (!res.ok) {
      console.error(`✗ update ${DECK_SLUG}: ${res.status} ${await res.text()}`);
      process.exit(1);
    }
    console.log(`✓ updated: ${DECK_TITLE} (${SLIDES.length} slides) → /present/${DECK_SLUG}`);
    console.log(`  deck id: ${id}`);
    return;
  }

  const res = await fetch(`${url}/rest/v1/presentation_decks`, {
    method: "POST",
    headers: { ...headers, Prefer: "return=representation" },
    body: JSON.stringify({
      slug: DECK_SLUG,
      title: DECK_TITLE,
      template_version: "standard-v2",
      data,
      is_published: true,
    }),
  });
  if (!res.ok) {
    console.error(`✗ create ${DECK_SLUG}: ${res.status} ${await res.text()}`);
    process.exit(1);
  }
  const [row] = (await res.json()) as { id: string }[];
  console.log(`✓ created: ${DECK_TITLE} (${SLIDES.length} slides) → /present/${DECK_SLUG}`);
  console.log(`  deck id: ${row.id}`);
}

// Only seed when run directly — the upload script imports DECK_SLUG from here.
if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, "/").split("/").pop()!)) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
