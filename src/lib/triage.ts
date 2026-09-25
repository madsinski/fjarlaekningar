// "Hvert á ég að leita?" — the service-navigation popup behind every
// "Opna sjúklingagátt" button.
//
// This is navigation between services, not clinical triage: it never scores
// symptoms or suggests what is wrong, it only answers "which door fits this
// kind of request". The one symptom list (step `emergency`) is the same red-flag
// set the Medalia questionnaires already use, and a yes there only ever sends
// people UP the ladder, to 112. Keep it that way — a tool that tells an
// individual how urgent their symptoms are is a medical device under MDR.
//
// The tree mirrors the out-of-scope screening in Medalia
// (docs/medalia/medalia_common.py, SCOPE_REASONS): anything the doctors cannot
// resolve in writing is routed away here, before sign-in, instead of after.

import type { LocaleContent, SiteField } from "./site-content/types";
import type { RegionId } from "./triage-places";

export type { RegionId } from "./triage-places";

export const PORTAL_URL = "https://app.medalia.is/fjarlaekningar-hsu";

export type ServiceKey =
  | "112" | "brada" | "1700" | "heilsugaesla" | "heilsuvera" | "fjar" | "other-adult";

type L = { is: string; en: string };

export type TriageOption = {
  label: L;
  next: string;
  /** Shown on the result page: why this answer led here. */
  why?: L;
  /**
   * Picture for the answer card: `img` = an illustration (/erindi-icons for
   * the services, /triage-icons for the rest, same flat style); `gallery` =
   * the grid of service icons (TRIAGE_EXAMPLES).
   */
  visual?: { img?: string; gallery?: boolean };
  /** Step "Hvað þarftu": 1 = the problems Fjarlækningar handles (the
   *  gallery answer becomes one button per service), 2 = everything else. */
  section?: 1 | 2;
  /** On the location step: the region this answer stands for. */
  region?: RegionId;
  /** On a medication-search step: only offered after a search that came out
   *  red (on the list) or not red (not on the list). Absent = always. */
  when?: "red" | "not-red";
};

/** The services shown as pictures under "Algengt vandamál" (erindi slugs). */
export const TRIAGE_EXAMPLES = [
  "kvef-hosti-halsbolga", "thvagfaera-leggangasykingar", "hudvandamal-utbrot",
  "augnsykingar-augnlokavandamal", "frunsa", "frjokornaofnaemi", "ristill",
  "getnadarvorn", "risvandamal", "njalgur",
];

export type TriageExample = { slug: string; title: string };

export type TriageQuestion = {
  kind: "question";
  question: L;
  hint?: L;
  list?: L[];
  /** A search box above the answers: place names, or the medication list. */
  search?: "places" | "meds";
  options: TriageOption[];
};

export type TriageAction = {
  /** Stable id: the label is ONE CMS field per id, however many results use it. */
  id: string;
  label: L;
  href: string;
  primary?: boolean;
};

export type TriageResult = {
  kind: "result";
  service: ServiceKey;
  eyebrow: L;
  title: L;
  body: L[];
  actions: TriageAction[];
  /** Adds a "Þar sem þú ert" box with the advice for the chosen region. */
  local?: LocalNeed;
};

/** What a result needs locally — the row of the region table below. */
export type LocalNeed = "er" | "child-er" | "evening";

export type TriageNode = TriageQuestion | TriageResult;

const tel = (n: string) => `tel:${n.replace(/\s/g, "")}`;

const CALL_112: TriageAction = { id: "call112", label: { is: "Hringja í 112", en: "Call 112" }, href: tel("112"), primary: true };
const CALL_1700: TriageAction = { id: "call1700", label: { is: "Hringja í 1700", en: "Call 1700" }, href: tel("1700") };
const OPEN_PORTAL: TriageAction = {
  id: "portal", label: { is: "Opna sjúklingagátt", en: "Open the patient portal" }, href: PORTAL_URL, primary: true,
};

export const TRIAGE_START = "emergency";

