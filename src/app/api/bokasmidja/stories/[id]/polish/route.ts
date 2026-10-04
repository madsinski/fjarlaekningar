// Yfirlestur íslenska textans: GreynirCorrect + ritstjórn með netleit í
// barnaefni (sjá src/lib/bokasmidja/icelandic.ts). Smiðjan kallar á þetta
// sjálfkrafa um leið og saga er til á íslensku; ritillinn getur beðið um það
// aftur eftir breytingar ({ force: true }).
//   POST /api/bokasmidja/stories/:id/polish  { force? }
// Endurtekningarþolið: yfirlesin saga er ekki lesin aftur nema beðið sé um það.

import { supabaseAdmin } from "@/lib/supabase-admin";
import { throttle } from "@/lib/bokasmidja/auth";
import { icelandicConfigured, polishIcelandic } from "@/lib/bokasmidja/icelandic";
import { UUID_RE, canEdit, fail, json, loadStory, readJson, requireViewer, unlock, viewerId } from "@/lib/bokasmidja/server";
import type { I18nText } from "@/lib/bokasmidja/types";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireViewer(req);
  if ("res" in auth) return auth.res;
  const { id } = await ctx.params;
  if (!UUID_RE.test(id)) return fail("bad_request");
  const force = (await readJson(req)).force === true;

  const story = await loadStory(id);
  if (!story) return fail("not_found", 404);
  if (force && !canEdit(auth.viewer, story.createdBy)) return fail("not_yours", 403);
  const pages = story.pages.filter((p) => p.text.is);
  if (!story.title.is || !pages.length) return json({ ok: true, skipped: true });
  if (story.polishedIs && !force) return json({ ok: true });
  if (!icelandicConfigured()) return json({ ok: true, skipped: true });
  if (!(await throttle(`polish:${viewerId(auth.viewer) ?? "parent"}`, 40, 86400))) return fail("daily_limit", 429);

  const lock = `polish:${id}`;
  if (!(await throttle(lock, 1, 290))) return json({ ok: true, busy: true });

  try {
    const out = await polishIcelandic({ title: story.title.is, summary: story.summary.is || "", pages: pages.map((p) => p.text.is as string) });
    await supabaseAdmin.from("bk_page_texts").upsert(pages.map((p, i) => ({ page_id: p.id, lang: "is", text: out.pages[i] })));
    await supabaseAdmin.from("bk_story_texts")
      .upsert({ story_id: id, lang: "is", title: out.title, summary: out.summary, polished_at: new Date().toISOString() });
    // Nafnlaus bók sem ber nafn þessarar sögu fylgir leiðréttum titli.
    const { data: book } = await supabaseAdmin.from("bk_books").select("id, title, title_auto").eq("id", story.bookId).maybeSingle();
    if (book?.title_auto && (book.title as I18nText).is === story.title.is && out.title !== story.title.is) {
      await supabaseAdmin.from("bk_books").update({ title: { ...(book.title as I18nText), is: out.title } }).eq("id", book.id);
    }
    await unlock(lock);
    return json({ ok: true, notesBefore: out.notesBefore, notesAfter: out.notesAfter });
  } catch (e) {
    await unlock(lock);
    console.error("[bokasmidja] polish failed", e instanceof Error ? e.message : e);
    return fail("agent_failed", 502);
  }
}
