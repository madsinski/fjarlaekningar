// Vinnustöð — innskráning hjúkrunarfræðinga og annars starfsfólks
// samstarfsstofnana.
//
// Sama hönnun og í HSU-vaktakerfinu (sjá src/lib/hsu/auth.ts), og sömu
// grunnföll: scrypt, tákn sem aðeins eru geymd sem SHA-256, httpOnly-kökur,
// aðgangskóði bundinn við traust tæki, læsing eftir rangar tilraunir og
// takmörkun á IP-tölu. Eigin töflur og eigin kökur, svo lota í vinnustöðinni
// og lota í vaktakerfinu trufli ekki hvor aðra í sama vafra.
//
// Server-only.

import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { newToken, sha256, type CookieJar } from "@/lib/hsu/auth";

export {
  clientIp, hashSecret, passwordProblem, pinProblem, sameOrigin, sha256, verifySecret,
} from "@/lib/hsu/auth";
import { throttle as hsuThrottle } from "@/lib/hsu/auth";

export const SESSION_COOKIE = "vs_session";
export const DEVICE_COOKIE = "vs_device";
export const SESSION_HOURS = 12;
export const DEVICE_DAYS = 90;
export const MAX_PASSWORD_FAILURES = 8;
export const LOCK_MINUTES = 15;
export const MAX_PIN_FAILURES = 5;
export const INVITE_DAYS = 14;

/** Takmörkun á tilraunum — sama tafla og vaktakerfið, eigin forskeyti. */
export const throttle = (key: string, limit: number, windowSeconds: number) => hsuThrottle(`vs:${key}`, limit, windowSeconds);

const isProd = process.env.NODE_ENV === "production";

export function normalizeEmail(raw: string): string {
  return (raw || "").trim().toLowerCase();
}

export interface VsUser {
  id: string;
  name: string;
  email: string;
  workplace: string;
  title: string;
  must_change_password: boolean;
  has_pin: boolean;
}

export async function startSession(jar: CookieJar, userId: string, method: "password" | "pin" | "invite", userAgent: string) {
  const token = newToken();
  const expires = new Date(Date.now() + SESSION_HOURS * 3600_000);
  await supabaseAdmin.from("gatt_sessions").insert({
    user_id: userId, token_hash: sha256(token), method,
    user_agent: userAgent.slice(0, 300), expires_at: expires.toISOString(),
  });
  await supabaseAdmin.from("gatt_users")
    .update({ last_login_at: new Date().toISOString(), failed_logins: 0, locked_until: null })
    .eq("id", userId);
  jar.set(SESSION_COOKIE, token, { httpOnly: true, secure: isProd, sameSite: "lax", path: "/", expires });
}

/** Traust tæki: forsenda þess að aðgangskóðinn virki. */
export async function trustDevice(jar: CookieJar, userId: string, userAgent: string, existingToken?: string) {
  const expires = new Date(Date.now() + DEVICE_DAYS * 86400_000);
  if (existingToken) {
    const { data } = await supabaseAdmin.from("gatt_devices")
      .update({ expires_at: expires.toISOString(), last_used_at: new Date().toISOString(), pin_failures: 0 })
      .eq("token_hash", sha256(existingToken)).eq("user_id", userId).select("id");
    if (data?.length) {
      jar.set(DEVICE_COOKIE, existingToken, { httpOnly: true, secure: isProd, sameSite: "lax", path: "/", expires });
      return;
    }
  }
  const token = newToken();
  await supabaseAdmin.from("gatt_devices").insert({
    user_id: userId, token_hash: sha256(token), user_agent: userAgent.slice(0, 300), expires_at: expires.toISOString(),
  });
  jar.set(DEVICE_COOKIE, token, { httpOnly: true, secure: isProd, sameSite: "lax", path: "/", expires });
}

/** Innskráður notandi vinnustöðvar, eða null. */
export async function getVsUser(): Promise<VsUser | null> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token || token.length < 20) return null;
  const { data: s } = await supabaseAdmin.from("gatt_sessions")
    .select("id, user_id, expires_at, last_seen_at").eq("token_hash", sha256(token)).maybeSingle();
  if (!s || new Date(s.expires_at).getTime() < Date.now()) return null;
  const { data: u } = await supabaseAdmin.from("gatt_users")
    .select("id, name, email, workplace, title, active, must_change_password, pin_hash")
    .eq("id", s.user_id).maybeSingle();
  if (!u || !u.active) return null;
  if (Date.now() - new Date(s.last_seen_at).getTime() > 300_000) {
    void supabaseAdmin.from("gatt_sessions").update({ last_seen_at: new Date().toISOString() }).eq("id", s.id).then(() => {});
  }
  return {
    id: u.id, name: u.name, email: u.email, workplace: u.workplace, title: u.title,
    must_change_password: u.must_change_password, has_pin: Boolean(u.pin_hash),
  };
}

export async function endSession(jar: CookieJar & { get: (n: string) => { value: string } | undefined }) {
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) await supabaseAdmin.from("gatt_sessions").delete().eq("token_hash", sha256(token));
  jar.delete(SESSION_COOKIE);
}

/**
 * Nýr hlekkur til að virkja aðgang eða velja nýtt lykilorð. Aðeins SHA-256 er
 * geymt. Nýr hlekkur ógildir þann gamla.
 */
export async function issueAccessLink(userId: string, kind: "invite" | "reset", origin: string): Promise<string> {
  const token = newToken();
  const hours = kind === "invite" ? INVITE_DAYS * 24 : 2;
  const patch: Record<string, unknown> = {
    invite_token_hash: sha256(token),
    invite_expires_at: new Date(Date.now() + hours * 3600_000).toISOString(),
  };
  if (kind === "invite") patch.invited_at = new Date().toISOString();
  const { error } = await supabaseAdmin.from("gatt_users").update(patch).eq("id", userId);
  if (error) throw new Error(error.message);
  return `${origin}/vinnustod/virkja/${token}`;
}

/** Lén sem mega nýskrá sig sjálf, t.d. ["hsu.is"]. */
export async function allowedDomains(): Promise<string[]> {
  const { data } = await supabaseAdmin.from("gatt_settings").select("value").eq("key", "allowed_domains").maybeSingle();
  return Array.isArray(data?.value) ? (data!.value as unknown[]).map((d) => String(d).toLowerCase()) : [];
}

export async function notifyEmails(): Promise<string[]> {
  const { data } = await supabaseAdmin.from("gatt_settings").select("value").eq("key", "notify_emails").maybeSingle();
  return Array.isArray(data?.value) ? (data!.value as unknown[]).map(String).filter((e) => e.includes("@")) : [];
}