export const TRIAGE: Record<string, TriageNode> = {
  // ------------------------------------------------------------ questions
  emergency: {
    kind: "question",
    question: { is: "Á eitthvað af þessu við núna?", en: "Does any of this apply right now?" },
    list: [
      { is: "Verkur eða þyngsli fyrir brjósti", en: "Chest pain or pressure" },
      { is: "Mikil andþyngsli eða öndunarerfiðleikar", en: "Severe shortness of breath or difficulty breathing" },
      { is: "Skyndilegt máttleysi eða dofi öðrum megin, talörðugleikar eða sjónskerðing",
        en: "Sudden weakness or numbness on one side, trouble speaking or loss of vision" },
      { is: "Meðvitundarskerðing, krampi eða rugl", en: "Reduced consciousness, a seizure or confusion" },
      { is: "Mikil blæðing eða alvarlegur áverki", en: "Heavy bleeding or a serious injury" },
      { is: "Bólga í andliti, vörum eða tungu, eða öndunarerfiðleikar eftir lyf, fæðu eða stungu",
        en: "Swelling of the face, lips or tongue, or trouble breathing after a medicine, food or sting" },
      { is: "Hugsanir um að skaða þig eða aðra", en: "Thoughts of harming yourself or others" },
    ],
    options: [
      { label: { is: "Já, eitthvað af þessu á við", en: "Yes, something here applies" }, next: "r-112" },
      { label: { is: "Nei", en: "No" }, next: "location" },
    ],
  },

  // Where you are decides where you can go: the answer is carried to every
  // result that sends people somewhere (see `local` and REGION_TEXT).
  location: {
    kind: "question",
    question: { is: "Hvar ertu núna?", en: "Where are you right now?" },
    hint: { is: "Það sem er í boði fer eftir því hvar á landinu þú ert. Skrifaðu nafn staðarins eða veldu svæði.",
            en: "What is available depends on where in Iceland you are. Type the name of the place or pick an area." },
    search: "places",
    options: [
      { label: { is: "Höfuðborgarsvæðið", en: "The capital area" }, next: "who", region: "capital" },
      { label: { is: "Akureyri og nágrenni", en: "Akureyri and around" }, next: "who", region: "akureyri" },
      { label: { is: "Selfoss og nágrenni", en: "Selfoss and around" }, next: "who", region: "selfoss" },
      { label: { is: "Annars staðar á landinu", en: "Elsewhere in Iceland" }, next: "who", region: "rural" },
    ],
  },

  who: {
    kind: "question",
    question: { is: "Fyrir hvern er erindið?", en: "Who is this for?" },
    options: [
      { label: { is: "Fyrir mig", en: "For me" }, next: "need" },
      { label: { is: "Fyrir barn", en: "For a child" }, next: "child-when" },
      { label: { is: "Fyrir annan fullorðinn, til dæmis maka eða foreldri", en: "For another adult, e.g. a partner or parent" },
        next: "other-self" },
    ],
  },

  need: {
    kind: "question",
    question: { is: "Hvað þarftu helst?", en: "What do you need most?" },
    hint: { is: "Veldu það sem passar best.", en: "Pick the closest match." },
    options: [
      // Section 1: shown as its heading, followed by one button per service.
      { label: { is: "Eitthvað af eftirfarandi vandamálum", en: "One of these problems" },
        next: "r-fjar", visual: { gallery: true }, section: 1 },
      { label: { is: "Endurnýjun á lyfi sem ég nota", en: "A renewal of a medicine I already take" }, next: "meds",
        visual: { img: "/erindi-icons/lyfjuendurnyjun.png" }, section: 1 },
      { label: { is: "Læknisvottorð", en: "A medical certificate" }, next: "cert",
        visual: { img: "/erindi-icons/laeknisvottord.png" }, section: 1 },
      { label: { is: "Annað sem ég get lýst með texta eða myndum", en: "Something else I can describe in writing or with photos" },
        next: "r-fjar", visual: { img: "/triage-icons/myndavel.svg" }, section: 1 },
      { label: { is: "Blóðprufa, myndgreining, speglun eða tilvísun",
                 en: "A blood test, imaging, endoscopy or a referral" },
        next: "r-heilsugaesla", visual: { img: "/triage-icons/blodprufa.svg" }, section: 2,
        why: { is: "Læknirinn sem biður um rannsókn eða tilvísun þarf að byggja á viðtali og skoðun og fylgja niðurstöðunum eftir. Það er best gert þar sem þú ert í reglulegri eftirfylgd.",
               en: "The doctor who orders a test or referral needs a consultation and examination to base it on, and has to follow up the results. That is best done where you are followed up regularly." } },
      { label: { is: "Vandamál sem læknir þarf að skoða, til dæmis hlusta, þreifa eða skoða eyru",
                 en: "A problem a doctor needs to examine, e.g. listen to, feel or look in the ears" },
        next: "exam-wait", visual: { img: "/erindi-icons/almenn-laeknisthjonusta.png" }, section: 2 },
      { label: { is: "Eftirfylgd með langvinnum sjúkdómi eða skilaboð til heimilislæknis",
                 en: "Follow-up of a long-term condition, or a message to my GP" },
        next: "r-heilsuvera", visual: { img: "/triage-icons/kross.svg" }, section: 2 },
      { label: { is: "Ég veit ekki hversu alvarlegt þetta er", en: "I'm not sure how serious this is" }, next: "r-1700",
        visual: { img: "/triage-icons/spurning.svg" }, section: 2 },
    ],
  },

  meds: {
    kind: "question",
    question: { is: "Hvað á við um lyfið?", en: "Which applies to the medicine?" },
    options: [
      { label: { is: "Lyf sem ég tek að staðaldri og sæki sjálf eða sjálfur í apótek",
                 en: "A medicine I take regularly and collect from the pharmacy myself" }, next: "meds-check" },
      { label: { is: "Skammtað í lyfjarúllu frá apóteki", en: "Dose-dispensed in a pharmacy roll (lyfjarúlla)" },
        next: "r-heilsugaesla",
        why: { is: "Skömmtuð lyf eru afgreidd eftir skömmtunarkorti sem læknirinn þinn heldur utan um. Til að öll lyfin skili sér rétt í rúlluna þarf sá læknir að gera breytingarnar.",
               en: "Dose-dispensed medicines follow a dispensing card kept by your own doctor. For everything to end up correctly in the roll, that doctor has to make the change." } },
      { label: { is: "Ávana- eða fíknilyf, til dæmis sterkt verkjalyf, svefnlyf, róandi lyf eða ADHD-lyf",
                 en: "A controlled drug, e.g. a strong painkiller, sleeping pill, sedative or ADHD medicine" },
        next: "controlled" },
      { label: { is: "Ég þarf fjölnota lyfseðil", en: "I need a repeat (multi-use) prescription" },
        next: "r-heilsugaesla",
        why: { is: "Fjarlækningar gefa aðeins út einfalda lyfseðla, ekki fjölnota lyfseðla.",
               en: "Fjarlækningar only issues single prescriptions, not repeat (multi-use) prescriptions." } },
    ],
  },

  // The same medication list and search as the nurses' guide on /vinnustod
  // (nurse-guide.ts, checkMedication), worded for patients.
  "meds-check": {
    kind: "question",
    question: { is: "Getum við endurnýjað lyfið?", en: "Can we renew the medicine?" },
    hint: { is: "Leitaðu að heiti lyfsins eða virka efninu til að sjá hvort það er á lista yfir lyf sem eru ekki endurnýjuð í fjarþjónustu.",
            en: "Search for the name of the medicine or its active ingredient to see whether it is on the list of medicines that are not renewed remotely." },
    search: "meds",
    options: [
      { label: { is: "Lyfið er ekki á listanum — halda áfram", en: "It is not on the list — continue" }, next: "r-fjar", when: "not-red" },
      { label: { is: "Sjá hvert ég á að leita með þetta lyf", en: "See where to go with this medicine" }, next: "r-controlled", when: "red" },
      { label: { is: "Ég finn ekki lyfið eða er ekki viss", en: "I can't find it or I'm not sure" }, next: "r-fjar",
        why: { is: "Listinn er ekki tæmandi. Læknir metur alltaf hvort lyfið er endurnýjað og lætur þig vita ef þú þarft að leita annað.",
               en: "The list is not exhaustive. A doctor always decides whether a medicine is renewed and tells you if you need to go elsewhere." } },
    ],
  },

  controlled: {
    kind: "question",
    question: { is: "Ávana- og fíknilyf", en: "Controlled drugs" },
    hint: { is: "Ávana- og fíknilyfjum er ekki ávísað í fjarþjónustu. Það á meðal annars við um sterk verkjalyf, róandi lyf, svefnlyf og ADHD-lyf. Leitaðu að lyfinu þínu til að vera viss.",
            en: "Controlled drugs are not prescribed remotely. That includes strong painkillers, sedatives, sleeping pills and ADHD medicines. Search for your medicine to be sure." },
    search: "meds",
    options: [
      { label: { is: "Sjá hvert ég á að leita", en: "See where to go" }, next: "r-controlled" },
      { label: { is: "Lyfið er ekki á listanum — halda áfram", en: "It is not on the list — continue" }, next: "r-fjar", when: "not-red" },
    ],
  },

  cert: {
    kind: "question",
    question: { is: "Hvers konar vottorð þarftu?", en: "What kind of certificate do you need?" },
    hint: { is: "Ertu veik eða veikur núna og þarft vottorð? Farðu til baka og veldu vandamálið þitt. Læknirinn getur gefið vottorð með erindinu.",
            en: "Ill right now and need a certificate? Go back and choose your problem. The doctor can issue a certificate with the request." },
    options: [
      { label: { is: "Veikindavottorð fyrir vinnu eða skóla, vegna erindis sem Fjarlækningar hafa afgreitt",
                 en: "A sick note for work or school, for a request Fjarlækningar has handled" }, next: "r-fjar" },
      { label: { is: "Veikindavottorð vegna veikinda sem Fjarlækningar hafa ekki metið",
                 en: "A sick note for an illness Fjarlækningar has not assessed" },
        next: "r-heilsugaesla",
        why: { is: "Læknir getur aðeins vottað veikindi sem hann hefur sjálfur metið. Vottorð vegna annarra veikinda gefur heilsugæslan út.",
               en: "A doctor can only certify an illness they have assessed. Certificates for other illnesses are issued by your health centre." } },
      { label: { is: "Annað vottorð, til dæmis vegna ökuskírteinis, íþrótta, ferðalaga eða trygginga",
                 en: "Another certificate, e.g. for a driving licence, sports, travel or insurance" },
        next: "r-heilsugaesla",
        why: { is: "Fjarlækningar gefa aðeins út veikindavottorð fyrir vinnu og skóla vegna erinda sem þær hafa afgreitt. Önnur vottorð gefur heilsugæslan út.",
               en: "Fjarlækningar only issues sick notes for work and school for requests it has handled. Other certificates are issued by your health centre." } },
    ],
  },

  "exam-wait": {
    kind: "question",
    question: { is: "Getur það beðið til næsta virka dags?", en: "Can it wait until the next working day?" },
    options: [
      { label: { is: "Já", en: "Yes" }, next: "r-heilsugaesla",
        why: { is: "Það sem þarf að skoða er ekki hægt að meta skriflega.",
               en: "What needs an examination cannot be assessed in writing." } },
      { label: { is: "Nei, og það tengist slysi eða áverka", en: "No, and it follows an accident or injury" }, next: "r-brada" },
      { label: { is: "Nei", en: "No" }, next: "r-1700" },
    ],
  },

  // Someone else: never a dead end. Every path ends at a real place to go.
  "child-when": {
    kind: "question",
    question: { is: "Hvernig er staðan hjá barninu?", en: "How is the child doing?" },
    hint: { is: "Læknar Fjarlækninga meta aðeins þann sem sendir erindið sjálfur, en hér sérðu hvert er best að leita með barnið.",
            en: "Fjarlækningar's doctors only assess the person sending the request, but here is where to go with the child." },
    options: [
      { label: { is: "Barnið er mjög veikt og þetta þolir enga bið", en: "The child is very unwell and this cannot wait" }, next: "r-child-er" },
      { label: { is: "Ég þarf ráð í dag eða í kvöld", en: "I need advice today or tonight" }, next: "r-child-1700" },
      { label: { is: "Þetta getur beðið til næsta virka dags", en: "It can wait until the next working day" }, next: "r-child-hg" },
    ],
  },

  "other-self": {
    kind: "question",
    question: { is: "Getur viðkomandi sent erindið sjálf eða sjálfur?", en: "Can they send the request themselves?" },
    hint: { is: "Til þess þarf viðkomandi að skrá sig inn með eigin rafrænum skilríkjum. Þú mátt aðstoða við að fylla út.",
            en: "They need to sign in with their own electronic ID. You are welcome to help fill it in." },
    options: [
      { label: { is: "Já", en: "Yes" }, next: "r-other-adult" },
      { label: { is: "Nei, eða ég veit það ekki", en: "No, or I don't know" }, next: "other-when" },
    ],
  },

  "other-when": {
    kind: "question",
    question: { is: "Hvernig er staðan hjá viðkomandi?", en: "How are they doing?" },
    options: [
      { label: { is: "Ástandið er alvarlegt og þolir enga bið", en: "They are very unwell and this cannot wait" }, next: "r-other-er" },
      { label: { is: "Það þarf ráð í dag eða í kvöld", en: "Advice is needed today or tonight" }, next: "r-1700" },
      { label: { is: "Þetta getur beðið til næsta virka dags", en: "It can wait until the next working day" }, next: "r-other-hg" },
    ],
  },

  // ------------------------------------------------------------ results
  "r-112": {
    kind: "result",
    service: "112",
    eyebrow: { is: "Bráðatilvik", en: "Emergency" },
    title: { is: "Hringdu strax í 112", en: "Call 112 now" },
    body: [
      { is: "Þessi einkenni þola enga bið eftir skriflegu svari. Hringdu í 112 eða farðu á næstu bráðamóttöku.",
        en: "These symptoms cannot wait for a written answer. Call 112 or go to the nearest emergency department." },
      { is: "Ef þú ert með hugsanir um að skaða þig: Hjálparsími Rauða krossins, 1717, er opinn allan sólarhringinn.",
        en: "If you are having thoughts of harming yourself: the Red Cross helpline, 1717, is open around the clock." },
    ],
    actions: [CALL_112, { id: "call1717", label: { is: "Hringja í 1717", en: "Call 1717" }, href: tel("1717") }],
  },

  "r-brada": {
    kind: "result",
    service: "brada",
    local: "er",
    eyebrow: { is: "Slys og áverkar", en: "Accidents and injuries" },
    title: { is: "Bráðamóttaka", en: "Emergency department" },
    body: [
      { is: "Áverkar sem þarf að skoða strax, til dæmis grunur um beinbrot, djúpur skurður eða höfuðhögg, eru metnir á bráðamóttöku.",
        en: "Injuries that need an examination now, such as a suspected fracture, a deep cut or a blow to the head, are assessed at an emergency department." },
      { is: "Ertu ekki viss? Hringdu í 1700 og fáðu ráð um hvert þú átt að fara.",
        en: "Not sure? Call 1700 for advice on where to go." },
    ],
    actions: [CALL_1700, { ...CALL_112, primary: false }],
  },

  "r-1700": {
    kind: "result",
    service: "1700",
    local: "evening",
    eyebrow: { is: "Ráðgjöf strax", en: "Advice now" },
    title: { is: "Hringdu í 1700", en: "Call 1700" },
    body: [
      { is: "Í síma 1700 færðu ráðgjöf hjúkrunarfræðings allan sólarhringinn og leiðbeiningar um hvert þú átt að leita.",
        en: "On 1700 a nurse gives advice around the clock and tells you where to go." },
    ],
    actions: [{ ...CALL_1700, primary: true }],
  },

  "r-heilsugaesla": {
    kind: "result",
    service: "heilsugaesla",
    eyebrow: { is: "Hentar ekki fjarþjónustu", en: "Not suited to remote care" },
    title: { is: "Heilsugæslan þín", en: "Your health centre" },
    body: [
      { is: "Heilsugæslan sér um skoðanir, blóðprufur, myndgreiningu, tilvísanir, lyfjaskömmtun og eftirfylgd með langvinnum sjúkdómum.",
        en: "Your health centre (heilsugæsla) handles examinations, blood tests, imaging, referrals, dose-dispensed medicines and follow-up of long-term conditions." },
      { is: "Hafðu samband við heilsugæslustöðina þína og bókaðu tíma. Þarftu ráð strax? Hringdu í 1700.",
        en: "Contact your health centre and book an appointment. Need advice now? Call 1700." },
    ],
    actions: [CALL_1700],
  },

  "r-heilsuvera": {
    kind: "result",
    service: "heilsugaesla",
    eyebrow: { is: "Þinn heimilislæknir", en: "Your own GP" },
    title: { is: "Heilsugæslan þín", en: "Your health centre" },
    body: [
      { is: "Eftirfylgd með langvinnum sjúkdómi er best hjá heilsugæslunni þinni, hjá lækni sem þekkir sögu þína. Hafðu samband við heilsugæslustöðina og bókaðu tíma.",
        en: "Follow-up of a long-term condition is best at your health centre, with a doctor who knows your history. Contact your health centre and book an appointment." },
      { is: "Viltu aðeins fá útskýringu á niðurstöðum sem þú hefur þegar fengið? Það geta læknar Fjarlækninga gert.",
        en: "Just want results you already have explained? Fjarlækningar's doctors can do that." },
    ],
    actions: [{ ...OPEN_PORTAL, primary: false }, CALL_1700],
  },

  "r-child-er": {
    kind: "result",
    service: "brada",
    local: "child-er",
    eyebrow: { is: "Barn · þolir enga bið", en: "Child · cannot wait" },
    title: { is: "Farðu með barnið á bráðamóttöku", en: "Take the child to an emergency department" },
    body: [
      { is: "Hringdu í 112 ef barnið á erfitt með að anda, er meðvitundarlítið eða fær krampa.",
        en: "Call 112 if the child is struggling to breathe, is hard to rouse or has a seizure." },
      { is: "Ertu ekki viss? Hringdu í 1700 og fáðu ráð um hvert þú átt að fara.",
        en: "Not sure? Call 1700 for advice on where to go." },
    ],
    actions: [{ ...CALL_112, primary: true }, CALL_1700],
  },

  "r-child-1700": {
    kind: "result",
    service: "1700",
    local: "evening",
    eyebrow: { is: "Barn · ráð í dag", en: "Child · advice today" },
    title: { is: "Hringdu í 1700", en: "Call 1700" },
    body: [
      { is: "Í síma 1700 færðu ráðgjöf hjúkrunarfræðings um barnið allan sólarhringinn, og leiðbeiningar um hvort og hvert þú átt að fara með það.",
        en: "On 1700 a nurse gives advice about the child around the clock, and tells you whether and where to take them." },
    ],
    actions: [{ ...CALL_1700, primary: true }],
  },

  "r-child-hg": {
    kind: "result",
    service: "heilsugaesla",
    eyebrow: { is: "Barn · getur beðið", en: "Child · can wait" },
    title: { is: "Heilsugæsla barnsins", en: "The child's health centre" },
    body: [
      { is: "Heilsugæslan þar sem barnið er skráð sér um skoðanir, eftirlit og lyf fyrir börn. Hafðu samband við heilsugæslustöðina og bókaðu tíma.",
        en: "The health centre where the child is registered handles examinations, check-ups and medicines for children. Contact the health centre and book an appointment." },
      { is: "Versni barninu á meðan þú bíður, hringdu í 1700 eða 112.",
        en: "If the child gets worse while you wait, call 1700 or 112." },
    ],
    actions: [CALL_1700],
  },

  "r-other-adult": {
    kind: "result",
    service: "fjar",
    eyebrow: { is: "Erindi fyrir annan", en: "For someone else" },
    title: { is: "Viðkomandi sendir erindið í sjúklingagáttinni", en: "They send the request through the patient portal" },
    body: [
      { is: "Viðkomandi skráir sig inn með eigin rafrænum skilríkjum og sendir erindið í eigin nafni, því læknir getur aðeins metið þann sem erindið er um. Þú mátt sitja hjá og aðstoða við að fylla út.",
        en: "They sign in with their own electronic ID and send the request in their own name, because a doctor can only assess the person it concerns. You are welcome to sit with them and help fill it in." },
      { is: "Læknir svarar innan tveggja klukkustunda á opnunartíma, alla daga milli 10 og 22.",
        en: "A doctor replies within two hours during opening hours, daily 10–22." },
    ],
    actions: [OPEN_PORTAL, CALL_1700],
  },

  "r-other-er": {
    kind: "result",
    service: "brada",
    local: "er",
    eyebrow: { is: "Þolir enga bið", en: "Cannot wait" },
    title: { is: "Bráðamóttaka eða 112", en: "Emergency department or 112" },
    body: [
      { is: "Hringdu í 112 ef ástandið er alvarlegt eða ef þú kemst ekki með viðkomandi á staðinn.",
        en: "Call 112 if it is serious or you cannot get them there yourself." },
      { is: "Ertu ekki viss? Hringdu í 1700 og fáðu ráð um hvert þú átt að fara.",
        en: "Not sure? Call 1700 for advice on where to go." },
    ],
    actions: [{ ...CALL_112, primary: true }, CALL_1700],
  },

  "r-controlled": {
    kind: "result",
    service: "heilsugaesla",
    eyebrow: { is: "Lyf sem eru ekki endurnýjuð hér", en: "Medicines not renewed here" },
    title: { is: "Læknirinn sem ávísar lyfinu", en: "The doctor who prescribes it" },
    body: [
      { is: "Ávana- og fíknilyf og önnur lyf á listanum eru ekki endurnýjuð í fjarþjónustu, því þau þurfa eftirlit hjá lækni sem þekkir meðferðina þína.",
        en: "Controlled drugs and the other medicines on the list are not renewed remotely, because they need follow-up by a doctor who knows your treatment." },
      { is: "Hafðu samband við lækninn sem ávísaði lyfinu síðast eða við heilsugæsluna þína.",
        en: "Contact the doctor who last prescribed it, or your health centre." },
    ],
    actions: [CALL_1700],
  },

  "r-other-hg": {
    kind: "result",
    service: "heilsugaesla",
    eyebrow: { is: "Getur beðið", en: "Can wait" },
    title: { is: "Heilsugæsla viðkomandi", en: "Their health centre" },
    body: [
      { is: "Hringdu í heilsugæslustöð viðkomandi og bókaðu tíma. Þú mátt fylgja viðkomandi í tímann.",
        en: "Phone the health centre where they are registered and book an appointment. You are welcome to go with them." },
      { is: "Versni viðkomandi á meðan þið bíðið, hringdu í 1700 eða 112.",
        en: "If they get worse while you wait, call 1700 or 112." },
    ],
    actions: [CALL_1700],
  },

  "r-fjar": {
    kind: "result",
    service: "fjar",
    eyebrow: { is: "Hentar fjarþjónustu", en: "Suited to remote care" },
    title: { is: "Fjarlækningar geta hjálpað", en: "Fjarlækningar can help" },
    body: [
      { is: "Þú skráir þig inn með rafrænum skilríkjum, velur erindi og svarar nokkrum spurningum. Læknir svarar innan tveggja klukkustunda á opnunartíma, alla daga milli 10 og 22.",
        en: "Sign in with electronic ID, choose a request type and answer a few questions. A doctor replies within two hours during opening hours, daily 10–22." },
      { is: "Gott að hafa við höndina: lista yfir lyfin sem þú notar, og myndir ef vandamálið sést. Versni einkennin á meðan þú bíður, hringdu í 1700 eða 112.",
        en: "Have ready: a list of the medicines you take, and photos if the problem is visible. If you get worse while you wait, call 1700 or 112." },
    ],
    actions: [OPEN_PORTAL],
  },
};

