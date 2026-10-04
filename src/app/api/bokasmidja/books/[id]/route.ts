// Eyða bók með öllum sögum hennar — aðeins foreldri.
//   DELETE /api/bokasmidja/books/:id

import { supabaseAdmin } from "@/lib/supabase-admin";
import { UUID_RE, fail, json, removeAudio, requireParent } from "@/lib/bokasmidja/server";

export const runtime = "nodejs";

export async function DELETE(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireParent(req);
  if ("res" in auth) return auth.res;
  const { id } = await ctx.params;
  if (!UUID_RE.test(id)) return fail("bad_request");
  const { data: stories } = await supabaseAdmin.from("bk_stories").select("id").eq("book_id", id);
  await removeAudio((stories || []).map((s) => s.id));
  await supabaseAdmin.from("bk_books").delete().eq("id", id);
  return json({ ok: true });
}
