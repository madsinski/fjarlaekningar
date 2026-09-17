// Tilkynningar í tæki (Web Push): skrá eða afskrá þennan vafra.
//
// POST   { endpoint, keys: { p256dh, auth } }  — skrá (eða uppfæra) tækið
// DELETE { endpoint }                          — afskrá
//
// Tækið er skráð fyrir ALLAR innskráningar í vafranum (t.d. stjórnandi sem er
// líka læknir í vaktakerfinu), svo skilaboð til hverrar þeirra berist tækinu.
// Stjórnandi Fjarlækninga (aal2) fær tilkynningar um ný skilaboð frá öllum;
// aðrir um skilaboð til sín. Sjá src/lib/vinnustod/live.ts.

import { supabaseAdmin } from "@/lib/supabase-admin";
import { getSmsActors } from "@/lib/sms-actor";
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
  const actors = await getSmsActors(req);
  if (!actors.length) return fail("Ekki innskráð(ur)", 401);
  if (!(await throttle(`push:${actors[0].kind}:${actors[0].id}`, 60, 3600))) return fail("Of margar tilraunir.", 429);
  const body = await readJson(req);
  const endpoint = validEndpoint(body.endpoint);
  const keys = (body.keys ?? {}) as { p256dh?: unknown; auth?: unknown };
  const p256dh = String(keys.p256dh ?? "");
  const auth = String(keys.auth ?? "");
  if (!endpoint || !B64URL.test(p256dh) || !B64URL.test(auth) || p256dh.length > 200 || auth.length > 100) {
    return fail("Ógild áskrift");
  }
  const ua = (req.headers.get("user-agent") ?? "").slice(0, 300);
  const { error } = await supabaseAdmin.from("gatt_push_subscriptions").upsert(actors.map((a) => ({
    endpoint,
    p256dh,
    auth,
    owner_kind: a.kind,
    owner_id: a.id,
    is_admin: a.kind === "staff" && Boolean(a.vsAdmin),
    user_agent: ua,
  })), { onConflict: "endpoint,owner_kind,owner_id" });
  if (error) return fail("Ekki tókst að vista", 500);
  return json({ ok: true, accounts: actors.map((a) => a.kind) });
}

export async function DELETE(req: Request) {
  if (!sameOrigin(req)) return fail("Ógild beiðni", 403);
  const actors = await getSmsActors(req);
  if (!actors.length) return fail("Ekki innskráð(ur)", 401);
  const body = await readJson(req);
  const endpoint = validEndpoint(body.endpoint);
  if (!endpoint) return fail("Ógild áskrift");
  // Slökkt er á tækinu í heild: slóðin er leynileg og aðeins þessi vafri þekkir hana.
  await supabaseAdmin.from("gatt_push_subscriptions").delete().eq("endpoint", endpoint);
  return json({ ok: true });
}
