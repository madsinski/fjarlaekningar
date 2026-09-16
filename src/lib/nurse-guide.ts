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
  /** Orð sem leitin á að finna spjaldið eftir. */
  keywords?: string[];
  tone?: "ok" | "no" | "info";
}

export interface GuideProblem {
  slug: string;
  title: string;
  /** Heiti á ensku — úr src/erindi.ts. */
  titleEn: string;
  /** Sjúklingur sendir mynd með erindinu. */
  photo?: boolean;
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
}

export interface GuideMedGroup {
  name: string;
  items: string[];
  /** Heiti sem fólk notar um flokkinn — „benzó“, „róandi“ … */
  keywords?: string[];
}

const HOW = "Þú skráir þig inn með rafrænum skilríkjum á fjarlaekningar.is (sjúklingagátt)";
const WHEN = "Læknir svarar innan tveggja klukkustunda á opnunartíma, alla daga kl. 10–22.";
const URGENT = "Ef einkennin eru alvarleg eða versna hratt skaltu hringja í 112.";

// ── Meginreglur ─────────────────────────────────────────────────────────────

export const GUIDE_FACTS: GuideFact[] = [
  { label: "18 ára og eldri", keywords: ["aldur", "barn", "börn", "barnið", "unglingur", "ungmenni", "foreldri", "forráðamaður", "18"], detail: "Aðeins fyrir 18 ára og eldri með rafræn skilríki. Foreldri getur ekki svarað fyrir barn.", tone: "info" },
  { label: "Aðeins fyrir sjálfa(n) sig", keywords: ["maki", "foreldri", "aðstandandi", "fyrir annan", "fyrir aðra", "umboð", "mamma", "pabbi", "eiginmaður", "eiginkona", "aldraður"], detail: "Sjúklingur sendir erindi fyrir sig sjálfan — ekki fyrir maka, foreldri eða aðra.", tone: "info" },
  { label: "Opið alla daga kl. 10–22", keywords: ["opnunartími", "opið", "lokað", "kvöld", "helgi", "helgar", "nótt", "hvenær", "klukkan"], detail: "Erindum sem berast eftir kl. 22 er svarað daginn eftir. Senda má erindi hvenær sem er sólarhrings.", tone: "ok" },
  { label: "Svar innan 2 klukkustunda", keywords: ["svartími", "bið", "biðtími", "svar", "lyfseðill", "lyfjagátt", "apótek"], detail: "Á opnunartíma. Lyfseðill fer rafrænt í lyfjagátt ef við á.", tone: "ok" },
  { label: "Ekki bráð eða alvarleg einkenni", keywords: ["bráð", "bráðatilfelli", "112", "1700", "neyð", "alvarlegt", "brjóstverkur", "læknavakt", "lífshætta", "slys"], detail: "Í bráðatilfellum: 112. Ráðgjöf hjúkrunarfræðings: 1700. Alvarlegum einkennum er vísað í annan farveg.", tone: "no" },
  { label: "Engin líkamsskoðun", keywords: ["skoðun", "læknisskoðun", "hlusta", "þreifa", "hitta lækni", "koma á stofu", "tími hjá lækni"], detail: "Erindi sem þarf að skoða, hlusta eða þreifa fara í hefðbundna þjónustu heilsugæslunnar.", tone: "no" },
  { label: "Engar blóðprufur né myndgreiningar", keywords: ["blóðprufa", "blóðrannsókn", "rannsókn", "röntgen", "myndgreining", "sneiðmynd", "segulómun", "ómun", "tékk"], detail: "Læknir Fjarlækninga pantar hvorki blóðprufur né myndgreiningu. Þá er vísað á heilsugæsluna.", tone: "no" },
  { label: "Skjólstæðingar HSU í Vestmannaeyjum", keywords: ["vestmannaeyjar", "eyjar", "hsu", "heilsugæsla", "skráður", "skráning", "búseta", "reykjavík"], detail: "Í tilraunaverkefninu er þjónustan aðeins fyrir skjólstæðinga sem eru skráðir hjá HSU í Vestmannaeyjum.", tone: "info" },
  { label: "Rafræn skilríki nauðsynleg", keywords: ["skilríki", "rafræn", "auðkenni", "auðkennisapp", "sim", "innskráning", "útlendingur"], detail: "Innskráning er aðeins með rafrænum skilríkjum — engin önnur leið.", tone: "info" },
];

// ── Erindin ─────────────────────────────────────────────────────────────────

