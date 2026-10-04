// Kápa bókar — foreldri, eða barnið sem bjó bókina til.
//   POST   /api/bokasmidja/books/:id/cover  { mode: "ai" }                 myndskreytirinn teiknar kápu úr efni bókarinnar
//   POST   /api/bokasmidja/books/:id/cover  { mode: "drawing", image }     teikning barns verður að kápumynd
//   POST   /api/bokasmidja/books/:id/cover  { mode: "image", image }       tilbúin kápa notuð óbreytt
//   DELETE /api/bokasmidja/books/:id/cover                                 aftur í lit og tákn
//   GET    /api/bokasmidja/books/:id/cover                                 tilbúna kápan (allir innskráðir)
// image er base64 (JPEG eða PNG); vafrinn minnkar myndina fyrst.

import { supabaseAdmin } from "@/lib/supabase-admin";
import { AgentError, agentsConfigured, illustratePage } from "@/lib/bokasmidja/agents";
import { throttle } from "@/lib/bokasmidja/auth";
import { artMode, paintCover } from "@/lib/bokasmidja/images";
import { AUDIO_BUCKET, UUID_RE, canEdit, fail, json, readImage, readJson, requireViewer, unlock, viewerId } from "@/lib/bokasmidja/server";
import { pick, type I18nText, type Viewer } from "@/lib/bokasmidja/types";

export const runtime = "nodejs";
export const maxDuration = 300;

const REFERENCE_MAX = 60_000;

