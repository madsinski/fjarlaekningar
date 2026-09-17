// Ein starfsstöð: breyta (nafn, heimilisfang, sími, athugasemd, virk),
// sameina annarri stöð, eða eyða (aðeins ef enginn notandi er tengdur).

import { supabaseAdmin } from "@/lib/supabase-admin";
import { getVsAdmin } from "@/lib/vinnustod/admin";
import { UUID_RE, cleanLine, cleanText, fail, json, readJson } from "@/lib/vinnustod/server";
import { findWorkplace } from "@/lib/vinnustod/workplaces";

export const runtime = "nodejs";

const DENY = "Krefst stjórnanda með tveggja þrepa auðkenningu";

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!(await getVsAdmin(req))) return fail(DENY, 403);
  const { id } = await ctx.params;
  const place = await findWorkplace(id);
  if (!place) return fail("Starfsstöðin fannst ekki", 404);
  const body = await readJson(req);

  // Sameina: notendur færast á hina stöðina og þessari er eytt.
  if (body.mergeInto !== undefined) {
    const target = await findWorkplace(body.mergeInto);
    if (!target || target.id === id) return fail("Veldu aðra starfsstöð til að sameina við.");
    await supabaseAdmin.from("gatt_users").update({ workplace_id: target.id, workplace: target.name }).eq("workplace_id", id);
    await supabaseAdmin.from("gatt_workplaces").delete().eq("id", id);
    return json({ ok: true, merged: target.name });
  }

  const patch: Record<string, unknown> = {};
  if (typeof body.name === "string") {
    const name = cleanLine(body.name, 120);
    if (!name) return fail("Nafn má ekki vera autt.");
    patch.name = name;
  }
  if (typeof body.address === "string") patch.address = cleanLine(body.address, 200);
  if (typeof body.phone === "string") patch.phone = cleanLine(body.phone, 40);
  if (typeof body.note === "string") patch.note = cleanText(body.note, 500);
  if (typeof body.active === "boolean") patch.active = body.active;
  if (!Object.keys(patch).length) return fail("Engu breytt");
  const { error } = await supabaseAdmin.from("gatt_workplaces").update(patch).eq("id", id);
  if (error?.code === "23505") return fail("Starfsstöð með þessu nafni er þegar til.", 409);
  if (error) return fail(error.message, 500);
  // Nýtt nafn fylgir notendunum.
  if (patch.name && patch.name !== place.name) {
    await supabaseAdmin.from("gatt_users").update({ workplace: patch.name }).eq("workplace_id", id);
  }
  return json({ ok: true });
}

export async function DELETE(req: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!(await getVsAdmin(req))) return fail(DENY, 403);
  const { id } = await ctx.params;
  if (!UUID_RE.test(id)) return fail("Ógild beiðni");
  const { count } = await supabaseAdmin.from("gatt_users").select("id", { count: "exact", head: true }).eq("workplace_id", id);
  if (count) return fail(`${count} notand${count === 1 ? "i er" : "ur eru"} á þessari stöð. Færðu þá, sameinaðu stöðina annarri eða gerðu hana óvirka.`, 409);
  await supabaseAdmin.from("gatt_workplaces").delete().eq("id", id);
  return json({ ok: true });
}
