// Uppflettiefni hjúkrunarfræðings í vinnustöðinni.
//
// ALLT HÉR ER ENDURSÖGN, EKKI NÝJAR FULLYRÐINGAR. Hver lína kemur úr því sem
// Fjarlækningar segja þegar sjúklingum: vefnum (/thjonusta og síðum hvers
// erindis), algengum spurningum, prentefni, skilmálum — eða reglum sem
// tæknistjóri gaf beint (18 ára, aðeins fyrir sig sjálfan, engar blóðprufur né
// myndgreiningar, engin líkamsskoðun). Breytist efnið þar verður að breyta því
// hér líka; annars segir hjúkrunarfræðingurinn annað en vefurinn.
//
// Erindi sem eru falin á vefnum (húðvandamál, augnsýkingar, almenn
// læknisþjónusta) eru EKKI hér: sjúklingur sem er vísað á þau finnur þau ekki.
//
// Svörin eru skrifuð til að afrita beint í skilaboð til sjúklings.

export interface GuideFact {
  label: string;
  detail: string;
  tone?: "ok" | "no" | "info";
}

export interface GuideProblem {
  slug: string;
  title: string;
  /** Heiti á ensku — úr src/erindi.ts. */
  titleEn: string;
  /** Sjálfspróf sem geta fylgt erindinu (lykill í GUIDE_SELFTESTS). */
  selftests?: string[];
  /** Orð sem sjúklingar og hjúkrunarfræðingar nota — fyrir leitina. */
  keywords: string[];
  summary: string;
  suitable: string[];
  notSuitable: string[];
  /** Tilbúið svar til sjúklings. */
  reply: string;
}

export interface GuideAnswer {
  key: string;
  q: string;
  a: string;
  keywords: string[];
}

export interface GuideMedGroup {
  name: string;
  items: string[];
}

const HOW = "Þú skráir þig inn með rafrænum skilríkjum á fjarlaekningar.is (sjúklingagátt)";
const WHEN = "Læknir svarar innan tveggja klukkustunda á opnunartíma, alla daga kl. 10–22.";
const URGENT = "Ef einkennin eru alvarleg eða versna hratt skaltu hringja í 112.";

// ── Meginreglur ─────────────────────────────────────────────────────────────

export const GUIDE_FACTS: GuideFact[] = [
  { label: "18 ára og eldri", detail: "Aðeins fyrir 18 ára og eldri með rafræn skilríki. Foreldri getur ekki svarað fyrir barn.", tone: "info" },
  { label: "Aðeins fyrir sjálfa(n) sig", detail: "Sjúklingur sendir erindi fyrir sig sjálfan — ekki fyrir maka, foreldri eða aðra.", tone: "info" },
  { label: "Opið alla daga kl. 10–22", detail: "Erindum sem berast eftir kl. 22 er svarað daginn eftir. Senda má erindi hvenær sem er sólarhrings.", tone: "ok" },
  { label: "Svar innan 2 klukkustunda", detail: "Á opnunartíma. Lyfseðill fer rafrænt í lyfjagátt ef við á.", tone: "ok" },
  { label: "Ekki bráð eða alvarleg einkenni", detail: "Í bráðatilfellum: 112. Ráðgjöf hjúkrunarfræðings: 1700. Alvarlegum einkennum er vísað í annan farveg.", tone: "no" },
  { label: "Engin líkamsskoðun", detail: "Erindi sem þarf að skoða, hlusta eða þreifa fara í hefðbundna þjónustu heilsugæslunnar.", tone: "no" },
  { label: "Engar blóðprufur né myndgreiningar", detail: "Læknir Fjarlækninga pantar hvorki blóðprufur né myndgreiningu. Þá er vísað á heilsugæsluna.", tone: "no" },
  { label: "Komugjald 1.000 kr.", detail: "Eins og á heilsugæslu. Sé erindinu vísað frá greiðir sjúklingurinn ekki.", tone: "info" },
  { label: "Skjólstæðingar HSU í Vestmannaeyjum", detail: "Í tilraunaverkefninu er þjónustan aðeins fyrir skjólstæðinga sem eru skráðir hjá HSU í Vestmannaeyjum.", tone: "info" },
  { label: "Rafræn skilríki nauðsynleg", detail: "Innskráning er aðeins með rafrænum skilríkjum — engin önnur leið.", tone: "info" },
];

// ── Erindin ─────────────────────────────────────────────────────────────────