// ------------------------------------------------------------ where you are
//
// The "Þar sem þú ert" box on results with a `local` need. One cell per region
// and need; every cell is a CMS field (group "Leiðarvísir — staðsetning").
export const REGION_TEXT: Record<RegionId, Record<LocalNeed, L>> = {
  capital: {
    er: { is: "Bráðamóttaka Landspítala í Fossvogi er opin allan sólarhringinn.",
          en: "The Landspítali emergency department in Fossvogur is open around the clock." },
    "child-er": { is: "Bráðamóttaka barna á Barnaspítala Hringsins við Hringbraut er opin allan sólarhringinn.",
                  en: "The children's emergency department at Barnaspítali Hringsins on Hringbraut is open around the clock." },
    evening: { is: "Læknavaktin tekur á móti fólki á kvöldin og um helgar, þegar heilsugæslan er lokuð. Á dagtíma virka daga sinnir heilsugæslan þín erindinu.",
               en: "Læknavaktin sees patients in the evenings and at weekends, when health centres are closed. On weekdays, your health centre handles it." },
  },
  akureyri: {
    er: { is: "Bráðamóttaka Sjúkrahússins á Akureyri er opin allan sólarhringinn og þangað má koma án tímapöntunar.",
          en: "The emergency department at Sjúkrahúsið á Akureyri is open around the clock and takes walk-ins." },
    "child-er": { is: "Farðu með barnið á bráðamóttöku Sjúkrahússins á Akureyri. Hún er opin allan sólarhringinn.",
                  en: "Take the child to the emergency department at Sjúkrahúsið á Akureyri. It is open around the clock." },
    evening: { is: "Utan opnunartíma heilsugæslunnar gefur 1700 þér samband við vaktþjónustu heilsugæslunnar. Á dagtíma virka daga sinnir heilsugæslan þín erindinu.",
               en: "Outside health-centre hours, 1700 puts you through to the health centre's on-call service. On weekdays, your health centre handles it." },
  },
  selfoss: {
    er: { is: "Bráðamóttaka Heilbrigðisstofnunar Suðurlands á Selfossi er opin allan sólarhringinn og þangað má koma án tímapöntunar.",
          en: "The HSU emergency department in Selfoss is open around the clock and takes walk-ins." },
    "child-er": { is: "Farðu með barnið á bráðamóttöku Heilbrigðisstofnunar Suðurlands á Selfossi. Hún er opin allan sólarhringinn.",
                  en: "Take the child to the HSU emergency department in Selfoss. It is open around the clock." },
    evening: { is: "Utan opnunartíma heilsugæslunnar gefur 1700 þér samband við vaktþjónustu heilsugæslunnar. Á dagtíma virka daga sinnir heilsugæslan þín erindinu.",
               en: "Outside health-centre hours, 1700 puts you through to the health centre's on-call service. On weekdays, your health centre handles it." },
  },
  rural: {
    er: { is: "Hringdu í 1700. Þaðan færðu samband við lækni á vakt á þínu svæði og leiðbeiningar um hvert þú átt að fara. Hringdu í 112 ef ástandið er alvarlegt.",
          en: "Call 1700 to reach the doctor on call in your area and get directions on where to go. Call 112 if it is serious." },
    "child-er": { is: "Hringdu í 1700. Þaðan færðu samband við lækni á vakt á þínu svæði og leiðbeiningar um hvert þú átt að fara með barnið. Hringdu í 112 ef ástandið er alvarlegt.",
                  en: "Call 1700 to reach the doctor on call in your area and get directions on where to take the child. Call 112 if it is serious." },
    evening: { is: "Utan dagvinnutíma sinnir vaktþjónusta heilsugæslunnar á þínu svæði bráðum erindum og 1700 gefur þér samband. Á dagtíma virka daga sinnir heilsugæslan þín erindinu.",
               en: "Outside working hours, the health centre's on-call service in your area handles urgent matters, and 1700 puts you through. On weekdays, your health centre handles it." },
  },
};

