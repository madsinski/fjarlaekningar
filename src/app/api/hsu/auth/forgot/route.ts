// Gleymt lykilorð. Svarar alltaf eins, hvort sem netfangið er skráð eða ekki.

import { after } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { clientIp, issueAccessLink, sameOrigin, throttle } from "@/lib/hsu/auth";
import { fail, hsuEmailHtml, json, originOf, readJson, sendHsuEmail } from "@/lib/hsu/server";
import { normalizeEmail } from "@/lib/hsu/types";
import { DEFAULT_LANG, isLang, translator } from "@/lib/hsu/i18n/core";
import { tr } from "@/lib/hsu/i18n/server";
import { apiDoctor } from "@/lib/hsu/i18n/messages/api-doctor";
import { notifyMsgs } from "@/lib/hsu/i18n/messages/notify";

export const runtime = "nodejs";

export async function POST(req: Request) {
  if (!sameOrigin(req)) return fail(tr(req, apiDoctor)("req.invalid"), 403);
  const body = await readJson(req);
  const email = normalizeEmail(String(body.email ?? ""));
  const origin = originOf(req);

  // Sent eftir svarið svo svartíminn segi ekki til um hvort netfangið er til.
  // Sama svar hvort sem takmörkin gilda eða ekki; póstur fer bara ekki út.
  const allowed = (await throttle(`forgot-ip:${clientIp(req)}`, 10, 3600)) && (await throttle(`forgot:${email}`, 3, 3600));

  after(async () => {
    if (!email || !allowed) return;
    const { data: d } = await supabaseAdmin.from("hsu_doctors").select("id, name, email, active, lang").eq("email", email).maybeSingle();
    if (!d?.active) return;
    const url = await issueAccessLink(d.id, "reset", origin);
    const lang = isLang(d.lang) ? d.lang : DEFAULT_LANG;
    const t = translator(notifyMsgs, lang);
    await sendHsuEmail(
      d.email,
      t("reset.subject"),
      hsuEmailHtml({
        origin,
        lang,
        heading: t("reset.heading"),
        paragraphs: [t("hello", { name: d.name }), t("reset.body")],
        cta: { label: t("reset.cta"), url },
        foot: t("reset.foot"),
      }),
      t("reset.text", { url }),
    );
  });

  return json({ ok: true });
}
