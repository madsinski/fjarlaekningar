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

export const PORTAL_URL = "https://app.medalia.is/fjarlaekningar-hsu";
export const HEILSUVERA_URL = "https://www.heilsuvera.is";

export type ServiceKey =
  | "112" | "brada" | "1700" | "heilsugaesla" | "heilsuvera" | "fjar" | "other-adult";

type L = { is: string; en: string };

export type TriageOption = {
  label: L;
  next: string;
  /** Shown on the result page: why this answer led here. */
  why?: L;
  /**
   * Picture for the answer card. Existing site material only: `img` = one of
   * the colourful service illustrations (/erindi-icons), used for answers
   * Fjarlækningar handles; `icon` = a neutral line icon, for answers that lead
   * to another service; `gallery` = the grid of service icons (TRIAGE_EXAMPLES).
   * Colour means "we can help here", grey means "someone else".
   */
  visual?: { img?: string; icon?: "test-tube" | "hand" | "message-square" | "phone"; gallery?: boolean };
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
};

export type TriageNode = TriageQuestion | TriageResult;

const tel = (n: string) => `tel:${n.replace(/\s/g, "")}`;

const CALL_112: TriageAction = { id: "call112", label: { is: "Hringja í 112", en: "Call 112" }, href: tel("112"), primary: true };
const CALL_1700: TriageAction = { id: "call1700", label: { is: "Hringja í 1700", en: "Call 1700" }, href: tel("1700") };
const OPEN_HEILSUVERA: TriageAction = {
  id: "heilsuvera", label: { is: "Opna Heilsuveru", en: "Open Heilsuvera" }, href: HEILSUVERA_URL,
};
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
      { label: { is: "Nei", en: "No" }, next: "who" },
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
      { label: { is: "Algengt vandamál, til dæmis:", en: "A common problem, for example:" },
        next: "r-fjar", visual: { gallery: true } },
      { label: { is: "Endurnýjun á lyfi sem ég nota", en: "A renewal of a medicine I already take" }, next: "meds",
        visual: { img: "/erindi-icons/lyfjuendurnyjun.png" } },
      { label: { is: "Læknisvottorð", en: "A medical certificate" }, next: "r-fjar",
        visual: { img: "/erindi-icons/laeknisvottord.png" } },
      { label: { is: "Annað sem ég get lýst í texta eða með myndum", en: "Something else I can describe in writing or with photos" },
        next: "r-fjar", visual: { img: "/erindi-icons/almenn-laeknisthjonusta.png" } },
      { label: { is: "Blóðprufa, myndgreining, speglun eða tilvísun",
                 en: "A blood test, imaging, endoscopy or a referral" },
        next: "r-heilsugaesla", visual: { icon: "test-tube" },
        why: { is: "Læknirinn sem biður um rannsókn eða tilvísun þarf að byggja á viðtali og skoðun og fylgja niðurstöðunum eftir. Það er best gert þar sem þú ert í reglulegri eftirfylgd.",
               en: "The doctor who orders a test or referral needs a consultation and examination to base it on, and has to follow up the results. That is best done where you are followed up regularly." } },
      { label: { is: "Vandamál sem læknir þarf að skoða, til dæmis hlusta, þreifa eða skoða eyru",
                 en: "A problem a doctor needs to examine, e.g. listen to, feel or look in the ears" },
        next: "exam-wait", visual: { icon: "hand" } },
      { label: { is: "Eftirfylgd með langvinnum sjúkdómi eða skilaboð til heimilislæknis",
                 en: "Follow-up of a long-term condition, or a message to my GP" },
        next: "r-heilsuvera", visual: { icon: "message-square" } },
      { label: { is: "Ég veit ekki hversu alvarlegt þetta er", en: "I'm not sure how serious this is" }, next: "r-1700",
        visual: { icon: "phone" } },
    ],
  },

  meds: {
    kind: "question",
    question: { is: "Hvernig færðu lyfið?", en: "How do you get the medicine?" },
    options: [
      { label: { is: "Ég sæki það sjálf eða sjálfur í apótek", en: "I collect it from the pharmacy myself" }, next: "r-fjar" },
      { label: { is: "Skammtað í lyfjarúllu frá apóteki", en: "Dose-dispensed in a pharmacy roll (lyfjarúlla)" },
        next: "r-heilsugaesla",
        why: { is: "Skömmtuð lyf eru afgreidd eftir skömmtunarkorti sem læknirinn þinn heldur utan um. Til að öll lyfin skili sér rétt í rúlluna þarf sá læknir að gera breytingarnar.",
               en: "Dose-dispensed medicines follow a dispensing card kept by your own doctor. For everything to end up correctly in the roll, that doctor has to make the change." } },
      { label: { is: "Það er ávana- eða fíknilyf, til dæmis sterkt verkjalyf, svefnlyf, róandi lyf eða ADHD-lyf",
                 en: "It is a controlled drug, e.g. a strong painkiller, sleeping pill, sedative or ADHD medicine" },
        next: "r-heilsugaesla",
        why: { is: "Ávana- og fíknilyfjum er ekki ávísað í fjarþjónustu.",
               en: "Controlled drugs are not prescribed through remote care." } },
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
    eyebrow: { is: "Slys og áverkar", en: "Accidents and injuries" },
    title: { is: "Slysa- og bráðamóttaka", en: "Accident and emergency department" },
    body: [
      { is: "Áverkar sem þarf að skoða strax, til dæmis grunur um beinbrot, djúpur skurður eða höfuðhögg, eru metnir á slysa- og bráðamóttöku. Á höfuðborgarsvæðinu er hún á Landspítala í Fossvogi, annars staðar á næstu heilbrigðisstofnun.",
        en: "Injuries that need an examination now, such as a suspected fracture, a deep cut or a blow to the head, are assessed at an accident and emergency department. In the capital area that is Landspítali in Fossvogur; elsewhere, the nearest healthcare institution." },
      { is: "Ertu ekki viss? Hringdu í 1700 og fáðu ráð um hvert þú átt að fara.",
        en: "Not sure? Call 1700 for advice on where to go." },
    ],
    actions: [CALL_1700, { ...CALL_112, primary: false }],
  },

  "r-1700": {
    kind: "result",
    service: "1700",
    eyebrow: { is: "Ráðgjöf strax", en: "Advice now" },
    title: { is: "Hringdu í 1700", en: "Call 1700" },
    body: [
      { is: "Í síma 1700 færðu ráðgjöf hjúkrunarfræðings allan sólarhringinn og leiðbeiningar um hvert þú átt að leita.",
        en: "On 1700 a nurse gives advice around the clock and tells you where to go." },
      { is: "Á höfuðborgarsvæðinu tekur Læknavaktin á móti fólki á kvöldin og um helgar, þegar heilsugæslan er lokuð.",
        en: "In the capital area, Læknavaktin sees patients in the evenings and at weekends, when health centres are closed." },
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
      { is: "Þú getur bókað tíma eða sent skilaboð á Mínum síðum á Heilsuveru, eða hringt í heilsugæslustöðina þína. Þarftu ráð strax? Hringdu í 1700.",
        en: "Book an appointment or send a message under My pages on Heilsuvera, or phone your health centre. Need advice now? Call 1700." },
    ],
    actions: [{ ...OPEN_HEILSUVERA, primary: true }, CALL_1700],
  },

  "r-heilsuvera": {
    kind: "result",
    service: "heilsuvera",
    eyebrow: { is: "Þinn heimilislæknir", en: "Your own GP" },
    title: { is: "Heilsuvera", en: "Heilsuvera" },
    body: [
      { is: "Á Mínum síðum á Heilsuveru getur þú sent heilsugæslunni þinni skilaboð, séð niðurstöður rannsókna og bókað tíma. Eftirfylgd með langvinnum sjúkdómi er best hjá lækni sem þekkir sögu þína.",
        en: "Under My pages on Heilsuvera you can message your health centre, see test results and book appointments. Follow-up of a long-term condition is best with a doctor who knows your history." },
      { is: "Viltu aðeins fá útskýringu á niðurstöðum sem þú hefur þegar fengið? Það geta læknar Fjarlækninga gert.",
        en: "Just want results you already have explained? Fjarlækningar's doctors can do that." },
    ],
    actions: [{ ...OPEN_HEILSUVERA, primary: true }, { ...OPEN_PORTAL, primary: false }],
  },

  "r-child-er": {
    kind: "result",
    service: "brada",
    eyebrow: { is: "Barn · þolir enga bið", en: "Child · cannot wait" },
    title: { is: "Bráðamóttaka barna", en: "Children's emergency department" },
    body: [
      { is: "Farðu með barnið á bráðamóttöku barna á Barnaspítala Hringsins, eða á næstu bráðamóttöku utan höfuðborgarsvæðisins. Hringdu í 112 ef barnið á erfitt með að anda, er meðvitundarlítið eða fær krampa.",
        en: "Take the child to the children's emergency department at Barnaspítali Hringsins, or the nearest emergency department outside the capital area. Call 112 if the child is struggling to breathe, is hard to rouse or has a seizure." },
      { is: "Ertu ekki viss? Hringdu í 1700 og fáðu ráð um hvert þú átt að fara.",
        en: "Not sure? Call 1700 for advice on where to go." },
    ],
    actions: [{ ...CALL_112, primary: true }, CALL_1700],
  },

  "r-child-1700": {
    kind: "result",
    service: "1700",
    eyebrow: { is: "Barn · ráð í dag", en: "Child · advice today" },
    title: { is: "Hringdu í 1700", en: "Call 1700" },
    body: [
      { is: "Í síma 1700 færðu ráðgjöf hjúkrunarfræðings um barnið allan sólarhringinn, og leiðbeiningar um hvort og hvert þú átt að fara með það.",
        en: "On 1700 a nurse gives advice about the child around the clock, and tells you whether and where to take them." },
      { is: "Á höfuðborgarsvæðinu tekur Læknavaktin á móti börnum á kvöldin og um helgar, þegar heilsugæslan er lokuð.",
        en: "In the capital area, Læknavaktin sees children in the evenings and at weekends, when health centres are closed." },
    ],
    actions: [{ ...CALL_1700, primary: true }],
  },

  "r-child-hg": {
    kind: "result",
    service: "heilsugaesla",
    eyebrow: { is: "Barn · getur beðið", en: "Child · can wait" },
    title: { is: "Heilsugæsla barnsins", en: "The child's health centre" },
    body: [
      { is: "Heilsugæslan þar sem barnið er skráð sér um skoðanir, eftirlit og lyf fyrir börn. Á Heilsuveru geta forráðamenn sent heilsugæslu barnsins skilaboð og bókað tíma, eða hringt beint í heilsugæslustöðina.",
        en: "The health centre where the child is registered handles examinations, check-ups and medicines for children. Through Heilsuvera, guardians can message the child's health centre and book an appointment, or phone the health centre directly." },
      { is: "Versni barninu á meðan þú bíður, hringdu í 1700 eða 112.",
        en: "If the child gets worse while you wait, call 1700 or 112." },
    ],
    actions: [{ ...OPEN_HEILSUVERA, primary: true }, CALL_1700],
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
    eyebrow: { is: "Þolir enga bið", en: "Cannot wait" },
    title: { is: "Bráðamóttaka eða 112", en: "Emergency department or 112" },
    body: [
      { is: "Farðu með viðkomandi á næstu bráðamóttöku. Á höfuðborgarsvæðinu er hún á Landspítala í Fossvogi. Hringdu í 112 ef ástandið er alvarlegt eða ef þú kemst ekki með viðkomandi á staðinn.",
        en: "Take them to the nearest emergency department; in the capital area that is Landspítali in Fossvogur. Call 112 if it is serious or you cannot get them there yourself." },
      { is: "Ertu ekki viss? Hringdu í 1700 og fáðu ráð um hvert þú átt að fara.",
        en: "Not sure? Call 1700 for advice on where to go." },
    ],
    actions: [{ ...CALL_112, primary: true }, CALL_1700],
  },

  "r-other-hg": {
    kind: "result",
    service: "heilsugaesla",
    eyebrow: { is: "Getur beðið", en: "Can wait" },
    title: { is: "Heilsugæsla viðkomandi", en: "Their health centre" },
    body: [
      { is: "Hringdu í heilsugæslustöð viðkomandi og bókaðu tíma, eða aðstoðaðu við að bóka á Heilsuveru. Þú mátt fylgja viðkomandi í tímann.",
        en: "Phone the health centre where they are registered and book an appointment, or help them book through Heilsuvera. You are welcome to go with them." },
      { is: "Versni viðkomandi á meðan þið bíðið, hringdu í 1700 eða 112.",
        en: "If they get worse while you wait, call 1700 or 112." },
    ],
    actions: [{ ...OPEN_HEILSUVERA, primary: true }, CALL_1700],
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
  intro: { is: "Nokkrar spurningar vísa þér á þá þjónustu sem hentar best. Það tekur innan við mínútu.",
           en: "A few questions point you to the service that fits best. It takes less than a minute." },
  step: { is: "Skref", en: "Step" },
  back: { is: "Til baka", en: "Back" },
  restart: { is: "Byrja aftur", en: "Start again" },
  close: { is: "Loka", en: "Close" },
  skip: { is: "Beint í sjúklingagátt", en: "Straight to the patient portal" },
  why: { is: "Hvers vegna?", en: "Why?" },
  disclaimer: { is: "Leiðbeining um þjónustuleiðir, ekki læknisfræðilegt mat.",
                en: "Guidance on where to go, not a medical assessment." },
};

const UI_LABELS: Record<string, string> = {
  title: "Titill leiðarvísis", intro: "Inngangur", step: "Orðið „Skref“ (númer bætist við)",
  back: "Hnappur: til baka", restart: "Hnappur: byrja aftur", close: "Hnappur: loka (skjálesari)",
  skip: "Tengill: beint í sjúklingagátt", why: "Merki við skýringu", disclaimer: "Fyrirvari neðst",
};

const NODE_NAMES: Record<string, string> = {
  emergency: "Skref 1 · Bráð einkenni",
  who: "Skref 2 · Fyrir hvern",
  need: "Skref 3 · Hvað þarftu",
  meds: "Skref 3a · Lyf",
  "exam-wait": "Skref 3b · Getur beðið?",
  "r-112": "Niðurstaða · 112",
  "r-brada": "Niðurstaða · Bráðamóttaka",
  "r-1700": "Niðurstaða · 1700",
  "r-heilsugaesla": "Niðurstaða · Heilsugæsla",
  "r-heilsuvera": "Niðurstaða · Heilsuvera",
  "child-when": "Barn · Staðan",
  "other-self": "Annar fullorðinn · Getur sent sjálfur?",
  "other-when": "Annar fullorðinn · Staðan",
  "r-child-er": "Niðurstaða · Barn, bráðamóttaka",
  "r-child-1700": "Niðurstaða · Barn, 1700",
  "r-child-hg": "Niðurstaða · Barn, heilsugæsla",
  "r-other-adult": "Niðurstaða · Annar fullorðinn, sjúklingagátt",
  "r-other-er": "Niðurstaða · Annar fullorðinn, bráðamóttaka",
  "r-other-hg": "Niðurstaða · Annar fullorðinn, heilsugæsla",
  "r-fjar": "Niðurstaða · Fjarlækningar",
};

const ACTION_NAMES: Record<string, string> = {
  call112: "Hnappur: hringja í 112", call1700: "Hnappur: hringja í 1700",
  call1717: "Hnappur: hringja í 1717", heilsuvera: "Hnappur: opna Heilsuveru",
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

/** The popup's strings out of a page's resolved content — only these travel
 *  to the browser, not the whole home page. */
export function triageText(c: LocaleContent): LocaleContent {
  return Object.fromEntries(Object.entries(c).filter(([k]) => k.startsWith("triage_")));
}

/** One screen in the popup; `via` = the node and option index that led here
 *  (for the "why" note on results). */
export type TriageStep = { id: string; via?: { from: string; index: number } };

/** Shortest click path from the start to `target` — used by the CMS preview to
 *  jump straight to any screen while still showing the note that leads there. */
export function triagePath(target: string): TriageStep[] {
  const queue: TriageStep[][] = [[{ id: TRIAGE_START }]];
  const seen = new Set([TRIAGE_START]);
  while (queue.length) {
    const path = queue.shift()!;
    const last = path[path.length - 1];
    if (last.id === target) return path;
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
