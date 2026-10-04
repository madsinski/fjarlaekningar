// Myndskreytirinn hannar persónur sögunnar einu sinni, áður en síðurnar eru
// málaðar. Hver síða er svo teiknuð eftir þessu persónublaði, svo hetjan sé
// eins á öllum myndum.
//   POST /api/bokasmidja/stories/:id/sheet
// Endurtekningarþolið: sé blaðið til gerist ekkert.

import { supabaseAdmin } from "@/lib/supabase-admin";
import { AgentError, agentsConfigured, drawCharacterSheet } from "@/lib/bokasmidja/agents";
import { throttle } from "@/lib/bokasmidja/auth";
import { artMode, paintSheet } from "@/lib/bokasmidja/images";
import { UUID_RE, fail, json, requireViewer, unlock } from "@/lib/bokasmidja/server";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireViewer(req);
  if ("res" in auth) return auth.res;
  const { id } = await ctx.params;
  if (!UUID_RE.test(id)) return fail("bad_request");
  if (!agentsConfigured()) return fail("not_configured", 503);

  const { data: story } = await supabaseAdmin.from("bk_stories").select("id, status, source_lang, art").eq("id", id).maybeSingle();
  if (!story || story.status === "idea") return fail("not_found", 404);
  const art = (story.art || {}) as { characters?: { name: string; look: string }[]; setting?: string; palette?: string; sheetSvg?: string; sheetImage?: string };
  const painted = artMode() === "image";
  if (painted ? art.sheetImage : art.sheetSvg) return json({ ok: true });

  const lock = `sheet:${id}`;
  if (!(await throttle(lock, 1, 290))) return json({ ok: true, busy: true });
  try {
    const { data: texts } = await supabaseAdmin.from("bk_story_texts").select("lang, title, summary").eq("story_id", id);
    const t = (texts || []).find((x) => x.lang === "en") || (texts || []).find((x) => x.lang === story.source_lang) || (texts || [])[0];
    if (painted) {
      const sheetImage = await paintSheet({ storyId: id, art, title: t?.title || "", summary: t?.summary || "" });
      await supabaseAdmin.from("bk_stories").update({ art: { ...art, sheetImage } }).eq("id", id);
    } else {
      const sheetSvg = await drawCharacterSheet({ art, storyTitle: t?.title || "", summary: t?.summary || "", idPrefix: `s${id.slice(0, 6)}` });
      await supabaseAdmin.from("bk_stories").update({ art: { ...art, sheetSvg } }).eq("id", id);
    }
    await unlock(lock);
    return json({ ok: true });
  } catch (e) {
    await unlock(lock);
    if (!(e instanceof AgentError)) console.error("[bokasmidja] sheet failed", e);
    return fail("agent_failed", 502);
  }
}
