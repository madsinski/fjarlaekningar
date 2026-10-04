# Short, medium and long versions — writer's brief

Every story in "Bedtime Stories for Tough Kids" exists in three lengths. The
version in `stories/en.json` is the SHORT one (10–11 pages) and stays exactly
as it is. You are writing the MEDIUM and LONG versions of one story.

## What the owner asked for
"Add more details and steps in between." Longer does not mean wordier pages.
It means more story: more attempts, more obstacles, more funny detail, more of
the world, more for the side characters to do.

## Voice (unchanged — read the short version until you can hear it)
For 5–7 year olds who think they are too tough for bedtime stories. A narrator
like a funny older cousin: dry asides, questions thrown at the listener, wild
exaggeration stated calmly, sounds that are fun to shout. Cool, never cute,
never preachy. Plain strong words (belly, not tummy). Concrete and physical;
short punchy sentences next to one longer rolling one. No stated moral.

## Structure (the proven picture-book arc — keep it in every length)
Hook → trigger → rising trouble in escalating beats → low point → the hero's
own turn (never a grown-up, never luck alone) → climax → warm, sleepy landing
with a callback to the beginning. Longer versions deepen the MIDDLE: more
escalating beats before the low point, each funnier or bigger than the last,
and a little more breathing room around the climax and the landing. Do not pad
the opening and do not add a second ending. Running jokes should pay off more
times in the longer versions (rule of three). Page turns matter: end several
pages on a small cliffhanger or a question.

Each story's closing line stays word for word as in the short version
("Because even the toughest … has to sleep sometime.").

## The three versions nest
- LONG: 20–22 pages. It contains every page moment of the short version, in the
  same order, with new pages inserted between them.
- MEDIUM: 15–16 pages. It is a subset of the long version's pages (same order)
  and contains every short page moment.
- SHORT: the existing pages, untouched.

Every page is one clear moment that can be drawn, 35–65 words. A page that
exists in several versions may have different text in each, so that every
version reads smoothly on its own (for example a short-version sentence that
summarises three attempts becomes one attempt in the long version, because the
other attempts now have their own pages). Keep the text of an existing page as
close to the short version as the new neighbours allow — the picture for that
page already exists and must still match.

## New pages need new pictures
For each new page write a "scene" note in the same style as the existing ones:
who is where, doing what, with what expression, plus one lively detail a child
would point at; one moment; no text in the picture. Reuse the story's existing
side characters and places (the crab, the squirrel, the troll kitchen …) and
only invent a new character or place when the new step truly needs it — say so
in the scene note. Keep everything safe and kind: fright that turns out fine,
no cruelty, joyful cartoon body humour, nothing a parent would wince at.

## Output
Write `stories/long/<story-key>.json`:

```json
{
  "key": "whale-1",
  "pages": [
    { "art": "p01", "short": true,  "medium": true,  "textMedium": "…", "textLong": "…" },
    { "art": "n01", "short": false, "medium": true,  "textMedium": "…", "textLong": "…", "scene": "…" },
    { "art": "n02", "short": false, "medium": false, "textLong": "…", "scene": "…" },
    { "art": "p02", "short": true,  "medium": true,  "textMedium": "…", "textLong": "…" }
  ]
}
```

- The list is the LONG version in reading order.
- `art` is the picture: `p01`, `p02` … for the existing pages (matching their
  number in the short version) and `n01`, `n02` … for new pages, numbered in
  reading order.
- `short` is true exactly for the existing pages. `medium` says whether the page
  is in the medium version; it is true for every short page.
- `textLong` on every page; `textMedium` on every page with `medium: true`.
  Do not include the short text (it stays in `stories/en.json`).
- `scene` only on new pages.
- Paragraph breaks inside a page are `\n\n`, as in the short version.

Before finishing: read the medium version alone, start to finish, then the long
version alone. Each must work as a complete story at its own pace, with the
jokes landing and the ending earned. Validate that the JSON loads, that the
`p…` pages appear in their original order, and report the page counts.
