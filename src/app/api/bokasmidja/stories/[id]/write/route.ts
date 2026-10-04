// Höfundurinn (Claude) skrifar söguna úr hugmyndinni, á máli barnsins, og
// skilur eftir lýsingar handa myndskreytinum.
//   POST /api/bokasmidja/stories/:id/write
// Endurtekningarþolið: sé sagan þegar skrifuð gerist ekkert. { busy: true }
// þýðir að annað tæki er að skrifa hana núna.

import { supabaseAdmin } from "@/lib/supabase-admin";
import { AgentError, agentsConfigured, writeStory } from "@/lib/bokasmidja/agents";
import { throttle } from "@/lib/bokasmidja/auth";
import { UUID_RE, fail, json, requireViewer, unlock } from "@/lib/bokasmidja/server";
import { pick, type I18nText, type Idea, type Lang } from "@/lib/bokasmidja/types";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireViewer(req);
  if ("res" in auth) return auth.res;
  const { id } = await ctx.params;
  if (!UUID_RE.test(id)) return fail("bad_request");
  if (!agentsConfigured()) return fail("not_configured", 503);

  const { data: story } = await supabaseAdmin.from("bk_stories")
    .select("id, book_id, status, source_lang, idea, created_by").eq("id", id).maybeSingle();
  if (!story) return fail("not_found", 404);
  if (story.status !== "idea") return json({ ok: true });

  const lock = `write:${id}`;
  if (!(await throttle(lock, 1, 280))) return json({ ok: true, busy: true });

  try {
    const lang = story.source_lang as Lang;
    const [{ data: book }, { data: siblings }, { data: child }] = await Promise.all([
      supabaseAdmin.from("bk_books").select("id, title, title_auto, concept").eq("id", story.book_id).single(),
      supabaseAdmin.from("bk_stories").select("id, bk_story_texts(lang, title, summary)").eq("book_id", story.book_id).neq("id", id),
      story.created_by
        ? supabaseAdmin.from("bk_children").select("name, age").eq("id", story.created_by).maybeSingle()
        : Promise.resolve({ data: null }),
    ]);
    const bookTitle = pick(book?.title as I18nText, "en");

    const written = await writeStory({
      lang,
      idea: story.idea as Idea,
      age: child?.age ?? null,
      childName: child?.name ?? null,
      bookTitle: bookTitle || "My own book",
      bookConcept: book?.concept || "",
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      siblings: (siblings || []).flatMap((s: any) => {
        const texts = (s.bk_story_texts || []) as { lang: string; title: string; summary: string }[];
        const t = texts.find((x) => x.lang === "en") || texts[0];
        return t ? [{ title: t.title, summary: t.summary }] : [];
      }),
      // Nýjar bækur barna eru líka kvöldsögur nema hugmyndin segi annað.
      bedtime: true,
    });

    const { data: pages, error } = await supabaseAdmin.from("bk_pages")
      .insert(written.pages.map((p, i) => ({ story_id: id, position: i + 1, scene: p.scene.slice(0, 2000) })))
      .select("id, position");
    if (error || !pages) throw new Error(error?.message || "pages");
    const byPos = new Map(pages.map((p) => [p.position, p.id]));
    await supabaseAdmin.from("bk_page_texts")
      .insert(written.pages.map((p, i) => ({ page_id: byPos.get(i + 1), lang, text: p.text.trim() })));
    await supabaseAdmin.from("bk_story_texts")
      .upsert({ story_id: id, lang, title: written.title.trim(), summary: written.summary.trim() });
    await supabaseAdmin.from("bk_stories").update({
      status: "written", updated_at: new Date().toISOString(),
      art: { characters: written.characters, setting: written.setting, palette: written.palette },
    }).eq("id", id);
    // Nafnlaus bók tekur nafn fyrstu sögunnar sem skrifuð er í hana.
    if (book?.title_auto && !bookTitle) {
      await supabaseAdmin.from("bk_books").update({ title: { [lang]: written.title.trim() } }).eq("id", book.id);
    }
    return json({ ok: true });
  } catch (e) {
    await unlock(lock);
    // Hálfskrifuð saga má ekki standa eftir: næsta tilraun byrjar á hreinu borði.
    await supabaseAdmin.from("bk_pages").delete().eq("story_id", id);
    if (!(e instanceof AgentError)) console.error("[bokasmidja] write failed", e);
    return fail(e instanceof AgentError && e.code === "refused" ? "refused" : "agent_failed", 502);
  }
}
