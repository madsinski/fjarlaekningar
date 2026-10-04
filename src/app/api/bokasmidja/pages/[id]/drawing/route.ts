// Teikning barnsins verður að bókarmynd: myndskreytirinn (Claude) fær myndina
// og teiknar hana upp á nýtt í stíl bókarinnar, sem lagskipta SVG-mynd.
//   POST /api/bokasmidja/pages/:id/drawing  { image: <base64>, mediaType: "image/jpeg" | "image/png" }
//   GET  /api/bokasmidja/pages/:id/drawing  → upprunalega teikningin
// Vafrinn minnkar myndina áður en hún er send (sjá Editor.tsx).

import { supabaseAdmin } from "@/lib/supabase-admin";
import { AgentError, agentsConfigured, illustratePage } from "@/lib/bokasmidja/agents";
import { throttle } from "@/lib/bokasmidja/auth";
import { AUDIO_BUCKET, UUID_RE, editablePage, fail, json, readJson, refreshStoryStatus, requireViewer, unlock, viewerId } from "@/lib/bokasmidja/server";

export const runtime = "nodejs";
export const maxDuration = 300;

const MAX_BYTES = 3_000_000;
const REFERENCE_MAX = 60_000;

/** Raunveruleg myndtegund eftir fyrstu bætum, óháð því sem vafrinn segir. */
function sniff(buf: Buffer): "image/jpeg" | "image/png" | null {
  if (buf.length > 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
  if (buf.length > 8 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "image/png";
  return null;
}

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireViewer(req);
  if ("res" in auth) return auth.res;
  const { id } = await ctx.params;
  const found = await editablePage(auth.viewer, id);
  if ("res" in found) return found.res;
  const { page, story } = found;
  if (!agentsConfigured()) return fail("not_configured", 503);

  const body = await readJson(req);
  const b64 = typeof body.image === "string" ? body.image : "";
  if (!b64 || b64.length > MAX_BYTES * 1.4 || !/^[A-Za-z0-9+/=]+$/.test(b64)) return fail("bad_image");
  const bytes = Buffer.from(b64, "base64");
  const mediaType = sniff(bytes);
  if (!mediaType || bytes.length > MAX_BYTES) return fail("bad_image");

  if (!(await throttle(`art:${viewerId(auth.viewer) ?? "parent"}`, auth.viewer.role === "parent" ? 400 : 80, 86400))) return fail("daily_limit", 429);
  const lock = `art:${id}`;
  if (!(await throttle(lock, 1, 290))) return fail("busy", 409);

  try {
    const [{ data: texts }, { data: storyTexts }, { data: first }, { count }] = await Promise.all([
      supabaseAdmin.from("bk_page_texts").select("lang, text").eq("page_id", id),
      supabaseAdmin.from("bk_story_texts").select("lang, title").eq("story_id", story.id),
      supabaseAdmin.from("bk_pages").select("id, svg").eq("story_id", story.id).order("position").limit(1),
      supabaseAdmin.from("bk_pages").select("id", { count: "exact", head: true }).eq("story_id", story.id),
    ]);
    const best = <T extends { lang: string }>(rows: T[] | null) =>
      (rows || []).find((r) => r.lang === "en") || (rows || []).find((r) => r.lang === story.source_lang) || (rows || [])[0];
    const ref = first?.[0];

    const svg = await illustratePage({
      art: (story.art || {}) as Parameters<typeof illustratePage>[0]["art"],
      storyTitle: best(storyTexts)?.title || "",
      scene: page.scene,
      pageText: best(texts)?.text || "",
      pageNumber: page.position,
      pageCount: count ?? page.position,
      referenceSvg: ref && ref.id !== id && ref.svg && ref.svg.length <= REFERENCE_MAX ? ref.svg : null,
      idPrefix: `d${id.slice(0, 6)}${Date.now().toString(36).slice(-3)}`,
      drawing: { data: b64, mediaType },
    });

    // Upprunalega teikningin geymist, svo barnið geti séð hana við hlið bókarmyndarinnar.
    const path = `drawings/${id}-${Date.now().toString(36)}.${mediaType === "image/png" ? "png" : "jpg"}`;
    const { error } = await supabaseAdmin.storage.from(AUDIO_BUCKET).upload(path, bytes, { contentType: mediaType, upsert: true });
    if (!error && page.drawing_path) await supabaseAdmin.storage.from(AUDIO_BUCKET).remove([page.drawing_path]);
    await supabaseAdmin.from("bk_pages").update({ svg, auto_art: false, ...(error ? {} : { drawing_path: path }) }).eq("id", id);
    await refreshStoryStatus(story.id);
    await unlock(lock);
    return json({ ok: true, svg, hasDrawing: !error || !!page.drawing_path });
  } catch (e) {
    await unlock(lock);
    if (!(e instanceof AgentError)) console.error("[bokasmidja] drawing failed", e);
    return fail(e instanceof AgentError && e.code === "refused" ? "refused" : "agent_failed", 502);
  }
}

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireViewer(req);
  if ("res" in auth) return auth.res;
  const { id } = await ctx.params;
  if (!UUID_RE.test(id)) return fail("bad_request");
  const { data: page } = await supabaseAdmin.from("bk_pages").select("drawing_path").eq("id", id).maybeSingle();
  if (!page?.drawing_path) return fail("not_found", 404);
  const { data: file } = await supabaseAdmin.storage.from(AUDIO_BUCKET).download(page.drawing_path);
  if (!file) return fail("not_found", 404);
  return new Response(Buffer.from(await file.arrayBuffer()), {
    headers: {
      "Content-Type": page.drawing_path.endsWith(".png") ? "image/png" : "image/jpeg",
      "Cache-Control": "private, max-age=3600",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
