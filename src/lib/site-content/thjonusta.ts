// Editable content model for /thjonusta.
// Defaults are verbatim from the original hard-coded page.

import { emptyDefaults, type LocaleContent, type SiteField } from "./types";

export const THJONUSTA_FIELDS: SiteField[] = [
  // Hero
  { key: "hero_heading", label: "Fyrirsögn", group: "Hetjusvæði", type: "heading" },
  { key: "hero_body", label: "Undirtexti", group: "Hetjusvæði", type: "textarea" },

  // Erindi list
  { key: "erindi_heading", label: "Fyrirsögn", group: "Algeng erindi", type: "heading" },
  { key: "erindi_body", label: "Texti", group: "Algeng erindi", type: "textarea" },
  { key: "erindi_footer", label: "Neðanmálstexti", group: "Algeng erindi", type: "text" },

  // How it works
  { key: "how_heading", label: "Fyrirsögn", group: "Hvernig þjónustan virkar", type: "heading" },
  { key: "how_body", label: "Texti", group: "Hvernig þjónustan virkar", type: "textarea" },
  { key: "f1_title", label: "Eiginleiki 1 — titill", group: "Hvernig þjónustan virkar", type: "text" },
  { key: "f1_desc", label: "Eiginleiki 1 — lýsing", group: "Hvernig þjónustan virkar", type: "textarea" },
  { key: "f1_icon", label: "Eiginleiki 1 — tákn", group: "Hvernig þjónustan virkar", type: "icon" },
  { key: "f2_title", label: "Eiginleiki 2 — titill", group: "Hvernig þjónustan virkar", type: "text" },
  { key: "f2_desc", label: "Eiginleiki 2 — lýsing", group: "Hvernig þjónustan virkar", type: "textarea" },
  { key: "f2_icon", label: "Eiginleiki 2 — tákn", group: "Hvernig þjónustan virkar", type: "icon" },
  { key: "f3_title", label: "Eiginleiki 3 — titill", group: "Hvernig þjónustan virkar", type: "text" },
  { key: "f3_desc", label: "Eiginleiki 3 — lýsing", group: "Hvernig þjónustan virkar", type: "textarea" },
  { key: "f3_icon", label: "Eiginleiki 3 — tákn", group: "Hvernig þjónustan virkar", type: "icon" },
  { key: "f4_title", label: "Eiginleiki 4 — titill", group: "Hvernig þjónustan virkar", type: "text" },
  { key: "f4_desc", label: "Eiginleiki 4 — lýsing", group: "Hvernig þjónustan virkar", type: "textarea" },
  { key: "f4_icon", label: "Eiginleiki 4 — tákn", group: "Hvernig þjónustan virkar", type: "icon" },
  { key: "f5_title", label: "Eiginleiki 5 — titill", group: "Hvernig þjónustan virkar", type: "text" },
  { key: "f5_desc", label: "Eiginleiki 5 — lýsing", group: "Hvernig þjónustan virkar", type: "textarea" },
  { key: "f5_icon", label: "Eiginleiki 5 — tákn", group: "Hvernig þjónustan virkar", type: "icon" },
  { key: "f6_title", label: "Eiginleiki 6 — titill", group: "Hvernig þjónustan virkar", type: "text" },
  { key: "f6_desc", label: "Eiginleiki 6 — lýsing", group: "Hvernig þjónustan virkar", type: "textarea" },
  { key: "f6_icon", label: "Eiginleiki 6 — tákn", group: "Hvernig þjónustan virkar", type: "icon" },

  // FAQ
  { key: "faq_heading", label: "Fyrirsögn", group: "Algengar spurningar", type: "heading" },
  { key: "faq1_q", label: "Spurning 1", group: "Algengar spurningar", type: "text" },
  { key: "faq1_a", label: "Svar 1", group: "Algengar spurningar", type: "textarea" },
  { key: "faq2_q", label: "Spurning 2", group: "Algengar spurningar", type: "text" },
  { key: "faq2_a", label: "Svar 2", group: "Algengar spurningar", type: "textarea" },
  { key: "faq3_q", label: "Spurning 3", group: "Algengar spurningar", type: "text" },
  { key: "faq3_a", label: "Svar 3", group: "Algengar spurningar", type: "textarea" },
  { key: "faq4_q", label: "Spurning 4", group: "Algengar spurningar", type: "text" },
  { key: "faq4_a", label: "Svar 4", group: "Algengar spurningar", type: "textarea" },
  { key: "faq5_q", label: "Spurning 5", group: "Algengar spurningar", type: "text" },
  { key: "faq5_a", label: "Svar 5", group: "Algengar spurningar", type: "textarea" },
  { key: "faq6_q", label: "Spurning 6", group: "Algengar spurningar", type: "text" },
  { key: "faq6_a", label: "Svar 6", group: "Algengar spurningar", type: "textarea" },

  // Closing CTA
  { key: "cta_text", label: "Texti", group: "Ákall (CTA)", type: "text" },
  { key: "cta_button", label: "Hnappur", group: "Ákall (CTA)", type: "text" },
];

