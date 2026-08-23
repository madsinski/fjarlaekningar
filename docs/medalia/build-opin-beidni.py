#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Builds the Medalia FHIR R4 Questionnaire for Fjarlaekningar's "Opin beidni"
(open-category consultation request).

Conventions copied from the proven Lifeline "Heilsumat" Medalia export:
  - pages          = group items with itemControl "page"
  - choice options = answerOption[].valueCoding {code, display}
  - branching      = plain enableWhen + answerCoding (NO FHIRPath, see the
                     enableWhenExpression gotchas in the Medalia notes)
  - help bubbles   = display child item with itemControl "help", linkId "<parent>-help"
  - placeholders   = entryFormat extension

Output: opin-beidni.json
"""
import json

ITEM_CONTROL = "http://hl7.org/fhir/StructureDefinition/questionnaire-itemControl"
ITEM_CONTROL_SYS = "http://hl7.org/fhir/questionnaire-item-control"
ENTRY_FORMAT = "http://hl7.org/fhir/StructureDefinition/entryFormat"
MIN_VALUE = "http://hl7.org/fhir/StructureDefinition/minValue"
MAX_VALUE = "http://hl7.org/fhir/StructureDefinition/maxValue"
SLIDER_STEP = "http://hl7.org/fhir/StructureDefinition/questionnaire-sliderStepValue"
UNIT = "http://hl7.org/fhir/StructureDefinition/questionnaire-unit"
UCUM = "http://unitsofmeasure.org"


def control(code, display=None):
    coding = {"code": code, "system": ITEM_CONTROL_SYS}
    if display:
        coding["display"] = display
    return {"url": ITEM_CONTROL, "valueCodeableConcept": {"coding": [coding]}}


def opts(*pairs):
    return [{"valueCoding": {"code": c, "display": d}} for c, d in pairs]


def when(question, *codes):
    """Plain enableWhen. Multiple codes => OR (caller sets enableBehavior any)."""
    return [
        {
            "question": question,
            "operator": "=",
            "answerCoding": {"code": c, "display": "", "system": ""},
        }
        for c in codes
    ]


def gated(item, question, *codes):
    item["enableWhen"] = when(question, *codes)
    item["enableBehavior"] = "any" if len(codes) > 1 else "all"
    return item


def display(link_id, text, ext=None):
    it = {"linkId": link_id, "type": "display", "text": text}
    if ext:
        it["extension"] = ext
    return it


def helper(parent_link_id, text):
    return display(parent_link_id + "-help", text, [control("help")])


def q(link_id, text, qtype, required=False, ext=None, options=None,
      repeats=False, children=None, help_text=None):
    it = {"linkId": link_id, "type": qtype, "text": text}
    if required:
        it["required"] = True
    if repeats:
        it["repeats"] = True
    if options:
        it["answerOption"] = options
    if ext:
        it["extension"] = ext
    kids = list(children or [])
    if help_text:
        kids.insert(0, helper(link_id, help_text))
    if kids:
        it["item"] = kids
    return it


def placeholder(text):
    return [{"url": ENTRY_FORMAT, "valueString": text}]


def slider(lo, hi, lower_label=None, upper_label=None):
    ext = [
        {"url": MIN_VALUE, "valueInteger": lo},
        {"url": MAX_VALUE, "valueInteger": hi},
        {"url": SLIDER_STEP, "valueInteger": 1},
        control("buttons", "Buttons"),
    ]
    return ext


def page(link_id, title, items, gate=None):
    it = {
        "linkId": link_id,
        "type": "group",
        "text": title,
        "extension": [control("page", "Page")],
        "item": items,
    }
    if gate:
        question, codes = gate
        gated(it, question, *codes)
    else:
        it["enableBehavior"] = "all"
    return it


YES_NO = opts(("yes", "Já"), ("no", "Nei"))
YES_NO_UNSURE = opts(("yes", "Já"), ("no", "Nei"), ("unsure", "Veit ekki"))

# ---------------------------------------------------------------- page 1
P1 = page("p1-fyrirvari", "Áður en þú byrjar", [
    display("intro-what", (
        "Þetta er opin beiðni um skriflegt læknismat hjá Fjarlækningum.\n\n"
        "Þú lýsir vandamálinu með þínum eigin orðum og læknir les erindið, "
        "metur það og svarar þér. Þetta er ekki spjall í rauntíma og læknirinn "
        "getur ekki skoðað þig, hlustað þig eða þreifað."
    )),
    display("intro-emergency", (
        "⚠️ Þetta er EKKI neyðarþjónusta.\n\n"
        "Hringdu í 112 ef um bráð veikindi eða slys er að ræða.\n"
        "Hringdu í 1700 (Læknavaktin / Heilsuvera) ef þú þarft ráðgjöf strax.\n"
        "Hringdu í 543 2222 (Eitrunarmiðstöð) vegna eitrunar eða ofskömmtunar.\n\n"
        "Erindi sem berast hér eru ekki lesin jafnóðum."
    )),
    display("intro-scope", (
        "Gott að vita áður en þú heldur áfram:\n\n"
        "• Svar berst [SVARTÍMI – t.d. innan 24 klst. á virkum dögum].\n"
        "• Læknirinn getur hafnað erindinu eða vísað þér í staðbundna skoðun ef "
        "málið hentar ekki fjarþjónustu. Það gerist meðal annars þegar þarf að "
        "hlusta lungu, skoða eyru eða háls, þreifa kvið eða meta áverka.\n"
        "• Ekki er ávísað ávana- og fíknilyfjum í fjarþjónustu. Það á meðal "
        "annars við um sterk verkjalyf (ópíóíða), róandi lyf og svefnlyf "
        "(benzódíazepín og skyld lyf) og ADHD-lyf.\n"
        "• [GJALDSKRÁ – t.d. Gjald fyrir erindið er X kr. og er innheimt "
        "þegar læknir hefur afgreitt erindið.]\n"
        "• Læknirinn sér aðeins það sem þú skrifar hér. Því nákvæmari sem þú "
        "ert, því betra verður matið."
    )),
    q("intro-ack",
      "Ég hef lesið ofangreint og skil að þetta er ekki neyðarþjónusta.",
      "boolean", required=True, ext=[control("check-box", "Check Box")]),
])

# ---------------------------------------------------------------- page 2
P2 = page("p2-oryggisskimun", "Öryggisskimun", [
    display("rf-intro", (
        "Fyrst þurfum við að útiloka einkenni sem þola enga bið.\n\n"
        "Lestu listann og svaraðu svo spurningunni fyrir neðan:\n\n"
        "• Verkur, þyngsli eða þrýstingur fyrir brjósti\n"
        "• Andþyngsli eða öndunarerfiðleikar í hvíld\n"
        "• Skyndilegt máttleysi, dofi eða skerðing öðrum megin í líkamanum, "
        "skyndilegir talörðugleikar eða skyndileg sjónskerðing\n"
        "• Skyndilegur og mjög mikill höfuðverkur, ólíkur öllu sem þú hefur fundið áður\n"
        "• Meðvitundarleysi, yfirlið eða rugl\n"
        "• Miklir eða vaxandi kviðverkir\n"
        "• Blóð í uppköstum, svartar eða blóðugar hægðir\n"
        "• Hár hiti ásamt stífum hnakka, ljósfælni eða útbrotum sem hverfa "
        "ekki þegar þrýst er á þau\n"
        "• Bólga í andliti, vörum eða tungu, eða öndunarerfiðleikar eftir "
        "lyf, fæðu eða stungu\n"
        "• Blæðing eða verkir á meðgöngu\n"
        "• Alvarlegur áverki, mikil blæðing eða grunur um beinbrot\n"
        "• Sjálfsvígshugsanir eða hugsanir um að skaða þig eða aðra"
    )),
    q("rf-gate", "Á eitthvað af ofangreindu við um þig núna?",
      "choice", required=True, options=YES_NO,
      ext=[control("radio-button", "Radio Button")]),
    gated(q("rf-which", "Hvað af þessu á við? Merktu við allt sem á við.",
            "choice", repeats=True,
            ext=[control("check-box", "Check Box")],
            options=opts(
                ("chest", "Verkur eða þyngsli fyrir brjósti"),
                ("breathing", "Andþyngsli eða öndunarerfiðleikar"),
                ("stroke", "Máttleysi, dofi, talörðugleikar eða sjónskerðing"),
                ("headache", "Skyndilegur og mjög mikill höfuðverkur"),
                ("consciousness", "Meðvitundarleysi, yfirlið eða rugl"),
                ("abdomen", "Miklir kviðverkir"),
                ("bleeding-gi", "Blóð í uppköstum eða hægðum"),
                ("meningitis", "Hiti með stífum hnakka eða útbrotum"),
                ("anaphylaxis", "Bólga í andliti eða tungu, bráðaofnæmi"),
                ("pregnancy", "Blæðing eða verkir á meðgöngu"),
                ("trauma", "Alvarlegur áverki eða mikil blæðing"),
                ("self-harm", "Sjálfsvígshugsanir eða hugsanir um að skaða mig"),
            )), "rf-gate", "yes"),
    gated(display("rf-warning", (
        "⚠️ Stöðvaðu hér og leitaðu aðstoðar strax.\n\n"
        "Einkennin sem þú merktir við þola ekki bið eftir skriflegu svari.\n\n"
        "• Hringdu í 112 ef ástandið er bráðt.\n"
        "• Hringdu í 1700 til að fá ráðgjöf strax.\n"
        "• Farðu á næstu bráðamóttöku eða heilsugæslu.\n\n"
        "Ef þú ert með sjálfsvígshugsanir: hringdu í 1717 (Hjálparsíma Rauða "
        "krossins, opinn allan sólarhringinn) eða 112.\n\n"
        "Þú mátt senda erindið samt, en það kemur ekki í stað bráðaþjónustu og "
        "gæti verið afgreitt of seint."
    )), "rf-gate", "yes"),
    gated(q("rf-ack",
            "Ég skil að ég á að hafa samband við 112 eða 1700 og að þetta "
            "erindi kemur ekki í stað bráðaþjónustu.",
            "boolean", required=True, ext=[control("check-box", "Check Box")]),
          "rf-gate", "yes"),
])

# ---------------------------------------------------------------- page 3
ERINDI_TYPES = opts(
    ("new-problem", "Nýtt einkenni eða nýtt heilsuvandamál"),
    ("known-problem", "Þekkt eða langvinnt vandamál sem hefur breyst eða versnað"),
    ("medication", "Lyf – endurnýjun, aukaverkun eða spurning"),
    ("results", "Niðurstöður úr rannsókn eða eftirfylgd"),
    ("certificate", "Vottorð eða staðfesting"),
    ("other", "Annað eða ég er ekki viss"),
)

P3 = page("p3-flokkun", "Um hvað snýst erindið?", [
    display("cat-intro",
            "Næstu tvær spurningar hjálpa lækninum að undirbúa sig áður en "
            "hann les lýsinguna þína."),
    q("erindi-type", "Hvers eðlis er erindið?", "choice", required=True,
      options=ERINDI_TYPES, ext=[control("radio-button", "Radio Button")],
      help_text="Veldu það sem passar best. Ef fleira en eitt á við, veldu "
                "aðalatriðið – þú getur útskýrt hitt í textanum síðar."),
    q("erindi-svaedi", "Hvaða svæði eða flokkur á best við?", "choice",
      required=True, ext=[control("drop-down", "Drop down")],
      options=opts(
          ("skin", "Húð, útbrot, sár eða nögl"),
          ("eye", "Augu"),
          ("ent", "Eyru, nef, háls eða munnur"),
          ("resp", "Öndunarfæri – hósti, kvef, andþyngsli"),
          ("cardio", "Hjarta og blóðrás"),
          ("gi", "Melting, magi eða kviður"),
          ("uro", "Þvagfæri og nýru"),
          ("sexual", "Kynheilbrigði og kynsjúkdómar"),
          ("gyn", "Kvenheilsa, tíðir eða þungun"),
          ("msk", "Stoðkerfi – vöðvar, liðir, bak eða áverki"),
          ("neuro", "Taugakerfi – höfuðverkur, svimi, dofi"),
          ("mental", "Geðheilsa, streita eða svefn"),
          ("allergy", "Ofnæmi"),
          ("infection", "Sýking eða hiti"),
          ("travel", "Ferðalög og bólusetningar"),
          ("other", "Annað eða veit ekki"),
      )),
])

# ---------------------------------------------------------------- page 4
DURATION = opts(
    ("today", "Í dag"),
    ("1-3d", "1–3 daga"),
    ("4-7d", "4–7 daga"),
    ("1-2w", "1–2 vikur"),
    ("2-4w", "2–4 vikur"),
    ("1-3m", "1–3 mánuði"),
    ("3-12m", "3–12 mánuði"),
    ("over-1y", "Lengur en ár"),
)

P4 = page("p4-einkenni", "Einkennin þín", [
    display("sym-intro",
            "Þetta eru atriðin sem sjúklingar gleyma oftast að nefna en "
            "læknirinn þarf nánast alltaf að vita."),
    gated(q("sym-diagnosis",
            "Hvaða greining eða vandamál er þetta og hvenær greindist það?",
            "string", required=True,
            ext=placeholder("t.d. exem á höndum, greint 2019")),
          "erindi-type", "known-problem"),
    q("sym-duration", "Hversu lengi hefur þetta staðið yfir?", "choice",
      required=True, options=DURATION, ext=[control("radio-button", "Radio Button")],
      help_text="Ef vandamálið er þekkt, áttu við þá versnun sem þú ert að "
                "leita til okkar með núna."),
    q("sym-onset", "Byrjaði þetta skyndilega eða smám saman?", "choice",
      required=True, ext=[control("radio-button", "Radio Button")],
      options=opts(
          ("sudden", "Skyndilega, ég man hvenær"),
          ("days", "Á nokkrum dögum"),
          ("gradual", "Smám saman á lengri tíma"),
          ("unsure", "Ég er ekki viss"),
      )),
    q("sym-trigger",
      "Gerðist eitthvað sérstakt rétt áður en einkennin byrjuðu?", "text",
      ext=placeholder("t.d. nýtt lyf, ferðalag, álag, matur, meiðsli, "
                      "skordýrabit, veikindi í kringum þig. Skrifaðu „ekkert“ "
                      "ef ekkert kemur upp í hugann.")),
    q("sym-course", "Hvernig hefur þetta þróast?", "choice", required=True,
      ext=[control("radio-button", "Radio Button")],
      options=opts(
          ("worse", "Versnandi"),
          ("same", "Óbreytt"),
          ("better", "Batnandi"),
          ("fluctuating", "Kemur og fer"),
      )),
    q("sym-impact",
      "Hversu mikil áhrif hefur þetta á daglegt líf þitt?", "choice",
      required=True, ext=[control("radio-button", "Radio Button")],
      options=opts(
          ("none", "Engin – ég sinni öllu eins og venjulega"),
          ("mild", "Lítil – ég næ að sinna flestu"),
          ("moderate", "Töluverð – ég hef þurft að draga úr"),
          ("severe", "Mikil – ég kemst ekki í vinnu, skóla eða sinni mér"),
      )),
    q("sym-fever", "Ertu með hita?", "choice", required=True,
      ext=[control("radio-button", "Radio Button")],
      options=opts(
          ("measured", "Já, ég hef mælt hann"),
          ("feels", "Mér finnst ég vera með hita en hef ekki mælt"),
          ("no", "Nei"),
          ("unsure", "Veit ekki"),
      )),
    gated(q("sym-fever-temp", "Hæsti hiti sem þú hefur mælt (°C)", "quantity",
            ext=[{"url": UNIT, "valueCoding": {"code": "Cel", "display": "°C",
                                               "system": UCUM}}]),
          "sym-fever", "measured"),
    q("sym-pain", "Ertu með verki?", "choice", required=True, options=YES_NO,
      ext=[control("radio-button", "Radio Button")]),
    gated(q("sym-pain-where", "Hvar eru verkirnir og leiða þeir eitthvað?",
            "string", required=True,
            ext=placeholder("t.d. neðarlega hægra megin í baki, leiðir niður í fót")),
          "sym-pain", "yes"),
    gated(q("sym-pain-score",
            "Hversu miklir eru verkirnir núna? 0 = engir verkir, 10 = "
            "verstu verkir sem þú getur ímyndað þér.",
            "integer", required=True, ext=slider(0, 10)),
          "sym-pain", "yes"),
    gated(q("sym-pain-mod", "Hvað gerir verkina betri eða verri?", "text",
            ext=placeholder("t.d. betra í hvíld, verra við hreyfingu, verra á "
                            "nóttunni, betra eftir mat")),
          "sym-pain", "yes"),
    q("sym-recurrent", "Hefur þú fengið svipuð einkenni áður?", "choice",
      required=True, ext=[control("radio-button", "Radio Button")],
      options=opts(
          ("no", "Nei, þetta er í fyrsta sinn"),
          ("once", "Já, einu sinni áður"),
          ("often", "Já, þetta kemur reglulega"),
      )),
    gated(q("sym-recurrent-what",
            "Hvað var gert síðast og hvað hjálpaði?", "text",
            ext=placeholder("t.d. fékk sýklalyf sem virkuðu, eða þetta lagaðist af sjálfu sér")),
            "sym-recurrent", "once", "often"),
    q("sym-seen-doctor",
      "Hefur þú þegar leitað til læknis, heilsugæslu eða bráðamóttöku "
      "vegna þessa?", "choice", required=True, options=YES_NO,
      ext=[control("radio-button", "Radio Button")]),
    gated(q("sym-seen-doctor-what",
            "Hvert leitaðir þú, hvenær og hvað var gert eða sagt?", "text",
            required=True,
            ext=placeholder("t.d. heilsugæslan í síðustu viku, tekin þvagprufa, "
                            "fékk sýklalyf í 5 daga")),
          "sym-seen-doctor", "yes"),
    q("sym-tried", "Hvað hefur þú prófað sjálf eða sjálfur?", "choice",
      repeats=True, ext=[control("check-box", "Check Box")],
      options=opts(
          ("painkillers", "Verkjalyf (t.d. Paratabs, Íbúfen)"),
          ("antihistamine", "Ofnæmislyf"),
          ("cream", "Krem eða smyrsl"),
          ("otc", "Annað lausasölulyf úr apóteki"),
          ("rest", "Hvíld"),
          ("heat-cold", "Kælingu eða hita"),
          ("supplements", "Bætiefni eða náttúrulyf"),
          ("nothing", "Ekkert"),
          ("other", "Annað"),
      )),
    gated(q("sym-tried-detail",
            "Hvað nákvæmlega prófaðir þú, hversu lengi og virkaði það?",
            "text", ext=placeholder("t.d. Íbúfen 400 mg þrisvar á dag í 3 daga, "
                                    "hjálpaði lítillega")),
          "sym-tried", "painkillers", "antihistamine", "cream", "otc",
          "supplements", "other"),
], gate=("erindi-type", ["new-problem", "known-problem"]))

# ---------------------------------------------------------------- page 5
P5 = page("p5-lyf", "Lyfjaerindi", [
    q("med-type", "Hvers konar lyfjaerindi er þetta?", "choice", required=True,
      ext=[control("radio-button", "Radio Button")],
      options=opts(
          ("renewal", "Endurnýjun á lyfi sem ég nota nú þegar"),
          ("side-effect", "Aukaverkun eða vandamál af lyfi"),
          ("question", "Spurning um lyf, skammta eða milliverkanir"),
          ("new", "Nýtt lyf sem ég tel mig þurfa"),
      )),
    display("med-controlled",
            "Athugið: ekki er ávísað ávana- og fíknilyfjum í fjarþjónustu. "
            "Það á meðal annars við um ópíóíða, róandi lyf, svefnlyf og "
            "ADHD-lyf. Slíkum beiðnum er vísað á heimilislækni."),
    q("med-name", "Heiti lyfs og styrkur", "string", required=True,
      ext=placeholder("t.d. Losartan 50 mg"),
      help_text="Skrifaðu nákvæmlega eins og stendur á pakkningunni. Þú mátt "
                "senda mynd af pakkningunni síðar í þessari beiðni."),
    q("med-dose", "Skammtur og hversu oft þú tekur lyfið", "string",
      required=True, ext=placeholder("t.d. 1 tafla að morgni")),
    gated(q("med-duration", "Hversu lengi hefur þú notað lyfið?", "choice",
            required=True, options=DURATION,
            ext=[control("radio-button", "Radio Button")]),
          "med-type", "renewal", "side-effect", "question"),
    gated(q("med-prescriber",
            "Hver ávísaði lyfinu síðast og hvenær, eftir bestu vitund?",
            "string", ext=placeholder("t.d. heimilislæknir á Heilsugæslunni "
                                      "Efra-Breiðholti, í fyrra")),
          "med-type", "renewal", "side-effect", "question"),
    gated(q("med-supply", "Hvenær klárast lyfið hjá þér?", "choice",
            required=True, ext=[control("radio-button", "Radio Button")],
            options=opts(
                ("out", "Það er þegar búið"),
                ("week", "Innan viku"),
                ("month", "Innan mánaðar"),
                ("later", "Seinna en eftir mánuð"),
            )),
          "med-type", "renewal"),
    gated(q("med-side-effect-what",
            "Hvaða aukaverkun finnur þú fyrir og hvenær byrjaði hún?", "text",
            required=True,
            ext=placeholder("Lýstu einkennunum og hvort þú hefur breytt "
                            "skammti eða hætt að taka lyfið")),
          "med-type", "side-effect"),
    q("med-change",
      "Hefur eitthvað breyst hjá þér síðan lyfinu var síðast ávísað?", "text",
      ext=placeholder("t.d. ný lyf, ný einkenni, þungun, breytt þyngd, "
                      "nýjar greiningar. Skrifaðu „ekkert“ ef svo er ekki.")),
    q("med-monitoring",
      "Hefur þú farið í eftirlit eða blóðprufu vegna þessa lyfs "
      "síðustu 12 mánuði?", "choice", options=YES_NO_UNSURE,
      ext=[control("radio-button", "Radio Button")]),
], gate=("erindi-type", ["medication"]))

# ---------------------------------------------------------------- page 6
P6 = page("p6-nidurstodur", "Niðurstöður og eftirfylgd", [
    q("res-what", "Hvaða rannsókn eða niðurstöður snýst erindið um?", "string",
      required=True, ext=placeholder("t.d. blóðprufa, röntgen, sýnataka, þvagprufa")),
    q("res-where", "Hvar og hvenær var rannsóknin gerð?", "string",
      required=True, ext=placeholder("t.d. Heilsugæslan Árbæ, 12. mars")),
    q("res-question", "Hverju viltu fá svarað?", "text", required=True,
      ext=placeholder("t.d. hvað niðurstöðurnar þýða, hvort þarf frekari "
                      "rannsóknir, hvort á að breyta meðferð")),
    display("res-attach",
            "Ef þú átt niðurstöðurnar á blaði eða í appi, taktu skjámynd eða "
            "mynd og hengdu hana við síðar í þessari beiðni."),
], gate=("erindi-type", ["results"]))

# ---------------------------------------------------------------- page 7
P7 = page("p7-vottord", "Vottorð", [
    display("cert-policy",
            "Læknir getur aðeins gefið út vottorð um það sem hann getur "
            "staðfest með mati sínu. Vottorð aftur í tímann fyrir veikindi "
            "sem enginn læknir hefur metið eru almennt ekki gefin út."),
    q("cert-type", "Hvers konar vottorð þarft þú?", "choice", required=True,
      ext=[control("radio-button", "Radio Button")],
      options=opts(
          ("sick-work", "Veikindavottorð fyrir vinnuveitanda"),
          ("sick-school", "Vottorð fyrir skóla"),
          ("travel", "Ferðavottorð eða vottorð vegna flugs"),
          ("sports", "Íþrótta- eða heilbrigðisvottorð"),
          ("other", "Annað"),
      )),
    q("cert-period", "Fyrir hvaða tímabil á vottorðið að gilda?", "string",
      required=True, ext=placeholder("t.d. 3.–7. maí")),
    q("cert-reason", "Hver er ástæða vottorðsins?", "text", required=True,
      ext=placeholder("Lýstu veikindunum eða ástæðunni og hvort þú hefur "
                      "þegar verið metin eða metinn af lækni")),
    q("cert-recipient", "Hver á að fá vottorðið og í hvaða formi?", "string",
      ext=placeholder("t.d. vinnuveitandi, sent í tölvupósti")),
], gate=("erindi-type", ["certificate"]))

# ---------------------------------------------------------------- page 8
P8 = page("p8-bakgrunnur", "Um heilsu þína", [
    display("bg-intro",
            "Þessar upplýsingar hafa áhrif á hvaða meðferð er örugg fyrir þig. "
            "Svaraðu þeim jafnvel þótt þér finnist þær ótengdar erindinu."),
    q("bg-chronic", "Ertu með langvinna sjúkdóma eða greiningar?", "choice",
      required=True, options=YES_NO_UNSURE,
      ext=[control("radio-button", "Radio Button")]),
    gated(q("bg-chronic-list", "Hvaða sjúkdómar eða greiningar?", "text",
            required=True,
            ext=placeholder("t.d. sykursýki, astmi, háþrýstingur, "
                            "skjaldkirtilssjúkdómur, hjartasjúkdómur, "
                            "nýrnasjúkdómur, geðgreining")),
          "bg-chronic", "yes"),
    q("bg-meds", "Notar þú lyf að staðaldri?", "choice", required=True,
      options=YES_NO, ext=[control("radio-button", "Radio Button")]),
    gated(q("bg-meds-list", "Hvaða lyf, styrk og skammt?", "text",
            required=True,
            ext=placeholder("Skrifaðu öll lyf, líka getnaðarvarnir, "
                            "bætiefni, náttúrulyf og lyf sem þú kaupir án "
                            "lyfseðils. Eitt lyf í hverja línu.")),
          "bg-meds", "yes"),
    q("bg-allergy", "Ertu með lyfjaofnæmi eða annað ofnæmi?", "choice",
      required=True, options=YES_NO_UNSURE,
      ext=[control("radio-button", "Radio Button")]),
    gated(q("bg-allergy-list", "Hvaða ofnæmi og hvernig lýsir það sér?",
            "text", required=True,
            ext=placeholder("t.d. penisillín – útbrot, eða hnetur – bólga í hálsi")),
          "bg-allergy", "yes"),
    q("bg-pregnancy", "Ertu þunguð eða með barn á brjósti?", "choice",
      required=True, ext=[control("radio-button", "Radio Button")],
      options=opts(
          ("no", "Nei"),
          ("pregnant", "Já, ég er þunguð"),
          ("breastfeeding", "Já, ég er með barn á brjósti"),
          ("possible", "Möguleiki er á þungun"),
          ("na", "Á ekki við"),
      ),
      help_text="Mörg lyf eru ekki örugg á meðgöngu eða við brjóstagjöf, "
                "þess vegna spyrjum við alltaf."),
    q("bg-nicotine", "Reykir þú eða notar nikótín?", "choice", required=True,
      ext=[control("radio-button", "Radio Button")],
      options=opts(
          ("no", "Nei, aldrei"),
          ("quit", "Hætt eða hættur"),
          ("smoke", "Já, sígarettur"),
          ("vape-pouch", "Já, rafrettur eða nikótínpúða"),
      )),
    q("bg-alcohol", "Hversu oft drekkur þú áfengi?", "choice", required=True,
      ext=[control("radio-button", "Radio Button")],
      options=opts(
          ("never", "Aldrei"),
          ("monthly", "Sjaldnar en vikulega"),
          ("weekly", "Vikulega"),
          ("daily", "Daglega eða næstum daglega"),
      )),
    q("bg-travel", "Hefur þú ferðast erlendis síðustu 4 vikur?", "choice",
      required=True, options=YES_NO, ext=[control("radio-button", "Radio Button")]),
    gated(q("bg-travel-where", "Hvert ferðaðist þú og hvenær komst þú heim?",
            "string", required=True, ext=placeholder("t.d. Taíland, kom heim 2. júní")),
          "bg-travel", "yes"),
    q("bg-height", "Hæð", "quantity",
      ext=[{"url": UNIT, "valueCoding": {"code": "cm", "display": "cm", "system": UCUM}}],
      help_text="Hæð og þyngd eru notaðar til að reikna örugga lyfjaskammta."),
    q("bg-weight", "Þyngd", "quantity",
      ext=[{"url": UNIT, "valueCoding": {"code": "kg", "display": "kg", "system": UCUM}}]),
])

# ---------------------------------------------------------------- page 9
P9 = page("p9-lysing", "Lýstu vandamálinu með þínum eigin orðum", [
    display("free-guide", (
        "Nú er komið að aðalatriðinu. Skrifaðu eins og þú værir að segja "
        "lækninum frá þessu í viðtali.\n\n"
        "Reyndu að koma þessu að:\n\n"
        "1. Hvað er að og hvar á líkamanum?\n"
        "2. Hvenær byrjaði það og hvernig hefur það þróast síðan?\n"
        "3. Hvernig lýsir þetta sér nákvæmlega – hvernig lítur það út eða "
        "hvernig finnst þér það?\n"
        "4. Hvað gerir það betra eða verra?\n"
        "5. Hvað hefur þú gert við því hingað til?\n"
        "6. Hvað viltu helst fá út úr þessu erindi?\n\n"
        "Það er engin þörf á að nota læknisfræðileg orð. Skrifaðu frekar of "
        "mikið en of lítið – læknirinn sér ekkert annað en það sem þú skrifar."
    )),
    q("free-text", "Lýsing á vandamálinu", "text", required=True,
      ext=placeholder("Byrjaðu hér. Notaðu punktana að ofan sem leiðarvísi.")),
    q("free-worry",
      "Hvað hefur þú mestar áhyggjur af eða hvað óttast þú að þetta gæti verið?",
      "text",
      ext=placeholder("Það er í lagi að segja það hreint út. Læknirinn svarar "
                      "því sérstaklega."),
      help_text="Þessi spurning er ekki formsatriði. Áhyggjur sjúklings eru "
                "oft besta vísbendingin um hvað þarf að útiloka."),
    q("free-extra", "Er eitthvað annað sem læknirinn ætti að vita?", "text",
      ext=placeholder("t.d. eitthvað í fjölskyldunni, vinnuaðstæður, "
                      "fyrri reynsla af meðferð. Þú mátt sleppa þessu.")),
])

# ---------------------------------------------------------------- page 10
P10 = page("p10-myndir", "Myndir", [
    q("img-gate",
      "Er eitthvað sýnilegt sem myndi hjálpa lækninum að sjá?", "choice",
      required=True, options=YES_NO, ext=[control("radio-button", "Radio Button")],
      help_text="t.d. útbrot, sár, bólga, auga, nögl, lyfjapakkning eða "
                "niðurstöður úr rannsókn."),
    gated(display("img-tips", (
        "Svona verður myndin gagnleg:\n\n"
        "• Taktu myndina í góðri dagsbirtu, ekki með flassi.\n"
        "• Taktu tvær myndir: eina nærmynd og eina þar sem sést hvar á "
        "líkamanum þetta er.\n"
        "• Leggðu fingur eða mynt við hliðina svo stærðin sjáist.\n"
        "• Þurrkaðu af krem eða farða áður.\n"
        "• Ef þetta breytist dag frá degi, sendu líka eldri mynd ef þú átt hana.\n\n"
        "Sendu ekki myndir sem sýna andlit eða kynfæri nema það sé nauðsynlegt "
        "fyrir matið."
    )), "img-gate", "yes"),
    gated(q("img-files", "Hengdu myndir við hér", "attachment", repeats=True),
          "img-gate", "yes"),
])

# ---------------------------------------------------------------- page 11
P11 = page("p11-lok", "Væntingar og staðfesting", [
    q("exp-wish", "Hverju vonast þú eftir frá þessu erindi?", "choice",
      repeats=True, required=True, ext=[control("check-box", "Check Box")],
      options=opts(
          ("advice", "Mati og ráðgjöf um hvað ég á að gera"),
          ("prescription", "Lyfseðli"),
          ("referral", "Tilvísun til sérfræðings"),
          ("tests", "Beiðni um rannsókn, t.d. blóðprufu eða myndatöku"),
          ("certificate", "Vottorði"),
          ("unsure", "Ég veit það ekki, ég vil bara láta meta þetta"),
      ),
      help_text="Þetta hjálpar okkur að forðast misskilning. Læknirinn metur "
                "sjálfstætt hvað á við, en það er gott að vita hvað þú vonaðist eftir."),
    q("contact-phone",
      "Símanúmer sem má hringja í ef læknirinn þarf að ná í þig", "string",
      ext=placeholder("t.d. 6XX XXXX")),
    display("final-intro", "Að lokum, staðfestu eftirfarandi:"),
    q("final-truth",
      "Upplýsingarnar sem ég hef gefið eru réttar eftir minni bestu vitund.",
      "boolean", required=True, ext=[control("check-box", "Check Box")]),
    q("final-noexam",
      "Ég skil að læknirinn getur ekki skoðað mig og getur því þurft að vísa "
      "mér í staðbundna skoðun eða hafna erindinu.",
      "boolean", required=True, ext=[control("check-box", "Check Box")]),
    q("final-notemergency",
      "Ég skil að þetta er ekki neyðarþjónusta og að svar berst "
      "[SVARTÍMI – t.d. innan 24 klst. á virkum dögum].",
      "boolean", required=True, ext=[control("check-box", "Check Box")]),
    q("final-privacy",
      "Ég samþykki að Fjarlækningar vinni þessar heilsufarsupplýsingar í "
      "samræmi við persónuverndarstefnu félagsins.",
      "boolean", required=True, ext=[control("check-box", "Check Box")]),
    display("final-thanks",
            "Takk fyrir. Erindið fer nú til læknis sem les það og svarar þér. "
            "Ef ástand þitt versnar á meðan þú bíður, hringdu í 1700 eða 112."),
])

questionnaire = {
    "resourceType": "Questionnaire",
    "status": "active",
    "title": "Opin beiðni – almennt læknisálit",
    "name": "OpinBeidni",
    "description": (
        "Opinn flokkur fyrir vandamál sem falla ekki undir tilbúnu "
        "erindaflokkana. Sjúklingur er leiddur í gegnum öryggisskimun og "
        "skipulagða forsögu áður en hann lýsir vandamálinu í frjálsum texta. "
        "Læknir les og metur handvirkt."
    ),
    "subjectType": ["Patient"],
    "extension": [
        {
            "url": "https://medalia.dev/fhir/extensions/1.0/questionnaire-help-display-mode",
            "valueCode": "inline",
        }
    ],
    "useContext": [
        {
            "code": {
                "code": "workflow",
                "display": "Workflow Setting",
                "system": "http://terminology.hl7.org/CodeSystem/usage-context-type",
            },
            "valueCodeableConcept": {
                "coding": [
                    {
                        "code": "patient-questionnaire",
                        "display": "Patient questionnaire",
                        "system": "https://medalia.dev/fhir/CodeSystem/questionnaire-contexts",
                    }
                ]
            },
        }
    ],
    "item": [P1, P2, P3, P4, P5, P6, P7, P8, P9, P10, P11],
}

if __name__ == "__main__":
    import sys
    out = sys.argv[1] if len(sys.argv) > 1 else "opin-beidni.json"
    with open(out, "w", encoding="utf-8") as f:
        json.dump(questionnaire, f, ensure_ascii=False, indent=2)
        f.write("\n")
    print("wrote", out)
