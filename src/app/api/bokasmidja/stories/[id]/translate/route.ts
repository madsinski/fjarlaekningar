// Sagan endursögð á öðru máli (enska, íslenska, norska, ungverska).
//   POST /api/bokasmidja/stories/:id/translate  { lang }
// Þýðir aðeins það sem vantar: síður sem eiga texta á öðru máli en ekki þessu
// (t.d. síðu sem bætt var við í ritlinum), og titilinn ef hann vantar.
// Endurtekningarþolið: vanti ekkert gerist ekkert.

import { supabaseAdmin } from "@/lib/supabase-admin";
import { AgentError, agentsConfigured, translateStory } from "@/lib/bokasmidja/agents";
import { throttle } from "@/lib/bokasmidja/auth";
import { UUID_RE, fail, json, loadStory, readJson, requireViewer, unlock, viewerId } from "@/lib/bokasmidja/server";
import { isLang, pick, type I18nText } from "@/lib/bokasmidja/types";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireViewer(req);
  if ("res" in auth) return auth.res;
  const { id } = await ctx.params;
  const { lang } = await readJson(req);
  if (!UUID_RE.test(id) || !isLang(lang)) return fail("bad_request");
  if (!agentsConfigured()) return fail("not_configured", 503);

  const story = await loadStory(id);
  if (!story || story.status === "idea") return fail("not_found", 404);
  const from = story.sourceLang;
  const todo = story.pages.filter((p) => !p.text[lang] && pick(p.text, from));
  const needTitle = !story.title[lang];
  if (!todo.length && !needTitle) return json({ ok: true });
  if (!(await throttle(`translate:${viewerId(auth.viewer) ?? "parent"}`, 60, 86400))) return fail("daily_limit", 429);

  const lock = `translate:${id}:${lang}`;
  if (!(await throttle(lock, 1, 280))) return json({ ok: true, busy: true });

  try {
    const out = await translateStory({
      title: pick(story.title, from),
      summary: pick(story.summary, from),
      pages: todo.map((p) => p.text[from] || pick(p.text, from)),
    }, from, lang);
    const rows = todo.map((p, i) => ({ page_id: p.id, lang, text: out.pages[i].trim() })).filter((r) => r.text);
    if (rows.length) await supabaseAdmin.from("bk_page_texts").upsert(rows);
    // Nýr íslenskur texti þarf yfirlestur (sjá /polish).
    if (lang === "is" && rows.length && !needTitle) await supabaseAdmin.from("bk_story_texts").update({ polished_at: null }).eq("story_id", id).eq("lang", "is");
    if (needTitle) {
      await supabaseAdmin.from("bk_story_texts")
        .upsert({ story_id: id, lang, title: out.title.trim(), summary: out.summary.trim() });
    }
    // Nafnlaus bók fylgir nafni fyrstu sögunnar, líka á þessu máli.
    const { data: book } = await supabaseAdmin.from("bk_books").select("id, title, title_auto").eq("id", story.bookId).maybeSingle();
    if (needTitle && book?.title_auto && !(book.title as I18nText)[lang] && (book.title as I18nText)[from] === story.title[from]) {
      await supabaseAdmin.from("bk_books").update({ title: { ...(book.title as I18nText), [lang]: out.title.trim() } }).eq("id", book.id);
    }
    return json({ ok: true });
  } catch (e) {
    await unlock(lock);
    if (!(e instanceof AgentError)) console.error("[bokasmidja] translate failed", e);
    return fail("agent_failed", 502);
  }
}
