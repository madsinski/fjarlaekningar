# New pages for the medium and long versions — illustrator's brief

Each story now has a medium and a long version (see ../LENGTHS.md) with new
pages inserted between the existing ones. You are drawing the pictures for the
new pages of ONE story. They must look like they were drawn in the same sitting
as that story's existing pictures.

## Read first
1. `art/STYLE.md` — the illustration brief, technical rules, animation tags and
   how to check your work. It applies in full.
2. The story's existing pictures, all of them: `art/<story>/p01.png … pNN.png`,
   and the SVG source of at least three (`p01.svg` and two that show the side
   characters and places your new pages need). The existing SVGs are your
   palette, your character designs and your world. Reuse their shapes, colours,
   gradients and backgrounds directly — copy the hero's and the side
   characters' markup and change only pose and expression. Do not redesign
   anything that already exists.
3. `stories/long/<story>.json` — the long version in reading order. Pages whose
   `art` starts with `n` are yours; each has `textLong` (and often
   `textMedium`) and a `scene` note. Read the neighbouring pages too, so each
   picture continues the one before it (same place, same weather, same props,
   same time of day).

## Your job
- Draw every new page as `art/<story>/n01.svg`, `n02.svg` … exactly as numbered
  in the json. Do not touch the existing `p…` files.
- One clear moment per picture, the hero large, expression first. When the
  scene note names a recurring side character (crab, snail, squirrel, bird,
  trolls, horse, goat, worm …), it must be the same design as in the existing
  pictures. A character or place the note flags as new is yours to design in
  the same style.
- Run `python3 tools/check.py art/<story>/nNN.svg` after each file and look at
  the PNG it writes with the Read tool. Compare it side by side with the
  existing page before and after it in the story. Fix and re-check until it
  belongs. Expect to revise most pages at least once.
- When all are done, run `python3 tools/sheet.py art/<story>` and look at the
  contact sheets: the new pages should be indistinguishable in finish from the
  old ones.

## Constraints
Only the check tool for rendering — no browsers or dev servers (little memory
on this machine). Write only `n…` files inside your story's folder (a helper
script there is fine while you work; delete it when done). Do not edit
STYLE.md, the sheets, the tools or the stories.

## Report
The list of files, the final check.py output for all of them, and an honest
note of any page you are not fully satisfied with and why.