async function editableBook(viewer: Viewer, id: string) {
  if (!UUID_RE.test(id)) return { res: fail("bad_request") } as const;
  const { data: book } = await supabaseAdmin.from("bk_books").select("id, title, subtitle, concept, created_by, cover_image_path").eq("id", id).maybeSingle();
  if (!book) return { res: fail("not_found", 404) } as const;
  if (!canEdit(viewer, book.created_by)) return { res: fail("not_yours", 403) } as const;
  return { book } as const;
}

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireViewer(req);
  if ("res" in auth) return auth.res;
  const { id } = await ctx.params;
  const found = await editableBook(auth.viewer, id);
  if ("res" in found) return found.res;
  const { book } = found;
  const body = await readJson(req);
  const mode = body.mode;
  if (mode !== "ai" && mode !== "drawing" && mode !== "image") return fail("bad_request");
  const image = mode === "ai" ? null : readImage(body.image);
  if (mode !== "ai" && !image) return fail("bad_image");

  // Tilbúin kápa: geymd og notuð óbreytt.
  if (mode === "image" && image) {
    const path = `covers/${id}-${Date.now().toString(36)}.${image.mediaType === "image/png" ? "png" : "jpg"}`;
    const { error } = await supabaseAdmin.storage.from(AUDIO_BUCKET).upload(path, image.bytes, { contentType: image.mediaType, upsert: true });
    if (error) return fail("failed", 500);
    if (book.cover_image_path) await supabaseAdmin.storage.from(AUDIO_BUCKET).remove([book.cover_image_path]);
    await supabaseAdmin.from("bk_books").update({ cover_image_path: path, cover_svg: null }).eq("id", id);
    return json({ ok: true, coverSvg: null, coverImage: `/api/bokasmidja/books/${id}/cover?v=${encodeURIComponent(path.slice(-12))}` });
  }

  if (!agentsConfigured()) return fail("not_configured", 503);
  if (!(await throttle(`art:${viewerId(auth.viewer) ?? "parent"}`, auth.viewer.role === "parent" ? 400 : 80, 86400))) return fail("daily_limit", 429);
  const lock = `cover:${id}`;
  if (!(await throttle(lock, 1, 290))) return fail("busy", 409);

  try {
    // Efni bókarinnar: hugmyndin, og sögurnar sem þegar eru til (útlit persóna úr þeirri fyrstu).
    const { data: stories } = await supabaseAdmin.from("bk_stories")
      .select("id, art, source_lang, bk_story_texts(lang, title, summary)").eq("book_id", id).neq("status", "idea").order("position");
    const first = stories?.[0];
    const { data: ref } = first
      ? await supabaseAdmin.from("bk_pages").select("svg").eq("story_id", first.id).order("position").limit(1)
      : { data: null };
    const blurbs = (stories || []).flatMap((s) => {
      const texts = (s.bk_story_texts || []) as { lang: string; title: string; summary: string }[];
      const t = texts.find((x) => x.lang === "en") || texts.find((x) => x.lang === s.source_lang) || texts[0];
      return t ? [`- ${t.title}: ${t.summary}`] : [];
    });
    const title = pick(book.title as I18nText, "en");

    // Máluð kápa frá myndlíkani; geymd og sýnd eins og tilbúin kápumynd.
    if (artMode() === "image") {
      const art = (first?.art || {}) as { characters?: { name: string; look: string }[]; setting?: string; sheetImage?: string };
      const about = [book.concept ? `About the book: ${book.concept}` : "", blurbs.length ? `Stories in the book:\n${blurbs.slice(0, 8).join("\n")}` : ""].filter(Boolean).join("\n\n");
      const path = await paintCover({
        bookId: id, title, about, art, sheetPath: art.sheetImage,
        drawing: image ? { bytes: image.bytes, type: image.mediaType } : null,
      });
      if (book.cover_image_path) await supabaseAdmin.storage.from(AUDIO_BUCKET).remove([book.cover_image_path]);
      await supabaseAdmin.from("bk_books").update({ cover_image_path: path, cover_svg: null }).eq("id", id);
      await unlock(lock);
      return json({ ok: true, coverSvg: null, coverImage: `/api/bokasmidja/books/${id}/cover?v=${encodeURIComponent(path.slice(-12))}` });
    }
    const scene = [
      `The front cover picture for the children's book "${title || "a book of stories"}".`,
      book.concept ? `About the book: ${book.concept}` : "",
      blurbs.length ? `Stories in the book:\n${blurbs.slice(0, 8).join("\n")}` : "",
      "One bold, inviting image that makes a child want to open the book: the main hero (or heroes) large and full of character, in the world of the stories. Simple, iconic composition. No title and no lettering — the title is printed separately.",
    ].filter(Boolean).join("\n\n");

    const svg = await illustratePage({
      art: (first?.art || {}) as Parameters<typeof illustratePage>[0]["art"],
      storyTitle: title,
      scene,
      pageText: pick(book.subtitle as I18nText, "en"),
      pageNumber: 1,
      pageCount: 1,
      referenceSvg: ref?.[0]?.svg && ref[0].svg.length <= REFERENCE_MAX ? ref[0].svg : null,
      idPrefix: `c${id.slice(0, 6)}${Date.now().toString(36).slice(-3)}`,
      drawing: image ? { data: image.b64, mediaType: image.mediaType } : undefined,
    });
    if (book.cover_image_path) await supabaseAdmin.storage.from(AUDIO_BUCKET).remove([book.cover_image_path]);
    await supabaseAdmin.from("bk_books").update({ cover_svg: svg, cover_image_path: null }).eq("id", id);
    await unlock(lock);
    return json({ ok: true, coverSvg: svg, coverImage: null });
  } catch (e) {
    await unlock(lock);
    if (!(e instanceof AgentError)) console.error("[bokasmidja] cover failed", e);
    return fail(e instanceof AgentError && e.code === "refused" ? "refused" : "agent_failed", 502);
  }
}

export async function DELETE(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireViewer(req);
  if ("res" in auth) return auth.res;
  const { id } = await ctx.params;
  const found = await editableBook(auth.viewer, id);
  if ("res" in found) return found.res;
  if (found.book.cover_image_path) await supabaseAdmin.storage.from(AUDIO_BUCKET).remove([found.book.cover_image_path]);
  await supabaseAdmin.from("bk_books").update({ cover_svg: null, cover_image_path: null }).eq("id", id);
  return json({ ok: true, coverSvg: null, coverImage: null });
}

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireViewer(req);
  if ("res" in auth) return auth.res;
  const { id } = await ctx.params;
  if (!UUID_RE.test(id)) return fail("bad_request");
  const { data: book } = await supabaseAdmin.from("bk_books").select("cover_image_path").eq("id", id).maybeSingle();
  if (!book?.cover_image_path) return fail("not_found", 404);
  const { data: file } = await supabaseAdmin.storage.from(AUDIO_BUCKET).download(book.cover_image_path);
  if (!file) return fail("not_found", 404);
  return new Response(Buffer.from(await file.arrayBuffer()), {
    headers: {
      "Content-Type": book.cover_image_path.endsWith(".png") ? "image/png" : "image/jpeg",
      "Cache-Control": "private, max-age=86400",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
