#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Builds the SHORT variant of the Medalia "Opin beiðni" questionnaire.

Design difference from the long variant (build-opin-beidni.py):

The long variant collects everything a doctor would ask in a consultation.
That is the right instinct for a first patient contact and the wrong instinct
for a product that competes with free text in Heilsuvera and a phone call.
This variant keeps one test for every question:

    If this answer were missing, would the doctor have to write back?

If no, the question is cut as a field and folded into the guided prompt above
the free text instead. The doctor can always ask; asking costs one doctor
twenty seconds, while a field costs every patient a decision.

Two things are deliberately NOT cut:
  - the safety set (red flags, meds, allergies, pregnancy, chronic disease),
    because that is exactly what Heilsuvera free text does not capture and
    what makes asynchronous prescribing defensible;
  - the medication branch, because free text does not reliably contain drug,
    strength and dose, and guessing those is a prescribing error.

Structural change: the free text moves BEFORE the structured questions.
Patients arrive with a story they want to tell. Letting them tell it first
gets a better story, and the questions that follow are ones patients never
volunteer anyway, so they do not feel redundant.

Output: opin-beidni-stutt.json
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
    return [
        {"question": question, "operator": "=",
         "answerCoding": {"code": c, "display": "", "system": ""}}
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


def page(link_id, title, items, gate=None):
    it = {
        "linkId": link_id, "type": "group", "text": title,
        "extension": [control("page", "Page")], "item": items,
    }
    if gate:
        question, codes = gate
        gated(it, question, *codes)
    else:
        it["enableBehavior"] = "all"
    return it


RADIO = [control("radio-button", "Radio Button")]
CHECK = [control("check-box", "Check Box")]
YES_NO = opts(("yes", "Já"), ("no", "Nei"))
YES_NO_UNSURE = opts(("yes", "Já"), ("no", "Nei"), ("unsure", "Veit ekki"))

# ---------------------------------------------------------------- 1
P1 = page("p1-fyrirvari", "Áður en þú byrjar", [
    display("intro-all", (
        "Þú lýsir vandamálinu, læknir les og svarar þér skriflega "
        "[SVARTÍMI – t.d. innan 24 klst. á virkum dögum]. "
        "Læknirinn getur ekki skoðað þig og gæti því vísað þér í skoðun eða "
        "hafnað erindinu. Ekki er ávísað ávana- og fíknilyfjum í fjarþjónustu.\n\n"
        "⚠️ Þetta er ekki neyðarþjónusta. Hringdu í 112 vegna bráðra veikinda "
        "eða slysa, 1700 til að fá ráðgjöf strax, 543 2222 vegna eitrunar.\n\n"
        "[GJALDSKRÁ – t.d. Gjald fyrir erindið er X kr.]\n\n"
        "Læknirinn sér aðeins það sem þú skrifar hér."
    )),
    q("intro-ack",
      "Ég hef lesið ofangreint og skil að þetta er ekki neyðarþjónusta.",
      "boolean", required=True, ext=CHECK),
])

# ---------------------------------------------------------------- 2
P2 = page("p2-oryggisskimun", "Öryggisskimun", [
    display("rf-intro", (
        "Lestu listann og svaraðu svo spurningunni fyrir neðan:\n\n"
        "• Verkur eða þyngsli fyrir brjósti\n"
        "• Andþyngsli eða öndunarerfiðleikar í hvíld\n"
        "• Skyndilegt máttleysi, dofi, talörðugleikar eða sjónskerðing\n"
        "• Skyndilegur og mjög mikill höfuðverkur, ólíkur öllu fyrri\n"
        "• Meðvitundarleysi, yfirlið eða rugl\n"
        "• Miklir eða vaxandi kviðverkir\n"
        "• Blóð í uppköstum, svartar eða blóðugar hægðir\n"
        "• Hiti með stífum hnakka, ljósfælni eða útbrotum sem hverfa ekki "
        "við þrýsting\n"
        "• Bólga í andliti, vörum eða tungu eftir lyf, fæðu eða stungu\n"
        "• Blæðing eða verkir á meðgöngu\n"
        "• Alvarlegur áverki eða mikil blæðing\n"
        "• Sjálfsvígshugsanir eða hugsanir um að skaða þig eða aðra"
    )),
    q("rf-gate", "Á eitthvað af ofangreindu við um þig núna?", "choice",
      required=True, options=YES_NO, ext=RADIO),
    gated(q("rf-which", "Hvað af þessu á við?", "choice", repeats=True,
            ext=CHECK,
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
                ("self-harm", "Sjálfsvígshugsanir"),
            )), "rf-gate", "yes"),
    gated(display("rf-warning", (
        "⚠️ Stöðvaðu hér og leitaðu aðstoðar strax.\n\n"
        "Hringdu í 112 ef ástandið er bráðt, 1700 til að fá ráðgjöf strax, "
        "eða farðu á næstu bráðamóttöku. Sjálfsvígshugsanir: 1717 eða 112.\n\n"
        "Þú mátt senda erindið samt, en það kemur ekki í stað bráðaþjónustu."
    )), "rf-gate", "yes"),
    gated(q("rf-ack",
            "Ég skil að ég á að hafa samband við 112 eða 1700 og að þetta "
            "erindi kemur ekki í stað bráðaþjónustu.",
            "boolean", required=True, ext=CHECK), "rf-gate", "yes"),
])