// ------------------------------------------------------------ CMS
//
// Every patient-facing string above is a field on the HOME page in the CMS
// (/admin/website/home, groups "Leiðarvísir — …"). The tree — which answer
// leads where — stays here in code; only the words are editable. The strings
// above are the built-in defaults, so an empty CMS renders exactly this text.
//
// Lists are one textarea with one item per line; result text is one textarea
// with a blank line between paragraphs.

const UI_TEXT: Record<string, L> = {
  title: { is: "Hvert á ég að leita?", en: "Where should I go?" },
  title_portal: { is: "Áður en þú opnar sjúklingagáttina", en: "Before you open the patient portal" },
  title_check: { is: "Hentar fjarlækningaþjónusta mér?", en: "Is remote care right for me?" },
  intro_heading: { is: "Af hverju þessar spurningar?", en: "Why these questions?" },
  intro: { is: "Fjarlækningar henta mörgum algengum erindum, en ekki öllum. Svaraðu nokkrum spurningum og við vísum þér á réttan stað, hvort sem það er hingað eða annað. Það tekur innan við mínútu.",
           en: "Remote care suits many common problems, but not all. Answer a few questions and we will point you to the right place, whether that is here or elsewhere. It takes less than a minute." },
  local: { is: "Þar sem þú ert", en: "Where you are" },
  need_more: { is: "Eða eitthvað af þessu", en: "Or one of these" },
  pick_hint: { is: "Í sjúklingagáttinni velur þú", en: "In the patient portal, choose" },
  place_placeholder: { is: "Skrifaðu nafn staðarins, til dæmis Hafnarfjörður eða Höfn",
                       en: "Type the place name, e.g. Hafnarfjörður or Höfn" },
  place_nomatch: { is: "Finnurðu ekki staðinn? Veldu „Annars staðar á landinu“.",
                   en: "Can't find it? Choose “Elsewhere in Iceland”." },
  med_placeholder: { is: "Heiti lyfs eða virkt efni, til dæmis Stesolid eða zópíklón",
                     en: "Medicine name or active ingredient, e.g. Stesolid or zopiclone" },
  med_red_title: { is: "Þetta lyf endurnýjum við ekki", en: "We do not renew this medicine" },
  med_red_body: { is: "Það er á lista yfir lyf sem eru ekki endurnýjuð í fjarþjónustu.",
                  en: "It is on the list of medicines that are not renewed remotely." },
  med_green_title: { is: "Ekki á listanum — getur hentað lyfjaendurnýjun", en: "Not on the list — may suit a renewal" },
  med_green_body: { is: "Á við lyf sem þú tekur að staðaldri, og aðeins einfaldan lyfseðil. Listinn er ekki tæmandi og læknir metur alltaf hvort lyfið er endurnýjað.",
                    en: "For medicines you take regularly, and a single prescription only. The list is not exhaustive and a doctor always decides." },
  step: { is: "Skref", en: "Step" },
  back: { is: "Til baka", en: "Back" },
  restart: { is: "Byrja aftur", en: "Start again" },
  close: { is: "Loka", en: "Close" },
  skip: { is: "Ég veit hvað ég þarf — beint í sjúklingagátt", en: "I know what I need — straight to the portal" },
  why: { is: "Hvers vegna?", en: "Why?" },
  disclaimer: { is: "Leiðbeining um þjónustuleiðir, ekki læknisfræðilegt mat.",
                en: "Guidance on where to go, not a medical assessment." },
};

