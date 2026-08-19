// Editable content model for the per-erindi landing pages (/thjonusta/<slug>).
//
// One page per medical problem, so the site can answer the searches people
// actually make ("þvagfærasýking læknir", "endurnýja lyfseðil") instead of
// putting all ten on /thjonusta.
//
// NOT LIVE BY DEFAULT. `pages_live` starts at "off": until it is switched on
// and published, /thjonusta/<slug> returns 404, the cards on /thjonusta stay
// plain (not links) and the pages are kept out of the sitemap. That way the
// draft medical text is never public and never indexed.
//
// The intro of each page defaults to the erindi's own approved scope text; the
// two lists are deliberately EMPTY, because what a doctor will and will not
// treat remotely is a clinical statement and must be written or approved by a
// Fjarlækningar doctor rather than drafted here.

import { erindi } from "@/erindi";
import { emptyDefaults, type LocaleContent, type SiteField, type SiteSection } from "./types";
import { ERINDI_ADVICE } from "./erindi-advice";

export const erindiKey = (slug: string) => slug.replace(/-/g, "_");

export const ERINDI_SECTIONS: SiteSection[] = [];

/** Extra detail already published in the /thjonusta FAQ, reused verbatim. */
const PUBLISHED_DETAIL: Record<string, string> = {
  "kvef-hosti-halsbolga": "Einfaldar öndunarfærasýkingar, hálsbólga, ennis- og kinnholusýkingar",
  "thvagfaera-leggangasykingar":
    "Þvagfærasýkingar kvenna, sveppasýkingar í leggöngum og bakteríusýkingar í leggöngum",
  njalgur: "Lausn fyrir alla fjölskyldumeðlimi",
  laeknisvottord:
    "Veikindavottorð til vinnuveitanda og skóla, tengt vandamáli sem hefur verið afgreitt í gegnum fjarlækningaþjónustuna",
};


