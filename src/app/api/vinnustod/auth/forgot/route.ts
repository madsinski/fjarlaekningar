// Gleymt lykilorð. Svarar alltaf eins, hvort sem netfangið er skráð eða ekki.

import { after } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { clientIp, issueAccessLink, normalizeEmail, sameOrigin, throttle } from "@/lib/vinnustod/auth";
import { fail, json, originOf, readJson, sendVsEmail } from "@/lib/vinnustod/server";

export const runtime = "nodejs";

export async function POST(req: Request) {
  if (!sameOrigin(req)) return fail("Ógild beiðni", 403);
  const body = await readJson(req);
  const email = normalizeEmail(String(body.email ?? ""));
  const origin = originOf(req);
  const allowed = (await throttle(`forgot-ip:${clientIp(req)}`, 10, 3600)) && (await throttle(`forgot:${email}`, 3, 3600));

  after(async () => {
    if (!email || !allowed) return;
    const { data: u } = await supabaseAdmin.from("gatt_users").select("id, name, email, active").eq("email", email).maybeSingle();
    if (!u?.active) return;
    const url = await issueAccessLink(u.id, "reset", origin);
    await sendVsEmail({
      to: u.email,
      subject: "Nýtt lykilorð — vinnustöð Fjarlækninga",
      heading: "Nýtt lykilorð",
      paragraphs: [`Sæl/l ${u.name}.`, "Beðið var um nýtt lykilorð að vinnustöð Fjarlækninga. Hlekkurinn gildir í 2 klukkustundir."],
      cta: { label: "Velja nýtt lykilorð", url },
      foot: "Ef þú baðst ekki um þetta máttu hunsa póstinn — lykilorðið þitt er óbreytt.",
    });
  });
  return json({ ok: true });
}
