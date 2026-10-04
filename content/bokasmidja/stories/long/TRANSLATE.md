# Medium and long versions — translator's brief

The six stories now exist in three lengths (see ../../LENGTHS.md). The short
versions are already translated in `stories/<lang>.json` and are accepted:
do not change them. You are adding the MEDIUM and LONG texts in your language.

## Source
`stories/long/<key>.json` for the six keys whale-1, whale-2, bear-1, bear-2,
rabbit-1, rabbit-2. Each lists the long version's pages in reading order with
`art` (picture id), `textLong`, and `textMedium` on pages that are also in the
medium version. Ignore `scene`.

## What to write
`stories/long/<lang>/<key>.json` for each story, shaped:

```json
{ "key": "whale-1", "pages": [ { "art": "p01", "textMedium": "…", "textLong": "…" }, { "art": "n02", "textLong": "…" } ] }
```

Same pages, same order, same `art` ids as the source; `textMedium` exactly on
the pages that have it in the source.

## How
- Read your own accepted short version of each story first
  (`stories/<lang>.json`). Everything you established there carries over
  unchanged: character names and how they inflect, the recurring phrases and
  refrains, the sound effects, the closing line, the word for "Genius", the
  narrator's voice. Where a page's English text is unchanged from the short
  version, reuse your existing translation of it word for word; where it is
  reworded, adapt your existing translation rather than starting over.
- New pages: re-tell, do not translate word for word. Same voice as before —
  cool, funny, a little cheeky, for 5–7 year olds, a narrator who talks
  straight to the child. Running jokes must use the same wording every time
  they return (check across pages and across the medium and long versions).
- Keep paragraph breaks (`\n\n`) and each page's rough length.
- Verify doubtful words, forms and idioms the way you did before, against
  children's material and language authorities — never medical, legal,
  technical or news sources.
- Validate: every file loads as JSON and has the same number of pages and the
  same `art` ids as its source, with `textMedium` on the same pages.

## Report
Page counts per story, any recurring phrase you had to adjust, what you
verified and where, and anything you are unsure about.
