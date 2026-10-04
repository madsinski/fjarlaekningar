# Bókasmiðjan — the family book workshop

A private module for making children's picture books. It is a personal project
that lives in this repository; it is not part of the Fjarlækningar service, is
not linked from the site, is not in the sitemap and is marked `noindex`.

- **URL:** `/bokasmidja`
- **Languages:** English, Icelandic, Norwegian, Hungarian — both the interface
  and every story.
- **First book:** "Bedtime Stories for Tough Kids", seeded with seven empty
  story slots that are filled in the workshop.

## What it does

| Feature | How |
|---|---|
| Writer | The writer agent turns a child's idea into a 9–11 page story in the child's language, then re-tells it in the other three. |
| Illustrator | The illustrator agent draws every page as layered SVG, with the first page passed along as a reference so characters stay the same. |
| Own drawings | A child photographs or uploads a drawing for a page; the illustrator redraws it as a finished picture in the book's style, keeping what the child drew. The original is kept and shown beside it. |
| Editor | "Change the book": every text in every language, title and summary, add and delete pages, and drag-and-drop to move pictures, texts and whole pages. |
| Animation | The illustrator tags parts of the picture (`data-anim`, `data-tap`). With "Magic" on, tagged parts move gently and react when tapped. |
| Reading | A reader for tablets, phones and computers: big buttons, swipe, arrow keys, full screen. |
| Audio book | "Read to me" reads each page aloud and turns the page by itself. OpenAI TTS, cached as mp3; the device's own voice is the fallback. |
| PDF | Three formats, built in the browser: for reading (small), for a home printer (A4), for a print shop (8 × 10 in, 300 dpi, 0.125 in bleed). |
| Ideas | A child can type an idea freely, or answer a five-step questionnaire with picture cards (and an "own idea" box on every step). |
| Accounts | Each child has a picture, a colour, a language and a four-digit code. |

## Setup

1. **Database** — `supabase/bokasmidja-schema.sql` (applied 2026-10-04). Creates
   the `bk_*` tables, the private `bokasmidja` storage bucket and the first book.
2. **Environment variables** (Vercel → Production, and `.env.local`):

   | Variable | Needed for |
   |---|---|
   | `BOKASMIDJA_PARENT_CODE` | The grown-up code, at least 6 characters. The whole module is locked while it is unset. |
   | `OPENAI_API_KEY` | Writing, illustrating and the read-aloud voice (already set for other modules; model `gpt-5.4`). |
   | `ANTHROPIC_API_KEY` | Optional. When set, writing and illustrating switch to Claude (`claude-opus-5-5`); the voice stays on OpenAI. |

3. **First use** — open `/bokasmidja`, type the grown-up code, add the children
   (name, picture, four-digit code, language, age) and go to the bookshelf.

## Who can get in

There is no email or password. Access has two steps:

1. **A grown-up opens the device** with the grown-up code. This is remembered
   for a year (`bk_device` cookie). Until then the page shows neither the
   children's names nor the code pad, so a four-digit code can never be guessed
   from the internet.
2. **A child taps their picture and types their code.** Five wrong codes lock
   that child for 15 minutes. A child's session lasts 12 hours.

The grown-ups area (`/bokasmidja/parent`) needs the grown-up code again and
lasts two hours. From there: add, change and remove children, reset a code,
delete books, and see whether the writer and the voice are connected.

Children see every book in the family. A child can change or delete only the
stories they made; a grown-up can change anything.

## How a book is made

`/bokasmidja/new` → the idea is saved (`POST /api/bokasmidja/stories`) → the
story page then runs three steps and shows the child where it is:

1. **Write** — `POST /stories/:id/write` (about a minute).
2. **Paint** — `POST /pages/:id/illustrate`, one page at a time (one to two
   minutes each). The child can start reading while pictures appear.
3. **Other languages** — `POST /stories/:id/translate`, once per language.

Every step is safe to repeat. If the page is closed, opening the story again
continues where it stopped. Two devices opening the same story do not paint the
same page twice.

Limits per day: a child can start 5 stories and 10 books; a grown-up 30 and 40.

In the reader, the "…" menu has: make a PDF, full screen, change the book,
fix the text of a page, paint a picture again, and delete the story.

## Books, stories and covers

