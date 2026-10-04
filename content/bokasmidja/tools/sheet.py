#!/usr/bin/env python3
"""Contact sheets for reviewing a story's pictures: python3 tools/sheet.py art/bear-1"""
import sys, os
from PIL import Image, ImageDraw
d = sys.argv[1]
files = sorted(f for f in os.listdir(d) if f.startswith("p") and f.endswith(".png"))
W, H = 640, 480
for n in range(0, len(files), 6):
    sheet = Image.new("RGB", (W * 3, H * 2), "white")
    for i, f in enumerate(files[n:n + 6]):
        im = Image.open(os.path.join(d, f)).convert("RGB").resize((W, H))
        sheet.paste(im, ((i % 3) * W, (i // 3) * H))
        ImageDraw.Draw(sheet).text(((i % 3) * W + 8, (i // 3) * H + 6), f[:-4], fill="white", stroke_width=3, stroke_fill="black")
    out = os.path.join(d, f"_sheet{n // 6 + 1}.png"); sheet.save(out); print(out)
