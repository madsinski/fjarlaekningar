// Ritstjórn einnar síðu (foreldri, eða barnið sem bjó söguna til).
//   PATCH  /api/bokasmidja/pages/:id  { lang, text }   texti á einu máli (tómur texti eyðir honum)
//   PATCH  /api/bokasmidja/pages/:id  { layout }       "art-first" | "text-first"
//   DELETE /api/bokasmidja/pages/:id                   síðan hverfur og hinar endurnúmerast
// Upplesturinn endurnýjast sjálfkrafa því hann er lyklaður á textann.

import { supabaseAdmin } from "@/lib/supabase-admin";
import { AUDIO_BUCKET, cleanText, editablePage, fail, json, readJson, refreshStoryStatus, renumberPages, requireViewer } from "@/lib/bokasmidja/server";
import { isLang } from "@/lib/bokasmidja/types";

export const runtime = "nodejs";

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireViewer(req);
  if ("res" in auth) return auth.res;
  const { id } = await ctx.params;
  const found = await editablePage(auth.viewer, id);
  if ("res" in found) return found.res;
  const body = await readJson(req);

  if (body.layout !== undefined) {
    if (body.layout !== "art-first" && body.layout !== "text-first") return fail("bad_request");
    await supabaseAdmin.from("bk_pages").update({ layout: body.layout }).eq("id", id);
    return json({ ok: true });
  }
  if (!isLang(body.lang) || typeof body.text !== "string") return fail("bad_request");
  const text = cleanText(body.text, 1500);
  if (text) await supabaseAdmin.from("bk_page_texts").upsert({ page_id: id, lang: body.lang, text });
  else await supabaseAdmin.from("bk_page_texts").delete().eq("page_id", id).eq("lang", body.lang);
  return json({ ok: true });
}

export async function DELETE(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireViewer(req);
  if ("res" in auth) return auth.res;
  const { id } = await ctx.params;
  const found = await editablePage(auth.viewer, id);
  if ("res" in found) return found.res;
  const { count } = await supabaseAdmin.from("bk_pages").select("id", { count: "exact", head: true }).eq("story_id", found.story.id);
  if ((count ?? 0) <= 1) return fail("last_page");

  const { data: audio } = await supabaseAdmin.from("bk_audio").select("storage_path").eq("page_id", id);
  const paths = [...(audio || []).map((a) => a.storage_path), ...(found.page.drawing_path ? [found.page.drawing_path] : [])];
  if (paths.length) await supabaseAdmin.storage.from(AUDIO_BUCKET).remove(paths);
  await supabaseAdmin.from("bk_pages").delete().eq("id", id);
  await renumberPages(found.story.id);
  await refreshStoryStatus(found.story.id);
  return json({ ok: true });
}
