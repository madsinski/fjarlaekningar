#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Renders opin-beidni.json into a human build sheet for the Medalia editor.

The JSON stays the source of truth; this guarantees the sheet cannot drift
from the validated branching logic.
"""
import json
import sys

CTRL = "http://hl7.org/fhir/StructureDefinition/questionnaire-itemControl"
ENTRY = "http://hl7.org/fhir/StructureDefinition/entryFormat"
UNIT = "http://hl7.org/fhir/StructureDefinition/questionnaire-unit"


def ext(it, url):
    for e in it.get("extension", []) or []:
        if e["url"] == url:
            return e
    return None


def control_of(it):
    e = ext(it, CTRL)
    if not e:
        return None
    return e["valueCodeableConcept"]["coding"][0]["code"]


def kind(it):
    t = it["type"]
    c = control_of(it)
    if t == "display":
        return "Skýringartexti"
    if t == "boolean":
        return "Gátreitur — já/nei"
    if t == "choice":
        if it.get("repeats"):
            return "Fjölval — gátreitir"
        if c == "drop-down":
            return "Fellilisti"
        return "Einn valkostur — radio"
    if t == "string":
        return "Stuttur texti — ein lína"
    if t == "text":
        return "Langur texti — textareitur"
    if t == "integer":
        return "Tala 0–10 — hnappar"
    if t == "quantity":
        u = ext(it, UNIT)
        unit = u["valueCoding"]["display"] if u else "?"
        return f"Tala með einingu — {unit}"
    if t == "attachment":
        return "Viðhengi — mynd"
    return t


def condition(it, labels):
    ew = it.get("enableWhen") or []
    if not ew:
        return None
    join = " EÐA " if it.get("enableBehavior") == "any" else " OG "
    return join.join(f"`{e['question']}` = `{e['answerCoding']['code']}`" for e in ew)


def block(text):
    return "\n".join("> " + ln if ln.strip() else ">" for ln in text.split("\n"))


def render(path):
    q = json.load(open(path, encoding="utf-8"))
    out = []
    w = out.append

    w("# Opin beiðni — uppsetningarblað fyrir Medalia")
    w("")
    w("Handvirk uppsetning, spurning fyrir spurningu, í réttri röð.")
    w("Búið til beint úr `opin-beidni.json` svo textinn og rökin séu örugglega þau sömu.")
    w("")
    w("**Hvernig á að lesa þetta**")
    w("")
    w("- `linkId` er auðkenni spurningarinnar. Sláðu það inn nákvæmlega eins og hér stendur —")
    w("  öll skilyrði vísa í þessi auðkenni og einn stafur skiptir máli.")
    w("- **Birtist ef** þýðir að spurningin er falin þar til skilyrðið er uppfyllt.")
    w("  Spurningar án þeirrar línu eru alltaf sýnilegar.")
    w("- **SKYLDA** þýðir að ekki er hægt að halda áfram án svars.")
    w("- Í valmöguleikatöflum er `kóði` gildið sem skilyrðin vísa í. Textinn er það sem")
    w("  sjúklingurinn sér. Ef Medalia leyfir aðeins texta, notaðu textann og passaðu að")
    w("  skilyrðin vísi í hann í staðinn.")
    w("- *Hjálpartexti* birtist undir spurningunni. *Skýring í reit* er grái textinn inni í")
    w("  auða reitnum.")
    w("")

    labels = {}
    for page in q["item"]:
        for it in page.get("item", []):
            labels[it["linkId"]] = it.get("text", "")

    for pi, page in enumerate(q["item"], 1):
        w("---")
        w("")
        w(f"## Síða {pi} · {page['text']}")
        w("")
        c = condition(page, labels)
        if c:
            w(f"**Öll síðan birtist ef:** {c}")
        else:
            w("**Sýnd öllum.**")
        w("")

        for qi, it in enumerate(page.get("item", []), 1):
            lid = it["linkId"]
            head = f"### {pi}.{qi} · `{lid}`"
            w(head)
            w("")
            bits = [kind(it)]
            if it.get("required"):
                bits.append("**SKYLDA**")
            w(" · ".join(bits))
            w("")

            if it["type"] == "display":
                w(block(it["text"]))
                w("")
            else:
                w(f"**Spurning:** {it['text']}")
                w("")

            cc = condition(it, labels)
            if cc:
                w(f"**Birtist ef:** {cc}")
                w("")

            opts = it.get("answerOption") or []
            if opts:
                w("| kóði | það sem sjúklingurinn sér |")
                w("|---|---|")
                for o in opts:
                    vc = o["valueCoding"]
                    w(f"| `{vc['code']}` | {vc['display']} |")
                w("")

            ef = ext(it, ENTRY)
            if ef:
                w(f"*Skýring í reit:* {ef['valueString']}")
                w("")

            for child in it.get("item", []) or []:
                if control_of(child) == "help":
                    w(f"*Hjálpartexti:* {child['text']}")
                    w("")

    return "\n".join(out) + "\n"


if __name__ == "__main__":
    src = sys.argv[1]
    dst = sys.argv[2]
    open(dst, "w", encoding="utf-8").write(render(src))
    print("wrote", dst)