const UI_LABELS: Record<string, string> = {
  title: "Titill (almennur)", title_portal: "Titill — opnað úr „Opna sjúklingagátt“",
  title_check: "Titill — opnað úr „Hentar fjarlækningaþjónusta mér?“", intro_heading: "Inngangur — fyrirsögn",
  intro: "Inngangur — texti", local: "Fyrirsögn staðbundinna ráða (staður bætist við)",
  need_more: "Skref „Hvað þarftu“ — fyrirsögn seinni hluta",
  pick_hint: "Niðurstaða Fjarlækninga — „velur þú“ (heiti erindis bætist við)",
  place_placeholder: "Staðarleit — texti í reit", place_nomatch: "Staðarleit — ef ekkert finnst",
  med_placeholder: "Lyfjaleit — texti í reit", med_red_title: "Lyfjaleit — á listanum: fyrirsögn",
  med_red_body: "Lyfjaleit — á listanum: texti", med_green_title: "Lyfjaleit — ekki á listanum: fyrirsögn",
  med_green_body: "Lyfjaleit — ekki á listanum: texti", step: "Orðið „Skref“ (númer bætist við)",
  back: "Hnappur: til baka", restart: "Hnappur: byrja aftur", close: "Hnappur: loka (skjálesari)",
  skip: "Tengill: beint í sjúklingagátt", why: "Merki við skýringu", disclaimer: "Fyrirvari neðst",
};

