// Viðvera: opin vinnustöð lætur vita á ~30 sek. fresti.
// POST { active } — active = flipinn sýnilegur og notandinn snerti síðuna nýlega.
// Skráð á þá innskráningu sem síðan sýnir (sama forgangsröð og vinnustöðin).

import { supabaseAdmin } from "@/lib/supabase-admin";
import { getSmsActor } from "@/lib/sms-actor";
import { sameOrigin } from "@/lib/vinnustod/auth";
import { fail, json, readJson } from "@/lib/vinnustod/server";

export const runtime = "nodejs";

export async function POST(req: Request) {
  if (!sameOrigin(req)) return fail("Ógild beiðni", 403);
  const actor = await getSmsActor(req);
  if (!actor) return fail("Ekki innskráð(ur)", 401);
  const body = await readJson(req);
  const now = new Date().toISOString();
  const row: Record<string, unknown> = {
    owner_kind: actor.kind,
    owner_id: actor.id,
    last_seen_at: now,
    active: body.active === true,
    user_agent: (req.headers.get("user-agent") ?? "").slice(0, 300),
  };
  if (body.active === true) row.last_active_at = now;
  const { error } = await supabaseAdmin.from("gatt_presence").upsert(row, { onConflict: "owner_kind,owner_id" });
  if (error) return fail("Ekki tókst að vista", 500);
  return json({ ok: true });
}

/** Síðunni lokað: hætta að teljast með opna síðu (innskráningin helst). */
export async function DELETE(req: Request) {
  const actor = await getSmsActor(req);
  if (!actor) return json({ ok: true });
  await supabaseAdmin.from("gatt_presence").update({ last_seen_at: new Date(Date.now() - 10 * 60_000).toISOString(), active: false })
    .eq("owner_kind", actor.kind).eq("owner_id", actor.id);
  return json({ ok: true });
}