export const GUIDE_PROBLEMS: GuideProblem[] = [
  {
    slug: "kvef-hosti-halsbolga",
    titleEn: "Cold, cough and sore throat",
    selftests: ["crp", "strep"],
    title: "Kvef, hósti og hálsbólga",
    keywords: ["kvef", "hósti", "hálsbólga", "hálssærindi", "streptókokkar", "strep", "kinnholur", "ennisholur", "berkjubólga", "flensa", "crp"],
    summary: "CRP heimapróf notað í upplýsingasöfnun ef þarf. Alvarlegum einkennum vísað í annan farveg.",
    suitable: [
      "Hósti og berkjubólga án alvarlegra einkenna",
      "Hálsbólga og streptókokkasýkingar í hálsi",
      "Ennis- og kinnholusýkingar",
    ],
    notSuitable: [
      "Öndunarerfiðleikar, andnauð eða brjóstverkur",
      "Erfiðleikar við að kyngja eigin munnvatni eða að opna munninn",
      "Hár hiti með hnakkastífleika eða húðblæðingum",
      "Einkenni sem hafa varað lengur en tíu daga eða versna eftir að bata var náð",
    ],
    reply: `Fjarlækningar geta aðstoðað með kvef, hósta og hálsbólgu. ${HOW}, velur „Kvef, hósti og hálsbólga“ og svarar stuttum spurningalista. Stundum er beðið um CRP- eða streptókokkapróf, sem fæst á heilsugæslunni. ${WHEN}\n\n${URGENT}`,
  },
  {
    slug: "thvagfaera-leggangasykingar",
    titleEn: "Urinary tract and vaginal infections",
    selftests: ["stix"],
    title: "Þvagfæra- og leggangasýkingar",
    keywords: ["þvagfærasýking", "blöðrubólga", "sviði", "pissa", "þvaglát", "sveppasýking", "leggangasýking", "útferð", "kláði", "stix", "þvagpróf"],
    summary: "Þvag-stix heimapróf notað í upplýsingasöfnun. Sveppa- og bakteríusýkingar í leggöngum greindar og meðhöndlaðar. Alvarlegum einkennum vísað í annan farveg.",
    suitable: [
      "Þvagfærasýkingar kvenna",
      "Sveppasýkingar í leggöngum",
      "Bakteríusýkingar í leggöngum",
    ],
    notSuitable: [
      "Hiti, hrollur eða verkur í baki eða síðu",
      "Þungun eða grunur um þungun",
      "Endurteknar sýkingar eða einkenni sem svara ekki meðferð",
      "Einkenni frá þvagfærum hjá körlum — þjónustan nær til þvagfærasýkinga kvenna",
    ],
    reply: `Fjarlækningar geta aðstoðað með þvagfærasýkingar kvenna og sveppa- eða bakteríusýkingar í leggöngum. ${HOW}, velur „Þvagfæra- og leggangasýkingar“ og svarar stuttum spurningalista. Þú gætir verið beðin um að taka þvagpróf (stix), sem fæst á heilsugæslunni eða í apóteki. ${WHEN}\n\nEf þú ert með hita, hroll eða verk í baki eða síðu, eða ert barnshafandi, skaltu leita á heilsugæsluna.`,
  },
  {
    slug: "getnadarvorn",
    titleEn: "Contraception",
    title: "Getnaðarvörn",
    keywords: ["getnaðarvörn", "pilla", "p-pilla", "pillan", "hormón", "endurnýja pillu", "skipta um pillu"],
    summary: "Fyrsta ávísun, endurnýjun eða breyting á getnaðarvörn.",
    suitable: [
      "Fyrsta ávísun á getnaðarvörn",
      "Endurnýjun á getnaðarvörn",
      "Breyting á getnaðarvörn",
    ],
    notSuitable: [
      "Uppsetning eða fjarlæging á lykkju eða hormónastaf, sem krefst skoðunar",
      "Neyðargetnaðarvörn",
      "Ófrjósemisaðgerðir",
      "Val á getnaðarvörn þegar meta þarf áhættuþætti með skoðun eða mælingu",
    ],
    reply: `Fjarlækningar geta aðstoðað með fyrstu ávísun, endurnýjun eða breytingu á getnaðarvörn. ${HOW}, velur „Getnaðarvörn“ og svarar stuttum spurningalista. ${WHEN}\n\nNeyðargetnaðarvörn og uppsetning eða fjarlæging á lykkju eða hormónastaf fara ekki í gegnum Fjarlækningar.`,
  },
  {
    slug: "frjokornaofnaemi",
    titleEn: "Pollen allergy",
    title: "Frjókornaofnæmi",
    keywords: ["ofnæmi", "frjókorn", "frjókornaofnæmi", "hnerri", "nefrennsli", "kláði í augum", "gras", "vorofnæmi", "sumarofnæmi"],
    summary: "Meðferð við árstíðabundnu ofnæmi.",
    suitable: ["Meðferð við árstíðabundnu frjókornaofnæmi"],
    notSuitable: [
      "Öndunarerfiðleikar, andnauð eða versnandi astmi",
      "Alvarleg ofnæmisviðbrögð, svo sem bjúgur í andliti eða koki",
      "Ofnæmispróf, afnæming eða greining á nýju ofnæmi",
      "Einkenni sem svara ekki ofnæmislyfjum",
    ],
    reply: `Fjarlækningar geta aðstoðað með árstíðabundið frjókornaofnæmi. ${HOW}, velur „Frjókornaofnæmi“ og svarar stuttum spurningalista. Læknir metur einkennin og leggur til ofnæmislyf. ${WHEN}\n\nEf þú finnur fyrir öndunarerfiðleikum eða bólgu í andliti eða koki skaltu hringja í 112.`,
  },
  {
    slug: "frunsa",
    titleEn: "Cold sore",
    title: "Frunsa",
    keywords: ["frunsa", "herpes", "sár á vör", "blöðrur á vör", "munnangur"],
    summary: "Meðferð við endurtekna frunsu. Frumgreiningu vísað í annan farveg.",
    suitable: ["Endurtekin frunsa sem sjúklingurinn þekkir"],
    notSuitable: [
      "Frumgreining — fyrsta greining þarf mat læknis með skoðun",
      "Sár eða einkenni nálægt auga",
      "Útbreidd sár eða merki um að sýking sé að versna",
    ],
    reply: `Fjarlækningar geta aðstoðað með frunsu sem þú hefur fengið áður og þekkir. ${HOW}, velur „Frunsa“ og svarar stuttum spurningalista. ${WHEN}\n\nSé þetta í fyrsta sinn sem þú færð frunsu þarf læknir að skoða þig — þá skaltu leita á heilsugæsluna. Sama á við ef sár eru nálægt auga.`,
  },
  {
    slug: "ristill",
    titleEn: "Shingles",
    title: "Ristill á húð",
    keywords: ["ristill", "belti", "útbrot", "blöðrur", "taugaverkur", "herpes zoster"],
    summary: "Meðferð við endurteknum ristli. Frumgreiningu vísað í annan farveg.",
    suitable: ["Endurtekinn ristill á húð sem sjúklingurinn þekkir"],
    notSuitable: [
      "Frumgreining — fyrsta greining þarf mat læknis með skoðun",
      "Útbrot nálægt auga eða í andliti",
      "Miklir verkir sem svara ekki verkjalyfjum",
    ],
    reply: `Fjarlækningar geta aðstoðað með ristil á húð sem þú hefur fengið áður og þekkir. ${HOW}, velur „Ristill á húð“ og svarar stuttum spurningalista. ${WHEN}\n\nSé þetta í fyrsta sinn þarf læknir að skoða þig — leitaðu þá á heilsugæsluna. Ef útbrotin eru nálægt auga eða í andliti skaltu leita aðstoðar strax.`,
  },
  {
    slug: "risvandamal",
    titleEn: "Erectile problems",
    title: "Risvandamál",
    keywords: ["risvandamál", "ristruflun", "stinning", "getuleysi", "kynlíf"],
    summary: "Mat og meðferð.",
    suitable: ["Mat og meðferð á risvandamálum, í trúnaði"],
    notSuitable: [
      "Verkur, aflögun eða langvarandi sársaukafull stinning",
      "Einkenni sem koma fram skyndilega eða eftir áverka",
      "Þörf á blóðprufum eða skoðun áður en meðferð er valin",
    ],
    reply: `Fjarlækningar geta metið og meðhöndlað risvandamál, í trúnaði. ${HOW}, velur „Risvandamál“ og svarar stuttum spurningalista. ${WHEN}`,
  },
  {
    slug: "njalgur",
    titleEn: "Pinworm",
    title: "Njálgur",
    keywords: ["njálgur", "ormar", "kláði í endaþarmi", "orma", "börn með njálg"],
    summary: "Greining og meðferð.",
    suitable: ["Greining og meðferð á njálg", "Lausn fyrir alla fjölskyldumeðlimi"],
    notSuitable: [
      "Einkenni sem hverfa ekki eftir meðferð",
      "Miklir kviðverkir, blóð í hægðum eða óútskýrt þyngdartap",
      "Þungun eða brjóstagjöf",
    ],
    reply: `Fjarlækningar geta greint og meðhöndlað njálg. ${HOW}, velur „Njálgur“ og svarar stuttum spurningalista. Yfirleitt er mælt með að allir á heimilinu fái meðferð á sama tíma. ${WHEN}`,
  },
  {
    slug: "lyfjuendurnyjun",
    titleEn: "Prescription renewal",
    title: "Lyfjaendurnýjun",
    keywords: ["lyf", "lyfseðill", "endurnýja", "endurnýjun", "föst lyf", "lyfjaendurnýjun", "vantar lyf"],
    summary: "Skjót endurnýjun á föstum lyfjum sem þolir ekki bið.",
    suitable: [
      "Endurnýjun á lyfjum sem sjúklingurinn tekur að staðaldri",
      "Lyf sem hann hefur notað áður og getur ekki beðið eftir hefðbundinni endurnýjun",
    ],
    notSuitable: [
      "Lyf sem flokkast sem ávanabindandi, örvandi eða geðlyf — tala þarf við lækninn sem skrifaði upp á þau",
      "Fjölnota lyfseðlar — einungis einfaldur lyfseðill",
      "Lyf sem krefjast reglulegrar eftirfylgni eða skoðunar — þjónustan kemur ekki í stað hennar",
      "Lyf á listanum „Lyf sem eru ekki endurnýjuð“ hér að neðan",
    ],
    reply: `Fjarlækningar geta endurnýjað lyf sem þú tekur að staðaldri, þegar endurnýjunin þolir ekki bið. ${HOW}, velur „Lyfjaendurnýjun“ og svarar stuttum spurningalista. Lyfseðillinn fer rafrænt í lyfjagátt og hann má leysa út í hvaða apóteki sem er. ${WHEN}\n\nAthugaðu að ekki er hægt að endurnýja öll lyf — til dæmis ekki ávanabindandi lyf, örvandi lyf eða geðlyf. Þá þarftu að tala við lækninn sem skrifaði upp á þau.`,
  },
  {
    slug: "laeknisvottord",
    titleEn: "Medical certificate",
    title: "Læknisvottorð",
    keywords: ["vottorð", "veikindavottorð", "fjarvistarvottorð", "vinna", "skóli", "læknisvottorð"],
    summary: "Veikindavottorð fyrir vinnu eða skóla, tengt vandamálum sem hafa verið sinnt í gegnum Fjarlækningar.",
    suitable: ["Veikindavottorð til vinnuveitanda eða skóla, tengt erindi sem hefur verið afgreitt hjá Fjarlækningum"],
    notSuitable: [
      "Veikindavottorð vegna erinda sem hafa ekki verið afgreidd hjá Fjarlækningum",
      "Ökuvottorð",
      "Sjúkradagpeningavottorð",
      "Örorkuvottorð",
      "Endurhæfingarvottorð",
      "Önnur vottorð sem tengjast ekki erindi sem afgreitt hefur verið hjá Fjarlækningum",
    ],
    reply: `Fjarlækningar geta gefið út veikindavottorð fyrir vinnu eða skóla — en aðeins vegna erindis sem hefur verið afgreitt hjá Fjarlækningum. ${HOW} og velur „Læknisvottorð“. Gjald fyrir vottorðið er samkvæmt gjaldskrá heilsugæslunnar.\n\nÖnnur vottorð, svo sem ökuvottorð eða örorkuvottorð, fást á heilsugæslunni.`,
  },
];