const NODE_NAMES: Record<string, string> = {
  emergency: "Skref 1 · Bráð einkenni",
  location: "Skref 2 · Hvar ertu",
  who: "Skref 3 · Fyrir hvern",
  need: "Skref 4 · Hvað þarftu",
  meds: "Lyf · Hvað á við",
  "meds-check": "Lyf · Lyfjaleit",
  controlled: "Lyf · Ávana- og fíknilyf",
  cert: "Vottorð · Hvers konar",
  "exam-wait": "Skoðun · Getur beðið?",
  "r-112": "Niðurstaða · 112",
  "r-brada": "Niðurstaða · Bráðamóttaka",
  "r-1700": "Niðurstaða · 1700",
  "r-heilsugaesla": "Niðurstaða · Heilsugæsla",
  // id kept (CMS keys hang on it); it now sends people to the health centre.
  "r-heilsuvera": "Niðurstaða · Heilsugæsla, eftirfylgd",
  "child-when": "Barn · Staðan",
  "other-self": "Annar fullorðinn · Getur sent sjálfur?",
  "other-when": "Annar fullorðinn · Staðan",
  "r-child-er": "Niðurstaða · Barn, bráðamóttaka",
  "r-child-1700": "Niðurstaða · Barn, 1700",
  "r-child-hg": "Niðurstaða · Barn, heilsugæsla",
  "r-other-adult": "Niðurstaða · Annar fullorðinn, sjúklingagátt",
  "r-other-er": "Niðurstaða · Annar fullorðinn, bráðamóttaka",
  "r-other-hg": "Niðurstaða · Annar fullorðinn, heilsugæsla",
  "r-controlled": "Niðurstaða · Lyf sem eru ekki endurnýjuð",
  "r-fjar": "Niðurstaða · Fjarlækningar",
};

