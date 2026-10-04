// Bók endurnefnd eða eytt — foreldri, eða barnið sem bjó bókina til.
//   PATCH  /api/bokasmidja/books/:id  { lang, title }   nafn á einu máli; bókin hættir þá að fylgja nafni fyrstu sögunnar
//   DELETE /api/bokasmidja/books/:id                    með öllum sögum hennar

import { supabaseAdmin } from "@/lib/supabase-admin";
import { AUDIO_BUCKET, UUID_RE, canEdit, cleanLine, fail, json, readJson, removeAudio, requireViewer } from "@/lib/bokasmidja/server";
import { isLang, type I18nText, type Viewer } from "@/lib/bokasmidja/types";

export const runtime = "nodejs";

async function editableBook(viewer: Viewer, id: string) {
  if (!UUID_RE.test(id)) return { res: fail("bad_request") } as const;
  const { data: book } = await supabaseAdmin.from("bk_books").select("id, title, created_by").eq("id", id).maybeSingle();
  if (!book) return { res: fail("not_found", 404) } as const;
  if (!canEdit(viewer, book.created_by)) return { res: fail("not_yours", 403) } as const;
  return { book } as const;
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireViewer(req);
  if ("res" in auth) return auth.res;
  const { id } = await ctx.params;
  const found = await editableBook(auth.viewer, id);
  if ("res" in found) return found.res;
  const body = await readJson(req);
  const title = cleanLine(body.title, 80);
  if (!isLang(body.lang) || !title) return fail("name_missing");
  const next = { ...(found.book.title as I18nText), [body.lang]: title };
  await supabaseAdmin.from("bk_books").update({ title: next, title_auto: false }).eq("id", id);
  return json({ ok: true, title: next });
}

export async function DELETE(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireViewer(req);
  if ("res" in auth) return auth.res;
  const { id } = await ctx.params;
  const found = await editableBook(auth.viewer, id);
  if ("res" in found) return found.res;
  const { data: cover } = await supabaseAdmin.from("bk_books").select("cover_image_path").eq("id", id).maybeSingle();
  if (cover?.cover_image_path) await supabaseAdmin.storage.from(AUDIO_BUCKET).remove([cover.cover_image_path]);
  const { data: stories } = await supabaseAdmin.from("bk_stories").select("id").eq("book_id", id);
  await removeAudio((stories || []).map((s) => s.id));
  await supabaseAdmin.from("bk_books").delete().eq("id", id);
  return json({ ok: true });
}
