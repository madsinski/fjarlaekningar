// Innskráning læknis með notandanafni (@hsu.is) og lykilorði.

import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase-admin";
import {
  DEVICE_COOKIE, LOCK_MINUTES, MAX_PASSWORD_FAILURES,
  clientIp, sameOrigin, startSession, throttle, trustDevice, verifySecret, sha256,
} from "@/lib/hsu/auth";
import { fail, json, readJson } from "@/lib/hsu/server";
import { normalizeEmail } from "@/lib/hsu/types";
import { tr } from "@/lib/hsu/i18n/server";
import { apiDoctor } from "@/lib/hsu/i18n/messages/api-doctor";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const t = tr(req, apiDoctor);
  if (!sameOrigin(req)) return fail(t("req.invalid"), 403);
  const body = await readJson(req);
  const email = normalizeEmail(String(body.email ?? ""));
  const password = String(body.password ?? "");
  if (!email || !password) return fail(t("login.missing"));
  // Læsing á reikning stöðvar ekki þann sem prófar eitt lykilorð á alla lækna.
  if (!(await throttle(`login:${clientIp(req)}`, 30, 900))) {
    return fail(t("login.tooManyNetwork"), 429);
  }
  // Á hvert netfang, óháð því hvort það er skráð: sá sem prófar lykilorð nær
  // aldrei læsingunni, sem annars segði að reikningurinn væri til.
  if (!(await throttle(`login-email:${email}`, 6, 900))) {
    return fail(t("login.tooMany"), 429);
  }

  const { data: d } = await supabaseAdmin
    .from("hsu_doctors")
    .select("id, role, active, password_hash, pin_hash, failed_logins, locked_until, must_change_password")
    .eq("email", email)
    .maybeSingle();

  if (d?.locked_until && new Date(d.locked_until).getTime() > Date.now()) {
    const mins = Math.ceil((new Date(d.locked_until).getTime() - Date.now()) / 60000);
    return fail(t("login.locked", { mins }), 429);
  }

  // verifySecret keyrir scrypt líka þegar notandinn er ekki til, svo svartíminn
  // segi ekki til um hvaða netföng eru skráð.
  const ok = await verifySecret(password, d?.active ? d.password_hash : null);
  if (!d || !d.active || !ok) {
    if (d) {
      const failures = (d.failed_logins ?? 0) + 1;
      await supabaseAdmin
        .from("hsu_doctors")
        .update(
          failures >= MAX_PASSWORD_FAILURES
            ? { failed_logins: 0, locked_until: new Date(Date.now() + LOCK_MINUTES * 60000).toISOString() }
            : { failed_logins: failures },
        )
        .eq("id", d.id);
    }
    return fail(t("login.wrong"), 401);
  }

  const jar = await cookies();
  const ua = req.headers.get("user-agent") ?? "";
  await startSession(jar, d.id, "password", ua);

  // Tækið sem skráði sig inn með lykilorði verður traust — þaðan virkar
  // aðgangskóðinn næst. Eigin tækiskaka annars læknis er aldrei endurnýtt.
  const existing = jar.get(DEVICE_COOKIE)?.value;
  let reuse: string | undefined;
  if (existing) {
    const { data: dev } = await supabaseAdmin.from("hsu_devices").select("doctor_id").eq("token_hash", sha256(existing)).maybeSingle();
    if (dev?.doctor_id === d.id) reuse = existing;
  }
  await trustDevice(jar, d.id, ua, reuse);

  return json({
    ok: true,
    role: d.role,
    mustChangePassword: d.must_change_password,
    hasPin: Boolean(d.pin_hash),
    next: d.must_change_password ? "/hsu/min-sida?t=stillingar" : d.role === "head" ? "/hsu/stjorn" : "/hsu/min-sida",
  });
}
