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
};

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
      { label: { is: "Fyrir barn", en: "For a child" }, next: "r-child" },
      { label: { is: "Fyrir annan fullorðinn, til dæmis maka eða foreldri", en: "For another adult, e.g. a partner or parent" },
        next: "r-other-adult" },
    ],
  },

  need: {
    kind: "question",
    question: { is: "Hvað þarftu helst?", en: "What do you need most?" },
    hint: { is: "Veldu það sem passar best.", en: "Pick the closest match." },
    options: [
      { label: { is: "Mat á algengu vandamáli, til dæmis kvefi, þvagfærasýkingu, útbrotum, augnsýkingu eða frunsu",
                 en: "Assessment of a common problem, e.g. a cold, urinary infection, rash, eye infection or cold sore" },
        next: "r-fjar" },
      { label: { is: "Endurnýjun á lyfi sem ég nota", en: "A renewal of a medicine I already take" }, next: "meds" },
      { label: { is: "Læknisvottorð", en: "A medical certificate" }, next: "r-fjar" },
      { label: { is: "Beiðni um blóðprufu, myndgreiningu eða speglun, eða tilvísun til sérfræðings",
                 en: "A blood test, imaging or endoscopy, or a referral to a specialist" },
        next: "r-heilsugaesla",
        why: { is: "Læknirinn sem biður um rannsókn eða tilvísun þarf að byggja á viðtali og skoðun og fylgja niðurstöðunum eftir. Það er best gert þar sem þú ert í reglulegri eftirfylgd.",
               en: "The doctor who orders a test or referral needs a consultation and examination to base it on, and has to follow up the results. That is best done where you are followed up regularly." } },
      { label: { is: "Vandamál sem þarf að skoða, til dæmis hlusta á lungu, skoða eyru eða þreifa á kvið",
                 en: "A problem that needs an examination, e.g. listening to the lungs, looking in the ears or examining the abdomen" },
        next: "exam-wait" },
      { label: { is: "Eftirfylgd með langvinnum sjúkdómi eða skilaboð til heimilislæknis",
                 en: "Follow-up of a long-term condition, or a message to my GP" },
        next: "r-heilsuvera" },
      { label: { is: "Ég veit ekki hversu alvarlegt þetta er", en: "I'm not sure how serious this is" }, next: "r-1700" },
      { label: { is: "Annað sem ég get lýst í texta eða með myndum", en: "Something else I can describe in writing or with photos" },
        next: "r-fjar" },
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

  "r-child": {
    kind: "result",
    service: "heilsugaesla",
    eyebrow: { is: "Erindi fyrir barn", en: "For a child" },
    title: { is: "Heilsugæsla barnsins", en: "The child's health centre" },
    body: [
      { is: "Læknar Fjarlækninga meta aðeins þann sem sendir erindið sjálfur, skráður inn með eigin rafrænum skilríkjum.",
        en: "Fjarlækningar's doctors only assess the person who sends the request, signed in with their own electronic ID." },
      { is: "Hafðu samband við heilsugæslu barnsins, til dæmis á Heilsuveru, eða hringdu í 1700 til að fá ráðgjöf. Sé barnið mjög veikt: farðu á bráðamóttöku barna á Barnaspítala Hringsins eða hringdu í 112.",
        en: "Contact the child's health centre, for example through Heilsuvera, or call 1700 for advice. If the child is very unwell: go to the children's emergency department at Barnaspítali Hringsins or call 112." },
    ],
    actions: [{ ...CALL_1700, primary: true }, OPEN_HEILSUVERA],
  },

  "r-other-adult": {
    kind: "result",
    service: "other-adult",
    eyebrow: { is: "Erindi fyrir aðra", en: "For someone else" },
    title: { is: "Viðkomandi sendir eigið erindi", en: "They need to send their own request" },
    body: [
      { is: "Læknir getur aðeins metið þann sem sendir erindið sjálfur, skráður inn með eigin rafrænum skilríkjum. Við getum ekki metið annan einstakling út frá lýsingu þinni.",
        en: "A doctor can only assess the person who sends the request, signed in with their own electronic ID. We cannot assess someone else from your description." },
      { is: "Ef erindið hentar fjarþjónustu getur viðkomandi sent það sjálf eða sjálfur í sjúklingagáttinni.",
        en: "If the request suits remote care, they can send it themselves through the patient portal." },
    ],
    actions: [{ ...OPEN_PORTAL, primary: false }, CALL_1700],
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
  "r-child": "Niðurstaða · Barn",
  "r-other-adult": "Niðurstaða · Annar fullorðinn",
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
