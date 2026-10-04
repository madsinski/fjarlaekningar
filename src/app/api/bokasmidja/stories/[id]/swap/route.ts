// Mynd eða texti færður milli tveggja síðna sömu sögu (drag-og-sleppa í ritlinum).
//   POST /api/bokasmidja/stories/:id/swap  { what: "art" | "text", a, b }
// Myndir: skipt á mynd, myndlýsingu og teikningu barnsins. Textar: á öllum málum.

import { supabaseAdmin } from "@/lib/supabase-admin";
import { UUID_RE, editableStory, fail, json, readJson, refreshStoryStatus, requireViewer } from "@/lib/bokasmidja/server";

export const runtime = "nodejs";

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireViewer(req);
  if ("res" in auth) return auth.res;
  const { id } = await ctx.params;
  const found = await editableStory(auth.viewer, id);
  if ("res" in found) return found.res;

  const { what, a, b } = await readJson(req);
  if ((what !== "art" && what !== "text") || typeof a !== "string" || typeof b !== "string" || !UUID_RE.test(a) || !UUID_RE.test(b) || a === b) return fail("bad_request");
  const { data: pages } = await supabaseAdmin.from("bk_pages").select("id, svg, scene, drawing_path").eq("story_id", id).in("id", [a, b]);
  const pa = pages?.find((p) => p.id === a);
  const pb = pages?.find((p) => p.id === b);
  if (!pa || !pb) return fail("not_found", 404);

  if (what === "art") {
    // auto_art: false á báðum — síða sem missti myndina sína verður ekki máluð óumbeðið.
    await Promise.all([
      supabaseAdmin.from("bk_pages").update({ svg: pb.svg, scene: pb.scene, drawing_path: pb.drawing_path, auto_art: false }).eq("id", a),
      supabaseAdmin.from("bk_pages").update({ svg: pa.svg, scene: pa.scene, drawing_path: pa.drawing_path, auto_art: false }).eq("id", b),
    ]);
    await refreshStoryStatus(id);
  } else {
    const { data: rows } = await supabaseAdmin.from("bk_page_texts").select("page_id, lang, text").in("page_id", [a, b]);
    await supabaseAdmin.from("bk_page_texts").delete().in("page_id", [a, b]);
    const moved = (rows || []).map((r) => ({ page_id: r.page_id === a ? b : a, lang: r.lang, text: r.text }));
    if (moved.length) {
      const { error } = await supabaseAdmin.from("bk_page_texts").insert(moved);
      // Mistakist innsetningin má textinn ekki glatast: setjum upprunalegu línurnar aftur.
      if (error) { await supabaseAdmin.from("bk_page_texts").insert(rows || []); return fail("failed", 500); }
    }
  }
  return json({ ok: true });
}