// ── Algengar spurningar ─────────────────────────────────────────────────────

export const GUIDE_ANSWERS: GuideAnswer[] = [
  {
    key: "byrja",
    q: "Hvernig byrja ég?",
    keywords: ["byrja", "skrá", "innskráning", "hvar", "slóð", "hlekkur", "gátt", "sjúklingagátt"],
    a: "Farðu á fjarlaekningar.is og smelltu á „Sjúklingagátt“. Þú skráir þig inn með rafrænum skilríkjum, velur erindi af listanum og svarar stuttum spurningalista. Læknir svarar innan tveggja klukkustunda á opnunartíma, alla daga kl. 10–22.",
  },
  {
    key: "verd",
    q: "Hvað kostar þetta?",
    keywords: ["kostar", "verð", "gjald", "komugjald", "borga", "greiða"],
    a: "Þú greiðir komugjald, 1.000 kr., eins og á heilsugæslu. Ef Fjarlækningar geta ekki leyst erindið og vísa þér annað greiðir þú ekkert. Gjald fyrir veikindavottorð er samkvæmt gjaldskrá heilsugæslunnar.",
  },
  {
    key: "svartimi",
    q: "Hvenær fæ ég svar? Hvað ef ég sendi eftir kl. 22?",
    keywords: ["hvenær", "svar", "svartími", "opnunartími", "kvöld", "nótt", "eftir 22", "helgi"],
    a: "Læknir svarar innan tveggja klukkustunda á opnunartíma, sem er alla daga kl. 10–22. Þú getur sent erindi hvenær sem er sólarhrings, en erindum sem berast eftir kl. 22 er svarað daginn eftir.",
  },
  {
    key: "barn",
    q: "Get ég sent erindi fyrir barnið mitt?",
    keywords: ["barn", "börn", "barnið", "sonur", "dóttir", "undir 18", "aldur"],
    a: "Nei. Fjarlækningar eru aðeins fyrir 18 ára og eldri. Það er læknisfræðilegt mat Fjarlækninga að alltaf sé best að fara með börn undir 18 ára í skoðun hjá lækni.",
  },
  {
    key: "adrir",
    q: "Get ég sent erindi fyrir annan fullorðinn (maka, foreldri)?",
    keywords: ["fyrir aðra", "maki", "mamma", "pabbi", "foreldri", "aðstandandi", "fyrir hönd"],
    a: "Nei. Hver og einn sendir erindi fyrir sig sjálfan og skráir sig inn með eigin rafrænu skilríkjum.",
  },
  {
    key: "skilriki",
    q: "Ég er ekki með rafræn skilríki.",
    keywords: ["rafræn skilríki", "skilríki", "auðkenni", "innskráning", "sim", "ekki með skilríki"],
    a: "Rafræn skilríki eru nauðsynleg svo læknarnir viti hver óskar eftir þjónustunni. Þú getur kannað hvort SIM-kortið þitt styður rafræn skilríki. Ef svo er geturðu mætt á næsta afgreiðslustað rafrænna skilríkja með gilt ökuskírteini (ekki stafrænt), vegabréf eða íslenskt nafnskírteini og fengið rafræn skilríki í símann.",
  },
  {
    key: "blodprufa",
    q: "Get ég fengið blóðprufu eða myndatöku?",
    keywords: ["blóðprufa", "blóðprufur", "myndgreining", "röntgen", "sneiðmynd", "ómun", "rannsókn"],
    a: "Nei. Læknar Fjarlækninga panta hvorki blóðprufur né myndgreiningu. Ef þú þarft slíka rannsókn skaltu bóka tíma á heilsugæslunni.",
  },
  {
    key: "skodun",
    q: "Getur læknirinn skoðað mig eða talað við mig í mynd?",
    keywords: ["skoðun", "skoða", "myndsímtal", "myndband", "símtal", "tala við lækni"],
    a: "Nei. Engin líkamsskoðun fer fram og þjónustan er einungis í formi staðlaðra spurninga frá læknum Fjarlækninga. Þurfir þú skoðun vísar læknirinn þér í hefðbundna þjónustu heilsugæslunnar.",
  },
  {
    key: "lyfsedill",
    q: "Hvar fæ ég lyfseðilinn?",
    keywords: ["lyfseðill", "apótek", "lyfjagátt", "sækja lyf"],
    a: "Lyfseðillinn fer rafrænt í lyfjagátt og þú getur leyst hann út í hvaða apóteki sem er. Athugaðu að einungis er hægt að fá einfaldan lyfseðil, ekki fjölnota.",
  },
  {
    key: "heimaprof",
    q: "Hvar fæ ég heimaprófið (CRP, þvagpróf, strep)?",
    keywords: ["heimapróf", "sjálfspróf", "crp", "þvagpróf", "stix", "strep", "streptókokkapróf", "próf"],
    a: "Heimaprófin fást á Heilsugæslunni í Vestmannaeyjum — biddu um prófið með nafni í móttökunni, t.d. „CRP sjálfspróf“. Þvagpróf og streptókokkapróf fást líka í apótekum. Leiðbeiningar fylgja prófinu og eru líka í sjúklingagáttinni. Læknirinn getur ekki lokið erindinu fyrr en niðurstaðan liggur fyrir.",
  },
  {
    key: "visad-fra",
    q: "Hvað gerist ef Fjarlækningar geta ekki leyst erindið?",
    keywords: ["vísað frá", "vísað annað", "hafnað", "ekki hægt", "tilvísun"],
    a: "Þá er þér vísað í viðeigandi þjónustu, til dæmis á heilsugæslu, Læknavakt eða aðra heilbrigðisstofnun, og þú greiðir ekkert fyrir þjónustuna.",
  },
  {
    key: "versnar",
    q: "Hvað ef mér versnar eða ég er ósammála niðurstöðunni?",
    keywords: ["versnar", "batnar ekki", "ósammála", "kvörtun", "aftur", "fyrirspurn"],
    a: "Ef ástandið batnar ekki eða þér versnar geturðu farið aftur í gegnum spurningaformið eða farið í læknisskoðun. Ef þú ert ósammála niðurstöðu læknis geturðu smellt á „Senda fyrirspurn“ í sjúklingagáttinni.",
  },
  {
    key: "brátt",
    q: "Sjúklingur lýsir alvarlegum einkennum",
    keywords: ["bráð", "alvarlegt", "112", "1700", "brjóstverkur", "andnauð", "lífshætta", "bráðamóttaka", "neyð"],
    a: "Fjarlækningar eru ekki bráðaþjónusta. Í bráðatilfellum skaltu hringja í 112 eða fara á bráðamóttöku. Í 1700 færðu ráðgjöf hjúkrunarfræðings.\n\nAlvarleg einkenni geta meðal annars verið: brjóstverkur eða þrýstingur fyrir brjósti, öndunarerfiðleikar, skyndileg máttminnkun, dofi eða taltruflun, skert meðvitund eða yfirlið, miklar blæðingar, skyndilegur óbærilegur höfuð- eða kviðverkur, hár hiti með hnakkastífleika eða húðblæðingum, alvarleg ofnæmisviðbrögð og hugsanir um sjálfsskaða eða sjálfsvíg.",
  },
  {
    key: "hvada",
    q: "Hvaða erindi geta Fjarlækningar aðstoðað með?",
    keywords: ["hvað", "erindi", "listi", "þjónusta", "hjálpa með", "aðstoða"],
    a: "Kvef, hósta og hálsbólgu · þvagfæra- og leggangasýkingar · getnaðarvörn · frjókornaofnæmi · endurtekna frunsu · endurtekinn ristil á húð · risvandamál · njálg · lyfjaendurnýjun · og veikindavottorð tengt erindi sem hefur verið afgreitt hjá Fjarlækningum.",
  },
];

