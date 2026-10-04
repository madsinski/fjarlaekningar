// Bókasmiðjan — gagnaaðgangur á þjóni.
// Server-only. Allt fer um þjónustulykil; auðkenning er í auth.ts.
//
// Villur fara til vafrans sem stuttir kóðar ({ ok: false, error: "locked" });
// viðmótið þýðir þá á mál barnsins (sjá err.* í i18n.ts).

import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getViewer, sameOrigin } from "./auth";
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
  };
}

async function childNames(): Promise<Map<string, string>> {
  const { data } = await supabaseAdmin.from("bk_children").select("id, name");
  return new Map((data || []).map((c: any) => [c.id, c.name]));
}

/** Allar bækur með sögunum sínum. `covers` sækir fyrstu mynd hverrar sögu. */
export async function loadBooks(opts: { bookId?: string; covers?: boolean } = {}): Promise<BookView[]> {
  let q = supabaseAdmin.from("bk_books").select("id, title, subtitle, color, emoji, planned_stories, created_by, created_at").order("created_at");
  if (opts.bookId) q = q.eq("id", opts.bookId);
  const { data: books } = await q;
  if (!books?.length) return [];
  const bookIds = books.map((b: any) => b.id);
  const { data: stories } = await supabaseAdmin.from("bk_stories")
    .select("id, book_id, position, status, source_lang, created_by").in("book_id", bookIds).order("position");
  const storyIds = (stories || []).map((s: any) => s.id);
  const [{ data: texts }, names, covers] = await Promise.all([
    storyIds.length ? supabaseAdmin.from("bk_story_texts").select("story_id, lang, title, summary").in("story_id", storyIds) : Promise.resolve({ data: [] as any[] }),
    childNames(),
    opts.covers && storyIds.length
      ? supabaseAdmin.from("bk_pages").select("story_id, svg").in("story_id", storyIds).eq("position", 1)
      : Promise.resolve({ data: [] as any[] }),
  ]);
  const coverOf = new Map((covers.data || []).map((p: any) => [p.story_id, p.svg as string | null]));
  return books.map((b: any) => ({
    id: b.id, title: i18n(b.title), subtitle: i18n(b.subtitle), color: b.color, emoji: b.emoji,
    plannedStories: b.planned_stories, createdBy: b.created_by,
    stories: (stories || []).filter((s: any) => s.book_id === b.id)
      .map((s: any) => toStory(s, (texts || []).filter((t: any) => t.story_id === s.id), names, coverOf.get(s.id) ?? null)),
  }));
}

/** Ein saga með síðum og textum á öllum málum. */
export async function loadStory(id: string): Promise<(StoryView & { pages: PageView[] }) | null> {
  const { data: s } = await supabaseAdmin.from("bk_stories")
    .select("id, book_id, position, status, source_lang, created_by").eq("id", id).maybeSingle();
  if (!s) return null;
  const [{ data: texts }, { data: pages }, names] = await Promise.all([
    supabaseAdmin.from("bk_story_texts").select("lang, title, summary").eq("story_id", id),
    supabaseAdmin.from("bk_pages").select("id, position, svg").eq("story_id", id).order("position"),
    childNames(),
  ]);
  const pageIds = (pages || []).map((p: any) => p.id);
  const { data: pageTexts } = pageIds.length
    ? await supabaseAdmin.from("bk_page_texts").select("page_id, lang, text").in("page_id", pageIds)
    : { data: [] as any[] };
  const views: PageView[] = (pages || []).map((p: any) => {
    const text: I18nText = {};
    for (const t of pageTexts || []) if (t.page_id === p.id && isLang(t.lang)) text[t.lang as Lang] = t.text;
    return { id: p.id, position: p.position, svg: p.svg, text };
  });
  return { ...toStory(s, texts || [], names, views[0]?.svg ?? null), pages: views };
}
/* eslint-enable @typescript-eslint/no-explicit-any */

/** Saga telst tilbúin þegar allar síður hafa mynd. */
export async function refreshStoryStatus(storyId: string) {
  const { data: pages } = await supabaseAdmin.from("bk_pages").select("svg").eq("story_id", storyId);
  if (!pages?.length) return;
  const status = pages.every((p) => !!p.svg) ? "ready" : "written";
  await supabaseAdmin.from("bk_stories").update({ status, updated_at: new Date().toISOString() }).eq("id", storyId);
}

/** Losar lás sem throttle() setti (sjá write- og illustrate-leiðirnar), svo reyna megi strax aftur eftir villu. */
export async function unlock(key: string) {
  await supabaseAdmin.from("hsu_auth_throttle").delete().eq("key", `bk:${key}`);
}

/** Eyðir upplestrarskrám sagna úr geymslunni áður en línurnar hverfa (cascade). */
export async function removeAudio(storyIds: string[]) {
  if (!storyIds.length) return;
  const { data: pages } = await supabaseAdmin.from("bk_pages").select("id").in("story_id", storyIds);
  const pageIds = (pages || []).map((p) => p.id);
  if (!pageIds.length) return;
  const { data: audio } = await supabaseAdmin.from("bk_audio").select("storage_path").in("page_id", pageIds);
  const paths = (audio || []).map((a) => a.storage_path);
  if (paths.length) await supabaseAdmin.storage.from(AUDIO_BUCKET).remove(paths);
}

export const AUDIO_BUCKET = "bokasmidja";
