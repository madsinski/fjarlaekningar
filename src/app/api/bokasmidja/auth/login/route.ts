// Barn skráir sig inn með fjögurra stafa kóða — aðeins á tæki sem fullorðinn
// hefur opnað. Fimm rangar tilraunir læsa barninu í korter.
//   POST /api/bokasmidja/auth/login  { childId, pin }

import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase-admin";
import {
  LOCK_MINUTES, MAX_PIN_FAILURES, clientIp, deviceTrusted, sameOrigin, startSession, throttle, verifySecret,
} from "@/lib/bokasmidja/auth";
import { UUID_RE, fail, json, readJson } from "@/lib/bokasmidja/server";
import { LANG_COOKIE, isLang } from "@/lib/bokasmidja/types";

export const runtime = "nodejs";

export async function POST(req: Request) {
  if (!sameOrigin(req)) return fail("bad_request", 403);
  if (!(await deviceTrusted())) return fail("device_locked", 401);
  if (!(await throttle(`pin:${clientIp(req)}`, 30, 900))) return fail("too_many", 429);

  const body = await readJson(req);
  const childId = typeof body.childId === "string" ? body.childId : "";
  const pin = typeof body.pin === "string" ? body.pin : "";
  if (!UUID_RE.test(childId) || !/^\d{4}$/.test(pin)) return fail("wrong_pin", 401);

  const { data: child } = await supabaseAdmin.from("bk_children")
    .select("id, lang, pin_hash, pin_failures, locked_until").eq("id", childId).maybeSingle();
  if (child?.locked_until && new Date(child.locked_until).getTime() > Date.now()) return fail("locked", 423);

  const ok = await verifySecret(pin, child?.pin_hash);
  if (!child || !ok) {
    if (child) {
      const failures = (child.pin_failures || 0) + 1;
      const locked = failures >= MAX_PIN_FAILURES;
      await supabaseAdmin.from("bk_children").update({
        pin_failures: locked ? 0 : failures,
        locked_until: locked ? new Date(Date.now() + LOCK_MINUTES * 60_000).toISOString() : null,
      }).eq("id", child.id);
      if (locked) return fail("locked", 423);
    }
    return fail("wrong_pin", 401);
  }

  await supabaseAdmin.from("bk_children")
    .update({ pin_failures: 0, locked_until: null, last_login_at: new Date().toISOString() }).eq("id", child.id);
  const jar = await cookies();
  await startSession(jar, "kid", child.id, req.headers.get("user-agent") || "");
  if (isLang(child.lang)) jar.set(LANG_COOKIE, child.lang, { path: "/", maxAge: 31536000, sameSite: "lax" });
  return json({ ok: true });
}