// ── Aðgangur ────────────────────────────────────────────────────────────────

export const GUIDE_ACCESS = {
  steps: [
    "Opna fjarlaekningar.is og smella á „Sjúklingagátt“ — eða nota hlekkinn sem þú sendir í SMS.",
    "Skrá sig inn með rafrænum skilríkjum.",
    "Velja erindi af listanum og svara stöðluðum spurningum læknis.",
    "Læknir metur svörin og leggur til meðferð. Lyfseðill fer rafrænt í lyfjagátt ef við á.",
  ],
  reply: "Farðu á fjarlaekningar.is og smelltu á „Sjúklingagátt“. Þú skráir þig inn með rafrænum skilríkjum, velur erindi af listanum og svarar stöðluðum spurningum læknis. Læknir metur svörin og leggur til meðferð — lyfseðill fer rafrænt í lyfjagátt ef við á. Svar berst innan tveggja klukkustunda á opnunartíma, alla daga kl. 10–22.",
};

// ── Lyf sem eru ekki endurnýjuð ─────────────────────────────────────────────
// Sama listi og á /thjonusta/lyfjuendurnyjun og á bakhlið tilvísunarleiðbeininga.

export const GUIDE_MEDS: GuideMedGroup[] = [
  {
    name: "A · Ópíóíðar og sterk verkjalyf",
    items: [
      "Morfín: Contalgin, Morfin",
      "Oxýkódon: OxyContin, OxyNorm, Targin",
      "Ketóbemídón: Ketogan",
      "Fentanýl-plástrar: Durogesic, Matrifen, Fentanyl",
      "Tapentadól: Palexia",
      "Petidín og metadon (sjá einnig flokk B)",
      "Tramadól: Tradolan, Nobligan, Tramadol",
    ],
  },
  { name: "A · Kódeín-samsett lyf", items: ["Parkódín og Parkódín forte (parasetamól + kódeín)", "Kódímagnýl (asetýlsalisýlsýra + kódeín)"] },
  {
    name: "A · Benzódíazepín",
    items: [
      "Díazepam: Stesolid, Diazepam",
      "Oxazepam: Sobril",
      "Klónazepam: Rivotril",
      "Alprazólam: Xanax, Tafil, Alprazolam",
      "Lorazepam: Lorazepam, Temesta",
      "Midazólam: Dormicum, Midazolam",
    ],
  },
  { name: "A · Svefnlyf (Z-lyf)", items: ["Zópíklón: Imovane, Zopiclone, Imozop", "Zolpidem: Stilnoct, Zolpidem"] },
  { name: "A · Örvandi lyf og ADHD-lyf", items: ["Metýlfenídat: Ritalin, Concerta, Medikinet, Equasym", "Lísdexamfetamín: Elvanse", "Dexamfetamín: Attentin"] },
  { name: "A · Gabapentínóíð", items: ["Pregabalín: Lyrica, Pregabalin", "Gabapentín: Neurontin, Gabapentin"] },
  { name: "A · Barbitúröt", items: ["Fenóbarbital: Fenemal"] },
  {
    name: "B · Lyf við fíkn og viðhaldsmeðferð",
    items: ["Búprenorfín: Norspan (plástur), Subutex", "Búprenorfín + naloxón: Suboxone", "Metadon", "Naltrexón og dísúlfíram (Antabus)"],
  },
  {
    name: "C · Lyf sem þurfa eftirlit með blóðprufum",
    items: ["Warfarín: Kóvar, Marevan", "Litíum", "Klózapín: Leponex", "Metótrexat", "Ísótretínóín: Roaccutan", "DOAC-blóðþynningarlyf: Xarelto, Eliquis, Pradaxa"],
  },
  {
    name: "D · Lyf sem einungis sérfræðingar ávísa",
    items: ["Geðrofslyf", "Testósterón", "Krabbameinslyf, ónæmisbælandi lyf og líftæknilyf"],
  },
];

