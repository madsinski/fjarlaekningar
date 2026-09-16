// Nýskráning: starfsmaður með netfang á leyfðu léni (t.d. @hsu.is) fær
// staðfestingarhlekk í pósti og velur lykilorð þar.
//
// Pósthólfið sjálft er sönnunin: aðeins sá sem hefur aðgang að @hsu.is netfangi
// getur lokið skráningunni. Svarið er alltaf það sama, hvort sem netfangið er
// þegar skráð eða ekki, svo ekki sé hægt að kanna hverjir eru með aðgang.

import { after } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { allowedDomains, clientIp, issueAccessLink, normalizeEmail, sameOrigin, throttle } from "@/lib/vinnustod/auth";
import { cleanLine, fail, json, originOf, readJson, sendVsEmail } from "@/lib/vinnustod/server";

export const runtime = "nodejs";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: Request) {
  if (!sameOrigin(req)) return fail("Ógild beiðni", 403);
  const body = await readJson(req);
  const email = normalizeEmail(String(body.email ?? ""));
  const name = cleanLine(body.name, 120);
  const workplace = cleanLine(body.workplace, 120);
  const title = cleanLine(body.title, 80);
  if (!name) return fail("Sláðu inn nafn.");
  if (!EMAIL_RE.test(email)) return fail("Sláðu inn gilt netfang.");

  const domains = await allowedDomains();
  const domain = email.split("@")[1] ?? "";
  if (!domains.includes(domain)) {
    // Þetta má segja upphátt: það afhjúpar ekkert um hverjir eru skráðir.
    return fail(`Nýskráning er opin netföngum á ${domains.map((d) => `@${d}`).join(", ") || "tilteknum lénum"}. Hafðu samband við Fjarlækningar til að fá boð.`);
  }

  // nafn+1@hsu.is og nafn+2@hsu.is berast flestum í sama pósthólf; takmörkunin
  // miðar við pósthólfið svo ekki sé hægt að drekkja því í póstum.
  const mailbox = email.replace(/\+[^@]*@/, "@");
  const allowed = (await throttle(`signup-ip:${clientIp(req)}`, 10, 3600)) && (await throttle(`signup:${mailbox}`, 3, 3600));
  const origin = originOf(req);

  after(async () => {
    if (!allowed) return;
    const { data: existing } = await supabaseAdmin.from("gatt_users").select("id, name, email, active, password_hash").eq("email", email).maybeSingle();

    if (existing) {
      // Þegar skráð: ekkert nýtt, en sé aðgangurinn virkur fær eigandinn
      // hlekk til að velja lykilorð — það er það sem hann vantar líklega.
      if (!existing.active) return;
      const url = await issueAccessLink(existing.id, existing.password_hash ? "reset" : "invite", origin);
      await sendVsEmail({
        to: existing.email,
        subject: "Aðgangur að vinnustöð Fjarlækninga",
        heading: "Þú ert þegar með aðgang",
        paragraphs: [`Sæl/l ${existing.name}.`, "Beðið var um nýskráningu með netfanginu þínu, en það er þegar með aðgang að vinnustöð Fjarlækninga. Hér er hlekkur til að velja lykilorð."],
        cta: { label: "Velja lykilorð", url },
        foot: "Ef þú baðst ekki um þetta máttu hunsa póstinn.",
      });
      return;
    }

    const { data: created, error } = await supabaseAdmin.from("gatt_users")
      .insert({ name, email, workplace, title: title || "Hjúkrunarfræðingur", source: "signup", created_by: "nýskráning" })
      .select("id").single();
    if (error || !created) return;
    const url = await issueAccessLink(created.id, "invite", origin);
    await sendVsEmail({
      to: email,
      subject: "Staðfestu netfangið — vinnustöð Fjarlækninga",
      heading: "Velkomin/n í vinnustöð Fjarlækninga",
      paragraphs: [
        `Sæl/l ${name}.`,
        "Smelltu á hnappinn til að staðfesta netfangið og velja lykilorð. Í vinnustöðinni finnurðu upplýsingar um þjónustuna, getur sent sjúklingum hlekk í SMS og spurt okkur beint.",
        "Hlekkurinn gildir í 14 daga.",
      ],
      cta: { label: "Staðfesta og velja lykilorð", url },
      foot: "Ef þú baðst ekki um aðgang máttu hunsa póstinn — ekkert gerist nema þú staðfestir.",
    });
  });

  return json({ ok: true });
}