const ACTION_NAMES: Record<string, string> = {
  call112: "Hnappur: hringja í 112", call1700: "Hnappur: hringja í 1700",
  call1717: "Hnappur: hringja í 1717",
  portal: "Hnappur: opna sjúklingagátt",
};

const key = (...parts: (string | number)[]) => ["triage", ...parts].join("_").replace(/-/g, "_");

/** CMS keys for every string in the popup. */
export const TK = {
  ui: (name: string) => key("ui", name),
  action: (id: string) => key("act", id),
  question: (node: string) => key(node, "q"),
  hint: (node: string) => key(node, "hint"),
  list: (node: string) => key(node, "list"),
  option: (node: string, i: number) => key(node, "opt", i + 1),
  why: (node: string, i: number) => key(node, "opt", i + 1, "why"),
  eyebrow: (node: string) => key(node, "eyebrow"),
  title: (node: string) => key(node, "title"),
  body: (node: string) => key(node, "body"),
  local: (region: RegionId, need: LocalNeed) => key("loc", region, need),
};

const G_UI = "Leiðarvísir — almennur texti";
const G_Q = "Leiðarvísir — spurningar";
const G_R = "Leiðarvísir — niðurstöður";

export const TRIAGE_FIELDS: SiteField[] = [];
export const TRIAGE_DEFAULTS_IS: LocaleContent = {};
export const TRIAGE_DEFAULTS_EN: LocaleContent = {};

function add(field: Omit<SiteField, "group"> & { group: string }, text: L) {
  TRIAGE_FIELDS.push(field);
  TRIAGE_DEFAULTS_IS[field.key] = text.is;
  TRIAGE_DEFAULTS_EN[field.key] = text.en;
}
const join = (items: L[], sep: string): L => ({
  is: items.map((x) => x.is).join(sep),
  en: items.map((x) => x.en).join(sep),
});

