// Notendur vinnustöðvar: listi og boð.

import { after } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getVsAdmin } from "@/lib/vinnustod/admin";
import { issueAccessLink, normalizeEmail } from "@/lib/vinnustod/auth";
import { cleanLine, fail, json, originOf, readJson, sendVsEmail } from "@/lib/vinnustod/server";

export const runtime = "nodejs";

const DENY = "Krefst stjórnanda með tveggja þrepa auðkenningu";
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function GET(req: Request) {
  const admin = await getVsAdmin(req);
  if (!admin) return fail(DENY, 403);
  const { data, error } = await supabaseAdmin.from("gatt_users")
    .select("id, created_at, name, email, workplace, title, active, source, created_by, password_hash, pin_hash, invite_expires_at, invited_at, activated_at, last_login_at")
    .order("name");
  if (error) return fail(error.message, 500);
  const users = (data ?? []).map(({ password_hash, pin_hash, ...u }) => ({
    ...u,
    activated: Boolean(password_hash),
    has_pin: Boolean(pin_hash),
    invite_pending: Boolean(u.invite_expires_at && new Date(u.invite_expires_at).getTime() > Date.now()),
  }));
  return json({ ok: true, users });
}

export async function POST(req: Request) {
  const admin = await getVsAdmin(req);
  if (!admin) return fail(DENY, 403);
  const body = await readJson(req);
  const name = cleanLine(body.name, 120);
  const email = normalizeEmail(String(body.email ?? ""));
  if (!name) return fail("Sláðu inn nafn.");
  if (!EMAIL_RE.test(email)) return fail("Sláðu inn gilt netfang.");

  const { data: existing } = await supabaseAdmin.from("gatt_users").select("id").eq("email", email).maybeSingle();
  if (existing) return fail("Notandi með þetta netfang er þegar til.", 409);

  const { data: user, error } = await supabaseAdmin.from("gatt_users").insert({
    name, email,
    workplace: cleanLine(body.workplace, 120),
    title: cleanLine(body.title, 80) || "Hjúkrunarfræðingur",
    source: "invite",
    created_by: admin.name,
  }).select("id").single();
  if (error || !user) return fail(error?.message ?? "Vistun mistókst", 500);

  const origin = originOf(req);
  const url = await issueAccessLink(user.id, "invite", origin);
  after(async () => {
    await sendVsEmail({
      to: email,
      subject: "Boð í vinnustöð Fjarlækninga",
      heading: "Þér er boðið í vinnustöð Fjarlækninga",
      paragraphs: [
        `Sæl/l ${name}.`,
        `${admin.name} hjá Fjarlækningum bauð þér aðgang að vinnustöðinni. Þar finnurðu upplýsingar um þjónustuna og tilbúin svör við spurningum sjúklinga, getur sent sjúklingum hlekk á þjónustuna í SMS og spurt okkur beint.`,
        "Smelltu á hnappinn til að velja lykilorð. Hlekkurinn gildir í 14 daga.",
      ],
      cta: { label: "Virkja aðgang", url },
    });
  });
  // Hlekkurinn fer líka til stjórnandans, ef pósturinn skilar sér ekki.
  return json({ ok: true, id: user.id, url });
}
