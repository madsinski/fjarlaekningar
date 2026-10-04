// Breyta barni (nafn, mynd, litur, mál, aldur, nýr kóði) eða eyða — aðeins foreldri.
//   PATCH  /api/bokasmidja/children/:id
//   DELETE /api/bokasmidja/children/:id   (sögur barnsins verða eftir í hillunni)

import { supabaseAdmin } from "@/lib/supabase-admin";
import { CHILD_COLUMNS, hashSecret, pinOk, toChild } from "@/lib/bokasmidja/auth";
import { UUID_RE, cleanLine, fail, json, readJson, requireParent } from "@/lib/bokasmidja/server";
import { AVATARS, COLORS, isLang } from "@/lib/bokasmidja/types";

export const runtime = "nodejs";

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireParent(req);
  if ("res" in auth) return auth.res;
  const { id } = await ctx.params;
  if (!UUID_RE.test(id)) return fail("bad_request");
  const body = await readJson(req);

  const patch: Record<string, unknown> = {};
  if (body.name !== undefined) { const name = cleanLine(body.name, 40); if (!name) return fail("name_missing"); patch.name = name; }
  if (typeof body.avatar === "string" && AVATARS[body.avatar]) patch.avatar = body.avatar;
  if (typeof body.color === "string" && COLORS.includes(body.color)) patch.color = body.color;
  if (isLang(body.lang)) patch.lang = body.lang;
  if (body.age !== undefined) { const age = Number(body.age); patch.age = Number.isInteger(age) && age >= 2 && age <= 17 ? age : null; }
  if (typeof body.pin === "string" && body.pin) {
    if (!pinOk(body.pin)) return fail("weak_pin");
    patch.pin_hash = await hashSecret(body.pin);
    patch.pin_failures = 0;
    patch.locked_until = null;
  }
  if (!Object.keys(patch).length) return fail("bad_request");

  const { data } = await supabaseAdmin.from("bk_children").update(patch).eq("id", id).select(CHILD_COLUMNS).maybeSingle();
  if (!data) return fail("not_found", 404);
  return json({ ok: true, child: toChild(data) });
}

export async function DELETE(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireParent(req);
  if ("res" in auth) return auth.res;
  const { id } = await ctx.params;
  if (!UUID_RE.test(id)) return fail("bad_request");
  await supabaseAdmin.from("bk_children").delete().eq("id", id);
  return json({ ok: true });
}
