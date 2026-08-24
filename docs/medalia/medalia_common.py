#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Shared builders for Fjarlækningar' Medalia questionnaires.

Conventions copied from the proven Lifeline "Heilsumat" Medalia export:
  - pages          = group items with itemControl "page"
  - choice options = answerOption[].valueCoding {code, display}
  - branching      = plain enableWhen + answerCoding, NO FHIRPath.
                     enableWhenExpression is a known source of silently hidden
                     questions in Medalia (single-line rule, repeat(item),
                     value-type matching, empty propagation). OR-logic is done
                     with enableBehavior "any" and several enableWhen entries.
  - help bubbles   = display child item, itemControl "help", linkId "<parent>-help"
  - placeholders   = entryFormat extension

Service facts below are the real ones, taken from Fjarlækningar' own patient
collateral — not invented for the questionnaire. If the service changes, change
them here and every questionnaire follows.
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

# ---------------------------------------------------------------- service copy

SVARTIMI = "Svar berst innan tveggja klukkustunda á opnunartíma, alla daga milli 10 og 22."
NEYD = (
    "⚠️ Fjarlækningar eru ekki bráðaþjónusta.\n\n"
    "Hringdu í 112 vegna bráðra veikinda eða slysa.\n"
    "Hringdu í 1700 (Læknavaktin) til að fá ráðgjöf strax.\n"
    "Hringdu í 543 2222 (Eitrunarmiðstöð) vegna eitrunar."
)
TILVISUN = (
    "Þurfir þú skoðun eða frekari rannsókn vísar læknir aftur í hefðbundna "
    "þjónustu. Mat læknis ræður alltaf."
)
LYFSEDILL = "Leggi læknir til lyfjameðferð fer lyfseðill rafrænt í lyfjagátt og er tilbúinn í því apóteki sem þú velur."

RADIO = None  # populated below once control() exists


def control(code, display=None):
    coding = {"code": code, "system": ITEM_CONTROL_SYS}
    if display:
        coding["display"] = display
    return {"url": ITEM_CONTROL, "valueCodeableConcept": {"coding": [coding]}}


RADIO = [control("radio-button", "Radio Button")]
CHECK = [control("check-box", "Check Box")]
DROPDOWN = [control("drop-down", "Drop down")]


def opts(*pairs):
    return [{"valueCoding": {"code": c, "display": d}} for c, d in pairs]


def when(question, *codes):
    return [
        {"question": question, "operator": "=",
         "answerCoding": {"code": c, "display": "", "system": ""}}
        for c in codes
    ]


def gated(item, question, *codes):
    """Show `item` only when `question` answered with any of `codes`."""
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


def slider(lo=0, hi=10):
    return [
        {"url": MIN_VALUE, "valueInteger": lo},
        {"url": MAX_VALUE, "valueInteger": hi},
        {"url": SLIDER_STEP, "valueInteger": 1},
        control("buttons", "Buttons"),
    ]


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


YES_NO = opts(("yes", "Já"), ("no", "Nei"))
YES_NO_UNSURE = opts(("yes", "Já"), ("no", "Nei"), ("unsure", "Veit ekki"))

DURATION = opts(
    ("today", "Í dag"), ("1-3d", "1–3 daga"), ("4-7d", "4–7 daga"),
    ("1-2w", "1–2 vikur"), ("2-4w", "2–4 vikur"), ("1-3m", "1–3 mánuði"),
    ("3-12m", "3–12 mánuði"), ("over-1y", "Lengur en ár"),
)


# ---------------------------------------------------------------- shared pages

def intro_page(what_text, not_for_lines):
    """Page 1 — what this is, what it is not, and a required acknowledgement."""
    return page("p1-fyrirvari", "Áður en þú byrjar", [
        display("intro-what", what_text),
        display("intro-emergency", NEYD),
        display("intro-scope",
                "Gott að vita:\n\n"
                + "\n".join("• " + l for l in not_for_lines)
                + "\n• " + TILVISUN
                + "\n• " + LYFSEDILL
                + "\n• " + SVARTIMI
                + "\n• Læknirinn sér aðeins það sem þú skrifar og sendir hér."),
        q("intro-ack",
          "Ég hef lesið ofangreint og skil að þetta er ekki bráðaþjónusta.",
          "boolean", required=True, ext=CHECK),
    ])


