// HSU innskráning — lykilorð, 4 stafa aðgangskóði og lotur.
//
// Sér innskráning, ekki Supabase Auth. Ástæðurnar:
//   * Læknar HSU mega ekki verða að notendum í auth.users Fjarlækninga — þá
//     gæti einhver RLS-regla sem treystir "authenticated" hleypt þeim inn.
//   * Supabase á enga hugmynd um fjögurra stafa aðgangskóða.
//   * Lota í localStorage myndi rekast á lotu starfsmanns Fjarlækninga í sama
//     vafra; hér er lotan httpOnly-kaka með eigið nafn.
//
// Server-only. Aldrei flytja inn í "use client" skrá.

import { LANG_COOKIE, LANG_COOKIE_OPTS, isLang } from "./i18n/core";
import { createHash, randomBytes, scrypt as scryptCb, timingSafeEqual, type ScryptOptions } from "node:crypto";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase-admin";
import type { HsuRole } from "./types";

function scrypt(password: string, salt: Buffer, keylen: number, opts: ScryptOptions): Promise<Buffer> {
  return new Promise((resolve, reject) =>
    scryptCb(password, salt, keylen, opts, (err, key) => (err ? reject(err) : resolve(key))),
  );
}

export const SESSION_COOKIE = "hsu_session";
export const DEVICE_COOKIE = "hsu_device";
/** Vinnudagur og vel það. Aðgangskóðinn gerir endurinnskráningu fljótlega. */
export const SESSION_HOURS = 12;
export const DEVICE_DAYS = 90;
export const MAX_PASSWORD_FAILURES = 8;
export const LOCK_MINUTES = 15;
export const MAX_PIN_FAILURES = 5;
export const INVITE_DAYS = 14;

// ── Hashing ─────────────────────────────────────────────────────────────────

const N = 16384, R = 8, P = 1, KEYLEN = 64;

export async function hashSecret(secret: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await scrypt(secret, salt, KEYLEN, { N, r: R, p: P, maxmem: 64 * 1024 * 1024 });
  return `scrypt$${N}$${R}$${P}$${salt.toString("base64url")}$${key.toString("base64url")}`;
}

export async function verifySecret(secret: string, stored: string | null | undefined): Promise<boolean> {
  if (!stored) {
    // Sama tímanotkun hvort sem notandinn er til eða ekki.
    await scrypt(secret || "x", randomBytes(16), KEYLEN, { N, r: R, p: P, maxmem: 64 * 1024 * 1024 });
    return false;
  }
  const [alg, n, r, p, saltB64, keyB64] = stored.split("$");
  if (alg !== "scrypt") return false;
  const expected = Buffer.from(keyB64, "base64url");
  const got = await scrypt(secret, Buffer.from(saltB64, "base64url"), expected.length, {
    N: Number(n), r: Number(r), p: Number(p), maxmem: 64 * 1024 * 1024,
  });
  return got.length === expected.length && timingSafeEqual(got, expected);
}

export const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");
export const newToken = (bytes = 32) => randomBytes(bytes).toString("base64url");

export function passwordProblem(pw: string): string | null {
  if (typeof pw !== "string" || pw.length < 10) return "Lykilorð þarf að vera minnst 10 stafir.";
  if (pw.length > 200) return "Lykilorð er of langt.";
  if (!/[A-Za-zÁÐÉÍÓÚÝÞÆÖáðéíóúýþæö]/.test(pw) || !/[0-9]/.test(pw)) return "Lykilorð þarf að innihalda bæði bókstafi og tölustafi.";
  return null;
}

export function pinProblem(pin: string): string | null {
  if (!/^\d{4}$/.test(pin || "")) return "Aðgangskóði er nákvæmlega 4 tölustafir.";
  if (/^(\d)\1{3}$/.test(pin) || ["1234", "4321", "0123", "9876"].includes(pin)) return "Veldu kóða sem er ekki augljós (t.d. ekki 1111 eða 1234).";
  return null;
}

// ── Lotur ───────────────────────────────────────────────────────────────────

const isProd = process.env.NODE_ENV === "production";

export interface CookieJar {
  get?: (name: string) => { value: string } | undefined;
  set: (name: string, value: string, opts: Record<string, unknown>) => unknown;
  delete: (name: string) => unknown;
}

