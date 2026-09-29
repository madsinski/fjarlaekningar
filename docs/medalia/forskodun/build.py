#!/usr/bin/env python3
"""Builds the clickable test version of the "Opin beiðni" questionnaire
(long + short) from the same JSON the Medalia .docx is generated from.

    python3 docs/medalia/forskodun/build.py
    → docs/medalia/forskodun/opin-beidni-forskodun.html

Not part of the website. Published privately as a claude.ai Artifact for
checking the questions and branching before they are built in Medalia.
"""
import json
from pathlib import Path

HERE = Path(__file__).parent
MEDALIA = HERE.parent


def embed(name: str) -> str:
    data = json.loads((MEDALIA / name).read_text(encoding="utf-8"))
    # Inside <script type="application/json">: "</" must not close the tag.
    return json.dumps(data, ensure_ascii=False).replace("</", "<\\/")


page = (HERE / "template.html").read_text(encoding="utf-8")
page = page.replace("__LONG__", embed("opin-beidni.json")).replace("__SHORT__", embed("opin-beidni-stutt.json"))
out = HERE / "opin-beidni-forskodun.html"
out.write_text(page, encoding="utf-8")
print("wrote", out)