- **A book comes first.** "Make a new book" asks for the book's name. It can be
  named straight away, or "Choose the name later": the book then borrows the
  name of its first story (in every language) until someone names it.
- **Renaming** — "Change the name" on the book page, in the language you are
  using. Open to the child who made the book and to grown-ups.
- **Adding stories** — every book has an "Add a story" card; a book holds up to
  30 stories. Deleting a story never deletes the book.
- **Moving a story** — "Move to another book" under a story card. The story
  goes to the end of the other book.
- **Cover** — the "Cover" button offers three ways: the painter makes one from
  the stories in the book; a child's drawing is redrawn as a cover; or a
  finished picture is uploaded and shown exactly as it is. The cover appears
  on the shelf and as the first page of the book's PDF.

## Icelandic

Every Icelandic story text is proofread before it counts as finished
(`src/lib/bokasmidja/icelandic.ts`), whether it was written in Icelandic or
re-told into it:

1. **GreynirCorrect** (Miðeind, the engine behind yfirlestur.is) parses the
   text and marks grammar and spelling errors. It understands Icelandic case
   and agreement, which general language models do not do reliably.
2. **An editor pass** corrects what is wrong and checks doubtful inflections
   and phrasing with web search. The search is limited to children's material
   and language authorities — BÍN and málið.is (Árnastofnun), folk tales and
   fairy tales (Netútgáfan, Wikisource), KrakkaRÚV, school reading material and
   children's publishers. It cannot reach medical, legal or technical writing.
3. **A second, narrow pass** fixes whatever GreynirCorrect still reports,
   changing nothing else.

The story itself is not rewritten: same pages, names, sound words and jokes.
In the editor, "Proofread the Icelandic" runs it again after manual changes.
It adds about one to two minutes per story.

## The hand-made stories

"Bedtime Stories for Tough Kids" holds six stories written and illustrated by
hand rather than by the app: two with the White Whale, two with Teddy the
bear, two with the rabbits Nana and Nuni. Their sources live in
`content/bokasmidja/`:

| Path | What |
|---|---|
| `stories/en.json` | The stories in English, with a scene note per page |
| `stories/{is,nb,hu}.json` | The same stories by key in the other languages |
| `art/<story>/pNN.svg` | One picture per page; `art/tough-kids/cover.svg` is the cover |
| `art/*-sheet.svg`, `art/STYLE.md` | Character designs and the illustration brief |
| `tools/check.py` | Validates a picture the way the app will and renders it |
| `tools/import.mjs` | Loads everything into the database |

`node content/bokasmidja/tools/import.mjs` adds any story not yet loaded and
leaves the rest alone, including stories children added to the book. `--dry`
only validates; `--replace` reloads the hand-made stories from the files, which
discards edits made to them in the app.