// DRAFT descriptions of each condition, for a doctor to correct before the
// pages are switched on. Deliberately encyclopedic — what the problem is,
// typical symptoms, how common — and never diagnostic advice for the reader.
const DRAFT_ABOUT: Record<string, string> = {
  "kvef-hosti-halsbolga":
    "Kvef, hósti og hálsbólga eru algengustu ástæður þess að fólk leitar til læknis. Langflestar sýkingar í efri öndunarvegi orsakast af veirum og ganga yfir á einni til tveimur vikum án sýklalyfja.\n\nStundum liggur þó bakteríusýking að baki — til dæmis streptókokkar í hálsi eða sýking í ennis- og kinnholum — og þá getur meðferð stytt veikindin. Mat á því hvort sýklalyf eigi við byggist á einkennum, tímalengd og eftir atvikum niðurstöðu sjálfsprófs.",
  "thvagfaera-leggangasykingar":
    "Þvagfærasýkingar eru algengar hjá konum og dæmigerð einkenni eru sviði við þvaglát, tíð þvaglát og aukin þvaglátsþörf.\n\nSýkingar í leggöngum — sveppasýking eða bakteríusýking — valda oftast kláða, ertingu og breyttri útferð. Einkennin eru ólík og meðferðin sömuleiðis, svo það skiptir máli að greina á milli.",
  getnadarvorn:
    "Getnaðarvörn er hluti af reglubundinni heilsuþjónustu. Val á getnaðarvörn fer eftir aldri, heilsufari, lífsstíl og því hvað hentar hverjum og einum.\n\nSumar þurfa að skipta um getnaðarvörn vegna aukaverkana eða breyttra aðstæðna, aðrar að endurnýja það sem þegar er í notkun.",
  frjokornaofnaemi:
    "Frjókornaofnæmi er árstíðabundið ofnæmi fyrir frjókornum, á Íslandi einkum frá grasi og trjám. Einkennin eru meðal annars hnerri, nefrennsli, stíflað nef, kláði í augum og þreyta.\n\nEinkennin fylgja frjótímabilinu og geta haft veruleg áhrif á svefn, einbeitingu og daglegt líf þótt þau séu sjaldan hættuleg.",
  frunsa:
    "Frunsa (áblástur) stafar af herpes simplex veiru sem liggur í dvala í líkamanum eftir fyrstu sýkingu. Hún blossar upp aftur við álag, sólarljós, tíðahring eða aðrar sýkingar.\n\nEinkennin byrja oft á sviða eða kláða áður en litlar blöðrur koma fram, oftast á eða við vör. Meðferð gagnast mest ef hún hefst strax við fyrstu einkenni.",
  ristill:
    "Ristill stafar af sömu veiru og hlaupabóla, sem liggur í dvala í taugum eftir hlaupabólusýkingu og getur blossað upp síðar á ævinni.\n\nHann lýsir sér sem sársaukafull útbrot með blöðrum, oftast í belti öðrum megin á búknum eða í andliti. Meðferð skilar mestum árangri ef hún hefst snemma eftir að útbrot koma fram.",
  risvandamal:
    "Risvandamál eru algengari en margir gera ráð fyrir og verða algengari með hækkandi aldri. Orsakirnar geta verið líkamlegar — svo sem æða- og efnaskiptasjúkdómar eða lyf — eða tengst álagi, svefni og andlegri líðan.\n\nRisvandamál geta einnig verið fyrsta vísbendingin um undirliggjandi hjarta- og æðasjúkdóm og því er rétt að taka þau alvarlega fremur en að bíða.",
  njalgur:
    "Njálgur er algeng sníkjudýrasýking, einkum hjá börnum. Helsta einkennið er kláði við endaþarm sem er verstur á nóttunni og getur truflað svefn.\n\nSmit berst auðveldlega innan heimilis og milli barna í leikskóla eða skóla, og því er yfirleitt mælt með að allir á heimilinu fái meðferð á sama tíma.",
  lyfjuendurnyjun:
    "Þessi þjónusta er fyrir endurnýjun á allt að 3 lyfjum sem þú hefur notað áður, og getur ekki beðið eftir hefðbundna lyfjaendurnýjun. Athugaðu að ekki er hægt að endurnýja öll lyf í gegnum þessa þjónustu.\n\nSum lyf krefjast reglulegrar eftirfylgni eða samtals við þann lækni sem ávísaði þeim upphaflega — það á meðal annars við um ávanabindandi lyf, örvandi lyf og geðlyf.",
  laeknisvottord:
    "Veikindavottorð staðfestir að þú hafir verið óvinnufær eða fjarverandi vegna veikinda. Vinnuveitendur og skólar óska oft eftir vottorði eftir tiltekinn fjölda veikindadaga.\n\nVottorð er gefið út í tengslum við erindi sem hefur verið afgreitt í gegnum þjónustuna, enda byggir það á mati læknis á veikindunum sjálfum.",
};

// The two erindi where a home test is part of the assessment.
const DRAFT_SELFTEST: Record<string, string> = {
  "kvef-hosti-halsbolga": [
    "CRP-próf | /gatt/prima-crp.webp | Mælir bólgusvörun í blóði með einum dropa úr fingurgómi. Niðurstaðan hjálpar lækninum að meta hvort einkennin séu líklega af völdum veiru eða bakteríu — og þar með hvort sýklalyf eigi við.",
    "Strep-próf | /gatt/prima-strep.webp | Strok úr hálsi sem leitar að streptókokkum, algengustu bakteríunni á bak við hálsbólgu sem þarf sýklalyf. Svar fæst á nokkrum mínútum heima.",
  ].join("\n"),
  "thvagfaera-leggangasykingar":
    "Þvagpróf (stix) | /gatt/prima-thvagstix.webp | Strimli er dýft í þvagsýni og reitirnir skipta um lit eftir því hvað finnst — hvít blóðkorn, blóð, nítrít eða prótein. Læknirinn notar niðurstöðuna við mat á erindinu.",
};

/**
 * What each erindi will NOT cover, one line each. Where the answer is already
 * published elsewhere it is reused rather than rewritten: the lyfjaendurnýjun
 * list is the /thjonusta FAQ answer "Get ég endurnýjað alla lyfseðla?" reduced
 * to its exclusions, and the medication list that answer shows is rendered on
 * the page too — see ERINDI_WITH_MEDS.
 *
 * DRAFTS, except lyfjaendurnýjun and læknisvottorð, which Mads supplied. The
 * rest are written from what the site already publishes — the approved red-flag
 * list and the "frumgreining" rule on /thjonusta, plus each erindi's own stated
 * scope — and still need a doctor to sign them off before the pages go live.
 */
