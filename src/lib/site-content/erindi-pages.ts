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

/** CMS key holding an erindi's heading. */
export const erindiTitleKey = (slug: string) => `${erindiKey(slug)}_title`;

/**
 * An erindi's heading: the CMS value if one is set, otherwise the code string.
 *
 * Every surface that prints an erindi title goes through here — the page's own
 * h1, the cards on /thjonusta and the front page, the related links, the admin
 * preview. That is the point: the titles lived only in erindi.ts precisely so
 * those four could not drift apart, so making them editable in one place means
 * every one of them has to read that place.
 */
export function erindiTitle(
  c: Record<string, string> | null | undefined,
  slug: string,
  fallback: string,
): string {
  return c?.[erindiTitleKey(slug)]?.trim() || fallback;
}

export const ERINDI_SECTIONS: SiteSection[] = [];

/** Extra detail already published in the /thjonusta FAQ, reused verbatim. */
const PUBLISHED_DETAIL: Record<string, string> = {
  "hudvandamal-utbrot": [
    "Exem, þurrkur og kláði",
    "Psoriasis sem þegar hefur verið greindur",
    "Unglingabólur og rósroði",
    "Sveppasýkingar í húð og nöglum",
    "Ofnæmisútbrot og snertiexem",
    "Skordýrabit og vægar húðsýkingar",
    "Vörtur og önnur afmörkuð húðvandamál",
  ].join("\n"),
  "augnsykingar-augnlokavandamal": [
    "Hvarmabólga — roði, flögnun og skorpur á augnlokabrún",
    "Vogrís og hvarmakýli — hnútur á augnloki",
    "Óbrotin tárubólga — rautt auga með útferð, óbreyttri sjón og engum verk",
    "Þurrkur og erting í augum",
  ].join("\n"),
  "almenn-laeknisthjonusta": [
    "Væg og afmörkuð einkenni sem þú vilt fá mat á",
    "Þekkt vandamál sem hefur breyst eða versnað",
    "Spurningar um lyf, skammta eða aukaverkanir",
    "Niðurstöður úr rannsókn sem þú vilt fá útskýrðar",
    "Vottorð vegna erindis sem þegar hefur verið afgreitt hjá okkur",
  ].join("\n"),
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
  "hudvandamal-utbrot": `Húðvandamál eru meðal algengustu erinda í heilsugæslu. Undir þau falla exem, psoriasis, unglingabólur, rósroði, sveppasýkingar, ofnæmisútbrot, skordýrabit og vörtur — ólík vandamál sem eiga það sameiginlegt að sjást utan á líkamanum.

Einkennin eru oftast kláði, roði, flögnun, þurrkur eða útbrot sem breiðast út. Sum ganga yfir af sjálfu sér á nokkrum dögum, önnur eru langvinn og koma og fara árum saman.

Húðvandamál henta vel til mats í fjarþjónustu, því útlit húðarinnar er stór hluti matsins. Þess vegna fylgir mynd alltaf erindi um húð.`,
  "augnsykingar-augnlokavandamal": `Roði, kláði og útferð úr augum eru meðal algengustu augnvandamála, og langflest þeirra eru væg og ganga yfir.

Hvarmabólga er bólga í augnlokabrúninni sem veldur roða, flögnun og skorpum, sérstaklega á morgnana. Hún er langvinn og kemur oft aftur. Vogrís og hvarmakýli eru hnútar á augnloki sem myndast þegar kirtill stíflast — vogrís er aumur og kemur snöggt, hvarmakýli er oftast verkjalaust og lengur að hverfa. Tárubólga er bólga í slímhúðinni sem þekur augnhvítuna og innra borð augnloksins, oftast af völdum veiru en stundum baktería eða ofnæmis.

Þessi vandamál eiga það sameiginlegt að sjást utan á auganu og að sjónin helst óbreytt. Versni sjónin, verki augað eða þolir þú illa ljós er málið annars eðlis og þarf skoðun.`,
  "almenn-laeknisthjonusta": `Sum erindi falla ekki undir neinn tiltekinn flokk. Það getur verið einkenni sem erfitt er að setja nafn á, spurning um lyf, niðurstaða úr rannsókn sem þú vilt fá útskýrða, eða vandamál sem hefur fylgt þér um hríð án þess að skýrast.

Almenn læknisþjónusta er opinn flokkur fyrir slík erindi. Þú lýsir vandamálinu með þínum eigin orðum og svarar nokkrum spurningum sem hjálpa lækninum að meta málið — hversu lengi það hefur staðið, hvernig það hefur þróast, hvaða lyf þú notar og hvað þú hefur þegar reynt.

Læknir les erindið og metur það. Niðurstaðan getur verið ráðgjöf, meðferð, beiðni um rannsókn, eða tilvísun í hefðbundna þjónustu ef málið þarf skoðun.`,
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
  "hudvandamal-utbrot": [
    "Fæðingarblettur eða húðbreyting sem hefur stækkað, breytt um lit eða lögun, blæðir eða veldur kláða.",
    "Sár sem hefur ekki gróið á fjórum vikum, eða sár á fæti hjá einstaklingi með sykursýki.",
    "Brunasár og bit eftir dýr eða menn.",
    "Útbrot sem hverfa ekki þegar þrýst er á þau, ásamt hita.",
    "Roði sem breiðist hratt út ásamt hita, eða húð sem flagnar af eftir að nýtt lyf var byrjað.",
    "Húðvandamál sem þarf að taka sýni úr, frysta eða skera í.",
  ].join("\n"),
  "augnsykingar-augnlokavandamal": [
    "Sjón sem hefur versnað eða orðið þokukennd.",
    "Verkur í auganu, ekki bara sviði eða aðskotatilfinning.",
    "Ljósfælni.",
    "Rautt auga hjá þeim sem nota augnlinsur — það þarf skoðun samdægurs.",
    "Áverki á auga, aðskotahlutur eða efni sem fór í augað.",
    "Blöðruútbrot á enni, augnloki eða nefbroddi.",
    "Auga sem stendur út, tvísýni eða skert augnhreyfing.",
    "Barn yngra en eins mánaðar með rautt auga eða útferð.",
  ].join("\n"),
  "almenn-laeknisthjonusta": [
    "Bráð eða alvarleg einkenni — hringdu í 112 eða Læknavaktina í 1700.",
    "Einkenni sem þarf að skoða, hlusta eða þreifa til að meta.",
    "Ávana- og fíknilyf, svefnlyf, róandi lyf og ADHD-lyf.",
    "Vottorð aftur í tímann fyrir veikindi sem enginn læknir hefur metið.",
    "Ný greining á flóknu eða langvinnu vandamáli sem krefst eftirfylgni.",
  ].join("\n"),
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
    label: "Birta þjónustusíður",
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
      key: erindiTitleKey(e.slug),
      label: `${e.title} — fyrirsögn`,
      group: e.title,
      type: "text",
      help: "Fyrirsögn síðunnar. Sama heiti birtist á kortunum á /thjonusta og forsíðunni, svo þau haldist í takt.",
    },
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
      [erindiTitleKey(e.slug), e.title],
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

  // Shared furniture. One translation each, reused by all thirteen pages, so
  // this is the cheapest English on the site by a wide margin.
  eyebrow: "Common problems",
  suitable_heading: "What can be handled here?",
  selftest_heading: "Home tests",
  selftest_body:
    "You collect the test from your nearest pick-up point, take it at home and record the result in the patient portal. A doctor reads it alongside your answers.",
  advice_heading: "General advice",
  advice_note:
    "The advice above is general and does not replace medical consultation. See a doctor if your symptoms get worse or do not clear up.",
  refer_heading: "When is this service not suitable?",
  note_heading: "Please note",
  note_body:
    "Fjarlækningar handles simple, clearly defined problems. Some need an examination, further investigation or emergency care, and those are directed elsewhere. In an emergency, call 112.",
  cta_heading: "Send in your case",
  cta_body:
    "You sign in with electronic ID and answer a short questionnaire. A doctor assesses your case and proposes treatment.",
  cta_label: "Open the patient portal",
  related_heading: "Other problems",

  // Per erindi. Red-flag lists are translated line for line rather than
  // paraphrased: each line is a safety instruction, and dropping or merging one
  // changes what a reader is told to act on.
  kvef_hosti_halsbolga_refer: [
    "Difficulty breathing, shortness of breath or chest pain.",
    "Difficulty swallowing your own saliva, or trouble opening your mouth.",
    "High fever with a stiff neck or bleeding into the skin.",
    "Symptoms lasting more than ten days, or getting worse after you had begun to recover.",
  ].join("\n"),
  thvagfaera_leggangasykingar_selftest:
    "Urine test (dipstick) | /gatt/prima-thvagstix.webp | A strip is dipped into a urine sample and the pads change colour according to what is found — white blood cells, blood, nitrites or protein. The doctor uses the result when assessing your case.",
  thvagfaera_leggangasykingar_suitable:
    "Urinary tract infections in women, vaginal yeast infections and bacterial vaginal infections",
  thvagfaera_leggangasykingar_refer: [
    "Fever, chills, or pain in your back or side.",
    "Pregnancy, or suspected pregnancy.",
    "Recurrent infections, or symptoms that do not respond to treatment.",
    "Urinary symptoms in men — this service covers urinary tract infections in women.",
  ].join("\n"),
  getnadarvorn_refer: [
    "Fitting or removing a coil or a hormonal implant, which requires an examination.",
    "Emergency contraception.",
    "Sterilisation.",
    "Choosing contraception where risk factors need to be assessed by examination or measurement.",
  ].join("\n"),
  frjokornaofnaemi_refer: [
    "Difficulty breathing, shortness of breath or worsening asthma.",
    "Severe allergic reactions, such as swelling of the face or throat.",
    "Allergy testing, desensitisation, or diagnosing a new allergy.",
    "Symptoms that do not respond to antihistamines.",
  ].join("\n"),
  hudvandamal_utbrot_suitable: [
    "Eczema, dryness and itching",
    "Psoriasis that has already been diagnosed",
    "Acne and rosacea",
    "Fungal infections of the skin and nails",
    "Allergic rashes and contact eczema",
    "Insect bites and mild skin infections",
    "Warts and other clearly defined skin problems",
  ].join("\n"),
  hudvandamal_utbrot_refer: [
    "A mole or skin change that has grown, changed colour or shape, bleeds or itches.",
    "A wound that has not healed within four weeks, or a foot wound in someone with diabetes.",
    "Burns, and animal or human bites.",
    "A rash that does not fade when pressed, together with a fever.",
    "Redness spreading quickly with a fever, or skin peeling after a new medicine was started.",
    "Skin problems that need a biopsy, freezing or surgery.",
  ].join("\n"),
  augnsykingar_augnlokavandamal_suitable: [
    "Blepharitis — redness, flaking and crusting along the eyelid margin",
    "Styes and chalazia — a lump on the eyelid",
    "Uncomplicated conjunctivitis — a red eye with discharge, unchanged vision and no pain",
    "Dryness and irritation of the eyes",
  ].join("\n"),
  augnsykingar_augnlokavandamal_refer: [
    "Vision that has worsened or become blurred.",
    "Pain in the eye, not merely stinging or the feeling of something in it.",
    "Sensitivity to light.",
    "A red eye in someone who wears contact lenses — this needs to be examined the same day.",
    "Injury to the eye, a foreign body, or a chemical splash.",
    "A blistering rash on the forehead, eyelid or tip of the nose.",
    "A bulging eye, double vision or restricted eye movement.",
    "A baby under one month old with a red eye or discharge.",
  ].join("\n"),
  njalgur_suitable: "Treatment for everyone in the household",
  njalgur_refer: [
    "Symptoms that do not clear up after treatment.",
    "Severe abdominal pain, blood in the stool, or unexplained weight loss.",
    "Pregnancy or breastfeeding.",
  ].join("\n"),
  lyfjuendurnyjun_refer: [
    "Medicines needing regular follow-up — blood pressure and heart medication, and medication for anxiety or depression. This service does not replace regular follow-up with your own doctor.",
    "Repeat prescriptions — only a single prescription can be issued.",
    "Medicines classed as addictive, stimulant or psychotropic — to renew these, speak to the doctor who prescribed them for you before.",
    "More than 3 medicines in one request.",
  ].join("\n"),
  almenn_laeknisthjonusta_refer: [
    "Acute or serious symptoms — call 112, or Læknavaktin on 1700.",
    "Symptoms that need to be looked at, listened to or examined by hand.",
    "Addictive and narcotic medicines, sleeping pills, sedatives and ADHD medication.",
    "Backdated certificates for illness no doctor has assessed.",
    "A new diagnosis of a complex or long-term problem that needs follow-up.",
  ].join("\n"),
  laeknisvottord_suitable:
    "Sick notes for an employer or a school, relating to a problem that has been handled through the telemedicine service",
  // Advice keeps its mark-up exactly: "##" headings, a line under a bullet as
  // that bullet's explanation, "++"/"--" as the paired do/avoid cards, "!!" as
  // the warning box. Translate the words, never the structure.
  frjokornaofnaemi_advice: [
    "Here is practical advice for reducing hay fever symptoms in everyday life.",
    "## The essentials",
    "- Avoid situations that bring on strong symptoms.",
    "- Rinse your nose and eyes with saline before using allergy medicine.",
    "- Keep the home clean and keep dust down.",
    "++ Do",
    "- Air the home well and vacuum regularly.",
    "- Shower and change clothes when the pollen count outside is high.",
    "- Change pillowcases regularly.",
    "- Wash and dry clothes indoors.",
    "- Wipe pets with a damp cloth when they come inside.",
    "-- Avoid",
    "- Avoid gardening (or wear a mask and eye protection).",
    "- Do not keep fresh flowers in the house.",
    "- Limit perfume and aftershave.",
    "- Avoid scented detergents.",
    "## Cleaning and dust control",
    "Good dust control at home can make a real difference. It helps to remove things that hold dust, such as fitted carpets, and to consider an air purifier if symptoms are troublesome.",
    "## Checklist for the home",
    "- Vacuum floors and furniture regularly",
    "- Keep pets out of the bedroom",
    "- Use fragrance-free detergents",
    "- Air the house when the pollen count is low",
    "## Using allergy medicine",
    "- Rinse",
    "Use saline to rinse your nose and eyes before taking allergy medicine.",
    "- Clear",
    "Rinsing removes the pollen sitting in the lining of the nose and eyes.",
    "- Medicate",
    "Once the area is clear, your medicine works best.",
  ].join("\n"),
  frunsa_advice: [
    "A cold sore is a common viral infection that appears as fluid-filled blisters, usually on or near the lips.",
    "## What is a cold sore?",
    "Cold sores are caused by the herpes simplex virus. After infection the virus stays in the body for life and can break out when the immune system is under strain, such as during another infection or a period of stress. Symptoms often begin with itching or tenderness a day before the blisters form.",
    "++ Do",
    "- Wash your hands with soap whenever you touch the cold sore",
    "- Use sun cream on it if you are out in the sun",
    "- Eat well, keep active and sleep properly to support your immune system",
    "-- Avoid",
    "- Do not pick at the sores; leave them to heal",
    "- Avoid sharing cutlery or kissing anyone while the sore can still spread",
    "- Avoid acidic fruit (lemon, for instance) and salty food, which can sting the sores",
    "## Pain relief for discomfort",
    "- Paracetamol 500 mg — 1–2 tablets at a time, at most 4 times a day",
    "- Ibuprofen 400 mg — 1 tablet at a time, at most 3 times a day",
    "!! Please note: if you have heart failure, kidney failure, acid reflux or a stomach ulcer, anti-inflammatory medicines such as ibuprofen are not advised.",
    "## Treatment and avoiding spread",
    "- Start antiviral treatment",
    "At the first sign — itching or tenderness. It can be bought at a pharmacy without a prescription, and works best within 3 days.",
    "- Take particular care around infants",
    "For as long as the sores are open. Avoid kissing or cuddling a newborn, as they are very vulnerable to herpes infections.",
    "## Glossary",
    "- Cold sore",
    "Also called herpes labialis: a herpes infection on the lips.",
    "- Infectious period",
    "The time from the first symptoms until the sores have closed over with a scab.",
  ].join("\n"),
  hudvandamal_utbrot_advice: [
    "Here is general advice on daily skin care that applies to most mild skin problems.",
    "## Moisturiser is treatment, not grooming",
    "- Apply moisturiser every day",
    "Including when the skin looks well. Being regular about it matters more than which one you use.",
    "- Use more than you think you need",
    "A thin layer, forgotten between days, does little good.",
    "## Washing and showers",
    "- Short, lukewarm showers",
    "Hot water dissolves the oils in the skin and leaves it drier than before.",
    "- Mild, soap-free cleansers",
    "Ordinary soap is alkaline and irritates skin that is already sensitive.",
    "- Pat the skin dry",
    "Rubbing with a towel irritates the skin needlessly.",
    "++ Do",
    "- Apply moisturiser straight after a shower, while the skin is still damp.",
    "- Keep nails short if you itch at night.",
    "- Note down what you used and for how long — it helps the assessment.",
    "-- Avoid",
    "- Scratching. It opens the skin and invites infection.",
    "- Using a steroid cream for longer than advised, especially on the face.",
    "- Switching creams quickly, before the first has had time to work.",
    "!! A rash that does not fade when pressed, together with a fever, can be a sign of serious infection. It cannot wait — call 112.",
  ].join("\n"),
  almenn_laeknisthjonusta_advice: [
    "The more precise your description, the better the assessment. The doctor sees nothing but what you write and send.",
    "## What is worth mentioning",
    "- When it started and how it has developed",
    "Give a number of days or weeks rather than \"a while ago\".",
    "- What makes it better or worse",
    "Rest, movement, food, time of day, or stress.",
    "- What you have already tried",
    "Medicine, dose and for how long — and whether it worked.",
    "- Every medicine you take regularly",
    "Including contraception, supplements and anything you buy without a prescription.",
    "## Your worries matter",
    "- Say plainly what you are afraid this might be",
    "This is not a formality. A patient's worry is often the best clue to what needs ruling out, and the doctor answers it directly.",
    "++ Do",
    "- Write too much rather than too little.",
    "- Send a photograph if anything is visible.",
    "- Say what you are hoping to get out of the consultation.",
    "-- Avoid",
    "- Leaving out medicines or past diagnoses because they seem unrelated.",
    "- Waiting with acute symptoms and sending a message instead.",
    "!! Fjarlækningar is not an emergency service. If your symptoms are acute or serious, call 112 or Læknavaktin on 1700.",
  ].join("\n"),
  njalgur_advice: [
    "Threadworm is a small white roundworm, a common infection in children and in adults too.",
    "## General advice",
    "Infections arise where many children are together, such as at nursery or school. Threadworm passes easily to parents and other family members.",
    "## Symptoms",
    "- A third of infections cause no symptoms at all.",
    "- The main symptom is itching around the anus, which gets worse at night.",
    "",
    "Scratching at night can irritate the skin and cause a skin infection. Less often, where there are many worms, threadworm can show as reduced appetite, abdominal pain and nausea.",
    "## How it spreads",
    "Threadworm spreads when eggs reach the mouth and travel down to the stomach. The eggs hatch in the gut, the worms lay eggs around the anus, and those are carried on unwashed hands into the surroundings and on to the next person.",
  ].join("\n"),
  risvandamal_advice: [
    "Erectile problems are common: about half of men aged 40 to 70 have trouble with erections at some point in their lives.",
    "## Common causes",
    "Many things affect erections, both physical and psychosocial.",
    "- Communication difficulties or other problems in a relationship.",
    "- Various medicines (for example for high blood pressure, epilepsy or depression, or diuretics).",
    "- A consequence of conditions such as heart disease or diabetes.",
    "- Lifestyle, such as smoking, alcohol or recreational drug use.",
    "## Treatment and next steps",
    "- Talking therapy",
    "Useful where the causes are psychological or related to communication.",
    "- Review your medication",
    "Ask your doctor whether the medicines you already take could be causing the problem.",
    "- Improve your lifestyle",
    "Cut down on alcohol and stop smoking.",
    "- Medication",
    "Erection medicines such as sildenafil (Viagra) help many people.",
    "## When to seek help",
    "- Book an appointment with a doctor",
    "If there is no obvious explanation for the problem, a urologist is the right place to go.",
    "If you want to discuss medication, or changes to the medicines you already take.",
  ].join("\n"),
  augnsykingar_augnlokavandamal_advice: [
    "Here is general advice for mild eye problems.",
    "## Warm compresses",
    "- Five to ten minutes, twice a day",
    "The compress has to stay warm throughout. A cold compress does nothing.",
    "- Wipe along the eyelid margin afterwards",
    "A warm flannel or a cotton bud loosens crusts and opens blocked glands.",
    "- Keep going after the symptoms start to settle",
    "Blepharitis and chalazia take weeks, not days.",
    "## Hygiene and avoiding spread",
    "- Wash your hands often, especially after touching the eye.",
    "- Do not share towels or pillowcases with others in the household.",
    "- Throw away any eye make-up used after the symptoms began.",
    "++ Do",
    "- Rinse discharge from the eye with clean water or saline.",
    "- Artificial tears can be used as needed for dryness and irritation.",
    "- Take your contact lenses out and wear glasses in the meantime.",
    "-- Avoid",
    "- Squeezing a lump on the eyelid.",
    "- Using eye drops prescribed for someone else.",
    "- Putting lenses back in before the eye is free of symptoms.",
    "!! A red eye in a contact lens wearer can be a corneal infection and needs to be examined the same day. Take the lenses out at once and contact an eye doctor or Læknavaktin on 1700.",
  ].join("\n"),
  thvagfaera_leggangasykingar_about: [
    "Urinary tract infections are common in women, and the typical symptoms are burning when passing urine, passing urine often, and a more urgent need to go.",
    "Vaginal infections — thrush or bacterial — usually cause itching, irritation and a change in discharge. The symptoms differ and so does the treatment, so telling them apart matters.",
  ].join("\n\n"),
  frjokornaofnaemi_about: [
    "Hay fever is a seasonal allergy to pollen, in Iceland mainly from grasses and trees. The symptoms include sneezing, a runny or blocked nose, itchy eyes and tiredness.",
    "The symptoms follow the pollen season and can have a real effect on sleep, concentration and daily life, even though they are rarely dangerous.",
  ].join("\n\n"),
  frunsa_about: [
    "A cold sore is caused by the herpes simplex virus, which stays dormant in the body after the first infection. It flares up again with stress, sunlight, the menstrual cycle or other infections.",
    "It often begins with burning or itching before small blisters appear, usually on or near the lip. Treatment helps most when it is started at the very first symptoms.",
  ].join("\n\n"),
  ristill_about: [
    "Shingles is caused by the same virus as chickenpox, which lies dormant in the nerves after a chickenpox infection and can flare up later in life.",
    "It appears as a painful, blistering rash, usually in a band on one side of the body or on the face. Treatment works best when it is started soon after the rash appears.",
  ].join("\n\n"),
  hudvandamal_utbrot_about: [
    "Skin problems are among the most common reasons for seeing a doctor. They include eczema, psoriasis, acne, rosacea, fungal infections, allergic rashes, insect bites and warts — different problems that have in common that they can be seen on the outside of the body.",
    "The symptoms are usually itching, redness, flaking, dryness or a spreading rash. Some clear up on their own within days; others are long-term and come and go for years.",
    "Skin problems suit remote assessment well, because how the skin looks is a large part of that assessment. That is why a photograph always accompanies a skin case.",
  ].join("\n\n"),
  augnsykingar_augnlokavandamal_about: [
    "Redness, itching and discharge from the eyes are among the most common eye problems, and the great majority are mild and pass.",
    "Blepharitis is inflammation of the eyelid margin causing redness, flaking and crusting, particularly in the morning. It is long-term and often returns. Styes and chalazia are lumps on the eyelid that form when a gland becomes blocked — a stye is tender and comes on quickly, a chalazion is usually painless and takes longer to go. Conjunctivitis is inflammation of the membrane covering the white of the eye and the inner surface of the eyelid, usually caused by a virus but sometimes by bacteria or an allergy.",
    "What these have in common is that they can be seen on the outside of the eye and that vision stays unchanged. If your vision worsens, the eye hurts, or you cannot tolerate light, the problem is of a different kind and needs to be examined.",
  ].join("\n\n"),
  risvandamal_about: [
    "Erectile problems are more common than many people expect, and become more common with age. The causes can be physical — such as vascular or metabolic disease, or medication — or related to stress, sleep and mental wellbeing.",
    "Erectile problems can also be the first sign of underlying cardiovascular disease, which is why they are worth taking seriously rather than waiting out.",
  ].join("\n\n"),
  njalgur_about: [
    "Threadworm is a common parasitic infection, mainly in children. The main symptom is itching around the anus, worst at night, which can disturb sleep.",
    "It spreads easily within a household and between children at nursery or school, so everyone in the home is usually advised to be treated at the same time.",
  ].join("\n\n"),
  laeknisvottord_about: [
    "A sick note confirms that you have been unfit for work or absent because of illness. Employers and schools often ask for one after a certain number of days off sick.",
    "A note is issued in connection with a case that has been handled through the service, since it rests on a doctor's assessment of the illness itself.",
  ].join("\n\n"),
  laeknisvottord_refer: [
    "Sick notes for problems that have not been handled through this service.",
    "Driving licence certificates.",
    "Sickness benefit certificates.",
    "Disability certificates.",
    "Rehabilitation certificates.",
    "Other certificates unrelated to a case handled by Fjarlækningar.",
  ].join("\n"),
  ...Object.fromEntries(erindi.flatMap((e) => [
    [erindiTitleKey(e.slug), e.titleEn],
    [`${erindiKey(e.slug)}_lead`, e.descriptionEn],
  ])),
};

/** Are the pages switched on? Anything but "on" keeps them dark. */
export const erindiPagesLive = (c: LocaleContent) => c.pages_live === "on";
