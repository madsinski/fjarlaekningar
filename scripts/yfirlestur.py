#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Yfirlestur — íslensk málfarsskoðun á texta úr geymslunni.

Keyrir GreynirCorrect (Miðeind, sama vél og yfirlestur.is) yfir íslenskan texta
í .md, .json, .ts, .tsx og .py skrám og skilar aðeins þeim athugasemdum sem eru
líklegar til að vera raunverulegar.

    python3 scripts/yfirlestur.py docs/medalia/verkferli/*.md
    python3 scripts/yfirlestur.py src/erindi.ts
    python3 scripts/yfirlestur.py --all

Uppsetning (einu sinni):

    pip install --break-system-packages --target scripts/.islib reynir-correct

Skilar 1 ef athugasemdir finnast, svo hægt sé að nota þetta í CI.

──────────────────────────────────────────────────────────────────────────────
AF HVERJU

Vélin les íslensku betur en nokkur málfarsleiðrétting sem byggir á enskum
líkönum. Hún fann fjórar raunverulegar villur í fyrstu keyrslu yfir texta sem
leit vel út:

  • „blettur sem klæjar“ — klæja er ópersónuleg sögn og tekur frumlag í
    þolfalli, svo þetta er ekki tæk setning. Rétt: „sem veldur kláða“.
  • „Þurrkaðu af krem“ — „þurrka af e-u“ er að þurrka eitthvað hreint; efnið
    sem er fjarlægt er ekki andlag þess. Rétt: „Hreinsaðu krem af húðinni“.
  • „ástandið er bráðt“ — hvorugkyn af bráður er brátt.
  • Elliptísk vísbending sem las eins og fallvilla; skýrari sem boðháttur.

TAKMARKANIR

Hún þekkir ekki læknisfræðiorðaforða og les hvorki markdown né kóða. Þess vegna
eru tvær síur hér: ORÐALISTI fyrir orð sem eru rétt en ekki í BÍN, og hreinsun
sem endurflæðir málsgreinar áður en textinn fer í vélina. Án þeirra drukknar
raunveruleg villa í hundrað fölskum.

Vélin hefur alltaf rangt fyrir sér um sumt. Boðháttur („Ekki nota augndropa“)
er lesinn sem persónubeyging, og hún vill breyta „lyfjagátt“ í „lyfjagát“.
Athugasemd er tilefni til að lesa línuna, ekki skipun.
"""
import glob
import json
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, ".islib"))

try:
    from reynir_correct import check
except ImportError:
    sys.exit(
        "GreynirCorrect vantar. Settu upp með:\n"
        "  pip install --break-system-packages --target scripts/.islib reynir-correct"
    )

# Kóðar sem segja ekkert um íslenskuna sjálfa í okkar texta.
SKIP_CODES = {
    "E001", "U001",   # óþekkt orð — læknisfræðiorðaforði er ekki í BÍN
    "E005",           # "málsgrein í lengra lagi" — á við um upptalningar
}

# Orð sem eru rétt hjá okkur þótt vélin þekki þau ekki. Athugasemd sem nefnir
# eitthvert þessara orða er felld niður.
ORDALISTI = {
    # þjónusta og kerfi
    "lyfjagátt", "sjúklingagátt", "fjarþjónustu", "fjarþjónusta", "Fjarlækningar",
    "Læknavaktin", "Læknavaktina", "Medalia", "heilsugæslu", "heilsugæslan",
    # húð
    "psoriasis", "snertiexem", "rósroða", "rósroði", "sveppasýking",
    "sveppasýkingar", "graftarbólur", "unglingabólur", "vörtur", "Vörtur",
    "flagnar", "flögnun", "dýrabit", "mannabit", "skordýrabit", "húðbreytingu",
    "sterakrem", "rakakrem", "hreistur", "vessandi", "sápulaus", "ertir",
    "snertiexem", "rósroði", "kláði", "útbrot",
    # augu
    "hvarmabólga", "hvarmabólgu", "vogrís", "hvarmakýli", "tárubólga",
    "tárubólgu", "táru", "útferð", "ljósfælni", "augnlokabrún", "gervitár",
    "aðskotatilfinning", "hornhimnu", "sjónskerðing", "augndropa", "augndropum",
    # almennt klínískt
    "einkennalaus", "bráðamóttöku", "áhættumat", "heilsumat", "líkamssamsetning",
    "blóðrannsókn", "endurmæling", "eftirfylgd", "lífsstílsáætlun",
    "ávana", "fíknilyfjum", "ópíóíða", "benzódíazepín", "bráðaofnæmi",
    "meðgöngu", "brjóstagjöf", "ónæmisbælingu", "skjaldkirtill",
}


def _units_from_markdownish(text):
    """Endurflæðir texta í málsgreinar. Markdown vefur málsgrein yfir margar
    línur — séu þær lesnar hver í sínu lagi verður hver þeirra að brotinni
    setningu og vélin kvartar undan hástöfum sem eru ekki rangir. Liðir í
    upptalningu eru hins vegar sjálfstæðar setningar og mega ekki límast saman."""
    out, para, inbullet, infence = [], [], [False], False

    def flush():
        if para:
            s = " ".join(para)
            if inbullet[0] and not re.search(r"[.!?:]$", s):
                s += "."
            out.append(s)
            para.clear()
        inbullet[0] = False

    for raw in text.split("\n"):
        s = raw.strip()
        if s.startswith("```"):
            flush()
            infence = not infence
            continue
        if infence:
            continue
        if s.startswith("#") or s.startswith("|") or (s and set(s) <= {"-", "="}):
            flush()
            continue
        s = re.sub(r"\[[^\]]*\]\([^)]*\)", "", s)   # tenglar
        s = re.sub(r"\[[^\]]*\]", "", s)            # [reitir sem læknir fyllir]
        s = re.sub(r"`[^`]*`", "", s)               # kóði
        s = re.sub(r"https?://\S+", "", s)
        s = s.lstrip(">").strip().replace("**", "").replace("⚠️", "")
        if not s:
            flush()
            continue
        if re.match(r"^([-•*]|\d+[.)])\s+", s):
            flush()
            inbullet[0] = True
            para.append(re.sub(r"^([-•*]|\d+[.)])\s+", "", s))
        else:
            para.append(s)
    flush()
    return [u for u in out if u and not u.isupper()]


ICELANDIC = re.compile(r"[þæðöáíóúýÞÆÐÖÁÍÓÚÝéÉ]")


def units(path):
    """Íslenskar málsgreinar úr einni skrá, eftir gerð hennar."""
    text = open(path, encoding="utf-8").read()
    ext = os.path.splitext(path)[1]

    if ext == ".json":
        out = []

        def walk(o):
            if isinstance(o, dict):
                for k, v in o.items():
                    if k in ("text", "display", "valueString", "title", "description") and isinstance(v, str):
                        out.extend(_units_from_markdownish(v))
                    else:
                        walk(v)
            elif isinstance(o, list):
                for v in o:
                    walk(v)

        walk(json.loads(text))
        return out

    if ext in (".ts", ".tsx", ".py"):
        # Strengir með íslenskum stöfum. Kóði og lyklar eru enska og fara ekki inn.
        lits = re.findall(r'"([^"\\\n]{12,400})"', text)
        lits += re.findall(r"`([^`\\]{12,2000})`", text)
        out = []
        for s in lits:
            if ICELANDIC.search(s):
                out.extend(_units_from_markdownish(s.replace("\\n", "\n")))
        return out

    return _units_from_markdownish(text)


def suppressed(annotation_text, sentence):
    """Fellur athugasemdin á orði sem er rétt hjá okkur, eða á reglu sem á ekki
    við hér?

    Tvípunktur: á íslensku heldur málsgrein áfram með lágstaf eftir tvípunkt, en
    tókarinn les tvípunkt sem endi og heimtar hástaf á næsta orði. Sú athugasemd
    er alltaf röng í okkar texta."""
    words = set(re.findall(r"[\wÞÆÐÖÁÍÓÚÝþæðöáíóúýéÉ]+", annotation_text))
    if words & ORDALISTI:
        return True
    if "hástaf" in annotation_text and ":" in str(sentence):
        return True
    return False


DEFAULT_TARGETS = [
    "docs/medalia/**/*.md",
    "docs/medalia/*.json",
    "src/erindi.ts",
    "src/lib/site-content/*.ts",
]


def main(argv):
    if not argv or argv[0] == "--all":
        root = os.path.dirname(HERE)
        paths = []
        for pat in DEFAULT_TARGETS:
            paths += glob.glob(os.path.join(root, pat), recursive=True)
    else:
        paths = argv

    total = 0
    for path in sorted(set(paths)):
        try:
            us = units(path)
        except Exception as exc:                      # noqa: BLE001 - report and move on
            print(f"\n=== {os.path.basename(path)}\n   (slepp: {exc})")
            continue
        hits = []
        for unit in us:
            for para in check(unit):
                for sent in para:
                    for a in sent.annotations:
                        if a.code in SKIP_CODES:
                            continue
                        if suppressed(a.text, sent):
                            continue
                        hits.append((a.code, a.text, str(sent)[:100]))
        if hits:
            print(f"\n=== {os.path.relpath(path)}  ({len(us)} málsgreinar)")
            for code, txt, ctx in hits:
                total += 1
                print(f"   [{code}] {txt}\n        …{ctx}")

    print(f"\nAthugasemdir: {total}")
    if total:
        print("Lestu hverja línu — vélin þekkir ekki boðhátt né læknisfræðiorð.")
    return 1 if total else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