const DRAFT_REFER: Record<string, string> = {
  "kvef-hosti-halsbolga": [
    "Öndunarerfiðleikar, andnauð eða brjóstverkur.",
    "Erfiðleikar við að kyngja eigin munnvatni eða að opna munninn.",
    "Hár hiti með hnakkastífleika eða húðblæðingum.",
    "Einkenni sem hafa varað lengur en tíu daga eða versna eftir að bata var náð.",
  ].join("\n"),
  "thvagfaera-leggangasykingar": [
    "Hiti, hrollur eða verkur í baki eða síðu.",
    "Þungun eða grunur um þungun.",
    "Endurteknar sýkingar eða einkenni sem svara ekki meðferð.",
    "Einkenni frá þvagfærum hjá körlum — þjónustan nær til þvagfærasýkinga kvenna.",
  ].join("\n"),
  "getnadarvorn": [
    "Uppsetning eða fjarlæging á lykkju eða hormónastaf, sem krefst skoðunar.",
    "Neyðargetnaðarvörn.",
    "Ófrjósemisaðgerðir.",
    "Val á getnaðarvörn þegar meta þarf áhættuþætti með skoðun eða mælingu.",
  ].join("\n"),
  "frjokornaofnaemi": [
    "Öndunarerfiðleikar, andnauð eða versnandi astmi.",
    "Alvarleg ofnæmisviðbrögð, svo sem bjúgur í andliti eða hálsi.",
    "Ofnæmispróf, afnæming eða greining á nýju ofnæmi.",
    "Einkenni sem svara ekki ofnæmislyfjum.",
  ].join("\n"),
  "frunsa": [
    "Frumgreining — fyrsta greining þarf mat læknis með skoðun. Endurtekin einkenni sem þú þekkir má afgreiða hér.",
    "Sár eða einkenni nálægt auga.",
    "Skert ónæmiskerfi.",
    "Útbreidd sár eða merki um að sýking sé að versna.",
  ].join("\n"),
  "ristill": [
    "Frumgreining — fyrsta greining þarf mat læknis með skoðun.",
    "Útbrot nálægt auga eða í andliti.",
    "Skert ónæmiskerfi.",
    "Miklir verkir sem svara ekki verkjalyfjum.",
  ].join("\n"),
  "risvandamal": [
    "Brjóstverkur eða andnauð við áreynslu.",
    "Verkur, aflögun eða langvarandi sársaukafull stinning.",
    "Einkenni sem koma fram skyndilega eða eftir áverka.",
    "Þörf á blóðprufum eða skoðun áður en meðferð er valin.",
  ].join("\n"),
  "njalgur": [
    "Einkenni sem hverfa ekki eftir meðferð.",
    "Miklir kviðverkir, blóð í hægðum eða óútskýrt þyngdartap.",
    "Þungun eða brjóstagjöf.",
  ].join("\n"),
  lyfjuendurnyjun: [
    "Lyf sem krefjast reglulegrar eftirfylgni, t.d. blóðþrýstingslyf, hjartalyf og kvíða- og þunglyndislyf — þjónustan kemur ekki í stað reglulegs eftirlits hjá heimilislækni.",
    "Fjölnota lyfseðlar — einungis er hægt að fá einfaldan lyfseðil.",
    "Lyf sem flokkast sem ávanabindandi, örvandi eða geðlyf — við endurnýjun þeirra þarf að tala við lækninn sem hefur áður skrifað upp á þau fyrir þig.",
    "Fleiri en 3 lyf í einu erindi.",
  ].join("\n"),
  laeknisvottord: [
    "Veikindavottorð vegna erinda sem hafa ekki verið afgreidd í gegnum þessa þjónustu.",
    "Ökuvottorð.",
    "Sjúkradagpeningavottorð.",
    "Örorkuvottorð.",
    "Endurhæfingarvottorð.",
    "Önnur vottorð sem tengjast ekki erindi sem afgreitt hefur verið hjá Fjarlækningum.",
  ].join("\n"),
};

