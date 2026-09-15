// Gleymt lykilorð. Svarar alltaf eins, hvort sem netfangið er skráð eða ekki.

import { after } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { clientIp, issueAccessLink, sameOrigin, throttle } from "@/lib/hsu/auth";
import { fail, hsuEmailHtml, json, originOf, readJson, sendHsuEmail } from "@/lib/hsu/server";
import { normalizeEmail } from "@/lib/hsu/types";

export const runtime = "nodejs";

export async function POST(req: Request) {
  if (!sameOrigin(req)) return fail("Ógild beiðni", 403);
  const body = await readJson(req);
  const email = normalizeEmail(String(body.email ?? ""));
  const origin = originOf(req);

  // Sent eftir svarið svo svartíminn segi ekki til um hvort netfangið er til.
  // Sama svar hvort sem takmörkin gilda eða ekki; póstur fer bara ekki út.
  const allowed = (await throttle(`forgot-ip:${clientIp(req)}`, 10, 3600)) && (await throttle(`forgot:${email}`, 3, 3600));

  after(async () => {
    if (!email || !allowed) return;
    const { data: d } = await supabaseAdmin.from("hsu_doctors").select("id, name, email, active").eq("email", email).maybeSingle();
    if (!d?.active) return;
    const url = await issueAccessLink(d.id, "reset", origin);
    await sendHsuEmail(
      d.email,
      "Nýtt lykilorð — vaktakerfi HSU",
      hsuEmailHtml({
        origin,
        heading: "Nýtt lykilorð",
        paragraphs: [`Sæl/l ${d.name}.`, "Beðið var um nýtt lykilorð að vaktakerfi Heilsugæslunnar í Vestmannaeyjum. Hlekkurinn gildir í 2 klukkustundir."],
        cta: { label: "Velja nýtt lykilorð", url },
        foot: "Ef þú baðst ekki um þetta máttu hunsa póstinn — lykilorðið þitt er óbreytt.",
      }),
      `Nýtt lykilorð að vaktakerfi HSU: ${url} (gildir í 2 klst.)`,
    );
  });

  return json({ ok: true });
}
