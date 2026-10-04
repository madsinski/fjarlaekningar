// Ný saga úr hugmynd barns. Sagan er aðeins skráð hér; höfundurinn (Claude)
// skrifar hana í /stories/:id/write, svo viðmótið geti sýnt framvinduna.
//   POST /api/bokasmidja/stories  { bookId?, lang, idea }
//     idea: { kind: "prompt", text } | { kind: "wizard", answers, heroName, extra }
// Án bookId verður til ný bók sem fær nafn sögunnar þegar hún er skrifuð.

import { supabaseAdmin } from "@/lib/supabase-admin";
import { throttle } from "@/lib/bokasmidja/auth";
import { UUID_RE, cleanLine, cleanText, fail, json, readJson, requireViewer, viewerId } from "@/lib/bokasmidja/server";
import { COLORS, isLang, type Idea } from "@/lib/bokasmidja/types";
import { IDEA_MAX, cleanAnswers } from "@/lib/bokasmidja/wizard";

export const runtime = "nodejs";

const BOOK_EMOJI = ["📕", "📗", "📘", "📙", "📔", "📒"];

export async function POST(req: Request) {
  const auth = await requireViewer(req);
  if ("res" in auth) return auth.res;
  const { viewer } = auth;
  const who = viewerId(viewer) ?? "parent";
  // Hver saga kostar um það bil tíu myndir; nokkrar á dag er nóg.
  if (!(await throttle(`story:${who}`, viewer.role === "parent" ? 30 : 5, 86400))) return fail("daily_limit", 429);

  const body = await readJson(req);
  if (!isLang(body.lang)) return fail("bad_request");
  const raw = (body.idea && typeof body.idea === "object" ? body.idea : {}) as Record<string, unknown>;
  let idea: Idea;
  if (raw.kind === "prompt") {
    const text = cleanText(raw.text, IDEA_MAX);
    if (text.length < 3) return fail("idea_missing");
    idea = { kind: "prompt", text };
  } else if (raw.kind === "wizard") {
    const answers = cleanAnswers(raw.answers);
    if (Object.keys(answers).length < 2) return fail("idea_missing");
    idea = { kind: "wizard", answers, heroName: cleanLine(raw.heroName, 40), extra: cleanText(raw.extra, 400) };
  } else return fail("bad_request");

  let bookId = typeof body.bookId === "string" && UUID_RE.test(body.bookId) ? body.bookId : null;
  let position = 1;
  if (bookId) {
    const [{ data: book }, { data: last }] = await Promise.all([
      supabaseAdmin.from("bk_books").select("id, planned_stories").eq("id", bookId).maybeSingle(),
      supabaseAdmin.from("bk_stories").select("position").eq("book_id", bookId).order("position", { ascending: false }).limit(1),
    ]);
    if (!book) return fail("not_found", 404);
    position = (last?.[0]?.position ?? 0) + 1;
    if (position > book.planned_stories) return fail("book_full");
  } else {
    const { count } = await supabaseAdmin.from("bk_books").select("id", { count: "exact", head: true });
    const n = count ?? 0;
    const { data: book, error } = await supabaseAdmin.from("bk_books").insert({
      color: COLORS[n % COLORS.length], emoji: BOOK_EMOJI[n % BOOK_EMOJI.length], planned_stories: 1, created_by: viewerId(viewer),
    }).select("id").single();
    if (error || !book) return fail("failed", 500);
    bookId = book.id;
  }

  const { data: story, error } = await supabaseAdmin.from("bk_stories").insert({
    book_id: bookId, position, status: "idea", source_lang: body.lang, idea, created_by: viewerId(viewer),
  }).select("id").single();
  if (error || !story) return fail("failed", 500);
  return json({ ok: true, storyId: story.id });
}