/**
 * Erindi whose page also shows the collapsible list of medications that cannot
 * be renewed. The list itself lives in the Þjónusta CMS content (meds_* fields)
 * and is shared with the FAQ, so it is only ever written in one place.
 */
export const ERINDI_WITH_MEDS = ["lyfjuendurnyjun"];

export const ERINDI_FIELDS: SiteField[] = [
  {
    key: "pages_live",
    label: "Birta erindissíður",
    group: "Birting",
    type: "choice",
    help: "Þar til kveikt er á þessu skila /thjonusta/… síður 404, kortin á /thjonusta eru ekki tenglar og síðurnar eru ekki í sitemap. Kveiktu fyrst þegar texti hvers erindis hefur verið yfirfarinn af lækni.",
    options: [
      { value: "off", label: "Falið (drög)", hint: "Enginn kemst á síðurnar." },
      { value: "on", label: "Birt", hint: "Síðurnar fara í loftið og í sitemap." },
    ],
  },

  // Shared furniture, same on every erindi page.
  { key: "eyebrow", label: "Merki fyrir ofan fyrirsögn", group: "Sameiginlegt", type: "text" },
  { key: "suitable_heading", label: "Fyrirsögn — hvað er hægt að leysa", group: "Sameiginlegt", type: "text" },
  { key: "selftest_heading", label: "Fyrirsögn — sjálfspróf", group: "Sameiginlegt", type: "text" },
  { key: "selftest_body", label: "Inngangur — sjálfspróf", group: "Sameiginlegt", type: "textarea" },
  { key: "advice_heading", label: "Fyrirsögn — almennar ráðleggingar", group: "Sameiginlegt", type: "text" },
  { key: "advice_note", label: "Fyrirvari undir ráðleggingum", group: "Sameiginlegt", type: "textarea" },
  { key: "process_heading", label: "Fyrirsögn — ferlið", group: "Sameiginlegt", type: "text" },
  { key: "refer_heading", label: "Fyrirsögn — hvenær á ekki við", group: "Sameiginlegt", type: "text" },
  {
    key: "note_heading",
    label: "Fyrirsögn — almennur fyrirvari",
    group: "Sameiginlegt",
    type: "text",
    help: "Gula spjaldið neðst á hverri erindissíðu, fyrir ofan ákallið. Sama á öllum síðum.",
  },
  { key: "note_body", label: "Texti — almennur fyrirvari", group: "Sameiginlegt", type: "textarea" },
  { key: "cta_heading", label: "Ákall — fyrirsögn", group: "Sameiginlegt", type: "heading" },
  { key: "cta_body", label: "Ákall — texti", group: "Sameiginlegt", type: "textarea" },
  { key: "cta_label", label: "Ákall — hnappur", group: "Sameiginlegt", type: "text" },
  { key: "related_heading", label: "Fyrirsögn — önnur erindi", group: "Sameiginlegt", type: "text" },

  // Per erindi.
  ...erindi.flatMap((e): SiteField[] => [
    {
      key: `${erindiKey(e.slug)}_lead`,
      label: `${e.title} — inngangur`,
      group: e.title,
      type: "textarea",
      help: "Birtist EKKI á síðunni — þetta er lýsingin sem Google sýnir í leitarniðurstöðum. Um 150 stafir.",
    },
    {
      key: `${erindiKey(e.slug)}_about`,
      label: `${e.title} — um vandamálið`,
      group: e.title,
      type: "textarea",
      help: "DRÖG — ÞARF YFIRFERÐ LÆKNIS. Opnunartexti síðunnar, beint undir fyrirsögninni: hvað vandamálið er, dæmigerð einkenni, hvað er algengt. Auð lína skilur að málsgreinar.",
    },
    {
      key: `${erindiKey(e.slug)}_selftest`,
      label: `${e.title} — sjálfspróf`,
      group: e.title,
      type: "textarea",
      help: "Eitt próf í hverja línu. Snið: Heiti | /gatt/mynd.webp | Lýsing. Skildu eftir autt til að fela kaflann.",
    },
    {
      key: `${erindiKey(e.slug)}_advice`,
      label: `${e.title} — almennar ráðleggingar`,
      group: e.title,
      type: "textarea",
      help:
        "SKRIFAÐ OG YFIRFARIÐ AF LÆKNI. Snið: \"# Kafli\" = aðalkafli, \"## Fyrirsögn\" = undirfyrirsögn, \"!! Varúð…\" = viðvörunarkassi, " +
        "\"- atriði\" = punktur. Lína beint undir punkti er skýring hans og birtist með honum; auð lína slítur tenginguna. " +
        "\"++ Góð ráð\" og \"-- Varast skal\" hlið við hlið verða að grænu og rauðu spjaldi með haki og krossi.",
    },
    {
      key: `${erindiKey(e.slug)}_suitable`,
      label: `${e.title} — hvað er hægt að leysa (ein lína í hverja línu)`,
      group: e.title,
      type: "textarea",
      help: "ÞARF YFIRFERÐ LÆKNIS. Ein setning í hverja línu.",
    },
    {
      key: `${erindiKey(e.slug)}_refer`,
      label: `${e.title} — hvenær er vísað áfram (ein lína í hverja línu)`,
      group: e.title,
      type: "textarea",
      help: "ÞARF YFIRFERÐ LÆKNIS. Skildu eftir autt til að nota almenna textann að ofan.",
    },
  ]),
];

