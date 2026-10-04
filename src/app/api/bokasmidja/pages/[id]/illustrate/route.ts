// Myndskreytirinn (Claude) teiknar eina síðu sem lagskipta SVG-mynd með
// hreyfimerkingum. Viðmótið kallar á þetta síðu fyrir síðu og sýnir framvinduna.
//   POST /api/bokasmidja/pages/:id/illustrate  { redo? }
// Endurtekningarþolið: sé myndin til gerist ekkert nema redo sé true (þá þarf
// að eiga söguna). { busy: true } þýðir að annað tæki er að teikna hana núna.

import { supabaseAdmin } from "@/lib/supabase-admin";
import { AgentError, agentsConfigured, illustratePage } from "@/lib/bokasmidja/agents";
import { throttle } from "@/lib/bokasmidja/auth";
import { UUID_RE, canEdit, fail, json, readJson, refreshStoryStatus, requireViewer, unlock, viewerId } from "@/lib/bokasmidja/server";

export const runtime = "nodejs";
export const maxDuration = 300;

const REFERENCE_MAX = 60_000;

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireViewer(req);
  if ("res" in auth) return auth.res;
  const { id } = await ctx.params;
  if (!UUID_RE.test(id)) return fail("bad_request");
  const redo = (await readJson(req)).redo === true;

  const { data: page } = await supabaseAdmin.from("bk_pages").select("id, story_id, position, scene, svg").eq("id", id).maybeSingle();
  if (!page) return fail("not_found", 404);
  const { data: story } = await supabaseAdmin.from("bk_stories")
    .select("id, source_lang, art, created_by").eq("id", page.story_id).single();
  if (!story) return fail("not_found", 404);
  if (page.svg) {
    if (!redo) return json({ ok: true, svg: page.svg });
    if (!canEdit(auth.viewer, story.created_by)) return fail("not_yours", 403);
  }
  if (!agentsConfigured()) return fail("not_configured", 503);
  if (!(await throttle(`art:${viewerId(auth.viewer) ?? "parent"}`, auth.viewer.role === "parent" ? 400 : 80, 86400))) return fail("daily_limit", 429);

  const lock = `art:${id}`;
  if (!(await throttle(lock, 1, 290))) return json({ ok: true, busy: true });

  try {
    const [{ data: texts }, { data: storyTexts }, { data: first }, { count }] = await Promise.all([
      supabaseAdmin.from("bk_page_texts").select("lang, text").eq("page_id", id),
      supabaseAdmin.from("bk_story_texts").select("lang, title").eq("story_id", story.id),
      page.position > 1
        ? supabaseAdmin.from("bk_pages").select("svg").eq("story_id", story.id).eq("position", 1).maybeSingle()
        : Promise.resolve({ data: null }),
      supabaseAdmin.from("bk_pages").select("id", { count: "exact", head: true }).eq("story_id", story.id),
    ]);
    const best = <T extends { lang: string }>(rows: T[] | null) =>
      (rows || []).find((r) => r.lang === "en") || (rows || []).find((r) => r.lang === story.source_lang) || (rows || [])[0];
    const reference = first?.svg && first.svg.length <= REFERENCE_MAX ? first.svg : null;

    const svg = await illustratePage({
      art: (story.art || {}) as Parameters<typeof illustratePage>[0]["art"],
      storyTitle: best(storyTexts)?.title || "",
      scene: page.scene,
      pageText: best(texts)?.text || "",
      pageNumber: page.position,
      pageCount: count ?? page.position,
      referenceSvg: reference,
      idPrefix: `p${id.slice(0, 6)}${redo ? Date.now().toString(36).slice(-3) : ""}`,
    });
    await supabaseAdmin.from("bk_pages").update({ svg }).eq("id", id);
    await refreshStoryStatus(story.id);
    await unlock(lock);
    return json({ ok: true, svg });
  } catch (e) {
    await unlock(lock);
    if (!(e instanceof AgentError)) console.error("[bokasmidja] illustrate failed", e);
    return fail("agent_failed", 502);
  }
}
