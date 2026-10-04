// Leiðrétta texta síðu á einu máli (foreldri, eða barnið sem bjó söguna til).
// Upplesturinn endurnýjast sjálfkrafa því hann er lyklaður á textann.
//   PATCH /api/bokasmidja/pages/:id  { lang, text }

import { supabaseAdmin } from "@/lib/supabase-admin";
import { UUID_RE, canEdit, cleanText, fail, json, readJson, requireViewer } from "@/lib/bokasmidja/server";
import { isLang } from "@/lib/bokasmidja/types";

export const runtime = "nodejs";

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireViewer(req);
  if ("res" in auth) return auth.res;
  const { id } = await ctx.params;
  const body = await readJson(req);
  const text = cleanText(body.text, 1500);
  if (!UUID_RE.test(id) || !isLang(body.lang) || !text) return fail("bad_request");

  const { data: page } = await supabaseAdmin.from("bk_pages").select("id, bk_stories(created_by)").eq("id", id).maybeSingle();
  if (!page) return fail("not_found", 404);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const story = (Array.isArray(page.bk_stories) ? page.bk_stories[0] : page.bk_stories) as any;
  if (!canEdit(auth.viewer, story?.created_by ?? null)) return fail("not_yours", 403);

  await supabaseAdmin.from("bk_page_texts").upsert({ page_id: id, lang: body.lang, text });
  return json({ ok: true });
}
