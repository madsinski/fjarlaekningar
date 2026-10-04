// Bókasmiðjan — gagnaaðgangur á þjóni.
// Server-only. Allt fer um þjónustulykil; auðkenning er í auth.ts.
//
// Villur fara til vafrans sem stuttir kóðar ({ ok: false, error: "locked" });
// viðmótið þýðir þá á mál barnsins (sjá err.* í i18n.ts).

import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getViewer, sameOrigin } from "./auth";
import { artMode, pictureSvg } from "./images";
import { LANG_COOKIE, isLang, type BookView, type I18nText, type Lang, type PageView, type StoryView, type Viewer } from "./types";

export const json = (body: unknown, status = 200) => NextResponse.json(body, { status });
export const fail = (error: string, status = 400) => NextResponse.json({ ok: false, error }, { status });
export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function readJson(req: Request): Promise<Record<string, unknown>> {
  try {
    const b = await req.json();
    return b && typeof b === "object" ? (b as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

export const cleanLine = (v: unknown, max: number) => (typeof v === "string" ? v.replace(/\s+/g, " ").trim().slice(0, max) : "");
export const cleanText = (v: unknown, max: number) => (typeof v === "string" ? v.replace(/\r/g, "").replace(/\n{3,}/g, "\n\n").trim().slice(0, max) : "");

/** Innskráð barn eða foreldri. Skilar svari til að senda beint ef ekki heimilt. */
export async function requireViewer(req: Request): Promise<{ viewer: Viewer } | { res: NextResponse }> {
  if (req.method !== "GET" && !sameOrigin(req)) return { res: fail("bad_request", 403) };
  const viewer = await getViewer();
  if (!viewer) return { res: fail("not_signed_in", 401) };
  return { viewer };
}

export async function requireParent(req: Request): Promise<{ viewer: Viewer } | { res: NextResponse }> {
  const auth = await requireViewer(req);
  if ("res" in auth) return auth;
  if (auth.viewer.role !== "parent") return { res: fail("parent_only", 403) };
  return auth;
}

/** Mál viðmótsins: kakan ræður (sett við innskráningu barns og þegar skipt er um mál). */
export async function getLang(): Promise<Lang> {
  const v = (await cookies()).get(LANG_COOKIE)?.value;
  return isLang(v) ? v : "is";
}

export const viewerId = (v: Viewer) => (v.role === "kid" ? v.child.id : null);
/** Foreldri má breyta öllu; barn aðeins því sem það bjó til sjálft. */
export const canEdit = (v: Viewer, createdBy: string | null) => v.role === "parent" || (!!createdBy && createdBy === viewerId(v));

// ── Bækur og sögur ──────────────────────────────────────────────────────────

/* eslint-disable @typescript-eslint/no-explicit-any */
const i18n = (v: any): I18nText => (v && typeof v === "object" ? v : {});

function toStory(r: any, texts: any[], names: Map<string, string>, cover: string | null): StoryView {
  const title: I18nText = {};
  const summary: I18nText = {};
  for (const t of texts) if (isLang(t.lang)) { title[t.lang as Lang] = t.title; summary[t.lang as Lang] = t.summary; }
  return {
    id: r.id, bookId: r.book_id, position: r.position, status: r.status,
    sourceLang: isLang(r.source_lang) ? r.source_lang : "is",
    title, summary, createdBy: r.created_by, authorName: r.created_by ? names.get(r.created_by) ?? null : null, cover,
    polishedIs: texts.some((t) => t.lang === "is" && !!t.polished_at),
    lengths: r.lengths ?? 1,
  };
}

async function childNames(): Promise<Map<string, string>> {
  const { data } = await supabaseAdmin.from("bk_children").select("id, name");
  return new Map((data || []).map((c: any) => [c.id, c.name]));
}

/** Allar bækur með sögunum sínum. `covers` sækir fyrstu mynd hverrar sögu. */
export async function loadBooks(opts: { bookId?: string; covers?: boolean } = {}): Promise<BookView[]> {
  let q = supabaseAdmin.from("bk_books").select("id, title, subtitle, color, emoji, planned_stories, created_by, created_at, cover_svg, cover_image_path").order("created_at");
  if (opts.bookId) q = q.eq("id", opts.bookId);
  const { data: books } = await q;
  if (!books?.length) return [];
  const bookIds = books.map((b: any) => b.id);
  const { data: stories } = await supabaseAdmin.from("bk_stories")
    .select("id, book_id, position, status, source_lang, created_by, lengths").in("book_id", bookIds).order("position");
  const storyIds = (stories || []).map((s: any) => s.id);
  const [{ data: texts }, names, covers] = await Promise.all([
    storyIds.length ? supabaseAdmin.from("bk_story_texts").select("story_id, lang, title, summary").in("story_id", storyIds) : Promise.resolve({ data: [] as any[] }),
    childNames(),
    opts.covers && storyIds.length
      ? supabaseAdmin.from("bk_pages").select("id, story_id, svg, image_path").in("story_id", storyIds).eq("position", 1)
      : Promise.resolve({ data: [] as any[] }),
  ]);
  const coverOf = new Map((covers.data || []).map((p: any) => [p.story_id, (p.svg ?? (p.image_path ? pictureSvg(p.id, p.image_path) : null)) as string | null]));
  return books.map((b: any) => ({
    id: b.id, title: i18n(b.title), subtitle: i18n(b.subtitle), color: b.color, emoji: b.emoji,
    plannedStories: b.planned_stories, createdBy: b.created_by,
    coverSvg: b.cover_svg ?? null,
    // Slóðin breytist með hverri nýrri kápu, svo vafrinn sæki nýju myndina.
    coverImage: b.cover_image_path ? `/api/bokasmidja/books/${b.id}/cover?v=${encodeURIComponent(String(b.cover_image_path).slice(-12))}` : null,
    stories: (stories || []).filter((s: any) => s.book_id === b.id)
      .map((s: any) => toStory(s, (texts || []).filter((t: any) => t.story_id === s.id), names, coverOf.get(s.id) ?? null)),
  }));
}

/** Ein saga með síðum og textum á öllum málum. */
export async function loadStory(id: string): Promise<(StoryView & { pages: PageView[] }) | null> {
  const { data: s } = await supabaseAdmin.from("bk_stories")
    .select("id, book_id, position, status, source_lang, created_by, lengths, art").eq("id", id).maybeSingle();
  if (!s) return null;
  const [{ data: texts }, { data: pages }, names] = await Promise.all([
    supabaseAdmin.from("bk_story_texts").select("lang, title, summary, polished_at").eq("story_id", id),
    supabaseAdmin.from("bk_pages").select("id, position, svg, image_path, layout, auto_art, drawing_path, level, reviewed").eq("story_id", id).order("position").order("created_at"),
    childNames(),
  ]);
  const pageIds = (pages || []).map((p: any) => p.id);
  const { data: pageTexts } = pageIds.length
    ? await supabaseAdmin.from("bk_page_texts").select("page_id, lang, text, length").in("page_id", pageIds)
    : { data: [] as any[] };
  const views: PageView[] = (pages || []).map((p: any) => {
    const text: I18nText = {};
    const textM: I18nText = {};
    const textL: I18nText = {};
    for (const t of pageTexts || []) {
      if (t.page_id !== p.id || !isLang(t.lang)) continue;
      (t.length === 3 ? textL : t.length === 2 ? textM : text)[t.lang as Lang] = t.text;
    }
    // Máluð mynd er afhent sem SVG utan um myndina, svo skjáirnir fari eins með báðar gerðir.
    return { id: p.id, position: p.position, svg: p.svg ?? (p.image_path ? pictureSvg(p.id, p.image_path) : null), text, textM, textL, level: p.level === 3 ? 3 : p.level === 2 ? 2 : 1, layout: p.layout === "text-first" ? "text-first" : "art-first", autoArt: p.auto_art !== false, hasDrawing: !!p.drawing_path, reviewed: p.reviewed === true };
  });
  return { ...toStory(s, texts || [], names, views[0]?.svg ?? null), hasSheet: !!(s.art?.sheetSvg || s.art?.sheetImage), artMode: artMode(), pages: views };
}
/* eslint-enable @typescript-eslint/no-explicit-any */

/** Saga telst tilbúin þegar allar síður sem smiðjan á að mála hafa mynd. */
export async function refreshStoryStatus(storyId: string) {
  const { data: pages } = await supabaseAdmin.from("bk_pages").select("svg, image_path, auto_art").eq("story_id", storyId);
  if (!pages?.length) return;
  const status = pages.every((p) => !!p.svg || !!p.image_path || !p.auto_art) ? "ready" : "written";
  await supabaseAdmin.from("bk_stories").update({ status, updated_at: new Date().toISOString() }).eq("id", storyId);
}

/** Losar lás sem throttle() setti (sjá write- og illustrate-leiðirnar), svo reyna megi strax aftur eftir villu. */
export async function unlock(key: string) {
  await supabaseAdmin.from("hsu_auth_throttle").delete().eq("key", `bk:${key}`);
}

/** Eyðir upplestrarskrám, teikningum og máluðum myndum sagna úr geymslunni áður en línurnar hverfa (cascade). */
export async function removeAudio(storyIds: string[]) {
  if (!storyIds.length) return;
  const { data: pages } = await supabaseAdmin.from("bk_pages").select("id").in("story_id", storyIds);
  const pageIds = (pages || []).map((p) => p.id);
  if (!pageIds.length) return;
  const [{ data: audio }, { data: drawn }] = await Promise.all([
    supabaseAdmin.from("bk_audio").select("storage_path").in("page_id", pageIds),
    supabaseAdmin.from("bk_pages").select("drawing_path, image_path").in("id", pageIds),
  ]);
  const { data: owners } = await supabaseAdmin.from("bk_stories").select("art").in("id", storyIds);
  const paths = [
    ...(audio || []).map((a) => a.storage_path),
    ...(drawn || []).flatMap((d) => [d.drawing_path, d.image_path]),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ...(owners || []).map((o: any) => o.art?.sheetImage),
  ].filter((p): p is string => !!p);
  if (paths.length) await supabaseAdmin.storage.from(AUDIO_BUCKET).remove(paths);
}

export const AUDIO_BUCKET = "bokasmidja";

/** Sagan sem síða tilheyrir, ef notandinn má breyta henni. Annars svar til að senda beint. */
export async function editablePage(viewer: Viewer, pageId: string) {
  if (!UUID_RE.test(pageId)) return { res: fail("bad_request") } as const;
  const { data: page } = await supabaseAdmin.from("bk_pages")
    .select("id, story_id, position, scene, svg, image_path, layout, drawing_path").eq("id", pageId).maybeSingle();
  if (!page) return { res: fail("not_found", 404) } as const;
  const { data: story } = await supabaseAdmin.from("bk_stories")
    .select("id, book_id, source_lang, art, created_by").eq("id", page.story_id).maybeSingle();
  if (!story) return { res: fail("not_found", 404) } as const;
  if (!canEdit(viewer, story.created_by)) return { res: fail("not_yours", 403) } as const;
  return { page, story } as const;
}

/** Sama fyrir sögu. */
export async function editableStory(viewer: Viewer, storyId: string) {
  if (!UUID_RE.test(storyId)) return { res: fail("bad_request") } as const;
  const { data: story } = await supabaseAdmin.from("bk_stories")
    .select("id, book_id, position, status, source_lang, created_by").eq("id", storyId).maybeSingle();
  if (!story) return { res: fail("not_found", 404) } as const;
  if (!canEdit(viewer, story.created_by)) return { res: fail("not_yours", 403) } as const;
  return { story } as const;
}

/** Númerar síður sögunnar 1..n í þeirri röð sem gefin er (eða núverandi röð). */
export async function renumberPages(storyId: string, order?: string[]) {
  let ids = order;
  if (!ids) {
    const { data } = await supabaseAdmin.from("bk_pages").select("id").eq("story_id", storyId).order("position").order("created_at");
    ids = (data || []).map((p) => p.id);
  }
  await Promise.all(ids.map((id, i) => supabaseAdmin.from("bk_pages").update({ position: i + 1 }).eq("id", id).eq("story_id", storyId)));
}

/** Raunveruleg myndtegund eftir fyrstu bætum, óháð því sem vafrinn segir. */
export function sniffImage(buf: Buffer): "image/jpeg" | "image/png" | null {
  if (buf.length > 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
  if (buf.length > 8 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "image/png";
  return null;
}

export const IMAGE_MAX_BYTES = 3_000_000;

/** Les base64-mynd úr beiðni. Skilar null ef hún er ekki JPEG/PNG innan marka. */
export function readImage(raw: unknown): { b64: string; bytes: Buffer; mediaType: "image/jpeg" | "image/png" } | null {
  const b64 = typeof raw === "string" ? raw : "";
  if (!b64 || b64.length > IMAGE_MAX_BYTES * 1.4 || !/^[A-Za-z0-9+/=]+$/.test(b64)) return null;
  const bytes = Buffer.from(b64, "base64");
  const mediaType = sniffImage(bytes);
  return mediaType && bytes.length <= IMAGE_MAX_BYTES ? { b64, bytes, mediaType } : null;
}
