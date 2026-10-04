// Bókasmiðjan — innskráning barna og foreldra.
//
// Sömu grunnföll og í HSU-vaktakerfinu (src/lib/hsu/auth.ts): scrypt, tákn sem
// aðeins eru geymd sem SHA-256 og httpOnly-kökur. Munurinn er að hér er enginn
// tölvupóstur og ekkert lykilorð á barn:
//
//   1. Fullorðinn opnar tækið einu sinni með foreldrakóða (BOKASMIDJA_PARENT_CODE).
//      Fyrr sjást hvorki nöfn barnanna né talnaborðið, svo fjögurra stafa kóði
//      verður aldrei reyndur af netinu.
//   2. Barn velur myndina sína og slær inn kóðann. Fimm rangar tilraunir læsa
//      barninu í korter.
//
// Server-only.

import { createHash, timingSafeEqual } from "node:crypto";
import { cache } from "react";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { newToken, sha256, throttle as hsuThrottle, type CookieJar } from "@/lib/hsu/auth";
import { isLang, type Child, type Viewer } from "./types";

export { clientIp, hashSecret, sameOrigin, verifySecret } from "@/lib/hsu/auth";

export const SESSION_COOKIE = "bk_session";
export const DEVICE_COOKIE = "bk_device";
export const KID_SESSION_HOURS = 12;
export const PARENT_SESSION_HOURS = 2;
export const DEVICE_DAYS = 365;
export const MAX_PIN_FAILURES = 5;
export const LOCK_MINUTES = 15;

/** Takmörkun á tilraunum — sama tafla og vaktakerfið, eigið forskeyti. */
export const throttle = (key: string, limit: number, windowSeconds: number) => hsuThrottle(`bk:${key}`, limit, windowSeconds);

const isProd = process.env.NODE_ENV === "production";
const cookieOpts = (expires: Date) => ({ httpOnly: true, secure: isProd, sameSite: "lax" as const, path: "/", expires });

export const parentCodeConfigured = () => (process.env.BOKASMIDJA_PARENT_CODE || "").trim().length >= 6;

/** Ber foreldrakóðann saman í föstum tíma. */
export function checkParentCode(code: string): boolean {
  const want = (process.env.BOKASMIDJA_PARENT_CODE || "").trim();
  if (want.length < 6) return false;
  const a = createHash("sha256").update(code.trim()).digest();
  const b = createHash("sha256").update(want).digest();
  return timingSafeEqual(a, b);
}

/** Fjórir tölustafir; ekki sami stafur fjórum sinnum og ekki augljósar raðir. */
export function pinOk(pin: string): boolean {
  return /^\d{4}$/.test(pin) && !/^(\d)\1{3}$/.test(pin) && !["1234", "4321", "0123", "9876"].includes(pin);
}

export async function trustDevice(jar: CookieJar, userAgent: string) {
  const token = newToken();
  const expires = new Date(Date.now() + DEVICE_DAYS * 86400_000);
  await supabaseAdmin.from("bk_devices").insert({
    token_hash: sha256(token), user_agent: userAgent.slice(0, 300), expires_at: expires.toISOString(),
  });
  jar.set(DEVICE_COOKIE, token, cookieOpts(expires));
}

/** Er þetta tæki opnað af fullorðnum? */
export async function deviceTrusted(): Promise<boolean> {
  const jar = await cookies();
  const token = jar.get(DEVICE_COOKIE)?.value;
  if (!token || token.length < 20) return false;
  const { data } = await supabaseAdmin.from("bk_devices")
    .select("id, expires_at").eq("token_hash", sha256(token)).maybeSingle();
  return !!data && new Date(data.expires_at).getTime() > Date.now();
}

export async function startSession(jar: CookieJar, role: "kid" | "parent", childId: string | null, userAgent: string) {
  const token = newToken();
  const hours = role === "parent" ? PARENT_SESSION_HOURS : KID_SESSION_HOURS;
  const expires = new Date(Date.now() + hours * 3600_000);
  await supabaseAdmin.from("bk_sessions").insert({
    token_hash: sha256(token), role, child_id: childId,
    user_agent: userAgent.slice(0, 300), expires_at: expires.toISOString(),
  });
  jar.set(SESSION_COOKIE, token, cookieOpts(expires));
}

export async function endSession(jar: CookieJar & { get: (n: string) => { value: string } | undefined }) {
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) await supabaseAdmin.from("bk_sessions").delete().eq("token_hash", sha256(token));
  jar.delete(SESSION_COOKIE);
}

export const CHILD_COLUMNS = "id, name, avatar, color, lang, age";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function toChild(r: any): Child {
  return { id: r.id, name: r.name, avatar: r.avatar, color: r.color, lang: isLang(r.lang) ? r.lang : "is", age: r.age ?? null };
}

/** Innskráð barn eða foreldri, eða null. Virkar í síðum og í API-leiðum; ein uppfletting á beiðni. */
export const getViewer = cache(async (): Promise<Viewer | null> => {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token || token.length < 20) return null;
  const { data: s } = await supabaseAdmin.from("bk_sessions")
    .select("role, child_id, expires_at").eq("token_hash", sha256(token)).maybeSingle();
  if (!s || new Date(s.expires_at).getTime() < Date.now()) return null;
  if (s.role === "parent") return { role: "parent", child: null };
  if (!s.child_id) return null;
  const { data: c } = await supabaseAdmin.from("bk_children").select(CHILD_COLUMNS).eq("id", s.child_id).maybeSingle();
  return c ? { role: "kid", child: toChild(c) } : null;
});
