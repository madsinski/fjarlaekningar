// Myndskreytirinn (Claude) teiknar eina síðu sem lagskipta SVG-mynd með
// hreyfimerkingum. Viðmótið kallar á þetta síðu fyrir síðu og sýnir framvinduna.
//   POST /api/bokasmidja/pages/:id/illustrate  { redo? }
//   POST /api/bokasmidja/pages/:id/illustrate  { review: true }
//     Yfirferð: myndin er teiknuð upp (PNG), myndskreytirinn skoðar hana og
//     lagar það sem er að. Hver mynd er yfirfarin einu sinni.
// Endurtekningarþolið: sé myndin til gerist ekkert nema redo sé true (þá þarf
// að eiga söguna). { busy: true } þýðir að annað tæki er að teikna hana núna.

import { supabaseAdmin } from "@/lib/supabase-admin";
import { AgentError, agentsConfigured, illustratePage, reviewPicture } from "@/lib/bokasmidja/agents";
import { artMode, paintPage, pictureSvg, removePictures } from "@/lib/bokasmidja/images";
import { renderPng } from "@/lib/bokasmidja/render";
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
  const body = await readJson(req);
  const redo = body.redo === true;
  const review = body.review === true;

  const { data: page } = await supabaseAdmin.from("bk_pages").select("id, story_id, position, scene, svg, image_path, reviewed").eq("id", id).maybeSingle();
  if (!page) return fail("not_found", 404);
  const { data: story } = await supabaseAdmin.from("bk_stories")
    .select("id, source_lang, art, created_by").eq("id", page.story_id).single();
  if (!story) return fail("not_found", 404);
  // Mynd síðunnar eins og skjáirnir fá hana: teiknuð SVG, eða máluð mynd í SVG-umgjörð.
  const current = page.svg ?? (page.image_path ? pictureSvg(page.id, page.image_path) : null);
  if (review && (!page.svg || page.reviewed)) return json({ ok: true, svg: current });
  if (current && !review) {
    if (!redo) return json({ ok: true, svg: current });
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

    const art = (story.art || {}) as Parameters<typeof illustratePage>[0]["art"] & { sheetSvg?: string; sheetImage?: string };

    // Máluð mynd frá myndlíkani: hröð, og persónurnar teknar af persónublaðinu.
    if (artMode() === "image" && !review) {
      const path = await paintPage({
        storyId: story.id, pageId: id, art, title: best(storyTexts)?.title || "",
        scene: page.scene, pageText: best(texts)?.text || "", sheetPath: art.sheetImage,
      });
      await supabaseAdmin.from("bk_pages").update({ image_path: path, svg: null, reviewed: true }).eq("id", id);
      await removePictures([page.image_path]);
      await refreshStoryStatus(story.id);
      await unlock(lock);
      return json({ ok: true, svg: pictureSvg(id, path) });
    }

    const input = {
      art,
      sheetSvg: art.sheetSvg && art.sheetSvg.length <= REFERENCE_MAX ? art.sheetSvg : null,
      storyTitle: best(storyTexts)?.title || "",
      scene: page.scene,
      pageText: best(texts)?.text || "",
      pageNumber: page.position,
      pageCount: count ?? page.position,
      referenceSvg: reference,
      idPrefix: `p${id.slice(0, 6)}${redo || review ? Date.now().toString(36).slice(-3) : ""}`,
    };

    if (review && page.svg) {
      // Myndin teiknuð upp og sýnd myndskreytinum. Takist það ekki stendur hún óbreytt.
      const png = renderPng(page.svg);
      const better = png ? await reviewPicture({ ...input, svg: page.svg, png }) : null;
      await supabaseAdmin.from("bk_pages").update({ svg: better ?? page.svg, reviewed: true }).eq("id", id);
      await unlock(lock);
      return json({ ok: true, svg: better ?? page.svg, changed: !!better });
    }

    const svg = await illustratePage(input);
    await supabaseAdmin.from("bk_pages").update({ svg, reviewed: false }).eq("id", id);
    await refreshStoryStatus(story.id);
    await unlock(lock);
    return json({ ok: true, svg });
  } catch (e) {
    await unlock(lock);
    if (!(e instanceof AgentError)) console.error("[bokasmidja] illustrate failed", e);
    return fail("agent_failed", 502);
  }
}