export const THJONUSTA_DEFAULTS_IS: LocaleContent = {
  hero_heading: "Þjónusta",
  hero_body:
    "Fjarlækningar leysa algeng heilsugæsluerindi í gegnum örugga sjúklingagátt Medalia — án þess að þú þurfir að mæta á staðinn.",

  erindi_heading: "Algeng erindi",
  erindi_body: "Flest erindi afgreidd innan tveggja klukkustunda á opnunartíma.",
  erindi_footer: "Listinn lengist jafnt og þétt eftir því sem þjónustan þróast.",

  how_heading: "Hvernig þjónustan virkar",
  how_body:
    "Sömu spurningar og sama fagmennska og á læknastofu — bara skilvirkari leið til að leysa erindið.",

  f1_title: "Fljótleg og þægileg læknisþjónusta",
  f1_desc:
    "Þú svarar spurningalista heima eða þar sem þú ert — læknir svarar erindum innan tveggja klukkustunda á opnunartíma milli 10 og 22.",
  f1_icon: "zap",
  f2_title: "Spurningalistar sérhannaðir",
  f2_desc:
    "Spurningalistar eru sérhannaðir í samstarfi við íslenska sérfræðilækna tengt hverju vandamáli. Ferlið er hannað eins og viðtal við lækni.",
  f2_icon: "clipboard-list",
  f3_title: "Heimapróf",
  f3_desc:
    "Þegar heimapróf bætir greiningu er þér leiðbeint að taka það — t.d. þvagpróf sem sækja má á heilsugæslu eða í næsta apóteki — og skrá niðurstöðuna beint í gáttina.",
  f3_icon: "test-tube",
  f4_title: "Meðferð og lyfseðill",
  f4_desc:
    "Læknir leggur til meðferð út frá svörum og læknisfræðilegu mati. Engin meðferð án mats læknis — lyfseðill fer rafrænt í lyfjagátt og er tilbúinn í næsta apóteki.",
  f4_icon: "pill",
  f5_title: "Innbyggt öryggisnet",
  f5_desc:
    "Rauð flögg í spurningalistunum vísa alvarlegum einkennum strax í rétta þjónustu. Fjarlækningar taka ekki að sér erindi sem eiga heima annars staðar — og þú greiðir ekki ef þér er vísað frá.",
  f5_icon: "shield-check",
  f6_title: "Fræðsluefni fylgir",
  f6_desc:
    "Niðurstöðunni fylgir fræðsluefni tengt þínu vandamáli: ráðleggingar, fyrirbyggjandi ráð og vörur án lyfseðils sem geta hjálpað.",
  f6_icon: "book-open",

  faq_heading: "Algengar spurningar",
  faq1_q: "Hverjir geta notað þjónustuna?",
  faq1_a:
    "Meðan á tilraunaverkefninu stendur er þjónustan aðeins í boði fyrir skjólstæðinga sem eru skráðir hjá Heilbrigðisstofnun Suðurlands (HSU). Þjónustan verður opnuð fyrir fleiri eftir því sem verkefninu vindur fram.",
  faq2_q: "Af hverju fæ ég ekki aðstoð við öll vandamál hér?",
  faq2_a:
    "Fjarlækningar leysa afmörkuð erindi þar sem óhætt er að meta einkenni út frá markvissum spurningalista og læknisfræðilegu mati, án líkamsskoðunar. Vandamál sem krefjast skoðunar hjá lækni, myndgreiningar eða frumgreiningar — eða sem gætu verið alvarleg — eiga heima hjá heilsugæslu, Læknavaktinni eða bráðamóttöku. Öryggisnetið í spurningalistunum vísar slíkum erindum strax í rétta þjónustu.",
  faq3_q: "Hvar nálgast ég heimapróf (sjálfspróf)?",
  faq3_a:
    "Þegar sjálfspróf bætir greiningu færð þú leiðbeiningar um hvaða próf á að taka. Þvag-stix, strep-próf og CRP má sækja á heilsugæslu þar sem þú ert skráð eða staddur, eða í næsta apóteki. Þú skráir niðurstöðuna beint í sjúklingagáttina og hún fylgir erindinu til læknis.",
  faq4_q: "Hvað gerist ef einkennin eru alvarleg?",
  faq4_a:
    "Ef svörin benda til alvarlegri veikinda, t.d. hita yfir 38°C, stöðvast ferlið sjálfkrafa og þú færð skýrar leiðbeiningar um rétt úrræði — vaktþjónustu heilsugæslunnar, Læknavaktina, 1700 eða bráðamóttöku eftir alvarleika.",
  faq5_q: "Hvað kostar þjónustan og greiði ég ef mér er vísað frá?",
  faq5_a:
    "Þú greiðir ekki ef þér er vísað frá vegna þess að erindið á heima annars staðar. Fjarlækningar taka ekki að sér erindi sem þarfnast skoðunar hjá lækni á stofu.",
  faq6_q: "Hversu fljótt fæ ég svar?",
  faq6_a:
    "Flest erindi eru afgreidd innan tveggja klukkustunda á opnunartíma. Opið er alla daga milli 10 og 22 — beiðnum sem berast eftir kl. 22 er svarað daginn eftir.",

  cta_text: "Tilbúin(n) að senda inn erindi?",
  cta_button: "Opna sjúklingagátt",
};

export const THJONUSTA_DEFAULTS_EN: LocaleContent = emptyDefaults(THJONUSTA_FIELDS);
