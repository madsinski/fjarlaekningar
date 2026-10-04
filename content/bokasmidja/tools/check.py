#!/usr/bin/env python3
"""Checks an illustration the way the app will treat it, and renders it.

    python3 tools/check.py art/whale-1/p03.svg [more.svg ...]

For each file: runs the app's SVG sanitizer (anything it drops would vanish in
the book), counts the animation tags, and writes a PNG beside the SVG so the
picture can be looked at.
"""
import json, os, subprocess, sys
import cairosvg
HERE = os.path.dirname(os.path.abspath(__file__))
JS = "const {sanitizeSvg}=require(process.argv[1]+'/lib/svg.js');const fs=require('fs');const s=fs.readFileSync(process.argv[2],'utf8');const o=sanitizeSvg(s,'chk');const c=(x,r)=>(x.match(r)||[]).length;console.log(JSON.stringify({ok:!!o,bytes:s.length,elemsIn:c(s,/<[a-zA-Z]/g),elemsOut:o?c(o,/<[a-zA-Z]/g):0,anim:o?c(o,/data-anim=/g):0,tap:o?c(o,/data-tap=/g):0,text:c(s,/<text/g),out:o}))"
bad = False
for f in sys.argv[1:]:
    r = json.loads(subprocess.run(["node", "-e", JS, HERE, f], capture_output=True, text=True, check=True).stdout)
    problems = []
    if not r["ok"]: problems.append("sanitizer rejected the file")
    if r["elemsIn"] != r["elemsOut"]: problems.append(f"sanitizer dropped {r['elemsIn'] - r['elemsOut']} elements (unsupported element?)")
    if r["text"]: problems.append("contains <text> (no lettering allowed)")
    if not 5 <= r["anim"] <= 12: problems.append(f"{r['anim']} data-anim tags (want 5-10)")
    if not 3 <= r["tap"] <= 8: problems.append(f"{r['tap']} data-tap tags (want 3-6)")
    if r["bytes"] > 60000: problems.append(f"{r['bytes']} bytes (keep under 60 KB)")
    if r["ok"]:
        png = f[:-4] + ".png"
        cairosvg.svg2png(bytestring=r["out"].encode(), write_to=png, output_width=1000)
    print(f"{f}: {r['bytes']} bytes, anim {r['anim']}, tap {r['tap']} -> " + ("OK" if not problems else "PROBLEMS: " + "; ".join(problems)))
    bad = bad or bool(problems)
sys.exit(1 if bad else 0)