def redflag_page(intro_lines, which_options, extra_note=None):
    """Page 2 — read the list, one yes/no gate, then detail + stop advice."""
    items = [
        display("rf-intro",
                "Fyrst þurfum við að útiloka einkenni sem þola enga bið. "
                "Lestu listann og svaraðu svo spurningunni fyrir neðan:\n\n"
                + "\n".join("• " + l for l in intro_lines)),
        q("rf-gate", "Á eitthvað af ofangreindu við um þig núna?", "choice",
          required=True, options=YES_NO, ext=RADIO),
        gated(q("rf-which", "Hvað af þessu á við? Merktu við allt sem á við.",
                "choice", repeats=True, ext=CHECK, options=which_options),
              "rf-gate", "yes"),
        gated(display("rf-warning",
                      "⚠️ Stöðvaðu hér og leitaðu aðstoðar strax.\n\n"
                      "Einkennin sem þú merktir við þola ekki bið eftir "
                      "skriflegu svari.\n\n"
                      "• Hringdu í 112 ef ástandið er bráðt.\n"
                      "• Hringdu í 1700 til að fá ráðgjöf strax.\n"
                      "• Farðu á næstu bráðamóttöku eða heilsugæslu.\n\n"
                      + (extra_note + "\n\n" if extra_note else "")
                      + "Þú mátt senda erindið samt, en það kemur ekki í stað "
                      "bráðaþjónustu og gæti verið afgreitt of seint."),
              "rf-gate", "yes"),
        gated(q("rf-ack",
                "Ég skil að ég á að hafa samband við 112 eða 1700 og að þetta "
                "erindi kemur ekki í stað bráðaþjónustu.",
                "boolean", required=True, ext=CHECK), "rf-gate", "yes"),
    ]
    return page("p2-oryggisskimun", "Öryggisskimun", items)


def background_page(extra_items=None):
    """Shared background page — the safety set, kept short."""
    items = [
        display("bg-intro",
                "Þessar spurningar ráða því hvaða meðferð er örugg fyrir þig. "
                "Svaraðu þeim jafnvel þótt þér finnist þær ótengdar erindinu."),
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
        q("bg-chronic",
          "Ertu með langvinna sjúkdóma eða greiningar?", "choice",
          required=True, options=YES_NO_UNSURE, ext=RADIO,
          help_text="Sérstaklega sykursýki, ónæmisbælingu, krabbameinsmeðferð "
                    "eða sjúkdóm sem hefur áhrif á ónæmiskerfið."),
        gated(q("bg-chronic-list", "Hvaða sjúkdómar eða greiningar?", "text",
                required=True,
                ext=placeholder("t.d. sykursýki, exem, psoriasis, "
                                "ónæmisbæling, líftæknilyf")),
              "bg-chronic", "yes"),
        q("bg-pregnancy", "Ertu þunguð eða með barn á brjósti?", "choice",
          required=True, ext=RADIO,
          options=opts(("no", "Nei"), ("pregnant", "Já, ég er þunguð"),
                       ("breastfeeding", "Já, með barn á brjósti"),
                       ("possible", "Möguleiki er á þungun"),
                       ("na", "Á ekki við")),
          help_text="Mörg lyf, líka krem og augndropar, eru ekki örugg á "
                    "meðgöngu eða við brjóstagjöf."),
    ]
    items.extend(extra_items or [])
    return page("p-bakgrunnur", "Um heilsu þína", items)


def freetext_page(guide_lines, placeholder_text):
    return page("p-lysing", "Lýstu vandamálinu með þínum eigin orðum", [
        display("free-guide",
                "Skrifaðu eins og þú værir að segja lækninum frá þessu. "
                "Reyndu að koma þessu að:\n\n"
                + "\n".join(f"{i+1}. {l}" for i, l in enumerate(guide_lines))
                + "\n\nEngin þörf á læknisfræðilegum orðum. Skrifaðu frekar of "
                  "mikið en of lítið."),
        q("free-text", "Lýsing á vandamálinu", "text", required=True,
          ext=placeholder(placeholder_text)),
        q("free-worry",
          "Hvað hefur þú mestar áhyggjur af eða hvað óttast þú að þetta gæti "
          "verið?", "text",
          ext=placeholder("Það er í lagi að segja það hreint út. Læknirinn "
                          "svarar því sérstaklega."),
          help_text="Áhyggjur sjúklings eru oft besta vísbendingin um hvað "
                    "þarf að útiloka."),
    ])


