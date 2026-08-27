// Google Calendar — OAuth and the handful of REST calls we actually make.
//
// Written against fetch rather than the googleapis SDK: we need six endpoints,
// and the SDK is a very large dependency to carry for six endpoints.
//
// SCOPE. We ask for calendar.app.created and nothing else. That grants exactly
// two things: create a secondary calendar, and manage events on calendars this
// app created. It cannot read, change or delete the doctor's own calendar, or
// any other calendar they have access to. This matters beyond good manners —
// the broad `calendar` scope is a restricted scope, which drags a yearly
// third-party security assessment along with it. This one does not.

import { createHmac, timingSafeEqual } from "node:crypto";

const OAUTH_AUTH = "https://accounts.google.com/o/oauth2/v2/auth";
const OAUTH_TOKEN = "https://oauth2.googleapis.com/token";
const OAUTH_REVOKE = "https://oauth2.googleapis.com/revoke";
const CAL = "https://www.googleapis.com/calendar/v3";

export const GOOGLE_SCOPE = "https://www.googleapis.com/auth/calendar.app.created";
/** Name of the calendar we create in the doctor's account. */
export const CALENDAR_NAME = "Fjarlækningar — vaktir";
export const CALENDAR_TZ = "Atlantic/Reykjavik";

export function googleClientId() { return process.env.GOOGLE_CLIENT_ID ?? ""; }
function googleClientSecret() { return process.env.GOOGLE_CLIENT_SECRET ?? ""; }

/**
 * Must match a redirect URI registered on the OAuth client, byte for byte —
 * Google compares it as a string, not as a URL.
 */
export function googleRedirectUri(): string {
  return process.env.GOOGLE_REDIRECT_URI || "https://www.fjarlaekningar.is/api/google/callback";
}

/** False when the OAuth client has not been set up yet; the UI hides itself. */
export function googleConfigured(): boolean {
  return Boolean(googleClientId() && googleClientSecret());
}

// ── state: CSRF protection for the round trip ───────────────────────────────
// The state parameter leaves our control and comes back through the browser, so
// it is signed. It carries the doctor's id — never their access token, which
// would then sit in Google's logs and in browser history.

function stateSecret(): string {
  return process.env.GOOGLE_OAUTH_STATE_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || "";
}
const b64u = (b: Buffer) => b.toString("base64url");

/**
 * Only a path on this site. An absolute URL here would turn the callback into
 * an open redirect — anyone could send a victim through our own domain to
 * somewhere else. "//evil.com" is a protocol-relative URL, so a leading slash
 * alone is not enough of a test.
 */
export function safeReturnPath(p?: string | null): string {
  return typeof p === "string" && p.startsWith("/") && !p.startsWith("//") ? p : "";
}

export function signState(doctorId: string, returnTo = "", ttlSeconds = 900): string {
  const payload = { d: doctorId, r: safeReturnPath(returnTo), exp: Date.now() + ttlSeconds * 1000 };
  const body = b64u(Buffer.from(JSON.stringify(payload)));
  const sig = b64u(createHmac("sha256", stateSecret()).update(body).digest());
  return `${body}.${sig}`;
}

/** Doctor id + return path, or null if the state was forged, altered or stale. */
export function verifyState(state: string): { doctorId: string; returnTo: string } | null {
  const [body, sig] = (state || "").split(".");
  if (!body || !sig) return null;
  const expect = b64u(createHmac("sha256", stateSecret()).update(body).digest());
  const a = Buffer.from(sig), b = Buffer.from(expect);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const { d, r, exp } = JSON.parse(Buffer.from(body, "base64url").toString());
    if (typeof d !== "string" || typeof exp !== "number" || Date.now() >= exp) return null;
    return { doctorId: d, returnTo: safeReturnPath(r) };
  } catch {
    return null;
  }
}

export function consentUrl(doctorId: string, returnTo = ""): string {
  const p = new URLSearchParams({
    client_id: googleClientId(),
    redirect_uri: googleRedirectUri(),
    response_type: "code",
    scope: GOOGLE_SCOPE,
    // offline + consent is what makes Google hand back a refresh token. Without
    // prompt=consent a doctor who has approved before gets none on reconnect,
    // and the connection dies silently an hour later.
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: "true",
    state: signState(doctorId, returnTo),
  });
  return `${OAUTH_AUTH}?${p}`;
}

// ── tokens ──────────────────────────────────────────────────────────────────

export interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  id_token?: string;
}