export const ERINDI_DEFAULTS_IS: LocaleContent = {
  pages_live: "off",
  eyebrow: "Algeng erindi",
  suitable_heading: "Hvað er hægt að leysa?",
  selftest_heading: "Sjálfspróf heima",
  selftest_body:
    "Þú sækir prófið á næsta afhendingarstað, tekur það heima og skráir niðurstöðuna í sjúklingagáttina. Læknir metur hana með svörunum þínum.",
  advice_heading: "Almennar ráðleggingar",
  advice_note:
    "Ráðleggingarnar hér að ofan eru almennar og koma ekki í stað læknisráðgjafar. Leitaðu til læknis ef einkenni versna eða ganga ekki yfir.",
  process_heading: "Svona virkar það",
  refer_heading: "Hvenær á þjónustan ekki við?",
  note_heading: "Athugaðu",
  // Verbatim from the published /thjonusta "Hvenær hentar ekki" band.
  note_body:
    "Fjarlækningar leysa einföld og afmörkuð erindi. Sum erindi þarfnast skoðunar, rannsóknar eða bráðaþjónustu — og þeim er vísað í annan farveg. Í bráðatilfellum hringdu í 112.",
  cta_heading: "Sendu inn erindi",
  cta_body:
    "Þú skráir þig inn með rafrænum skilríkjum og svarar stuttum spurningalista. Læknir metur málið og leggur til meðferð.",
  cta_label: "Opna sjúklingagátt",
  related_heading: "Önnur erindi",
  ...Object.fromEntries(
    erindi.flatMap((e) => [
      [`${erindiKey(e.slug)}_lead`, e.description],
      [`${erindiKey(e.slug)}_about`, DRAFT_ABOUT[e.slug] ?? ""],
      [`${erindiKey(e.slug)}_selftest`, DRAFT_SELFTEST[e.slug] ?? ""],
      [`${erindiKey(e.slug)}_advice`, ERINDI_ADVICE[e.slug] ?? ""],
      [`${erindiKey(e.slug)}_suitable`, PUBLISHED_DETAIL[e.slug] ?? ""],
      [`${erindiKey(e.slug)}_refer`, DRAFT_REFER[e.slug] ?? ""],
    ]),
  ),
};

export const ERINDI_DEFAULTS_EN: LocaleContent = {
  ...emptyDefaults(ERINDI_FIELDS),
  ...Object.fromEntries(erindi.map((e) => [`${erindiKey(e.slug)}_lead`, e.descriptionEn])),
};

/** Are the pages switched on? Anything but "on" keeps them dark. */
export const erindiPagesLive = (c: LocaleContent) => c.pages_live === "on";