# ---------------------------------------------------------------- 3
P3 = page("p3-erindid", "Hvað er að?", [
    q("erindi-type", "Hvers eðlis er erindið?", "choice", required=True,
      ext=RADIO,
      options=opts(
          ("new-problem", "Nýtt einkenni eða nýtt heilsuvandamál"),
          ("known-problem", "Þekkt vandamál sem hefur breyst eða versnað"),
          ("medication", "Lyf – endurnýjun, aukaverkun eða spurning"),
          ("results", "Niðurstöður úr rannsókn eða eftirfylgd"),
          ("certificate", "Vottorð eða staðfesting"),
          ("other", "Annað eða ég er ekki viss"),
      )),
    display("free-guide", (
        "Skrifaðu eins og þú værir að segja lækninum frá þessu. Reyndu að "
        "koma þessu að:\n\n"
        "1. Hvað er að og hvar á líkamanum?\n"
        "2. Hvenær byrjaði það, byrjaði það skyndilega, og gerðist eitthvað "
        "sérstakt á undan?\n"
        "3. Hvernig lýsir þetta sér — hvernig lítur það út eða hvernig "
        "finnst þér það?\n"
        "4. Hvað gerir það betra eða verra?\n"
        "5. Hvað hefur þú prófað sjálf eða sjálfur og virkaði það?\n"
        "6. Hefur þú fengið þetta áður og hvað var gert þá?\n\n"
        "Engin þörf á læknisfræðilegum orðum. Skrifaðu frekar of mikið en of "
        "lítið."
    )),
    q("free-text", "Lýsing á vandamálinu", "text", required=True,
      ext=placeholder("Byrjaðu hér. Notaðu punktana að ofan sem leiðarvísi.")),
    q("free-worry",
      "Hvað hefur þú mestar áhyggjur af eða hvað óttast þú að þetta gæti verið?",
      "text",
      ext=placeholder("Það er í lagi að segja það hreint út. Læknirinn svarar "
                      "því sérstaklega."),
      help_text="Áhyggjur sjúklings eru oft besta vísbendingin um hvað þarf "
                "að útiloka."),
])