export async function startSession(
  jar: CookieJar,
  doctorId: string,
  method: "password" | "pin" | "invite",
  userAgent: string,
): Promise<void> {
  const token = newToken();
  const expires = new Date(Date.now() + SESSION_HOURS * 3600_000);
  await supabaseAdmin.from("hsu_sessions").insert({
    doctor_id: doctorId,
    token_hash: sha256(token),
    method,
    user_agent: userAgent.slice(0, 300),
    expires_at: expires.toISOString(),
  });
  // Tungumál: val á innskráningarsíðunni vistast á lækninn; annars gildir hans.
  const chosen = jar.get?.(LANG_COOKIE)?.value;
  const { data: me } = await supabaseAdmin
    .from("hsu_doctors")
    .update({ last_login_at: new Date().toISOString(), failed_logins: 0, locked_until: null, ...(isLang(chosen) ? { lang: chosen } : {}) })
    .eq("id", doctorId)
    .select("lang")
    .maybeSingle();
  jar.set(SESSION_COOKIE, token, { httpOnly: true, secure: isProd, sameSite: "lax", path: "/", expires });
  if (!isLang(chosen) && isLang(me?.lang)) jar.set(LANG_COOKIE, me.lang, LANG_COOKIE_OPTS);
}

/** Treyst tæki: forsenda þess að aðgangskóði virki. */
export async function trustDevice(jar: CookieJar, doctorId: string, userAgent: string, existingToken?: string): Promise<void> {
  const expires = new Date(Date.now() + DEVICE_DAYS * 86400_000);
  if (existingToken) {
    const { data } = await supabaseAdmin
      .from("hsu_devices")
      .update({ expires_at: expires.toISOString(), last_used_at: new Date().toISOString(), pin_failures: 0 })
      .eq("token_hash", sha256(existingToken))
      .eq("doctor_id", doctorId)
      .select("id");
    if (data?.length) {
      jar.set(DEVICE_COOKIE, existingToken, { httpOnly: true, secure: isProd, sameSite: "lax", path: "/", expires });
      return;
    }
  }
  const token = newToken();
  await supabaseAdmin.from("hsu_devices").insert({
    doctor_id: doctorId,
    token_hash: sha256(token),
    user_agent: userAgent.slice(0, 300),
    expires_at: expires.toISOString(),
  });
  jar.set(DEVICE_COOKIE, token, { httpOnly: true, secure: isProd, sameSite: "lax", path: "/", expires });
}

export interface HsuDoctorSession {
  id: string;
  name: string;
  email: string;
  role: HsuRole;
  must_change_password: boolean;
  has_pin: boolean;
}

/** Innskráður læknir út frá köku, eða null. Virkar í server components og route handlers. */
export async function getDoctorSession(): Promise<HsuDoctorSession | null> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token || token.length < 20) return null;
  const { data: s } = await supabaseAdmin
    .from("hsu_sessions")
    .select("id, doctor_id, expires_at, last_seen_at")
    .eq("token_hash", sha256(token))
    .maybeSingle();
  if (!s || new Date(s.expires_at).getTime() < Date.now()) return null;
  const { data: d } = await supabaseAdmin
    .from("hsu_doctors")
    .select("id, name, email, role, active, must_change_password, pin_hash")
    .eq("id", s.doctor_id)
    .maybeSingle();
  if (!d || !d.active) return null;
  // Síðast séð: uppfært í mesta lagi á 5 mín fresti.
  if (Date.now() - new Date(s.last_seen_at).getTime() > 300_000) {
    void supabaseAdmin.from("hsu_sessions").update({ last_seen_at: new Date().toISOString() }).eq("id", s.id).then(() => {});
  }
  return {
    id: d.id, name: d.name, email: d.email, role: d.role as HsuRole,
    must_change_password: d.must_change_password, has_pin: Boolean(d.pin_hash),
  };
}

export async function endSession(jar: CookieJar & { get: (n: string) => { value: string } | undefined }): Promise<void> {
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) await supabaseAdmin.from("hsu_sessions").delete().eq("token_hash", sha256(token));
  jar.delete(SESSION_COOKIE);
}

// ── Hver er að kalla? ───────────────────────────────────────────────────────
// Stjórnborð HSU má opna á tvo vegu: yfirlæknir HSU með sína lotu, eða
// stjórnandi Fjarlækninga (Mads) með starfsmannalotu sem hefur staðist MFA.