// ── Tenglar og texti til sjúklings ──────────────────────────────────────────

export const PORTAL_URL = "https://app.medalia.is/fjarlaekningar-hsu";
export const SITE = "https://www.fjarlaekningar.is";
/** Síða erindisins á vefnum (þar sem erindið er sýnt). */
export const problemPageUrl = (slug: string) => `${SITE}/thjonusta/${slug}`;
/** Kaflinn um heimapróf á vefnum. */
export const SELFTEST_INFO_URL = `${SITE}/thjonusta#tests`;

export type Lang = "is" | "en";

/**
 * Textinn sem hjúkrunarfræðingurinn afritar og sendir sjúklingi — alltaf með
 * hlekk á gáttina. Enska útgáfan segir hvaða erindi á að velja með íslenska
 * heitinu, því gáttin er á íslensku.
 */
export function patientText(p: GuideProblem, lang: Lang): string {
  if (lang === "en") {
    const test = p.selftests?.length ? " You may be asked to take a simple home test, available at the health centre." : "";
    return `Fjarlaekningar (telemedicine) can help with: ${p.titleEn.toLowerCase()}. Log in with your electronic ID using the link below, choose "${p.title}" and answer a short questionnaire.${test} A doctor replies within two hours during opening hours, 10:00–22:00 every day. If your symptoms are severe, call 112.\n\nStart here: ${PORTAL_URL}`;
  }
  return `${p.reply}\n\nByrjaðu hér: ${PORTAL_URL}`;
}