# ---------------------------------------------------------------- 4
P4 = page("p4-einkenni", "Nokkur atriði sem gleymast oft", [
    q("sym-duration", "Hversu lengi hefur þetta staðið yfir?", "choice",
      required=True, ext=RADIO,
      options=opts(
          ("today", "Í dag"), ("1-3d", "1–3 daga"), ("4-7d", "4–7 daga"),
          ("1-2w", "1–2 vikur"), ("2-4w", "2–4 vikur"),
          ("1-3m", "1–3 mánuði"), ("3-12m", "3–12 mánuði"),
          ("over-1y", "Lengur en ár"),
      )),
    q("sym-course", "Hvernig hefur þetta þróast?", "choice", required=True,
      ext=RADIO,
      options=opts(("worse", "Versnandi"), ("same", "Óbreytt"),
                   ("better", "Batnandi"), ("fluctuating", "Kemur og fer"))),
    q("sym-impact", "Hversu mikil áhrif hefur þetta á daglegt líf þitt?",
      "choice", required=True, ext=RADIO,
      options=opts(
          ("none", "Engin"),
          ("mild", "Lítil – ég næ að sinna flestu"),
          ("moderate", "Töluverð – ég hef þurft að draga úr"),
          ("severe", "Mikil – ég kemst ekki í vinnu eða skóla"),
      )),
    q("sym-fever", "Ertu með hita?", "choice", required=True, ext=RADIO,
      options=opts(
          ("measured", "Já, ég hef mælt hann"),
          ("feels", "Mér finnst það en hef ekki mælt"),
          ("no", "Nei"), ("unsure", "Veit ekki"),
      )),
    gated(q("sym-fever-temp", "Hæsti mældur hiti (°C)", "quantity",
            ext=[{"url": UNIT, "valueCoding": {"code": "Cel", "display": "°C",
                                               "system": UCUM}}]),
          "sym-fever", "measured"),
    q("sym-pain-score",
      "Verkir núna? 0 = engir verkir, 10 = verstu verkir sem þú getur "
      "ímyndað þér.", "integer",
      ext=[{"url": MIN_VALUE, "valueInteger": 0},
           {"url": MAX_VALUE, "valueInteger": 10},
           {"url": SLIDER_STEP, "valueInteger": 1},
           control("buttons", "Buttons")]),
    q("sym-seen-doctor",
      "Hefur þú þegar leitað til læknis eða heilsugæslu vegna þessa?",
      "choice", required=True, options=YES_NO, ext=RADIO),
    gated(q("sym-seen-doctor-what",
            "Hvert leitaðir þú, hvenær og hvað var gert?", "text",
            required=True,
            ext=placeholder("t.d. heilsugæslan í síðustu viku, tekin "
                            "þvagprufa, fékk sýklalyf í 5 daga")),
          "sym-seen-doctor", "yes"),
], gate=("erindi-type", ["new-problem", "known-problem"]))

# ---------------------------------------------------------------- 5
P5 = page("p5-lyf", "Lyfið", [
    q("med-type", "Hvers konar lyfjaerindi er þetta?", "choice",
      required=True, ext=RADIO,
      options=opts(
          ("renewal", "Endurnýjun á lyfi sem ég nota nú þegar"),
          ("side-effect", "Aukaverkun eða vandamál af lyfi"),
          ("question", "Spurning um lyf, skammta eða milliverkanir"),
          ("new", "Nýtt lyf sem ég tel mig þurfa"),
      )),
    display("med-controlled",
            "Ekki er ávísað ávana- og fíknilyfjum í fjarþjónustu — meðal "
            "annars ópíóíðum, róandi lyfjum, svefnlyfjum og ADHD-lyfjum."),
    q("med-name", "Heiti lyfs og styrkur", "string", required=True,
      ext=placeholder("t.d. Losartan 50 mg"),
      help_text="Skrifaðu nákvæmlega eins og stendur á pakkningunni, eða "
                "sendu mynd af henni aftar í þessari beiðni."),
    q("med-dose", "Skammtur og hversu oft þú tekur lyfið", "string",
      required=True, ext=placeholder("t.d. 1 tafla að morgni")),
    gated(q("med-supply", "Hvenær klárast lyfið hjá þér?", "choice",
            required=True, ext=RADIO,
            options=opts(("out", "Það er þegar búið"), ("week", "Innan viku"),
                         ("month", "Innan mánaðar"),
                         ("later", "Seinna en eftir mánuð"))),
          "med-type", "renewal"),
    gated(q("med-side-effect-what",
            "Hvaða aukaverkun finnur þú fyrir og hvenær byrjaði hún?", "text",
            required=True,
            ext=placeholder("Segðu líka hvort þú hefur breytt skammti eða "
                            "hætt að taka lyfið")),
          "med-type", "side-effect"),
    q("med-monitoring",
      "Hefur þú farið í eftirlit eða blóðprufu vegna þessa lyfs síðustu "
      "12 mánuði?", "choice", options=YES_NO_UNSURE, ext=RADIO),
], gate=("erindi-type", ["medication"]))

