// Stillingar vinnustöðvar: hvaða lén mega nýskrá sig, og hverjir fá póst um spurningar.

import { supabaseAdmin } from "@/lib/supabase-admin";
import { getVsAdmin } from "@/lib/vinnustod/admin";
import { allowedDomains, notifyEmails } from "@/lib/vinnustod/auth";
import { fail, json, readJson } from "@/lib/vinnustod/server";
import { nudgeSettings } from "@/lib/vinnustod/nudge";
import { toE164 } from "@/lib/sms";
import { vsAdminEmails } from "@/lib/sms-actor";

export const runtime = "nodejs";

const DENY = "Krefst stjórnanda með tveggja þrepa auðkenningu";
const DOMAIN_RE = /^[a-z0-9-]+(\.[a-z0-9-]+)+$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const list = (v: unknown) => (Array.isArray(v) ? v : String(v ?? "").split(/[\s,;]+/)).map((x) => String(x).trim().toLowerCase()).filter(Boolean);

export async function GET(req: Request) {
  if (!(await getVsAdmin(req))) return fail(DENY, 403);
  const nudge = await nudgeSettings();
  const { data: em } = await supabaseAdmin.from("gatt_settings").select("value").eq("key", "emergency_contact").maybeSingle();
  return json({ ok: true, allowedDomains: await allowedDomains(), notifyEmails: await notifyEmails(), nudgePhone: nudge.phone ?? "", nudgeAfterMinutes: nudge.afterMinutes, vsAdmins: await vsAdminEmails(), emergency: em?.value ?? { name: "", phone: "", note: "" } });
}

export async function PUT(req: Request) {
  if (!(await getVsAdmin(req))) return fail(DENY, 403);
  const body = await readJson(req);
  const now = new Date().toISOString();
  if ("allowedDomains" in body) {
    const domains = [...new Set(list(body.allowedDomains).map((d) => d.replace(/^@/, "")))];
    const bad = domains.find((d) => !DOMAIN_RE.test(d));
    if (bad) return fail(`Ógilt lén: ${bad}`);
    // Almenn netfangalén myndu opna nýskráningu fyrir hvern sem er.
    const open = domains.find((d) => ["gmail.com", "hotmail.com", "outlook.com", "yahoo.com", "icloud.com", "simnet.is", "internet.is"].includes(d));
    if (open) return fail(`${open} er almennt póstlén — þá gæti hver sem er skráð sig.`);
    await supabaseAdmin.from("gatt_settings").upsert({ key: "allowed_domains", value: domains, updated_at: now });
  }
  if ("notifyEmails" in body) {
    const emails = [...new Set(list(body.notifyEmails))];
    const bad = emails.find((e) => !EMAIL_RE.test(e));
    if (bad) return fail(`Ógilt netfang: ${bad}`);
    if (!emails.length) return fail("Að minnsta kosti eitt netfang þarf að fá tilkynningar.");
    await supabaseAdmin.from("gatt_settings").upsert({ key: "notify_emails", value: emails, updated_at: now });
  }
  if ("emergency" in body) {
    const e = (body.emergency ?? {}) as { name?: unknown; phone?: unknown; note?: unknown };
    const rawPhone = String(e.phone ?? "").trim();
    const phone = rawPhone ? toE164(rawPhone) : "";
    if (rawPhone && !phone) return fail("Ógilt neyðarnúmer.");
    await supabaseAdmin.from("gatt_settings").upsert({
      key: "emergency_contact",
      value: { name: String(e.name ?? "").trim().slice(0, 120), phone, note: String(e.note ?? "").trim().slice(0, 200) },
      updated_at: now,
    });
  }
  if ("vsAdmins" in body) {
    const emails = [...new Set(list(body.vsAdmins))];
    const bad = emails.find((e) => !EMAIL_RE.test(e));
    if (bad) return fail(`Ógilt netfang: ${bad}`);
    if (!emails.length) return fail("Að minnsta kosti einn stjórnandi þarf að svara spurningum.");
    // Aðeins starfsmenn með hlutverkið stjórnandi geta svarað.
    const { data: staff } = await supabaseAdmin.from("staff").select("email, role, roles").in("email", emails);
    const ok = new Set((staff ?? []).filter((s) => (Array.isArray(s.roles) && s.roles.length ? s.roles : [s.role]).includes("admin")).map((s) => String(s.email).toLowerCase()));
    const missing = emails.find((e) => !ok.has(e));
    if (missing) return fail(`${missing} er ekki stjórnandi í stjórnborði Fjarlækninga.`);
    await supabaseAdmin.from("gatt_settings").upsert({ key: "vs_admin_emails", value: emails, updated_at: now });
  }
  if ("nudgePhone" in body) {
    const raw = String(body.nudgePhone ?? "").trim();
    const phone = raw ? toE164(raw) : "";
    if (raw && !phone) return fail("Ógilt símanúmer fyrir SMS-áminningu.");
    await supabaseAdmin.from("gatt_settings").upsert({ key: "nudge_phone", value: phone, updated_at: now });
  }
  if ("nudgeAfterMinutes" in body) {
    const n = Math.round(Number(body.nudgeAfterMinutes));
    if (!Number.isFinite(n) || n < 1 || n > 1440) return fail("Mínútur þurfa að vera á bilinu 1–1440.");
    await supabaseAdmin.from("gatt_settings").upsert({ key: "nudge_after_minutes", value: n, updated_at: now });
  }
  return json({ ok: true });
}
