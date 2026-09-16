// Tilkynningar í tæki (Web Push): skrá eða afskrá þennan vafra.
//
// POST   { endpoint, keys: { p256dh, auth } }  — skrá (eða uppfæra) tækið
// DELETE { endpoint }                          — afskrá
//
// Stjórnandi Fjarlækninga (aal2) fær tilkynningar um ný skilaboð frá öllum;
// aðrir um skilaboð til sín. Sjá src/lib/vinnustod/live.ts.

import { supabaseAdmin } from "@/lib/supabase-admin";
import { getSmsActor } from "@/lib/sms-actor";
import { sameOrigin, throttle } from "@/lib/vinnustod/auth";
import { fail, json, readJson } from "@/lib/vinnustod/server";

export const runtime = "nodejs";

const B64URL = /^[A-Za-z0-9_-]+=*$/;

function validEndpoint(v: unknown): string | null {
  const s = String(v ?? "");
  if (s.length > 1000) return null;
  try {
    const u = new URL(s);
    return u.protocol === "https:" ? s : null;
  } catch {
    return null;
  }
}

export async function POST(req: Request) {
  if (!sameOrigin(req)) return fail("Ógild beiðni", 403);
  const actor = await getSmsActor(req);
  if (!actor) return fail("Ekki innskráð(ur)", 401);
  if (!(await throttle(`push:${actor.kind}:${actor.id}`, 20, 3600))) return fail("Of margar tilraunir.", 429);
  const body = await readJson(req);
  const endpoint = validEndpoint(body.endpoint);
  const keys = (body.keys ?? {}) as { p256dh?: unknown; auth?: unknown };
  const p256dh = String(keys.p256dh ?? "");
  const auth = String(keys.auth ?? "");
  if (!endpoint || !B64URL.test(p256dh) || !B64URL.test(auth) || p256dh.length > 200 || auth.length > 100) {
    return fail("Ógild áskrift");
  }
  const { error } = await supabaseAdmin.from("gatt_push_subscriptions").upsert({
    endpoint,
    p256dh,
    auth,
    owner_kind: actor.kind,
    owner_id: actor.id,
    is_admin: actor.kind === "staff" && actor.isAdmin,
    user_agent: (req.headers.get("user-agent") ?? "").slice(0, 300),
  }, { onConflict: "endpoint" });
  if (error) return fail("Ekki tókst að vista", 500);
  return json({ ok: true });
}

export async function DELETE(req: Request) {
  if (!sameOrigin(req)) return fail("Ógild beiðni", 403);
  const actor = await getSmsActor(req);
  if (!actor) return fail("Ekki innskráð(ur)", 401);
  const body = await readJson(req);
  const endpoint = validEndpoint(body.endpoint);
  if (!endpoint) return fail("Ógild áskrift");
  // Aðeins eigin tæki.
  await supabaseAdmin.from("gatt_push_subscriptions").delete()
    .eq("endpoint", endpoint).eq("owner_kind", actor.kind).eq("owner_id", actor.id);
  return json({ ok: true });
}
