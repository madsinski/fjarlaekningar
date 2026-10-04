// Loads the hand-made books into the Bókasmiðjan database.
//
//   node content/bokasmidja/tools/import.mjs            (from the repo root; reads .env.local)
//   node content/bokasmidja/tools/import.mjs --dry      (validate only, write nothing)
//
// Source: stories/en.json (books and stories), stories/{is,nb,hu}.json (the same
// stories by key), art/<story-key>/pNN.svg and art/<book-key>/cover.svg.
// Safe to run again: a book is matched by its slug; hand-made stories already
// loaded (idea.seed) are left alone unless --replace is given, and stories
// children added to the book are never touched.
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

  // Stories already loaded are left alone (their ids, audio and any edits made
  // in the app survive); pass --replace to load them again from these files.
  const old = await must(db.from("bk_stories").select("id, idea").eq("book_id", bookId));
  const replace = process.argv.includes("--replace");
  const seeded = old.filter((s) => s.idea?.seed);
  if (replace && seeded.length) await must(db.from("bk_stories").delete().in("id", seeded.map((s) => s.id)));
  const have = new Set(replace ? [] : seeded.map((s) => s.idea.seed));
  const todo = stories.filter(({ story }) => !have.has(story.key));
  for (const { story } of stories) if (have.has(story.key)) console.log(`  ${story.key}: already loaded, left as is`);
  const kept = replace ? old.length - seeded.length : old.length;

  for (const [n, { story, texts, pictures }] of todo.entries()) {
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
      story_id: row.id, position: i + 1, scene: p.scene, svg: pictures[i], auto_art: false, reviewed: true, art_key: `p${String(i + 1).padStart(2, "0")}`,
    }))).select("id, position"));
    const idAt = new Map(pages.map((p) => [p.position, p.id]));
    await must(db.from("bk_page_texts").insert(LANGS.flatMap((l) => texts[l].pages.map((p, i) => ({ page_id: idAt.get(i + 1), lang: l, text: pageText(p) })))));
    console.log(`  ${story.key}: ${pages.length} pages in ${LANGS.length} languages`);
  }
}
// ── Medium and long versions ────────────────────────────────────────────────
// stories/long/<key>.json lists the long version in reading order; each page
// names its picture (p01… existing, n01… new) and whether it is also in the
// medium version. Loaded once every new picture and every translation is there.
const readJson = (file) => (existsSync(file) ? JSON.parse(readFileSync(file, "utf8")) : null);
for (const book of en.books) {
  const row = await must(db.from("bk_books").select("id").eq("slug", book.key).maybeSingle());
  for (const story of book.stories) {
    const long = readJson(join(root, "stories", "long", `${story.key}.json`));
    if (!long) continue;
    const others = Object.fromEntries(Object.keys(tr).map((l) => [l, readJson(join(root, "stories", "long", l, `${story.key}.json`))]));
    const arts = long.pages.map((p) => p.art);
    const untranslated = Object.keys(tr).filter((l) => !others[l] || others[l].pages.map((p) => p.art).join() !== arts.join());
    const undrawn = long.pages.filter((p) => !p.short && !existsSync(join(root, "art", story.key, `${p.art}.svg`))).map((p) => p.art);
    if (untranslated.length || undrawn.length) {
      console.log(`  ${story.key} long: skipped — ${untranslated.length ? `no finished text in ${untranslated.join(", ")}` : `pictures missing: ${undrawn.join(" ")}`}`);
      continue;
    }
    const pictures = Object.fromEntries(long.pages.filter((p) => !p.short).map((p) => [p.art, picture(join(root, "art", story.key, `${p.art}.svg`), `${story.key.replace(/[^a-z0-9]/g, "")}${p.art}`)]));
    const medium = long.pages.filter((p) => p.medium).length;
    console.log(`  ${story.key} long: ${long.pages.length} pages (medium ${medium}), ${Object.keys(pictures).length} new pictures — valid`);
    if (dry || !row) continue;

    const stories = await must(db.from("bk_stories").select("id, idea").eq("book_id", row.id));
    const target = stories.find((s) => s.idea?.seed === story.key);
    if (!target) { console.log(`  ${story.key} long: the short version is not loaded yet`); continue; }
    let pages = await must(db.from("bk_pages").select("id, position, art_key").eq("story_id", target.id).order("position"));
    // First time: name the existing pages after their pictures (p01, p02 …).
    if (pages.every((p) => !p.art_key)) {
      for (const p of pages) await must(db.from("bk_pages").update({ art_key: `p${String(p.position).padStart(2, "0")}` }).eq("id", p.id));
      pages = pages.map((p) => ({ ...p, art_key: `p${String(p.position).padStart(2, "0")}` }));
    }
    const idOf = new Map(pages.filter((p) => p.art_key).map((p) => [p.art_key, p.id]));
    for (const [i, p] of long.pages.entries()) {
      const fields = { position: i + 1, level: p.short ? 1 : p.medium ? 2 : 3 };
      if (idOf.has(p.art)) {
        await must(db.from("bk_pages").update(p.short ? fields : { ...fields, svg: pictures[p.art], scene: p.scene || "" }).eq("id", idOf.get(p.art)));
      } else {
        if (p.short) throw new Error(`${story.key}: existing page ${p.art} not found in the database`);
        const made = await must(db.from("bk_pages").insert({ story_id: target.id, art_key: p.art, svg: pictures[p.art], scene: p.scene || "", auto_art: false, reviewed: true, ...fields }).select("id").single());
        idOf.set(p.art, made.id);
      }
    }
    const texts = [];
    for (const [l, src] of [["en", long], ...Object.entries(others)]) {
      for (const p of src.pages) {
        if (p.textLong) texts.push({ page_id: idOf.get(p.art), lang: l, length: 3, text: p.textLong.trim() });
        if (p.textMedium) texts.push({ page_id: idOf.get(p.art), lang: l, length: 2, text: p.textMedium.trim() });
      }
    }
    await must(db.from("bk_page_texts").upsert(texts));
    await must(db.from("bk_stories").update({ lengths: 3, updated_at: new Date().toISOString() }).eq("id", target.id));
    console.log(`    loaded: ${texts.length} texts`);
  }
}

console.log(dry ? "dry run: nothing written" : "done");