The voice (cool and funny for 5–7 year olds, a narrator who talks straight to
the child) and the story arc (hook, trigger, three escalating beats, low point,
the hero's own turn, climax, warm sleepy landing) are the same ones the app's
writer is instructed to follow. Every story ends on the book's refrain: even
the toughest hero has to sleep sometime.

## Short, medium and long

A story can exist in three nested versions: the long one contains every page
of the medium one, which contains every page of the short one. Each page knows
the shortest version it belongs to (`bk_pages.level`), and a page may have
different text per version (`bk_page_texts.length`; a version without its own
text for a page uses the next shorter one). Read-aloud audio is cached per
version.

- **Reading:** the cover offers Short / Medium / Long with page counts. The
  choice is remembered on the device. Text, page turns, audio and PDF follow it.
- **Making a story:** the idea screen asks how long (about 10, 16 or 22 pages).
  A story made in the app has one length; the writer deepens the middle of the
  story for longer ones rather than making pages wordier.
- **Editing:** the editor shows one version at a time. Text typed there becomes
  that version's text. Reordering, adding and deleting pages affect the whole
  story and are only offered in the longest version.
- **The six hand-made stories** have all three versions: 10–11, 15–16 and
  20–22 pages. Their longer texts are in `content/bokasmidja/stories/long/`
  (`<key>.json` in English, `<lang>/<key>.json` for the others) and the extra
  pictures are `art/<story>/nNN.svg`. Writer's and illustrator's briefs:
  `LENGTHS.md`, `art/NEWPAGES.md`, `stories/long/TRANSLATE.md`.

## How the app makes a story

The app's own story maker follows the process that produced the hand-made
stories:

1. **Write** in the child's language, in the tough-kids voice and the classic
   picture-book arc, at the chosen length.
2. **Proofread** Icelandic text (see Icelandic above).
3. **Character sheet** — the illustrator designs the recurring characters once
   (`POST /stories/:id/sheet`, kept in `bk_stories.art.sheetSvg`). Every page
   is drawn from this sheet, which is what keeps the hero the same.
4. **Paint** each page from the sheet and the illustration brief.
5. **Look and correct** — each picture is rendered to an image, shown back to
   the illustrator and redrawn if something is off (`POST /pages/:id/illustrate`
   with `{ review: true }`, once per picture; `bk_pages.reviewed`).
6. **Re-tell** in the other languages.

The child can read as soon as step 1 is done; pictures appear and improve
while they read. Rough times on OpenAI: writing 2 min, character sheet 1.5 min,
each picture 2.5 min plus 1 min of review.

**Which model:** with only `OPENAI_API_KEY` set, all of this runs on OpenAI.
The process helps, but the drawing and writing quality is noticeably below the
hand-made stories. Setting `ANTHROPIC_API_KEY` switches the writer, translator
and illustrator to Claude with no other change; the reading voice and the
Icelandic proofreading editor stay on OpenAI.

## Changing a book

`/bokasmidja/story/:id/edit`, open to the child who made the story and to
grown-ups.

- **Text** — pick the language at the top, then type in any page. Text saves
  when you leave the box. Title and summary are edited the same way.
- **Own drawing** — "Use my drawing" on a page opens the camera or the photo
  library. The picture is shrunk in the browser, sent to the illustrator and
  comes back as the page's illustration in one to two minutes.
- **Where a picture goes** — hold the ✋ on a picture and drag it onto another
  page: the two pictures swap. Upload on any page and move it afterwards.
- **Moving text and pages** — the ✋ on a text swaps texts between pages (in all
  languages); the ✋ beside "Page 3" moves the whole page. Arrow buttons do the
  same for pages without dragging.
- **Picture and text order** — the ⇄ button (or dropping a picture on its own
  text) puts the text before the picture. The reader and the PDF follow it.
- **New pages** — "Add a page" adds an empty page at the end. Text written
  there in one language is re-told in the others the next time the story opens.

A page that was added, or whose picture was moved away, is never painted
automatically; use "Paint a picture" or a drawing. A page without a picture
shows as a text-only page.

## Things to know

- **Icelandic and Hungarian text** is written by Claude and is good but not
  flawless. Read a story through before printing it and use "Fix the text".
  The read-aloud voice follows corrected text automatically.
- **The Icelandic voice** has a noticeable accent; it is a general-purpose
  voice, not a native one.
- **Pictures are SVG**, not photos or paintings: bold, flat-colour picture-book
  shapes. That is what makes them animate, stay sharp in print and cost nothing
  to store.
- **Print-shop PDFs** are the inside pages. A printer will also want a separate
  cover file to their own template (spine width depends on the page count).
- **Model output is treated as untrusted.** Every SVG is rebuilt from an
  allowlist (`src/lib/bokasmidja/svg.ts`) before it is stored: no scripts, no
  event handlers, no remote resources.

## Code map

| Path | What |
|---|---|
| `src/lib/bokasmidja/auth.ts` | Device trust, sessions, PIN rules |
| `src/lib/bokasmidja/agents.ts` | The writer, translator and illustrator prompts and calls (OpenAI or Claude) |
| `src/lib/bokasmidja/icelandic.ts` | Icelandic proofreading: GreynirCorrect + editor with source-limited web search |
| `src/lib/bokasmidja/svg.ts` | SVG sanitizer |
| `src/lib/bokasmidja/wizard.ts` | The questionnaire, in four languages |
| `src/lib/bokasmidja/i18n.ts` | Interface strings, in four languages |
| `src/lib/bokasmidja/pdf.ts` | PDF builder (browser) |
| `src/lib/bokasmidja/server.ts` | Guards and data loading |
| `src/app/bokasmidja/` | Pages and components (`Editor.tsx` is the editor); animations in `bokasmidja.css` |
| `src/app/api/bokasmidja/` | API routes |