# ---------------------------------------------------------------- 6
P6 = page("p6-nidurstodur", "Rannsóknin", [
    q("res-what", "Hvaða rannsókn eða niðurstöður snýst erindið um?",
      "string", required=True,
      ext=placeholder("t.d. blóðprufa, röntgen, sýnataka")),
    q("res-where", "Hvar og hvenær var hún gerð?", "string", required=True,
      ext=placeholder("t.d. Heilsugæslan Árbæ, 12. mars")),
], gate=("erindi-type", ["results"]))

# ---------------------------------------------------------------- 7
P7 = page("p7-vottord", "Vottorðið", [
    display("cert-policy",
            "Læknir getur aðeins vottað það sem hann getur staðfest með mati "
            "sínu. Vottorð aftur í tímann fyrir veikindi sem enginn læknir "
            "hefur metið eru almennt ekki gefin út."),
    q("cert-type", "Hvers konar vottorð þarft þú?", "choice", required=True,
      ext=RADIO,
      options=opts(
          ("sick-work", "Veikindavottorð fyrir vinnuveitanda"),
          ("sick-school", "Vottorð fyrir skóla"),
          ("travel", "Ferðavottorð"),
          ("sports", "Íþrótta- eða heilbrigðisvottorð"),
          ("other", "Annað"),
      )),
    q("cert-period", "Fyrir hvaða tímabil?", "string", required=True,
      ext=placeholder("t.d. 3.–7. maí")),
], gate=("erindi-type", ["certificate"]))

# ---------------------------------------------------------------- 8
P8 = page("p8-oryggi", "Öryggisatriði og myndir", [
    display("bg-intro",
            "Þessar fjórar spurningar ráða því hvaða meðferð er örugg fyrir "
            "þig. Svaraðu þeim jafnvel þótt þér finnist þær ótengdar."),
    q("bg-meds", "Notar þú lyf að staðaldri?", "choice", required=True,
      options=YES_NO, ext=RADIO),
    gated(q("bg-meds-list", "Hvaða lyf, styrk og skammt?", "text",
            required=True,
            ext=placeholder("Líka getnaðarvarnir, bætiefni og lyf án "
                            "lyfseðils. Eitt lyf í hverja línu.")),
          "bg-meds", "yes"),
    q("bg-allergy", "Ertu með lyfjaofnæmi eða annað ofnæmi?", "choice",
      required=True, options=YES_NO_UNSURE, ext=RADIO),
    gated(q("bg-allergy-list", "Hvaða ofnæmi og hvernig lýsir það sér?",
            "text", required=True,
            ext=placeholder("t.d. penisillín – útbrot")),
          "bg-allergy", "yes"),
    q("bg-chronic", "Ertu með langvinna sjúkdóma eða greiningar?", "choice",
      required=True, options=YES_NO_UNSURE, ext=RADIO),
    gated(q("bg-chronic-list", "Hvaða sjúkdómar eða greiningar?", "text",
            required=True,
            ext=placeholder("t.d. sykursýki, astmi, háþrýstingur, "
                            "skjaldkirtilssjúkdómur")),
          "bg-chronic", "yes"),
    q("bg-pregnancy", "Ertu þunguð eða með barn á brjósti?", "choice",
      required=True, ext=RADIO,
      options=opts(("no", "Nei"), ("pregnant", "Já, ég er þunguð"),
                   ("breastfeeding", "Já, með barn á brjósti"),
                   ("possible", "Möguleiki er á þungun"),
                   ("na", "Á ekki við"))),
    q("img-gate", "Er eitthvað sýnilegt sem myndi hjálpa lækninum að sjá?",
      "choice", required=True, options=YES_NO, ext=RADIO,
      help_text="t.d. útbrot, sár, bólga, auga, lyfjapakkning eða "
                "niðurstöður úr rannsókn."),
    gated(display("img-tips", (
        "Góð mynd: dagsbirta og ekkert flass, ein nærmynd og ein þar sem "
        "sést hvar á líkamanum þetta er, fingur eða mynt við hliðina svo "
        "stærðin sjáist, og krem eða farði þurrkað af."
    )), "img-gate", "yes"),
    gated(q("img-files", "Hengdu myndir við hér", "attachment", repeats=True),
          "img-gate", "yes"),
])

