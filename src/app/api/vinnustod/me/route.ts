// Hver er við vinnustöðina, og stillingar á eigin aðgangi.
//
// GET  — innskráður notandi (hvaðan sem hann kemur), ólesin svör og tilkynningar.
// PUT  — { kind: "password", current, next } eða { kind: "pin", password, pin }.
// DELETE — fjarlægja aðgangskóða.
// Aðgangsstillingar eiga aðeins við notendur vinnustöðvarinnar; starfsfólk
// Fjarlækninga og læknar vaktakerfisins stilla sinn aðgang þar.

import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getSmsActor } from "@/lib/sms-actor";
import { hashSecret, passwordProblem, pinProblem, sameOrigin, sha256, verifySecret, SESSION_COOKIE } from "@/lib/vinnustod/auth";
import { fail, json, readJson } from "@/lib/vinnustod/server";
import { canAsk, ownerColumn } from "@/lib/vinnustod/threads";
import { getGuideContent } from "@/lib/vinnustod/guide-content";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const actor = await getSmsActor(req);
  if (!actor) return fail("Ekki innskráð(ur)", 401);

  let unread = 0;
  // Stjórnandi Fjarlækninga svarar spurningunum: hjá honum telur „ólesið“
  // opnar spurningar sem bíða svars.
  if (actor.kind === "staff" && actor.isAdmin) {
    const { count } = await supabaseAdmin.from("gatt_threads")
      .select("id", { count: "exact", head: true }).eq("status", "open").eq("last_author", "user");
    unread = count ?? 0;
  }
  if (canAsk(actor)) {
    const { data: threads } = await supabaseAdmin.from("gatt_threads")
      .select("last_message_at, last_author, user_read_at").eq(ownerColumn(actor.kind), actor.id);
    unread = (threads ?? []).filter((t) => t.last_author === "staff" && (!t.user_read_at || t.user_read_at < t.last_message_at)).length;
  }
  const { data: news } = await supabaseAdmin.from("gatt_announcements")
    .select("id, created_at, title, body, level").eq("active", true)
    .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
    .order("created_at", { ascending: false }).limit(10);
  // Textar sem stjórnandi hefur breytt fyrir alla.
  const { data: custom } = await supabaseAdmin.from("gatt_settings").select("key, value").like("key", "text:%");
  const texts: Record<string, { text: string; by: string; at: string }> = {};
  for (const r of custom ?? []) {
    const v = r.value as { text?: unknown; by?: unknown; at?: unknown } | null;
    if (typeof v?.text === "string") texts[r.key.slice(5)] = { text: v.text, by: String(v.by ?? ""), at: String(v.at ?? "") };
  }

  return json({
    ok: true,
    me: {
      id: actor.id, name: actor.name, kind: actor.kind, email: actor.email ?? "",
      workplace: actor.workplace ?? "", title: actor.title ?? "",
      hasPin: actor.hasPin ?? false, mustChangePassword: actor.mustChangePassword ?? false,
      canMessage: canAsk(actor),
      canAnswer: actor.kind === "staff" && actor.isAdmin,
    },
    unread,
    announcements: news ?? [],
    texts,
    guide: await getGuideContent(),
  });
}

export async function PUT(req: Request) {
  if (!sameOrigin(req)) return fail("Ógild beiðni", 403);
  const actor = await getSmsActor(req);
  if (!actor || actor.kind !== "vs") return fail("Ekki heimild", 403);
  const body = await readJson(req);
  const { data: u } = await supabaseAdmin.from("gatt_users").select("id, password_hash").eq("id", actor.id).single();

  if (body.kind === "password") {
    if (!(await verifySecret(String(body.current ?? ""), u?.password_hash))) return fail("Núverandi lykilorð er rangt.", 401);
    const next = String(body.next ?? "");
    const problem = passwordProblem(next);
    if (problem) return fail(problem);
    await supabaseAdmin.from("gatt_users").update({ password_hash: await hashSecret(next), must_change_password: false }).eq("id", actor.id);
    // Önnur tæki og lotur falla úr gildi; þessi lota lifir.
    const jar = await cookies();
    const mine = jar.get(SESSION_COOKIE)?.value;
    await supabaseAdmin.from("gatt_sessions").delete().eq("user_id", actor.id).neq("token_hash", mine ? sha256(mine) : "");
    await supabaseAdmin.from("gatt_devices").delete().eq("user_id", actor.id);
    return json({ ok: true });
  }

  if (body.kind === "pin") {
    if (!(await verifySecret(String(body.password ?? ""), u?.password_hash))) return fail("Lykilorðið er rangt.", 401);
    const pin = String(body.pin ?? "");
    const problem = pinProblem(pin);
    if (problem) return fail(problem);
    await supabaseAdmin.from("gatt_users").update({ pin_hash: await hashSecret(pin) }).eq("id", actor.id);
    return json({ ok: true });
  }
  return fail("Ógild beiðni");
}

export async function DELETE(req: Request) {
  if (!sameOrigin(req)) return fail("Ógild beiðni", 403);
  const actor = await getSmsActor(req);
  if (!actor || actor.kind !== "vs") return fail("Ekki heimild", 403);
  await supabaseAdmin.from("gatt_users").update({ pin_hash: null }).eq("id", actor.id);
  return json({ ok: true });
}