async function tokenCall(body: Record<string, string>): Promise<TokenResponse> {
  const res = await fetch(OAUTH_TOKEN, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(body),
  });
  const j = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(j.error_description || j.error || `Google token ${res.status}`);
  return j as TokenResponse;
}

export function exchangeCode(code: string) {
  return tokenCall({
    code,
    client_id: googleClientId(),
    client_secret: googleClientSecret(),
    redirect_uri: googleRedirectUri(),
    grant_type: "authorization_code",
  });
}

export function refreshAccessToken(refreshToken: string) {
  return tokenCall({
    refresh_token: refreshToken,
    client_id: googleClientId(),
    client_secret: googleClientSecret(),
    grant_type: "refresh_token",
  });
}

export async function revokeToken(token: string): Promise<void> {
  // Best effort: a token Google has already forgotten returns 400, which is
  // the outcome we wanted anyway.
  await fetch(`${OAUTH_REVOKE}?token=${encodeURIComponent(token)}`, { method: "POST" }).catch(() => {});
}

/**
 * Read sub and email out of the id_token WITHOUT verifying the signature.
 *
 * Safe only because of where it comes from: a direct server-to-server response
 * from Google's token endpoint over TLS, not something a browser handed us. It
 * is used for display, never for authorisation.
 */
export function readIdToken(idToken?: string): { sub?: string; email?: string } {
  if (!idToken) return {};
  try {
    const p = JSON.parse(Buffer.from(idToken.split(".")[1], "base64url").toString());
    return { sub: p.sub, email: p.email };
  } catch {
    return {};
  }
}

// ── calendar ────────────────────────────────────────────────────────────────

async function api(token: string, path: string, init: RequestInit = {}): Promise<Response> {
  return fetch(`${CAL}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });
}

async function json<T>(res: Response, what: string): Promise<T> {
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new GoogleApiError(`${what} (${res.status})`, res.status, body);
  }
  return res.json() as Promise<T>;
}

export class GoogleApiError extends Error {
  constructor(message: string, readonly status: number, readonly body = "") {
    super(message);
    this.name = "GoogleApiError";
  }
  /** The doctor pulled our access at Google's end; reconnecting is the only fix. */
  get isAuthFailure() { return this.status === 401 || this.status === 403; }
  get isGone() { return this.status === 404 || this.status === 410; }
}

export interface GoogleEvent {
  id: string;
  summary?: string;
  description?: string;
  start?: { date?: string; dateTime?: string };
  end?: { date?: string; dateTime?: string };
  status?: string;
}

export async function createCalendar(token: string): Promise<string> {
  const r = await api(token, "/calendars", {
    method: "POST",
    body: JSON.stringify({ summary: CALENDAR_NAME, timeZone: CALENDAR_TZ }),
  });
  const cal = await json<{ id: string }>(r, "Gat ekki búið til dagatal");
  return cal.id;
}

export async function deleteCalendar(token: string, calendarId: string): Promise<void> {
  const r = await api(token, `/calendars/${encodeURIComponent(calendarId)}`, { method: "DELETE" });
  if (!r.ok && r.status !== 404 && r.status !== 410) {
    throw new GoogleApiError(`Gat ekki eytt dagatali (${r.status})`, r.status, await r.text().catch(() => ""));
  }
}

export async function getCalendar(token: string, calendarId: string): Promise<{ id: string } | null> {
  const r = await api(token, `/calendars/${encodeURIComponent(calendarId)}`);
  if (r.status === 404 || r.status === 410) return null;
  return json<{ id: string }>(r, "Gat ekki lesið dagatal");
}

export function insertEvent(token: string, calendarId: string, body: unknown): Promise<GoogleEvent> {
  return api(token, `/calendars/${encodeURIComponent(calendarId)}/events`, {
    method: "POST",
    body: JSON.stringify(body),
  }).then((r) => json<GoogleEvent>(r, "Gat ekki búið til atburð"));
}

export function patchEvent(token: string, calendarId: string, eventId: string, body: unknown): Promise<GoogleEvent> {
  return api(token, `/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  }).then((r) => json<GoogleEvent>(r, "Gat ekki uppfært atburð"));
}

export async function deleteEvent(token: string, calendarId: string, eventId: string): Promise<void> {
  const r = await api(token, `/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`, {
    method: "DELETE",
  });
  // Already gone is success: the doctor may have deleted it by hand.
  if (!r.ok && r.status !== 404 && r.status !== 410) {
    throw new GoogleApiError(`Gat ekki eytt atburði (${r.status})`, r.status, await r.text().catch(() => ""));
  }
}