# ---------------------------------------------------------------- 9
P9 = page("p9-lok", "Staðfesting", [
    q("exp-wish", "Hverju vonast þú eftir?", "choice", repeats=True,
      required=True, ext=CHECK,
      options=opts(
          ("advice", "Mati og ráðgjöf"),
          ("prescription", "Lyfseðli"),
          ("referral", "Tilvísun til sérfræðings"),
          ("tests", "Beiðni um rannsókn"),
          ("certificate", "Vottorði"),
          ("unsure", "Veit ekki, vil bara láta meta þetta"),
      ),
      help_text="Læknirinn metur sjálfstætt hvað á við, en það er gott að "
                "vita hvað þú vonaðist eftir."),
    q("final-all",
      "Ég staðfesti að upplýsingarnar eru réttar eftir minni bestu vitund, "
      "að ég skil að læknirinn getur ekki skoðað mig og gæti þurft að vísa "
      "mér áfram eða hafna erindinu, og ég samþykki að Fjarlækningar vinni "
      "þessar heilsufarsupplýsingar samkvæmt persónuverndarstefnu félagsins.",
      "boolean", required=True, ext=CHECK),
    display("final-thanks",
            "Takk fyrir. Læknir les erindið og svarar þér. Ef þér versnar á "
            "meðan þú bíður, hringdu í 1700 eða 112."),
])

questionnaire = {
    "resourceType": "Questionnaire",
    "status": "active",
    "title": "Opin beiðni – stutt útgáfa",
    "name": "OpinBeidniStutt",
    "description": (
        "Stutt útgáfa opna erindaflokksins. Öryggisskimun, frjáls texti með "
        "leiðarvísi, og aðeins þær skipulögðu spurningar sem myndu annars "
        "kalla á aukafyrirspurn frá lækni."
    ),
    "subjectType": ["Patient"],
    "extension": [{
        "url": "https://medalia.dev/fhir/extensions/1.0/questionnaire-help-display-mode",
        "valueCode": "inline",
    }],
    "useContext": [{
        "code": {"code": "workflow", "display": "Workflow Setting",
                 "system": "http://terminology.hl7.org/CodeSystem/usage-context-type"},
        "valueCodeableConcept": {"coding": [{
            "code": "patient-questionnaire", "display": "Patient questionnaire",
            "system": "https://medalia.dev/fhir/CodeSystem/questionnaire-contexts"}]},
    }],
    "item": [P1, P2, P3, P4, P5, P6, P7, P8, P9],
}

if __name__ == "__main__":
    import sys
    out = sys.argv[1] if len(sys.argv) > 1 else "opin-beidni-stutt.json"
    with open(out, "w", encoding="utf-8") as f:
        json.dump(questionnaire, f, ensure_ascii=False, indent=2)
        f.write("\n")
    print("wrote", out)