export type HsuActor =
  | { kind: "doctor"; doctor: HsuDoctorSession; canManage: boolean; label: string }
  | { kind: "staff"; staffId: string; name: string; canManage: true; label: string };

function jwtAal(token: string): string | null {
  try {
    return JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString()).aal ?? null;
  } catch {
    return null;
  }
}

export async function getHsuActor(req: Request): Promise<HsuActor | null> {
  const auth = req.headers.get("authorization");
  if (auth?.startsWith("Bearer ")) {
    const token = auth.slice(7);
    const { data, error } = await supabaseAdmin.auth.getUser(token);
    if (!error && data.user?.id) {
      const { data: staff } = await supabaseAdmin
        .from("staff")
        .select("id, name, role, roles, active")
        .eq("id", data.user.id)
        .maybeSingle();
      const roles: string[] = Array.isArray(staff?.roles) && staff.roles.length ? staff.roles : [staff?.role];
      // getUser staðfesti undirskriftina; aal er þá traust krafa í sama lykli.
      if (staff?.active && roles.includes("admin") && jwtAal(token) === "aal2") {
        return { kind: "staff", staffId: staff.id, name: staff.name, canManage: true, label: `${staff.name} (Fjarlækningar)` };
      }
    }
  }
  const doctor = await getDoctorSession();
  if (doctor) return { kind: "doctor", doctor, canManage: doctor.role === "head", label: doctor.name };
  return null;
}

/**
 * Vörn gegn CSRF á breytingum: kakan er SameSite=Lax, og auk þess verður
 * Origin (þegar vafrinn sendir hann) að vera þessi sama síða.
 */
export function sameOrigin(req: Request): boolean {
  const origin = req.headers.get("origin");
  // Vafrar senda Origin með POST/PUT/DELETE. Vanti hann tökum við aðeins
  // beiðni sem vafrinn sjálfur merkir sem af sömu síðu.
  if (!origin) return req.headers.get("sec-fetch-site") === "same-origin";
  try {
    return new URL(origin).host === new URL(req.url).host;
  } catch {
    return false;
  }
}

/** IP-tala beiðanda. Á Vercel setur netið sjálft fyrsta gildi x-forwarded-for. */
export function clientIp(req: Request): string {
  return (req.headers.get("x-forwarded-for")?.split(",")[0] || req.headers.get("x-real-ip") || "unknown").trim();
}

/**
 * Skráir tilraun og segir hvort hún sé innan marka. Talið í gagnagrunni, ekki í
 * minni, því serverless-tilvik eru mörg og skammlíf.
 */
export async function throttle(key: string, limit: number, windowSeconds: number): Promise<boolean> {
  const since = new Date(Date.now() - windowSeconds * 1000).toISOString();
  const { count } = await supabaseAdmin
    .from("hsu_auth_throttle")
    .select("id", { count: "exact", head: true })
    .eq("key", key)
    .gte("at", since);
  if ((count ?? 0) >= limit) return false;
  await supabaseAdmin.from("hsu_auth_throttle").insert({ key });
  // Tiltekt: línur eldri en sólarhringur skipta engu máli lengur.
  if (Math.random() < 0.02) {
    void supabaseAdmin.from("hsu_auth_throttle").delete().lt("at", new Date(Date.now() - 86400_000).toISOString()).then(() => {});
  }
  return true;
}

/**
 * Nýr virkjunar-/endurstillingarhlekkur. Aðeins SHA-256 er geymt; hlekkurinn
 * sjálfur fer í póst eða til stjórnanda og er ekki hægt að endurheimta.
 * Nýr hlekkur ógildir þann gamla.
 */
export async function issueAccessLink(doctorId: string, kind: "invite" | "reset", origin: string): Promise<string> {
  const token = newToken();
  const hours = kind === "invite" ? INVITE_DAYS * 24 : 2;
  const patch: Record<string, unknown> = {
    invite_token_hash: sha256(token),
    invite_expires_at: new Date(Date.now() + hours * 3600_000).toISOString(),
  };
  if (kind === "invite") patch.invited_at = new Date().toISOString();
  const { error } = await supabaseAdmin.from("hsu_doctors").update(patch).eq("id", doctorId);
  if (error) throw new Error(error.message);
  return `${origin}/hsu/virkja/${token}`;
}

export async function audit(actor: string, action: string, month: string | null, detail: Record<string, unknown> = {}) {
  await supabaseAdmin.from("hsu_audit").insert({ actor, action, month, detail });
}
