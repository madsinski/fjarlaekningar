// Loads the hand-made books into the Bókasmiðjan database.
//
//   node content/bokasmidja/tools/import.mjs            (from the repo root; reads .env.local)
//   node content/bokasmidja/tools/import.mjs --dry      (validate only, write nothing)
//
// Source: stories/en.json (books and stories), stories/{is,nb,hu}.json (the same
// stories by key), art/<story-key>/pNN.svg and art/<book-key>/cover.svg.
// Safe to run again: a book is matched by its slug and its hand-made stories
// (idea.seed) are replaced; stories children added to the book are left alone.
// Every picture goes through the app's own SVG sanitizer first.

import { createClient } from "@supabase/supabase-js";
import { createRequire } from "node:module";
import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const { sanitizeSvg } = createRequire(import.meta.url)("./lib/svg.js");
const dry = process.argv.includes("--dry");
const LANGS = ["en", "is", "nb", "hu"];

const env = Object.fromEntries(
  readFileSync(join(root, "../../.env.local"), "utf8").split("\n").filter((l) => /^[A-Z_]+=/.test(l)).map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1).trim()]),
);
// Realtime is not used here; a stub transport lets the client start on Node 20, which has no built-in WebSocket.
class NoSocket { constructor() { throw new Error("realtime is not used by this script"); } }
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false }, realtime: { transport: NoSocket } });

const load = (lang) => JSON.parse(readFileSync(join(root, "stories", `${lang}.json`), "utf8"));
const en = load("en");
const tr = Object.fromEntries(LANGS.filter((l) => l !== "en").map((l) => [l, load(l)]));
const pageText = (v) => (typeof v === "string" ? v : v.text).trim();

function picture(file, prefix) {
  if (!existsSync(file)) throw new Error(`missing picture: ${file}`);
  const svg = sanitizeSvg(readFileSync(file, "utf8"), prefix);
  if (!svg) throw new Error(`sanitizer rejected: ${file}`);
  return svg;
}
const must = async (p) => { const { data, error } = await p; if (error) throw new Error(error.message); return data; };

// A translation file may group stories under any books; stories are matched by key.
const storyIn = (lang, key) => tr[lang].books.flatMap((b) => b.stories).find((s) => s.key === key);

for (const book of en.books) {
  const cover = picture(join(root, "art", book.key, "cover.svg"), `cv${book.key.slice(0, 4)}`);

  // Validate every story before touching the database. A story still in the
  // making (pictures or a translation missing) is skipped, not an error.
  const stories = [];
  for (const story of book.stories) {
    const texts = { en: story };
    const missing = Object.keys(tr).filter((l) => storyIn(l, story.key)?.pages.length !== story.pages.length);
    const art = story.pages.map((_, i) => join(root, "art", story.key, `p${String(i + 1).padStart(2, "0")}.svg`));
    if (missing.length || !art.every(existsSync)) {
      console.log(`  skipping ${story.key}: ${missing.length ? `no finished text in ${missing.join(", ")}` : "pictures not finished"}`);
      continue;
    }
    for (const l of Object.keys(tr)) texts[l] = storyIn(l, story.key);
    const pictures = art.map((file, i) => picture(file, `${story.key.replace(/[^a-z0-9]/g, "")}p${i + 1}`));
    stories.push({ story, texts, pictures });
  }
  console.log(`${book.key}: ${stories.length} stories, ${stories.reduce((n, s) => n + s.pictures.length, 0)} pictures, cover ${Math.round(cover.length / 1024)} KB — valid`);
  if (dry) continue;

  // The book's own name and subtitle are kept as they are in the database when it already exists.
  const fields = { concept: book.concept, cover_svg: cover, cover_image_path: null };
  const existing = await must(db.from("bk_books").select("id, planned_stories").eq("slug", book.key).maybeSingle());
  const bookId = existing?.id ?? (await must(db.from("bk_books").insert({
    slug: book.key, title: { en: book.title }, subtitle: { en: book.subtitle }, color: book.color, emoji: book.emoji,
    planned_stories: 7, title_auto: false, ...fields,
  }).select("id").single())).id;
  if (existing) await must(db.from("bk_books").update(fields).eq("id", bookId));

  const old = await must(db.from("bk_stories").select("id, idea").eq("book_id", bookId));
  const seeded = old.filter((s) => s.idea?.seed);
  if (seeded.length) await must(db.from("bk_stories").delete().in("id", seeded.map((s) => s.id)));
  const kept = old.length - seeded.length;

  for (const [n, { story, texts, pictures }] of stories.entries()) {
    const row = await must(db.from("bk_stories").insert({
      book_id: bookId, position: kept + n + 1, status: "ready", source_lang: "en",
      idea: { kind: "prompt", text: story.summary, seed: story.key },
      art: { characters: [], setting: "", palette: "" },
    }).select("id").single());
    await must(db.from("bk_story_texts").insert(LANGS.map((l) => ({
      story_id: row.id, lang: l, title: texts[l].title, summary: texts[l].summary,
      // The Icelandic was proofread by hand with GreynirCorrect; the app need not redo it.
      polished_at: l === "is" ? new Date().toISOString() : null,
    }))));
    const pages = await must(db.from("bk_pages").insert(story.pages.map((p, i) => ({
      story_id: row.id, position: i + 1, scene: p.scene, svg: pictures[i], auto_art: false,
    }))).select("id, position"));
    const idAt = new Map(pages.map((p) => [p.position, p.id]));
    await must(db.from("bk_page_texts").insert(LANGS.flatMap((l) => texts[l].pages.map((p, i) => ({ page_id: idAt.get(i + 1), lang: l, text: pageText(p) })))));
    console.log(`  ${story.key}: ${pages.length} pages in ${LANGS.length} languages`);
  }
}
console.log(dry ? "dry run: nothing written" : "done");
