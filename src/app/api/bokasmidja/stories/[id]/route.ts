// Ein saga með síðum, textum á öllum málum og myndum.
//   GET    /api/bokasmidja/stories/:id
//   PATCH  /api/bokasmidja/stories/:id   { lang, title, summary }  (ritillinn)
//   DELETE /api/bokasmidja/stories/:id   (foreldri, eða barnið sem bjó hana til)

import { supabaseAdmin } from "@/lib/supabase-admin";
import { UUID_RE, canEdit, cleanLine, cleanText, editableStory, fail, json, loadStory, readJson, removeAudio, requireViewer } from "@/lib/bokasmidja/server";
import { isLang, type I18nText } from "@/lib/bokasmidja/types";

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
  const title = cleanLine(body.title, 120);
  if (!isLang(body.lang) || !title) return fail("bad_request");

  await supabaseAdmin.from("bk_story_texts").upsert({ story_id: id, lang: body.lang, title, summary: cleanText(body.summary, 600) });
  // Bók utan um eina sögu ber nafn hennar.
  const { data: book } = await supabaseAdmin.from("bk_books").select("id, slug, title, planned_stories").eq("id", found.story.book_id).maybeSingle();
  if (book && !book.slug && book.planned_stories === 1) {
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
  // Bók sem varð til utan um þessa einu sögu fer með henni; safnbækur standa.
  const [{ data: book }, { count }] = await Promise.all([
    supabaseAdmin.from("bk_books").select("slug, planned_stories").eq("id", story.book_id).maybeSingle(),
    supabaseAdmin.from("bk_stories").select("id", { count: "exact", head: true }).eq("book_id", story.book_id),
  ]);
  const bookGone = !!book && !book.slug && book.planned_stories === 1 && (count ?? 0) === 0;
  if (bookGone) await supabaseAdmin.from("bk_books").delete().eq("id", story.book_id);
  return json({ ok: true, bookGone });
}