export const GUIDE_PROBLEMS: GuideProblem[] = [
  {
    slug: "kvef-hosti-halsbolga",
    titleEn: "Cold, cough and sore throat",
    selftests: ["crp", "strep"],
    title: "Kvef, hósti og hálsbólga",
    keywords: ["kvef", "hósti", "hálsbólga", "hálssærindi", "streptókokkar", "strep", "kinnholur", "ennisholur", "berkjubólga", "flensa", "crp", "hiti", "stíflað nef", "nefrennsli", "kinnholubólga", "ennisholubólga", "öndunarfærasýking", "særindi"],
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
    keywords: ["þvagfærasýking", "blöðrubólga", "sviði", "pissa", "þvaglát", "sveppasýking", "leggangasýking", "útferð", "kláði", "stix", "þvagpróf", "þvagfæri", "leggöng", "skeiðarsýking", "bakteríusýking", "candida", "lykt"],
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
    keywords: ["getnaðarvörn", "pilla", "p-pilla", "pillan", "hormón", "endurnýja pillu", "skipta um pillu", "getnaðarvarnir", "getnaðarvarnarpilla", "smápilla", "minipilla"],
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
    keywords: ["ofnæmi", "frjókorn", "frjókornaofnæmi", "hnerri", "nefrennsli", "kláði í augum", "gras", "vorofnæmi", "sumarofnæmi", "ofnæmislyf", "nefúði", "heymæði", "kláði í nefi"],
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
    keywords: ["frunsa", "herpes", "sár á vör", "blöðrur á vör", "munnangur", "herpes á vör", "vararsár"],
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
    keywords: ["ristill", "belti", "útbrot", "blöðrur", "taugaverkur", "herpes zoster", "zoster"],
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
    slug: "hudvandamal-utbrot",
    titleEn: "Skin problems and rashes",
    title: "Húðvandamál og útbrot",
    photo: true,
    keywords: ["húð", "útbrot", "exem", "psoriasis", "bólur", "unglingabólur", "rósroði", "sveppasýking", "kláði", "skordýrabit", "vörtur", "ofnæmisútbrot"],
    summary: "Exem, psoriasis, unglingabólur, sveppasýkingar og önnur afmörkuð húðvandamál. Mynd fylgir erindinu.",
    suitable: [
      "Exem, þurrkur og kláði",
      "Psoriasis sem þegar hefur verið greindur",
      "Unglingabólur og rósroði",
      "Sveppasýkingar í húð og nöglum",
      "Ofnæmisútbrot og snertiexem",
      "Skordýrabit og vægar húðsýkingar",
      "Vörtur og önnur afmörkuð húðvandamál",
    ],
    notSuitable: [
      "Fæðingarblettur eða húðbreyting sem hefur stækkað, breytt um lit eða lögun, blæðir eða veldur kláða",
      "Sár sem hefur ekki gróið á fjórum vikum, eða sár á fæti hjá einstaklingi með sykursýki",
      "Brunasár og bit eftir dýr eða menn",
      "Útbrot sem hverfa ekki þegar þrýst er á þau, ásamt hita — hringja í 112",
      "Roði sem breiðist hratt út ásamt hita, eða húð sem flagnar af eftir að nýtt lyf var byrjað",
      "Húðvandamál sem þarf að taka sýni úr, frysta eða skera í",
    ],
    reply: `Fjarlækningar geta aðstoðað með exem, psoriasis, unglingabólur, sveppasýkingar og önnur afmörkuð húðvandamál. ${HOW}, velur „Húðvandamál og útbrot“ og svarar stuttum spurningalista. Þú sendir mynd af húðinni með erindinu. ${WHEN}\n\nFæðingarblettir sem hafa breyst, sár sem gróa ekki og brunasár þurfa skoðun á heilsugæslunni. Útbrot sem hverfa ekki þegar þrýst er á þau, ásamt hita, þola enga bið — hringdu þá í 112.`,
  },
  {
    slug: "augnsykingar-augnlokavandamal",
    titleEn: "Eye infections and eyelid problems",
    title: "Augnsýkingar og augnlokavandamál",
    photo: true,
    keywords: ["auga", "augu", "tárubólga", "vogrís", "hvarmabólga", "hvarmakýli", "augnlok", "rautt auga", "augnþurrkur", "útferð"],
    summary: "Hvarmabólga, vogrís og óbrotin tárubólga. Mynd fylgir erindinu.",
    suitable: [
      "Hvarmabólga — roði, flögnun og skorpur á augnlokabrún",
      "Vogrís og hvarmakýli — hnútur á augnloki",
      "Óbrotin tárubólga — rautt auga með útferð, óbreyttri sjón og engum verk",
      "Þurrkur og erting í augum",
    ],
    notSuitable: [
      "Sjón sem hefur versnað eða orðið þokukennd",
      "Verkur í auganu, ekki bara sviði eða aðskotatilfinning",
      "Ljósfælni",
      "Rautt auga hjá þeim sem nota augnlinsur — þarf skoðun samdægurs",
      "Áverki á auga, aðskotahlutur eða efni sem fór í augað",
      "Blöðruútbrot á enni, augnloki eða nefbroddi",
      "Auga sem stendur út, tvísýni eða skert augnhreyfing",
    ],
    reply: `Fjarlækningar geta aðstoðað með hvarmabólgu, vogrís og óbrotna tárubólgu. ${HOW}, velur „Augnsýkingar og augnlokavandamál“ og svarar stuttum spurningalista. Þú sendir mynd af auganu með erindinu. ${WHEN}\n\nEf sjónin hefur versnað, augað er aumt eða þú þolir illa ljós þarf skoðun. Notir þú augnlinsur og ert með rautt auga skaltu taka linsurnar úr strax og leita skoðunar samdægurs.`,
  },
  {
    slug: "risvandamal",
    titleEn: "Erectile problems",
    title: "Risvandamál",
    keywords: ["risvandamál", "ristruflun", "stinning", "getuleysi", "kynlíf", "viagra", "cialis", "sildenafil", "tadalafil", "stinningarvandi", "reisn"],
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
    keywords: ["njálgur", "ormar", "kláði í endaþarmi", "orma", "börn með njálg", "njálg", "nálgur", "vermox", "kláði í rassi"],
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
    keywords: ["lyf", "lyfseðill", "endurnýja", "endurnýjun", "föst lyf", "lyfjaendurnýjun", "vantar lyf", "endurnýja lyf", "lyfseðlar", "fastalyf", "blóðþrýstingslyf", "astmalyf", "innöndunarlyf"],
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
    slug: "almenn-laeknisthjonusta",
    titleEn: "General medical service",
    title: "Almenn læknisþjónusta",
    keywords: ["almennt", "annað", "spurning", "lyf", "aukaverkun", "skammtar", "niðurstöður", "rannsókn", "einkenni", "opin beiðni"],
    summary: "Erindi sem falla ekki undir hina flokkana. Sjúklingurinn lýsir vandamálinu með eigin orðum og læknir metur málið.",
    suitable: [
      "Væg og afmörkuð einkenni sem sjúklingurinn vill fá mat á",
      "Þekkt vandamál sem hefur breyst eða versnað",
      "Spurningar um lyf, skammta eða aukaverkanir",
      "Niðurstöður úr rannsókn sem hann vill fá útskýrðar",
      "Vottorð vegna erindis sem þegar hefur verið afgreitt hjá Fjarlækningum",
    ],
    notSuitable: [
      "Bráð eða alvarleg einkenni — 112 eða Læknavaktin í 1700",
      "Einkenni sem þarf að skoða, hlusta eða þreifa til að meta",
      "Ávana- og fíknilyf, svefnlyf, róandi lyf og ADHD-lyf",
      "Vottorð aftur í tímann fyrir veikindi sem enginn læknir hefur metið",
      "Ný greining á flóknu eða langvinnu vandamáli sem krefst eftirfylgni",
    ],
    reply: `Ef erindið fellur ekki undir hina flokkana geturðu valið „Almenn læknisþjónusta“. ${HOW}, lýsir vandamálinu með þínum eigin orðum og svarar nokkrum spurningum. Læknir les erindið og metur það — niðurstaðan getur verið ráðgjöf, meðferð eða tilvísun í hefðbundna þjónustu ef málið þarf skoðun. ${WHEN}\n\nFjarlækningar eru ekki bráðaþjónusta. Séu einkennin bráð eða alvarleg skaltu hringja í 112 eða Læknavaktina í 1700.`,
  },
  {
    slug: "laeknisvottord",
    titleEn: "Medical certificate",
    title: "Læknisvottorð",
    keywords: ["vottorð", "veikindavottorð", "fjarvistarvottorð", "vinna", "skóli", "læknisvottorð", "skólavottorð", "veikindi", "veikur", "frí úr vinnu"],
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
// Koma beint úr „Algengum spurningum“ á /thjonusta (vefumsjónin), sjá
// src/lib/vinnustod/guide-content.ts — svo orðalagið sé alltaf það sama og á vefnum.

// ── Aðgangur ────────────────────────────────────────────────────────────────

export const GUIDE_ACCESS = {
  keywords: ["byrja", "hvernig", "slóð", "hlekkur", "vefslóð", "vefsíða", "heimasíða", "gátt", "sjúklingagátt", "innskráning", "skrá sig", "sms", "link", "medalia", "aðgangur"],
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
    keywords: ["ópíóíðar", "ópíöt", "verkjalyf", "sterk verkjalyf", "oxý", "oxycodone", "morphine", "fentanyl"],
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
  { name: "A · Kódeín-samsett lyf", keywords: ["kódeín", "parkódín", "parkodin", "verkjalyf", "codeine"], items: ["Parkódín og Parkódín forte (parasetamól + kódeín)", "Kódímagnýl (asetýlsalisýlsýra + kódeín)"] },
  {
    name: "A · Benzódíazepín",
    keywords: ["benzó", "bensó", "benso", "benzo", "benzodiazepines", "róandi", "róandi lyf", "kvíðalyf", "kvíðastillandi", "valíum", "valium"],
    items: [
      "Díazepam: Stesolid, Diazepam",
      "Oxazepam: Sobril",
      "Klónazepam: Rivotril",
      "Alprazólam: Xanax, Tafil, Alprazolam",
      "Lorazepam: Lorazepam, Temesta",
      "Midazólam: Dormicum, Midazolam",
    ],
  },
  { name: "A · Svefnlyf (Z-lyf)", keywords: ["svefnlyf", "svefntöflur", "svefnleysi", "z-lyf"], items: ["Zópíklón: Imovane, Zopiclone, Imozop", "Zolpidem: Stilnoct, Zolpidem"] },
  { name: "A · Örvandi lyf og ADHD-lyf", keywords: ["adhd", "ofvirkni", "athyglisbrestur", "örvandi", "rítalín", "amfetamín"], items: ["Metýlfenídat: Ritalin, Concerta, Medikinet, Equasym", "Lísdexamfetamín: Elvanse", "Dexamfetamín: Attentin"] },
  { name: "A · Gabapentínóíð", keywords: ["taugaverkir", "taugaverkjalyf", "flogaveiki"], items: ["Pregabalín: Lyrica, Pregabalin", "Gabapentín: Neurontin, Gabapentin"] },
  { name: "A · Barbitúröt", keywords: ["flogaveikilyf", "barbitúrat"], items: ["Fenóbarbital: Fenemal"] },
  {
    name: "B · Lyf við fíkn og viðhaldsmeðferð",
    keywords: ["fíkn", "fíknilyf", "viðhaldsmeðferð", "ópíóíðafíkn", "áfengi", "áfengisfíkn", "metadón"],
    items: ["Búprenorfín: Norspan (plástur), Subutex", "Búprenorfín + naloxón: Suboxone", "Metadon", "Naltrexón og dísúlfíram (Antabus)"],
  },
  {
    name: "C · Lyf sem þurfa eftirlit með blóðprufum",
    keywords: ["blóðþynning", "blóðþynningarlyf", "blóðprufur", "lithium", "bólulyf", "gigtarlyf", "geðhvörf"],
    items: ["Warfarín: Kóvar, Marevan", "Litíum", "Klózapín: Leponex", "Metótrexat", "Ísótretínóín: Roaccutan", "DOAC-blóðþynningarlyf: Xarelto, Eliquis, Pradaxa"],
  },
  {
    name: "D · Lyf sem einungis sérfræðingar ávísa",
    keywords: ["sérfræðingur", "geðlyf", "krabbamein", "ónæmisbæling", "líftæknilyf", "hormón"],
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

/**
 * Hlekkirnir neðst í texta til sjúklings: gáttin (þar sem erindið er sent) og
 * vefurinn (þar sem allar upplýsingarnar eru). Merktir svo sjúklingurinn viti
 * hvor er hvað.
 */
export function linkLines(lang: Lang, info: string = SITE): string {
  return lang === "en"
    ? `Patient portal (log in to start): ${PORTAL_URL}\nMore information: ${info}`
    : `Sjúklingagátt (innskráning): ${PORTAL_URL}\nNánari upplýsingar: ${info}`;
}

export type Lang = "is" | "en";

/**
 * Textinn sem hjúkrunarfræðingurinn afritar og sendir sjúklingi — alltaf með
 * hlekk á gáttina. Enska útgáfan segir hvaða erindi á að velja með íslenska
 * heitinu, því gáttin er á íslensku.
 */
export function patientText(p: GuideProblem, lang: Lang, info: string = `${SITE}/thjonusta`): string {
  if (lang === "en") {
    const test = p.selftests?.length ? " You may be asked to take a simple home test, available at the health centre." : "";
    return `Fjarlaekningar (telemedicine) can help with: ${p.titleEn.toLowerCase()}. Log in with your electronic ID using the link below, choose "${p.title}" and answer a short questionnaire.${test} A doctor replies within two hours during opening hours, 10:00–22:00 every day. If your symptoms are severe, call 112.\n\n${linkLines("en", info)}`;
  }
  return `${p.reply}\n\n${linkLines("is", info)}`;
}

// ── Sjálfspróf (heimapróf) ──────────────────────────────────────────────────
// Sama efni og kaflinn „Heimapróf“ á /thjonusta og síður erindanna. Verð og
// afhending í móttöku koma úr innleiðingarpakka Fjarlækninga fyrir HSU og eru
// aðeins fyrir starfsfólk — ekki í textanum til sjúklings.

export interface GuideSelftest {
  key: string;
  keywords: string[];
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
    keywords: ["crp", "bólgupróf", "bólgusvörun", "fingurstunga", "blóðdropi", "sýklalyf", "veira", "baktería"],
    title: "CRP-próf",
    what: "Mælir bólgusvörun í blóði með einum dropa úr fingurgómi. Hjálpar lækninum að meta hvort einkennin séu líklega af völdum veiru eða bakteríu.",
    when: "Kvef, hósti og hálsbólga",
    where: "Heilsugæslan í Vestmannaeyjum",
    reply: `Læknirinn biður þig um að taka CRP-próf. Það mælir bólgusvörun í blóði með einum dropa úr fingurgómi. Þú færð prófið í móttöku Heilsugæslunnar í Vestmannaeyjum — biddu um „CRP sjálfspróf“. ${TEST_OUTRO}\n\nSjúklingagátt (skrá niðurstöðu): ${PORTAL_URL}\nNánar um sjálfsprófin: ${SELFTEST_INFO_URL}`,
    replyEn: `The doctor asks you to take a CRP test. It measures inflammation in the blood from a single drop from your fingertip. Get the test at the reception of the health centre in Vestmannaeyjar — ask for a "CRP sjálfspróf". ${TEST_OUTRO_EN}\n\nPatient portal (enter the result): ${PORTAL_URL}\nMore about the home tests: ${SELFTEST_INFO_URL}`,
  },
  {
    key: "strep",
    keywords: ["strep", "streptókokkar", "streptókokkapróf", "hálsstrok", "hálsbólga", "hálspróf"],
    title: "Strep-próf (streptókokkapróf)",
    what: "Strok úr hálsi sem leitar að streptókokkum. Svar fæst á nokkrum mínútum heima.",
    when: "Kvef, hósti og hálsbólga — hálsbólga, til að aðstoða greiningu",
    where: "Heilsugæslan í Vestmannaeyjum eða apótek",
    reply: `Læknirinn biður þig um að taka streptókokkapróf. Það er strok úr hálsi og svar fæst á nokkrum mínútum heima. Prófið fæst í móttöku Heilsugæslunnar í Vestmannaeyjum — biddu um „strep sjálfspróf“ — eða í apóteki. ${TEST_OUTRO}\n\nSjúklingagátt (skrá niðurstöðu): ${PORTAL_URL}\nNánar um sjálfsprófin: ${SELFTEST_INFO_URL}`,
    replyEn: `The doctor asks you to take a strep test. It is a throat swab and you get the answer within a few minutes at home. Get the test at the reception of the health centre in Vestmannaeyjar — ask for a "strep sjálfspróf" — or at a pharmacy. ${TEST_OUTRO_EN}\n\nPatient portal (enter the result): ${PORTAL_URL}\nMore about the home tests: ${SELFTEST_INFO_URL}`,
  },
  {
    key: "stix",
    keywords: ["stix", "þvagstix", "þvagprufa", "þvagpróf", "þvagfærasýking", "blöðrubólga", "pissa"],
    title: "Þvagpróf (þvagstix)",
    what: "Skimar fyrir merkjum um þvagfærasýkingu.",
    when: "Þvagfæra- og leggangasýkingar — þvagfærasýking í fyrsta skipti",
    where: "Heilsugæslan í Vestmannaeyjum eða apótek",
    reply: `Læknirinn biður þig um að taka þvagpróf (þvagstix). Það skimar fyrir merkjum um þvagfærasýkingu. Prófið fæst í móttöku Heilsugæslunnar í Vestmannaeyjum — biddu um „þvagstix sjálfspróf“ — eða í apóteki. ${TEST_OUTRO}\n\nSjúklingagátt (skrá niðurstöðu): ${PORTAL_URL}\nNánar um sjálfsprófin: ${SELFTEST_INFO_URL}`,
    replyEn: `The doctor asks you to take a urine test (dipstick). It screens for signs of a urinary tract infection. Get the test at the reception of the health centre in Vestmannaeyjar — ask for a "þvagstix sjálfspróf" — or at a pharmacy. ${TEST_OUTRO_EN}\n\nPatient portal (enter the result): ${PORTAL_URL}\nMore about the home tests: ${SELFTEST_INFO_URL}`,
  },
];

/** Fyrir starfsfólk í móttöku — ekki í texta til sjúklings. */
export const SELFTEST_STAFF_NOTE = "Móttökuritari afhendir prófið og innheimtir 1.400 kr. Sé prófið ekki til á staðnum er sjúklingi vísað á vakthafandi hjúkrunarfræðing sem tekur prófið — sama gjald.";

/** Almenni textinn: hvernig sjúklingur kemst inn — með hlekk. */
export function accessText(lang: Lang): string {
  if (lang === "en") {
    return `Fjarlaekningar (telemedicine) can help with simple, common health problems. Log in with your electronic ID using the link below, choose your problem from the list and answer a short questionnaire. A doctor replies within two hours during opening hours, 10:00–22:00 every day. If your symptoms are severe, call 112.\n\n${linkLines("en")}`;
  }
  return `${GUIDE_ACCESS.reply}\n\n${linkLines("is")}`;
}

// ── Textar sem má breyta ────────────────────────────────────────────────────
// Hver afritanlegur texti á sér auðkenni. Stjórnandi getur vistað eigin útgáfu
// fyrir alla (gatt_settings, lykill `text:<auðkenni>`); annars gildir sjálfgefni
// textinn hér að ofan.
//
//   problem:<slug>:<is|en>   texti til sjúklings um erindi
//   access:<is|en>           almenni textinn
//   selftest:<key>:<is|en>   leiðbeiningar um sjálfspróf
//   answer:<key>             svar við algengri spurningu af vefnum (faq1, faq2…)

/** Efni af vefnum sem textarnir byggja á (sjá src/lib/vinnustod/guide-content.ts). */
export interface GuideSiteContent { answers: GuideAnswer[]; livePages: string[] }

export function defaultText(id: string, site: GuideSiteContent = { answers: [], livePages: [] }): string | null {
  const [kind, key, l] = id.split(":");
  const lang: Lang | null = l === "is" || l === "en" ? l : null;
  if (kind === "problem" && lang) {
    const p = GUIDE_PROBLEMS.find((x) => x.slug === key);
    return p ? patientText(p, lang, site.livePages.includes(p.slug) ? problemPageUrl(p.slug) : `${SITE}/thjonusta`) : null;
  }
  if (kind === "access" && (key === "is" || key === "en") && l === undefined) return accessText(key);
  if (kind === "selftest" && lang) {
    const t = GUIDE_SELFTESTS.find((x) => x.key === key);
    return t ? (lang === "en" ? t.replyEn : t.reply) : null;
  }
  if (kind === "answer" && l === undefined) {
    const a = site.answers.find((x) => x.key === key)?.a;
    return a ? `${a}\n\nNánari upplýsingar: ${SITE}/thjonusta` : null;
  }
  return null;
}

/** Á textinn að innihalda hlekk? Allir nema svörin við algengum spurningum. */
export const textNeedsLink = (id: string) => !id.startsWith("answer:");

/** Hlekkur sem má standa í texta til sjúklings. */
export function hasPortalLink(text: string): boolean {
  return /https?:\/\/\S+/.test(text) || /fjarlaekningar\.is/i.test(text);
}
