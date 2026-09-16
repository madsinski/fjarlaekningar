// Tilkynningar um ný skilaboð í Vinnustöðinni — strax, í báðar áttir. Server-only.
//
// TVÆR LEIÐIR, því hvor nær til ólíkra aðstæðna:
//   1. Merki (Supabase Realtime broadcast): opnar síður — líka í bakgrunnsflipa —
//      fá „ping“ um leið og skilaboð eru vistuð og sækja stöðuna sjálfar.
//      Merkið ber ekkert efni; rásarheitið er leynilegt (HMAC af viðtakanda),
//      svo sá sem veit það ekki getur ekki hlustað.
//   2. Web Push: tilkynning í tækið þótt síðan sé lokuð, fyrir þá sem hafa
//      leyft tilkynningar (gatt_push_subscriptions).
//
// Hver fær hvað: skilaboð frá starfsmanni → allir stjórnendur; skilaboð frá
// stjórnanda → eigandi samtalsins.

import { createHmac } from "node:crypto";
import webpush from "web-push";
import { supabaseAdmin } from "@/lib/supabase-admin";
import type { SmsActor } from "@/lib/sms-actor";

type Kind = SmsActor["kind"];
export type LiveTarget = { admins: true } | { everyone: true } | { kind: Kind; id: string };

function secret(): string {
  return process.env.VS_LIVE_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || "";
}

/** Leynilegt rásarheiti fyrir viðtakanda. */
export function liveTopic(target: LiveTarget): string {
  const who = "admins" in target ? "admins" : "everyone" in target ? "everyone" : `${target.kind}:${target.id}`;
  return `vs-${createHmac("sha256", secret()).update(`vinnustod-live:${who}`).digest("hex").slice(0, 32)}`;
}

export function vapidPublicKey(): string | null {
  return process.env.VAPID_PUBLIC_KEY || null;
}

let vapidReady = false;
function ensureVapid(): boolean {
  if (vapidReady) return true;
  const pub = process.env.VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv) return false;
  webpush.setVapidDetails(process.env.VAPID_SUBJECT || "mailto:fjarlaekningar@fjarlaekningar.is", pub, priv);
  vapidReady = true;
  return true;
}

async function broadcast(topic: string, event: "msg" | "sync" = "msg"): Promise<void> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return;
  await fetch(`${url}/realtime/v1/api/broadcast`, {
    method: "POST",
    headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ messages: [{ topic, event, payload: { at: Date.now() }, private: false }] }),
  }).catch(() => {});
}

async function push(target: LiveTarget, note: { title: string; body: string; url: string; tag: string }): Promise<void> {
  if (!ensureVapid()) return;
  let q = supabaseAdmin.from("gatt_push_subscriptions").select("id, endpoint, p256dh, auth");
  if (!("everyone" in target)) {
    q = "admins" in target ? q.eq("is_admin", true) : q.eq("owner_kind", target.kind).eq("owner_id", target.id);
  }
  const { data: rows } = await q;
  // Sama tæki getur verið skráð fyrir fleiri en eina innskráningu — ein tilkynning á tæki.
  const seen = new Set<string>();
  const data = (rows ?? []).filter((r) => (seen.has(r.endpoint) ? false : (seen.add(r.endpoint), true)));
  await Promise.all((data ?? []).map(async (s) => {
    try {
      await webpush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        JSON.stringify(note),
        { TTL: 60 * 60 * 24, urgency: "high" },
      );
      await supabaseAdmin.from("gatt_push_subscriptions").update({ last_used_at: new Date().toISOString() }).eq("id", s.id);
    } catch (e) {
      // 404/410: tækið hefur afturkallað áskriftina — henni er eytt.
      const code = (e as { statusCode?: number }).statusCode;
      console.warn("[vinnustod] push failed", code ?? (e as Error).message?.slice(0, 80));
      if (code === 404 || code === 410) await supabaseAdmin.from("gatt_push_subscriptions").delete().eq("id", s.id);
    }
  }));
}

/**
 * Nýtt skeyti í samtali: láta hina hliðina vita strax. Kallað úr addMessage
 * (inni í after(), svo svarið til sendandans bíður ekki).
 */
export async function signalNewMessage(threadId: string, from: "user" | "staff", authorName: string, message: string): Promise<void> {
  const { data: t } = await supabaseAdmin.from("gatt_threads")
    .select("subject, owner_kind, user_id, owner_staff, owner_hsu").eq("id", threadId).maybeSingle();
  if (!t) return;
  // Tilkynningin sýnir upphaf nýju skilaboðanna (ekki fyrirsögn samtalsins).
  const preview = (message ?? "").replace(/\s+/g, " ").trim();
  const subject = preview.length > 140 ? `${preview.slice(0, 139)}…` : preview || String(t.subject ?? "");
  if (from === "user") {
    await Promise.all([
      broadcast(liveTopic({ admins: true })),
      push({ admins: true }, {
        title: `Ný skilaboð frá ${authorName}`,
        body: subject,
        url: "/admin/vinnustod?t=spurningar",
        tag: `vs-${threadId}-${Date.now()}`,
      }),
    ]);
    return;
  }
  const kind = t.owner_kind as Kind;
  const id = (kind === "vs" ? t.user_id : kind === "staff" ? t.owner_staff : t.owner_hsu) as string | null;
  if (!id) return;
  await Promise.all([
    broadcast(liveTopic({ kind, id })),
    push({ kind, id }, {
      title: "Ný skilaboð frá Fjarlækningum",
      body: subject,
      url: "/vinnustod?t=spurningar",
      tag: `vs-${threadId}-${Date.now()}`,
    }),
  ]);
}

/** Rás eiganda samtals, út frá röðinni í gatt_threads. */
export function ownerTarget(t: { owner_kind: string; user_id: string | null; owner_staff: string | null; owner_hsu: string | null }): LiveTarget | null {
  const kind = t.owner_kind as Kind;
  const id = kind === "vs" ? t.user_id : kind === "staff" ? t.owner_staff : t.owner_hsu;
  return id ? { kind, id } : null;
}

/**
 * Samtali eytt (eða breytt án nýrra skilaboða): báðar hliðar sækja listann
 * aftur. Ekkert hljóð og engin tilkynning í tæki.
 */
export async function signalSync(owner: LiveTarget | null): Promise<void> {
  await Promise.all([
    broadcast(liveTopic({ admins: true }), "sync"),
    owner ? broadcast(liveTopic(owner), "sync") : Promise.resolve(),
  ]);
}

/**
 * Tilkynningum breytt: allar opnar vinnustöðvar sækja þær strax. Ný virk
 * tilkynning fer líka í öll tæki sem hafa leyft tilkynningar.
 */
export async function signalAnnouncements(fresh?: { id: string; title: string; body: string; level: string }): Promise<void> {
  await Promise.all([
    broadcast(liveTopic({ everyone: true }), "sync"),
    fresh ? push({ everyone: true }, {
      title: `${fresh.level === "warning" ? "⚠ Mikilvæg tilkynning" : "Tilkynning"}: ${fresh.title}`.slice(0, 120),
      body: fresh.body.slice(0, 160),
      url: "/vinnustod",
      tag: `vs-ann-${fresh.id}`,
    }) : Promise.resolve(),
  ]);
}