for (const [name, text] of Object.entries(UI_TEXT)) {
  add({
    key: TK.ui(name), label: UI_LABELS[name], group: G_UI,
    type: name === "intro" ? "textarea" : "text",
    ...(name === "title" ? { help: "Ef íslenskum texta er breytt birtist hann líka á ensku þar til enska útgáfan er uppfærð. Uppfærðu því enska textann um leið." } : {}),
  }, text);
}
const actions = new Map<string, TriageAction>();
for (const node of Object.values(TRIAGE)) {
  if (node.kind === "result") for (const a of node.actions) actions.set(a.id, a);
}
for (const [id, a] of actions) {
  add({ key: TK.action(id), label: ACTION_NAMES[id] ?? id, group: G_UI, type: "text" }, a.label);
}
for (const [id, node] of Object.entries(TRIAGE)) {
  const n = NODE_NAMES[id] ?? id;
  if (node.kind === "question") {
    add({ key: TK.question(id), label: `${n} — spurning`, group: G_Q, type: "text" }, node.question);
    if (node.hint) add({ key: TK.hint(id), label: `${n} — leiðbeining`, group: G_Q, type: "text" }, node.hint);
    if (node.list) {
      add({ key: TK.list(id), label: `${n} — listi`, group: G_Q, type: "textarea",
            help: "Eitt atriði í hverja línu." }, join(node.list, "\n"));
    }
    node.options.forEach((o, i) => {
      add({ key: TK.option(id, i), label: `${n} — svar ${i + 1}`, group: G_Q, type: "text" }, o.label);
      if (o.why) {
        add({ key: TK.why(id, i), label: `${n} — svar ${i + 1}: hvers vegna`, group: G_Q, type: "textarea",
              help: "Birtist efst á niðurstöðunni sem þetta svar leiðir til." }, o.why);
      }
    });
  } else {
    add({ key: TK.eyebrow(id), label: `${n} — merki`, group: G_R, type: "text" }, node.eyebrow);
    add({ key: TK.title(id), label: `${n} — fyrirsögn`, group: G_R, type: "text" }, node.title);
    add({ key: TK.body(id), label: `${n} — texti`, group: G_R, type: "textarea",
          help: "Auð lína á milli efnisgreina." }, join(node.body, "\n\n"));
  }
}

const G_L = "Leiðarvísir — staðsetning";
const REGION_NAMES: Record<RegionId, string> = {
  capital: "Höfuðborgarsvæðið", akureyri: "Akureyri", selfoss: "Selfoss", rural: "Annars staðar",
};
const NEED_NAMES: Record<LocalNeed, string> = {
  er: "bráðamóttaka", "child-er": "bráðamóttaka fyrir barn", evening: "kvöld, helgar og dagtími",
};
for (const [region, needs] of Object.entries(REGION_TEXT) as [RegionId, Record<LocalNeed, L>][]) {
  for (const [need, text] of Object.entries(needs) as [LocalNeed, L][]) {
    add({ key: TK.local(region, need), label: `${REGION_NAMES[region]} — ${NEED_NAMES[need]}`, group: G_L, type: "textarea",
          ...(region === "capital" && need === "er" ? { help: "Birtist í reitnum „Þar sem þú ert“ á niðurstöðum sem vísa fólki á staðinn, eftir því hvaða svæði var valið." } : {}) }, text);
  }
}

/** The popup's strings out of a page's resolved content — only these travel
 *  to the browser, not the whole home page. */
export function triageText(c: LocaleContent): LocaleContent {
  return Object.fromEntries(Object.entries(c).filter(([k]) => k.startsWith("triage_")));
}

/** One screen in the popup; `via` = the node and option index that led here
 *  (for the "why" note on results); `place` = a place picked in the search;
 *  `pick` = the service button pressed on "Hvað þarftu" (named on the result). */
export type TriageStep = { id: string; via?: { from: string; index: number }; place?: string; pick?: string };

/** Shortest click path from the start to `target` — used by the CMS preview to
 *  jump straight to any screen while still showing the note that leads there.
 *  `regionIndex` picks the answer on the location step (default: first). */
export function triagePath(target: string, regionIndex = 0): TriageStep[] {
  const queue: TriageStep[][] = [[{ id: TRIAGE_START }]];
  const seen = new Set([TRIAGE_START]);
  while (queue.length) {
    const path = queue.shift()!;
    const last = path[path.length - 1];
    if (last.id === target) {
      return path.map((st) => (st.via?.from === "location" ? { ...st, via: { from: "location", index: regionIndex } } : st));
    }
    const node = TRIAGE[last.id];
    if (node?.kind !== "question") continue;
    node.options.forEach((o, index) => {
      if (seen.has(o.next)) return;
      seen.add(o.next);
      queue.push([...path, { id: o.next, via: { from: last.id, index } }]);
    });
  }
  return [{ id: TRIAGE_START }];
}

/** The region (and place name, if typed) chosen on the location step. */
export function triageWhere(steps: TriageStep[]): { region?: RegionId; label?: string; place?: string } {
  const st = steps.find((x) => x.via?.from === "location");
  const node = TRIAGE.location;
  if (!st?.via || node.kind !== "question") return {};
  return { region: node.options[st.via.index]?.region, place: st.place };
}

/** Longest number of further answers from `id` to a result — for the
 *  progress bar, so it never runs backwards. */
export function triageRemaining(id: string): number {
  const node = TRIAGE[id];
  if (!node || node.kind === "result") return 0;
  return 1 + Math.max(...node.options.map((o) => triageRemaining(o.next)));
}

/** Human names of every screen, in tree order (CMS editor labels + preview). */
export const TRIAGE_SCREENS = Object.keys(TRIAGE).map((id) => ({ id, name: NODE_NAMES[id] ?? id }));

/** The example services for the "Algengt vandamál" picture grid, in the page's
 *  language, minus any service switched off in the Þjónusta CMS. */
export function triageExamples(
  titles: { slug: string; title: string }[],
  shown: (slug: string) => boolean = () => true,
): TriageExample[] {
  return TRIAGE_EXAMPLES.filter(shown)
    .map((slug) => titles.find((t) => t.slug === slug))
    .filter((t): t is TriageExample => !!t)
    .map(({ slug, title }) => ({ slug, title }));
}