def photo_page(tips, required=True, gate_text=None):
    """Photo page. For skin and eye the photo IS the examination, so the
    attachment is required rather than offered."""
    items = [
        display("img-intro",
                (gate_text or "Læknirinn getur ekki skoðað þig. Myndin kemur í "
                              "stað skoðunarinnar, svo hún skiptir öllu máli.")),
        display("img-tips", "Svona verður myndin gagnleg:\n\n"
                + "\n".join("• " + t for t in tips)),
        q("img-files", "Hengdu myndir við hér", "attachment",
          required=required, repeats=True),
    ]
    return page("p-myndir", "Myndir", items)


def closing_page(expect_options):
    return page("p-lok", "Væntingar og staðfesting", [
        q("exp-wish", "Hverju vonast þú eftir frá þessu erindi?", "choice",
          repeats=True, required=True, ext=CHECK, options=expect_options,
          help_text="Læknirinn metur sjálfstætt hvað á við, en það er gott að "
                    "vita hvað þú vonaðist eftir."),
        display("final-intro", "Að lokum, staðfestu eftirfarandi:"),
        q("final-truth",
          "Upplýsingarnar sem ég hef gefið eru réttar eftir minni bestu vitund.",
          "boolean", required=True, ext=CHECK),
        q("final-noexam",
          "Ég skil að læknirinn getur ekki skoðað mig og gæti þurft að vísa mér "
          "í hefðbundna þjónustu eða hafna erindinu.",
          "boolean", required=True, ext=CHECK),
        q("final-privacy",
          "Ég samþykki að Fjarlækningar vinni þessar heilsufarsupplýsingar í "
          "samræmi við persónuverndarstefnu félagsins.",
          "boolean", required=True, ext=CHECK),
        display("final-thanks",
                "Takk fyrir. Læknir les erindið og svarar þér. " + SVARTIMI
                + " Versni þér á meðan þú bíður, hringdu í 1700 eða 112."),
    ])


# ---------------------------------------------------------------- assembly

def questionnaire(title, name, description, pages):
    return {
        "resourceType": "Questionnaire",
        "status": "active",
        "title": title,
        "name": name,
        "description": description,
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
        "item": pages,
    }


def validate(qres):
    """Every enableWhen must point at a real linkId AND a real option code —
    the #1 cause of a question that silently never appears."""
    links = {}
    errors = []

    def walk(items, parent=None):
        for it in items or []:
            lid = it["linkId"]
            if lid in links:
                errors.append(f"duplicate linkId: {lid}")
            links[lid] = it
            walk(it.get("item"), lid)

    walk(qres["item"])
    for lid, it in links.items():
        ew = it.get("enableWhen") or []
        for e in ew:
            tgt = e["question"]
            if tgt not in links:
                errors.append(f"{lid}: enableWhen -> unknown linkId '{tgt}'")
                continue
            codes = {o["valueCoding"]["code"] for o in links[tgt].get("answerOption", [])}
            code = e["answerCoding"]["code"]
            if code not in codes:
                errors.append(f"{lid}: code '{code}' not among options of '{tgt}' ({sorted(codes)})")
        if len(ew) > 1 and it.get("enableBehavior") != "any":
            errors.append(f"{lid}: {len(ew)} enableWhen but behavior is not 'any'")
        if it["type"] == "choice" and not it.get("answerOption"):
            errors.append(f"{lid}: choice with no answerOption")
        if it["type"] in ("display", "group") and it.get("required"):
            errors.append(f"{lid}: required set on a {it['type']}")
    return links, errors


def write(qres, path):
    links, errors = validate(qres)
    for e in errors:
        print("  !", e)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(qres, f, ensure_ascii=False, indent=2)
        f.write("\n")
    pages = sum(1 for i in links.values() if i["type"] == "group")
    questions = sum(1 for i in links.values() if i["type"] not in ("group", "display"))
    print(f"wrote {path} — {len(links)} atriði, {pages} síður, "
          f"{questions} spurningar, {len(errors)} villur")
    return len(errors)
