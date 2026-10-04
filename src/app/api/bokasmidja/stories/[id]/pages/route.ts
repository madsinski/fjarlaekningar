// Síður sögu í ritlinum (foreldri, eða barnið sem bjó söguna til).
//   POST /api/bokasmidja/stories/:id/pages              ný auð síða aftast
//   PUT  /api/bokasmidja/stories/:id/pages  { order }   ný röð: öll auðkenni síðna, í röð

import { supabaseAdmin } from "@/lib/supabase-admin";
import { editableStory, fail, json, readJson, renumberPages, requireViewer } from "@/lib/bokasmidja/server";
import { MAX_PAGES } from "@/lib/bokasmidja/types";

export const runtime = "nodejs";

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireViewer(req);
  if ("res" in auth) return auth.res;
  const { id } = await ctx.params;
  const found = await editableStory(auth.viewer, id);
  if ("res" in found) return found.res;
  if (found.story.status === "idea") return fail("bad_request");

  const { data: pages } = await supabaseAdmin.from("bk_pages").select("position").eq("story_id", id);
  if ((pages?.length ?? 0) >= MAX_PAGES) return fail("too_many_pages");
  const position = Math.max(0, ...(pages || []).map((p) => p.position)) + 1;
  // auto_art: false — smiðjan málar ekki auða síðu óumbeðið.
  const { data, error } = await supabaseAdmin.from("bk_pages")
    .insert({ story_id: id, position, auto_art: false }).select("id, position").single();
  if (error || !data) return fail("failed", 500);
  return json({ ok: true, page: { id: data.id, position: data.position, text: {}, level: 1, svg: null, layout: "art-first", autoArt: false, hasDrawing: false } });
}

export async function PUT(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireViewer(req);
  if ("res" in auth) return auth.res;
  const { id } = await ctx.params;
  const found = await editableStory(auth.viewer, id);
  if ("res" in found) return found.res;

  const { order } = await readJson(req);
  const { data: pages } = await supabaseAdmin.from("bk_pages").select("id").eq("story_id", id);
  const have = new Set((pages || []).map((p) => p.id));
  // Röðin verður að vera nákvæmlega síður þessarar sögu, hver einu sinni.
  if (!Array.isArray(order) || order.length !== have.size || new Set(order).size !== have.size || !order.every((x) => typeof x === "string" && have.has(x))) {
    return fail("bad_request");
  }
  await renumberPages(id, order as string[]);
  return json({ ok: true });
}
