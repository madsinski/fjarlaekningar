// Editable content model for /thjonusta.
// Defaults are verbatim from the original hard-coded page.

import { emptyDefaults, type LocaleContent, type SiteField, type SiteSection } from "./types";
// Reorderable bands, in their built-in order. The hero/page header is not
// listed: it is structural and always renders first.
export const THJONUSTA_SECTIONS: SiteSection[] = [
  { id: "erindi", label: "Algeng erindi" },
  { id: "ferlid", label: "Ferlið" },
  { id: "tests", label: "Heimapróf" },
  { id: "live", label: "Virk þjónusta" },
  { id: "limits", label: "Hvenær hentar ekki" },
  { id: "faq", label: "Algengar spurningar" },
];


export const THJONUSTA_FIELDS: SiteField[] = [
  // Hero
  { key: "hero_eyebrow", label: "Merki (lítill borði)", group: "Hetjusvæði", type: "text" },
  { key: "hero_heading", label: "Fyrirsögn", group: "Hetjusvæði", type: "heading" },
  { key: "hero_body", label: "Undirtexti", group: "Hetjusvæði", type: "textarea" },

  // Erindi list
  { key: "erindi_heading", label: "Fyrirsögn", group: "Algeng erindi", type: "heading" },
  { key: "erindi_body", label: "Texti", group: "Algeng erindi", type: "textarea" },
  { key: "erindi_footer", label: "Neðanmálstexti", group: "Algeng erindi", type: "text" },

  // The process — the single canonical description of how the service works.
  // This used to be split in two: five numbered steps on the home page and six
  // feature cards here, which restated the same five things in a different
  // format. Five of the six cards duplicated a step. They are now merged, with
  // each card's specifics folded into the step it belonged to, so a patient
  // reads the process once, in order, in one place.
  { key: "how_heading", label: "Fyrirsögn", group: "Ferlið", type: "heading" },
  { key: "how_body", label: "Texti", group: "Ferlið", type: "textarea" },
  { key: "step1_title", label: "Skref 1 — titill", group: "Ferlið", type: "text" },
  { key: "step1_desc", label: "Skref 1 — lýsing", group: "Ferlið", type: "textarea" },
  { key: "step2_title", label: "Skref 2 — titill", group: "Ferlið", type: "text" },
  { key: "step2_desc", label: "Skref 2 — lýsing", group: "Ferlið", type: "textarea" },
  { key: "step3_title", label: "Skref 3 — titill", group: "Ferlið", type: "text" },
  { key: "step3_desc", label: "Skref 3 — lýsing", group: "Ferlið", type: "textarea" },
  { key: "step4_title", label: "Skref 4 — titill", group: "Ferlið", type: "text" },
  { key: "step4_desc", label: "Skref 4 — lýsing", group: "Ferlið", type: "textarea" },
  { key: "step5_title", label: "Skref 5 — titill", group: "Ferlið", type: "text" },
  { key: "step5_desc", label: "Skref 5 — lýsing", group: "Ferlið", type: "textarea" },

  // Heimapróf. Step 2 of the process mentions these in passing; this section is
  // the practical detail, because fetching a test yourself is the one piece of
  // friction in an otherwise at-home flow. "Hvar" is a comma-separated list.
  { key: "tests_heading", label: "Fyrirsögn", group: "Heimapróf", type: "heading" },
  { key: "tests_body", label: "Inngangur", group: "Heimapróf", type: "textarea" },
  { key: "test1_title", label: "Próf 1 — heiti", group: "Heimapróf", type: "text" },
  { key: "test1_desc", label: "Próf 1 — lýsing", group: "Heimapróf", type: "textarea" },
  { key: "test1_when", label: "Próf 1 — á við um (erindi)", group: "Heimapróf", type: "text" },
  { key: "test1_where", label: "Próf 1 — hvar (aðskilið með kommu)", group: "Heimapróf", type: "text" },
  { key: "test1_icon", label: "Próf 1 — tákn", group: "Heimapróf", type: "icon" },
  { key: "test2_title", label: "Próf 2 — heiti", group: "Heimapróf", type: "text" },
  { key: "test2_desc", label: "Próf 2 — lýsing", group: "Heimapróf", type: "textarea" },
  { key: "test2_when", label: "Próf 2 — á við um (erindi)", group: "Heimapróf", type: "text" },
  { key: "test2_where", label: "Próf 2 — hvar (aðskilið með kommu)", group: "Heimapróf", type: "text" },
  { key: "test2_icon", label: "Próf 2 — tákn", group: "Heimapróf", type: "icon" },
  { key: "test3_title", label: "Próf 3 — heiti", group: "Heimapróf", type: "text" },
  { key: "test3_desc", label: "Próf 3 — lýsing", group: "Heimapróf", type: "textarea" },
  { key: "test3_when", label: "Próf 3 — á við um (erindi)", group: "Heimapróf", type: "text" },
  { key: "test3_where", label: "Próf 3 — hvar (aðskilið með kommu)", group: "Heimapróf", type: "text" },
  { key: "test3_icon", label: "Próf 3 — tákn", group: "Heimapróf", type: "icon" },
  // Why home tests exist, and what they are / are not. Clinically sensitive:
  // see the sign-off note in the defaults.
  { key: "tests_why_heading", label: "Af hverju — fyrirsögn", group: "Heimapróf", type: "text" },
  { key: "tests_why_body", label: "Af hverju — texti", group: "Heimapróf", type: "textarea" },
  { key: "tests_accuracy", label: "Áreiðanleiki — texti", group: "Heimapróf", type: "textarea" },
  // How it works in the sjúklingagátt. Each step takes an optional screenshot
  // and highlight boxes, written as "x,y,w,h" in PERCENT of the image, several
  // separated by ";" — e.g. "12,40,55,12; 12,60,55,10".
  { key: "tests_how_heading", label: "Í gáttinni — fyrirsögn", group: "Heimapróf", type: "text" },
  { key: "tests_s1_title", label: "Skref 1 — titill", group: "Heimapróf", type: "text" },
  { key: "tests_s1_desc", label: "Skref 1 — lýsing", group: "Heimapróf", type: "textarea" },
  { key: "tests_s1_img", label: "Skref 1 — skjámynd (slóð)", group: "Heimapróf", type: "text" },
  { key: "tests_s1_hl", label: "Skref 1 — áherslusvæði (x,y,b,h í %)", group: "Heimapróf", type: "text" },
  { key: "tests_s2_title", label: "Skref 2 — titill", group: "Heimapróf", type: "text" },
  { key: "tests_s2_desc", label: "Skref 2 — lýsing", group: "Heimapróf", type: "textarea" },
  { key: "tests_s2_img", label: "Skref 2 — skjámynd (slóð)", group: "Heimapróf", type: "text" },
  { key: "tests_s2_hl", label: "Skref 2 — áherslusvæði (x,y,b,h í %)", group: "Heimapróf", type: "text" },
  { key: "tests_s3_title", label: "Skref 3 — titill", group: "Heimapróf", type: "text" },
  { key: "tests_s3_desc", label: "Skref 3 — lýsing", group: "Heimapróf", type: "textarea" },
  { key: "tests_s3_img", label: "Skref 3 — skjámynd (slóð)", group: "Heimapróf", type: "text" },
  { key: "tests_s3_hl", label: "Skref 3 — áherslusvæði (x,y,b,h í %)", group: "Heimapróf", type: "text" },
  { key: "tests_footer", label: "Neðanmálstexti", group: "Heimapróf", type: "textarea" },

  // Where the service is live. One location per line so staff can add as many
  // heilsugaeslur as they like from the admin editor without a schema change:
  //   Nafn | Texti
  // The text after "|" is optional; a line with no "|" renders as name only.
  { key: "live_heading", label: "Fyrirsögn", group: "Virk þjónusta", type: "heading" },
  { key: "live_body", label: "Inngangur", group: "Virk þjónusta", type: "textarea" },
  // Umbrella organisations (HSU, HSN, ...), their heilsugæslur, and where
  // patients of an open heilsugæsla can collect home tests. One per line, so
  // the rollout can grow without a schema change:
  //   Stofnun | undirtexti | /logo.webp      <- umbrella (no prefix)
  //   + Heilsugæsla | texti                  <- open now
  //   - Heilsugæsla                          <- not yet open
  //   * Staður | heimilisfang | prófin       <- test pickup point for the
  //                                             nearest "+" line above it
  { key: "live_locations", label: "Stofnanir, heilsugæslur og afhendingarstaðir (sjá snið að neðan)", group: "Virk þjónusta", type: "textarea" },
  { key: "live_pickup_label", label: "Hnappur — afhendingarstaðir", group: "Virk þjónusta", type: "text" },
  { key: "live_footer", label: "Neðanmálstexti", group: "Virk þjónusta", type: "text" },

  // FAQ
  // Scope/limits — what fjarlækningar is NOT for. Clinically sensitive: the
  // defaults are assembled verbatim from Fjarlækningar's own existing copy
  // (erindi descriptions + the HSU referral collateral), not written fresh.
  { key: "limits_heading", label: "Fyrirsögn", group: "Hvenær hentar ekki", type: "heading" },
  { key: "limits_body", label: "Inngangur", group: "Hvenær hentar ekki", type: "textarea" },
  { key: "limits1_title", label: "Atriði 1 — titill", group: "Hvenær hentar ekki", type: "text" },
  { key: "limits1_body", label: "Atriði 1 — texti", group: "Hvenær hentar ekki", type: "textarea" },
  { key: "limits1_icon", label: "Atriði 1 — tákn", group: "Hvenær hentar ekki", type: "icon" },
  // Expandable red-flag panel on the "Alvarleg einkenni" card: what the
  // symptoms are, then what to do about them. Clearing limits1_items collapses
  // the card back to a plain one.
  { key: "limits1_lead", label: "Atriði 1 — inngangur að einkennalista", group: "Hvenær hentar ekki", type: "text" },
  { key: "limits1_items", label: "Atriði 1 — einkenni (ein lína hvert)", group: "Hvenær hentar ekki", type: "textarea" },
  { key: "limits1_action_lead", label: "Atriði 1 — inngangur að úrræðum", group: "Hvenær hentar ekki", type: "text" },
  { key: "limits1_actions", label: "Atriði 1 — úrræði (ein lína hvert)", group: "Hvenær hentar ekki", type: "textarea" },
  { key: "limits2_title", label: "Atriði 2 — titill", group: "Hvenær hentar ekki", type: "text" },
  { key: "limits2_body", label: "Atriði 2 — texti", group: "Hvenær hentar ekki", type: "textarea" },
  { key: "limits2_icon", label: "Atriði 2 — tákn", group: "Hvenær hentar ekki", type: "icon" },
  { key: "limits4_title", label: "Atriði 4 — titill", group: "Hvenær hentar ekki", type: "text" },
  { key: "limits4_body", label: "Atriði 4 — texti", group: "Hvenær hentar ekki", type: "textarea" },
  { key: "limits4_icon", label: "Atriði 4 — tákn", group: "Hvenær hentar ekki", type: "icon" },
  { key: "limits3_title", label: "Atriði 3 — titill", group: "Hvenær hentar ekki", type: "text" },
  { key: "limits3_body", label: "Atriði 3 — texti", group: "Hvenær hentar ekki", type: "textarea" },
  { key: "limits3_icon", label: "Atriði 3 — tákn", group: "Hvenær hentar ekki", type: "icon" },
  { key: "limits_note", label: "Áherslulína (neyðartilvik)", group: "Hvenær hentar ekki", type: "text" },

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
  hero_eyebrow: "Þjónusta Fjarlækninga",
  hero_heading: "Læknisþjónusta fyrir ==algeng erindi==",
  hero_body:
    "Fjarlækningar leysa algeng heilsugæsluerindi í gegnum örugga sjúklingagátt — án þess að þú þurfir að mæta á staðinn.",

  erindi_heading: "Algeng ==erindi==",
  erindi_body: "Flest erindi afgreidd innan tveggja klukkustunda á opnunartíma.",
  erindi_footer: "Listinn lengist jafnt og þétt eftir því sem þjónustan þróast.",

  // Merged from the old home-page steps + the six cards that used to live here.
  // Every sentence below is verbatim from one of those two sources — the merge
  // only removed repetition and put the detail on the step it describes.
  how_heading: "Ferlið frá ==upphafi til enda==",
  how_body:
    "Sömu spurningar og sama fagmennska og á læknastofu — bara skilvirkari leið til að leysa erindið. Þú svarar spurningalista heima eða þar sem þú ert, og læknir svarar innan tveggja klukkustunda á opnunartíma milli 10 og 22.",

  step1_title: "Þú velur erindi af vandamálalista",
  step1_desc:
    "Skráðu þig inn með rafrænum skilríkjum og farðu í viðeigandi ferli eftir einkennum.",
  step2_title: "Þú svarar spurningalista",
  step2_desc:
    "Spurningalistar eru sérhannaðir í samstarfi við íslenska sérfræðilækna tengt hverju vandamáli — ferlið er hannað eins og viðtal við lækni. Þegar heimapróf bætir greiningu er þér leiðbeint að taka það, t.d. þvagpróf sem sækja má á heilsugæslu eða í næsta apóteki, og skrá niðurstöðuna beint í gáttina.",
  step3_title: "Öryggisnetið metur svörin",
  step3_desc:
    "Rauð flögg í spurningalistunum vísa alvarlegum einkennum strax í rétta þjónustu. Fjarlækningar taka ekki að sér erindi sem eiga heima annars staðar — og þú greiðir ekki ef þér er vísað frá.",
  step4_title: "Læknir metur og leggur til meðferð",
  step4_desc:
    "Læknir fer yfir svörin og leggur til viðeigandi meðferð út frá sínu læknisfræðilega mati. Engin meðferð án mats læknis.",
  step5_title: "Niðurstaða, ráðleggingar og lyfseðill",
  step5_desc:
    "Þú færð skriflega niðurstöðu og ráðleggingar, og lyfseðill fer rafrænt í lyfjagátt ef þörf er á — tilbúinn í næsta apóteki. Niðurstöðunni fylgir fræðsluefni tengt þínu vandamáli: ráðleggingar, fyrirbyggjandi ráð og vörur án lyfseðils sem geta hjálpað.",

  // NEEDS CLINICAL SIGN-OFF. Step 2 already says heimapróf exist and that
  // þvagpróf is fetched "á heilsugæslu eða í næsta apóteki" — that part is
  // existing copy. What is new: naming CRP and strep-próf, the one-line
  // description of what each screens for, and CRP being heilsugæsla-only.
  // Descriptions are deliberately about what the test looks for, never what a
  // result means for the patient.
  tests_heading: "==Heimapróf== sem geta fylgt erindinu",
  tests_body:
    "Fyrir sum erindi bætir einfalt próf matið. Spurningalistinn segir þér hvort próf þarf — það á ekki við um öll erindi. Þú sækir prófið sjálf eða sjálfur, tekur það heima og skráir niðurstöðuna beint í gáttina.",
  test1_title: "CRP-próf",
  test1_desc: "Mælir bólgusvörun í blóði.",
  test1_when: "Kvef, hósti og hálsbólga",
  test1_where: "Heilsugæsla",
  test1_icon: "droplet",
  test2_title: "Þvagstix",
  test2_desc: "Skimar fyrir merkjum um þvagfærasýkingu.",
  test2_when: "Þvagfæra- og leggangasýkingar — þvagfærasýking í fyrsta skipti",
  test2_where: "Apótek, Heilsugæsla",
  test2_icon: "test-tube",
  test3_title: "Strep-próf",
  test3_desc: "Skimar fyrir streptókokkum í hálsi.",
  test3_when: "Kvef, hósti og hálsbólga — hálsbólga, til að aðstoða greiningu",
  test3_where: "Apótek, Heilsugæsla",
  test3_icon: "open-mouth",
  // NEEDS CLINICAL SIGN-OFF, in addition to the test descriptions above.
  // tests_accuracy makes a factual claim about the tests being the same rapid
  // tests used at a heilsugæsla — deliberately written without any numeric
  // sensitivity/specificity figure, because no source was available. Do not add
  // numbers without a citation, and confirm the "same tests" claim is true.
  tests_why_heading: "Af hverju heimapróf?",
  tests_why_body:
    "Fyrir afmörkuð og algeng erindi getur einfalt próf, sem þú tekur sjálf eða sjálfur, gefið lækni þær upplýsingar sem upp á vantar til að ljúka matinu — án þess að þú þurfir að bóka tíma, ferðast og bíða. Þannig verður ferlið einfaldara og hraðara fyrir þig, og heilsugæslan getur einbeitt sér að flóknari erindum.",
  tests_accuracy:
    "Prófin eru sömu hraðpróf og notuð eru við sömu erindi á heilsugæslu. Þau koma ekki í stað mats læknis: læknir túlkar niðurstöðuna í samhengi við svörin þín úr spurningalistanum. Ef niðurstaðan er óljós, eða einkennin passa ekki við hana, er erindinu vísað í hefðbundna þjónustu.",

  tests_how_heading: "Svona fer þetta fram í sjúklingagáttinni",
  tests_s1_title: "Spurningalistinn segir þér hvort prófs er þörf",
  tests_s1_desc:
    "Þú velur erindi og svarar spurningalistanum. Eigi próf við um þitt erindi færðu skilaboð um hvaða próf það er — það á ekki við um öll erindi.",
  tests_s1_img: "",
  tests_s1_hl: "",
  tests_s2_title: "Þú sækir prófið og tekur það heima",
  tests_s2_desc:
    "Prófið sækir þú á heilsugæslu eða í apóteki — sjá hvar hér að ofan. Leiðbeiningar um hvernig það er tekið fylgja í gáttinni.",
  tests_s2_img: "",
  tests_s2_hl: "",
  tests_s3_title: "Þú skráir niðurstöðuna í gáttina",
  tests_s3_desc:
    "Niðurstaðan er skráð beint í sjúklingagáttina. Læknir metur hana ásamt svörunum þínum og lýkur erindinu.",
  tests_s3_img: "",
  tests_s3_hl: "",

  tests_footer:
    "Þú skráir niðurstöðuna beint í sjúklingagáttina og læknir metur hana með svörunum þínum. Þurfir þú aðstoð við að nálgast próf, hafðu samband.",

  live_heading: "Hvar er þjónustan ==virk==?",
  live_body:
    "Við opnum þjónustuna í samstarfi við heilbrigðisstofnanir, eina heilsugæslu í einu. Heilbrigðisstofnun Suðurlands er fyrsta stofnunin sem opnar fyrir þjónustuna.",
  // VERIFY BEFORE PUBLISHING. Written from public knowledge of the institution,
  // not from a Fjarlækningar source document:
  //   - the roster of HSU heilsugæslur, and that Vestmannaeyjar is genuinely live
  //   - the pickup points: the pharmacy NAME is a best guess and the addresses
  //     are deliberately left blank rather than invented. Sending a patient to a
  //     wrong address for a test is a real failure, so these must be filled in
  //     and checked before this section goes public.
  live_locations: [
    "Heilbrigðisstofnun Suðurlands | Fyrsta stofnunin sem opnar fyrir þjónustuna | /hsu-logo.webp",
    "+ Heilsugæslan í Vestmannaeyjum | Fyrsta heilsugæslan til að opna.",
    // ADDRESSES INTENTIONALLY BLANK — see the note above. The middle field is
    // the street address; fill it in from a source you trust.
    "* Heilsugæslan í Vestmannaeyjum |  | CRP-próf, þvagstix, strep-próf",
    "* Apótek Vestmannaeyja |  | Þvagstix, strep-próf",
    "- Heilsugæslan á Selfossi",
    "- Heilsugæslan í Hveragerði",
    "- Heilsugæslan í Þorlákshöfn",
    "- Heilsugæslan í Laugarási",
    "- Heilsugæslan á Hellu",
    "- Heilsugæslan á Hvolsvelli",
    "- Heilsugæslan í Vík í Mýrdal",
    "- Heilsugæslan á Kirkjubæjarklaustri",
    "- Heilsugæslan á Höfn í Hornafirði",
  ].join("\n"),
  live_pickup_label: "Hvar fæ ég heimapróf?",
  live_footer:
    "Heilsugæslur merktar „væntanlegt“ opna fyrir þjónustuna í áföngum. Fleiri heilbrigðisstofnanir bætast við eftir því sem þjónustan þróast.",

  // NOTE: assembled from Fjarlækningar's own published wording (erindi
  // descriptions + HSU referral collateral). Review clinically before publishing.
  limits_heading: "Hvenær hentar fjarlækningaþjónusta ==ekki==?",
  limits_body:
    "Fjarlækningar leysa einföld og afmörkuð erindi. Sum erindi þarfnast skoðunar, rannsóknar eða bráðaþjónustu — og þeim er vísað í annan farveg.",
  limits1_title: "Alvarleg einkenni",
  limits1_body: "Alvarlegum einkennum er vísað í annan farveg.",
  limits1_icon: "shield-alert",
  limits1_lead: "Alvarleg einkenni geta meðal annars verið:",
  limits1_items: [
    "Brjóstverkur eða þrýstingur fyrir brjósti",
    "Öndunarerfiðleikar eða skyndileg andnauð",
    "Skyndilegur máttminnkun, dofi, taltruflun eða lömun (einkenni heilablóðfalls)",
    "Skert meðvitund eða yfirlið",
    "Miklar blæðingar eða alvarlegir áverkar",
    "Skyndilegur, óbærilegur höfuðverkur eða kviðverkur",
    "Hár hiti með hnakkastífleika eða húðblæðingum",
    "Alvarleg ofnæmisviðbrögð (bjúgur í andliti/hálsi, öndunarerfiðleikar)",
    "Hugsanir um sjálfsskaða eða sjálfsvíg",
  ].join("\n"),
  limits1_action_lead: "Ef alvarleg einkenni eru til staðar getur þú:",
  limits1_actions: [
    "Hringt í 1700 til að fá ráðgjöf hjúkrunarfræðings",
    "Leitað á Læknavaktina (á höfuðborgarsvæðinu)",
    "Ef málið þolir enga bið: farðu á Bráðamóttökuna eða hringdu í 112",
  ].join("\n"),
  limits2_title: "Þörf á skoðun eða rannsókn",
  limits2_body:
    "Þurfi sjúklingur skoðun eða frekari rannsókn vísar læknir aftur í hefðbundna þjónustu.",
  limits2_icon: "stethoscope",
  limits3_title: "Frumgreining",
  limits3_body: "Frumgreiningu tiltekinna vandamála er vísað í annan farveg.",
  limits3_icon: "clipboard-list",
  // NEW — needs clinical sign-off before publishing (see NOTE above). Built
  // around Mads' own phrasing; the rest uses vocabulary already on the page
  // ("vísað í hefðbundna þjónustu", "annan farveg").
  limits4_title: "Alvarlegir sjúkdómar í sjúkrasögu",
  limits4_body:
    "Ef sjúkrasaga sýnir alvarlega undirliggjandi sjúkdóma getur verið of áhættusamt að afgreiða erindið í gegnum fjarþjónustu — þá er vísað í hefðbundna þjónustu.",
  limits4_icon: "heart-pulse",
  limits_note: "Í bráðatilfellum hringdu í 112.",

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
