// Editable content model for the per-erindi landing pages (/erindi/<slug>).
//
// One page per medical problem, so the site can answer the searches people
// actually make ("þvagfærasýking læknir", "endurnýja lyfseðil") instead of
// putting all ten on /thjonusta.
//
// NOT LIVE BY DEFAULT. `pages_live` starts at "off": until it is switched on
// and published, /erindi/<slug> returns 404, the cards on /thjonusta stay
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
    "Föst lyf þarf að endurnýja reglulega og flestar endurnýjanir má afgreiða án þess að hitta lækni.\n\nSum lyf krefjast þó reglulegrar eftirfylgni eða samtals við þann lækni sem ávísaði þeim upphaflega — það á meðal annars við um ávanabindandi lyf, örvandi lyf og geðlyf.",
  laeknisvottord:
    "Veikindavottorð staðfestir að þú hafir verið óvinnufær eða fjarverandi vegna veikinda. Vinnuveitendur og skólar óska oft eftir vottorði eftir tiltekinn fjölda veikindadaga.\n\nVottorð er gefið út í tengslum við erindi sem hefur verið afgreitt í gegnum þjónustuna, enda byggir það á mati læknis á veikindunum sjálfum.",
};

// The two erindi where a home test is part of the assessment.
const DRAFT_SELFTEST: Record<string, string> = {
  "kvef-hosti-halsbolga":
    "CRP-heimapróf mælir bólgusvörun í blóði með einum dropa úr fingurgómi. Niðurstaðan hjálpar lækninum að meta hvort einkennin séu líklega af völdum veiru eða bakteríu — og þar með hvort sýklalyf eigi við. Þú sækir prófið, tekur það heima og skráir niðurstöðuna í sjúklingagáttina.",
  "thvagfaera-leggangasykingar":
    "Þvagstix er einfalt heimapróf þar sem strimli er dýft í þvagsýni. Reitirnir á strimlinum skipta um lit eftir því hvað finnst í þvaginu — hvít blóðkorn, blóð, nítrít eða prótein — og læknirinn notar niðurstöðuna við mat á erindinu. Þú sækir prófið, tekur það heima og skráir niðurstöðuna í sjúklingagáttina.",
};

export const ERINDI_FIELDS: SiteField[] = [
  {
    key: "pages_live",
    label: "Birta erindissíður",
    group: "Birting",
    type: "choice",
    help: "Þar til kveikt er á þessu skila /erindi/… síður 404, kortin á /thjonusta eru ekki tenglar og síðurnar eru ekki í sitemap. Kveiktu fyrst þegar texti hvers erindis hefur verið yfirfarinn af lækni.",
    options: [
      { value: "off", label: "Falið (drög)", hint: "Enginn kemst á síðurnar." },
      { value: "on", label: "Birt", hint: "Síðurnar fara í loftið og í sitemap." },
    ],
  },

  // Shared furniture, same on every erindi page.
  { key: "eyebrow", label: "Merki fyrir ofan fyrirsögn", group: "Sameiginlegt", type: "text" },
  { key: "about_heading", label: "Fyrirsögn — um vandamálið", group: "Sameiginlegt", type: "text" },
  { key: "suitable_heading", label: "Fyrirsögn — hvað er hægt að leysa", group: "Sameiginlegt", type: "text" },
  { key: "selftest_heading", label: "Fyrirsögn — sjálfspróf", group: "Sameiginlegt", type: "text" },
  { key: "advice_heading", label: "Fyrirsögn — almennar ráðleggingar", group: "Sameiginlegt", type: "text" },
  { key: "advice_note", label: "Fyrirvari undir ráðleggingum", group: "Sameiginlegt", type: "textarea" },
  { key: "process_heading", label: "Fyrirsögn — ferlið", group: "Sameiginlegt", type: "text" },
  { key: "refer_heading", label: "Fyrirsögn — hvenær á ekki við", group: "Sameiginlegt", type: "text" },
  { key: "refer_body", label: "Texti — hvenær á ekki við", group: "Sameiginlegt", type: "textarea" },
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
      help: "Fyrsta málsgreinin á síðunni og lýsingin sem Google sýnir. 2–3 setningar.",
    },
    {
      key: `${erindiKey(e.slug)}_about`,
      label: `${e.title} — um vandamálið`,
      group: e.title,
      type: "textarea",
      help: "DRÖG — ÞARF YFIRFERÐ LÆKNIS. Lýsing á vandamálinu sjálfu: hvað það er, dæmigerð einkenni, hvað er algengt. Þetta er meginefnið sem leitarvélar og gervigreind lesa. Auð lína skilur að málsgreinar.",
    },
    {
      key: `${erindiKey(e.slug)}_selftest`,
      label: `${e.title} — sjálfspróf`,
      group: e.title,
      type: "textarea",
      help: "Á aðeins við þar sem heimapróf er notað (CRP, þvagstix). Skildu eftir autt til að fela kaflann.",
    },
    {
      key: `${erindiKey(e.slug)}_advice`,
      label: `${e.title} — almennar ráðleggingar`,
      group: e.title,
      type: "textarea",
      help: "SKRIFAÐ OG YFIRFARIÐ AF LÆKNI. Snið: \"## Fyrirsögn\" = undirfyrirsögn, \"- atriði\" = punktur, annað verður málsgrein.",
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
  about_heading: "Um vandamálið",
  suitable_heading: "Hvað er hægt að leysa?",
  selftest_heading: "Sjálfspróf heima",
  advice_heading: "Almennar ráðleggingar",
  advice_note:
    "Ráðleggingarnar hér að ofan eru almennar og koma ekki í stað læknisráðgjafar. Leitaðu til læknis ef einkenni versna eða ganga ekki yfir.",
  process_heading: "Svona virkar það",
  refer_heading: "Hvenær á þjónustan ekki við?",
  // Verbatim from the published /thjonusta "Hvenær hentar ekki" band.
  refer_body:
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
      [`${erindiKey(e.slug)}_refer`, ""],
    ]),
  ),
};

export const ERINDI_DEFAULTS_EN: LocaleContent = {
  ...emptyDefaults(ERINDI_FIELDS),
  ...Object.fromEntries(erindi.map((e) => [`${erindiKey(e.slug)}_lead`, e.descriptionEn])),
};

/** Are the pages switched on? Anything but "on" keeps them dark. */
export const erindiPagesLive = (c: LocaleContent) => c.pages_live === "on";