// ── Sjálfspróf (heimapróf) ──────────────────────────────────────────────────
// Sama efni og kaflinn „Heimapróf“ á /thjonusta og síður erindanna. Verð og
// afhending í móttöku koma úr innleiðingarpakka Fjarlækninga fyrir HSU og eru
// aðeins fyrir starfsfólk — ekki í textanum til sjúklings.

export interface GuideSelftest {
  key: string;
  title: string;
  what: string;
  when: string;
  where: string;
  reply: string;
  replyEn: string;
}

const TEST_OUTRO = "Þú skráir niðurstöðuna í sjúklingagáttina. Leiðbeiningar um hvernig prófið er tekið fylgja með í pakkanum og í gáttinni. Læknirinn getur ekki lokið erindinu fyrr en niðurstaðan liggur fyrir.";
const TEST_OUTRO_EN = "Enter the result in the patient portal. Instructions for taking the test come in the package and in the portal. The doctor cannot complete your case until the result is in.";

export const GUIDE_SELFTESTS: GuideSelftest[] = [
  {
    key: "crp",
    title: "CRP-próf",
    what: "Mælir bólgusvörun í blóði með einum dropa úr fingurgómi. Hjálpar lækninum að meta hvort einkennin séu líklega af völdum veiru eða bakteríu.",
    when: "Kvef, hósti og hálsbólga",
    where: "Heilsugæslan í Vestmannaeyjum",
    reply: `Læknirinn biður þig um að taka CRP-próf. Það mælir bólgusvörun í blóði með einum dropa úr fingurgómi. Þú færð prófið í móttöku Heilsugæslunnar í Vestmannaeyjum — biddu um „CRP sjálfspróf“. ${TEST_OUTRO}\n\nNánar um sjálfsprófin: ${SELFTEST_INFO_URL}`,
    replyEn: `The doctor asks you to take a CRP test. It measures inflammation in the blood from a single drop from your fingertip. Get the test at the reception of the health centre in Vestmannaeyjar — ask for a "CRP sjálfspróf". ${TEST_OUTRO_EN}\n\nMore about the home tests: ${SELFTEST_INFO_URL}`,
  },
  {
    key: "strep",
    title: "Strep-próf (streptókokkapróf)",
    what: "Strok úr hálsi sem leitar að streptókokkum. Svar fæst á nokkrum mínútum heima.",
    when: "Kvef, hósti og hálsbólga — hálsbólga, til að aðstoða greiningu",
    where: "Heilsugæslan í Vestmannaeyjum eða apótek",
    reply: `Læknirinn biður þig um að taka streptókokkapróf. Það er strok úr hálsi og svar fæst á nokkrum mínútum heima. Prófið fæst í móttöku Heilsugæslunnar í Vestmannaeyjum — biddu um „strep sjálfspróf“ — eða í apóteki. ${TEST_OUTRO}\n\nNánar um sjálfsprófin: ${SELFTEST_INFO_URL}`,
    replyEn: `The doctor asks you to take a strep test. It is a throat swab and you get the answer within a few minutes at home. Get the test at the reception of the health centre in Vestmannaeyjar — ask for a "strep sjálfspróf" — or at a pharmacy. ${TEST_OUTRO_EN}\n\nMore about the home tests: ${SELFTEST_INFO_URL}`,
  },
  {
    key: "stix",
    title: "Þvagpróf (þvagstix)",
    what: "Skimar fyrir merkjum um þvagfærasýkingu.",
    when: "Þvagfæra- og leggangasýkingar — þvagfærasýking í fyrsta skipti",
    where: "Heilsugæslan í Vestmannaeyjum eða apótek",
    reply: `Læknirinn biður þig um að taka þvagpróf (þvagstix). Það skimar fyrir merkjum um þvagfærasýkingu. Prófið fæst í móttöku Heilsugæslunnar í Vestmannaeyjum — biddu um „þvagstix sjálfspróf“ — eða í apóteki. ${TEST_OUTRO}\n\nNánar um sjálfsprófin: ${SELFTEST_INFO_URL}`,
    replyEn: `The doctor asks you to take a urine test (dipstick). It screens for signs of a urinary tract infection. Get the test at the reception of the health centre in Vestmannaeyjar — ask for a "þvagstix sjálfspróf" — or at a pharmacy. ${TEST_OUTRO_EN}\n\nMore about the home tests: ${SELFTEST_INFO_URL}`,
  },
];

