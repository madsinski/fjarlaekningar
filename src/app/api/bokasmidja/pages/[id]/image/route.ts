// Máluð mynd síðu (frá myndlíkani), úr lokuðu geymslunni. Allir innskráðir.
//   GET /api/bokasmidja/pages/:id/image?v=…   (v breytist með myndinni; svarið má því geyma lengi)

import { supabaseAdmin } from "@/lib/supabase-admin";
import { AUDIO_BUCKET, UUID_RE, fail, requireViewer } from "@/lib/bokasmidja/server";

export const runtime = "nodejs";

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireViewer(req);
  if ("res" in auth) return auth.res;
  const { id } = await ctx.params;
  if (!UUID_RE.test(id)) return fail("bad_request");
  const { data: page } = await supabaseAdmin.from("bk_pages").select("image_path").eq("id", id).maybeSingle();
  if (!page?.image_path) return fail("not_found", 404);
  const { data: file } = await supabaseAdmin.storage.from(AUDIO_BUCKET).download(page.image_path);
  if (!file) return fail("not_found", 404);
  return new Response(Buffer.from(await file.arrayBuffer()), {
    headers: { "Content-Type": "image/jpeg", "Cache-Control": "private, max-age=31536000, immutable", "X-Content-Type-Options": "nosniff" },
  });
}
