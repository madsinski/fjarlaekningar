// Ein saga með síðum, textum á öllum málum og myndum.
//   GET    /api/bokasmidja/stories/:id
//   PATCH  /api/bokasmidja/stories/:id   { lang, title, summary }  (ritillinn)
//   PATCH  /api/bokasmidja/stories/:id   { bookId }                sagan flutt í aðra bók
//   DELETE /api/bokasmidja/stories/:id   (foreldri, eða barnið sem bjó hana til)

import { supabaseAdmin } from "@/lib/supabase-admin";
import { UUID_RE, canEdit, cleanLine, cleanText, editableStory, fail, json, loadStory, readJson, removeAudio, requireViewer } from "@/lib/bokasmidja/server";
import { MAX_STORIES, isLang, type I18nText } from "@/lib/bokasmidja/types";

export const runtime = "nodejs";

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireViewer(req);
  if ("res" in auth) return auth.res;
  const { id } = await ctx.params;
  if (!UUID_RE.test(id)) return fail("bad_request");
  const story = await loadStory(id);
  if (!story) return fail("not_found", 404);
  return json({ ok: true, story });
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireViewer(req);
  if ("res" in auth) return auth.res;
  const { id } = await ctx.params;
  const found = await editableStory(auth.viewer, id);
  if ("res" in found) return found.res;
  const body = await readJson(req);

  // Sagan flutt í aðra bók: fer aftast þar, og gamla bókin endurnúmerast.
  if (body.bookId !== undefined) {
    const to = typeof body.bookId === "string" && UUID_RE.test(body.bookId) ? body.bookId : "";
    const from = found.story.book_id;
    if (!to || to === from) return fail("bad_request");
    const [{ data: target }, { data: there }] = await Promise.all([
      supabaseAdmin.from("bk_books").select("id").eq("id", to).maybeSingle(),
      supabaseAdmin.from("bk_stories").select("position").eq("book_id", to),
    ]);
    if (!target) return fail("not_found", 404);
    if ((there?.length ?? 0) >= MAX_STORIES) return fail("book_full");
    const position = Math.max(0, ...(there || []).map((s) => s.position)) + 1;
    await supabaseAdmin.from("bk_stories").update({ book_id: to, position, updated_at: new Date().toISOString() }).eq("id", id);
    const { data: left } = await supabaseAdmin.from("bk_stories").select("id").eq("book_id", from).order("position");
    await Promise.all((left || []).map((s, i) => supabaseAdmin.from("bk_stories").update({ position: i + 1 }).eq("id", s.id)));
    return json({ ok: true });
  }

  const title = cleanLine(body.title, 120);
  if (!isLang(body.lang) || !title) return fail("bad_request");

  await supabaseAdmin.from("bk_story_texts").upsert({ story_id: id, lang: body.lang, title, summary: cleanText(body.summary, 600) });
  // Nafnlaus bók ber nafn fyrstu sögunnar.
  const { data: book } = await supabaseAdmin.from("bk_books").select("id, title, title_auto").eq("id", found.story.book_id).maybeSingle();
  if (book?.title_auto && found.story.position === 1) {
    await supabaseAdmin.from("bk_books").update({ title: { ...(book.title as I18nText), [body.lang]: title } }).eq("id", book.id);
  }
  return json({ ok: true });
}

export async function DELETE(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireViewer(req);
  if ("res" in auth) return auth.res;
  const { id } = await ctx.params;
  if (!UUID_RE.test(id)) return fail("bad_request");
  const { data: story } = await supabaseAdmin.from("bk_stories").select("id, book_id, created_by").eq("id", id).maybeSingle();
  if (!story) return fail("not_found", 404);
  if (!canEdit(auth.viewer, story.created_by)) return fail("not_yours", 403);

  await removeAudio([id]);
  await supabaseAdmin.from("bk_stories").delete().eq("id", id);
  // Bókin stendur eftir, líka tóm: fleiri sögur geta bæst við.
  return json({ ok: true });
}