/** Fyrir starfsfólk í móttöku — ekki í texta til sjúklings. */
export const SELFTEST_STAFF_NOTE = "Móttökuritari afhendir prófið og innheimtir 1.400 kr. Sé prófið ekki til á staðnum er sjúklingi vísað á vakthafandi hjúkrunarfræðing sem tekur prófið — sama gjald.";

/** Almenni textinn: hvernig sjúklingur kemst inn — með hlekk. */
export function accessText(lang: Lang): string {
  if (lang === "en") {
    return `Fjarlaekningar (telemedicine) can help with simple, common health problems. Log in with your electronic ID using the link below, choose your problem from the list and answer a short questionnaire. A doctor replies within two hours during opening hours, 10:00–22:00 every day. If your symptoms are severe, call 112.\n\nStart here: ${PORTAL_URL}`;
  }
  return `${GUIDE_ACCESS.reply}\n\nByrjaðu hér: ${PORTAL_URL}`;
}

// ── Textar sem má breyta ────────────────────────────────────────────────────
// Hver afritanlegur texti á sér auðkenni. Stjórnandi getur vistað eigin útgáfu
// fyrir alla (gatt_settings, lykill `text:<auðkenni>`); annars gildir sjálfgefni
// textinn hér að ofan.
//
//   problem:<slug>:<is|en>   texti til sjúklings um erindi
//   access:<is|en>           almenni textinn
//   selftest:<key>:<is|en>   leiðbeiningar um sjálfspróf
//   answer:<key>             tilbúið svar við algengri spurningu

export function defaultText(id: string): string | null {
  const [kind, key, l] = id.split(":");
  const lang: Lang | null = l === "is" || l === "en" ? l : null;
  if (kind === "problem" && lang) {
    const p = GUIDE_PROBLEMS.find((x) => x.slug === key);
    return p ? patientText(p, lang) : null;
  }
  if (kind === "access" && (key === "is" || key === "en") && l === undefined) return accessText(key);
  if (kind === "selftest" && lang) {
    const t = GUIDE_SELFTESTS.find((x) => x.key === key);
    return t ? (lang === "en" ? t.replyEn : t.reply) : null;
  }
  if (kind === "answer" && l === undefined) return GUIDE_ANSWERS.find((a) => a.key === key)?.a ?? null;
  return null;
}

/** Á textinn að innihalda hlekk? Allir nema svörin við algengum spurningum. */
export const textNeedsLink = (id: string) => !id.startsWith("answer:");

/** Hlekkur sem má standa í texta til sjúklings. */
export function hasPortalLink(text: string): boolean {
  return /https?:\/\/\S+/.test(text) || /fjarlaekningar\.is/i.test(text);
}
