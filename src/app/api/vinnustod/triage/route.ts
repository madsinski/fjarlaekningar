// Gervigreindarmat: hentar erindið Fjarlækningum? Sjá src/lib/vinnustod/triage.ts.
// Allir sem komast inn í Vinnustöðina. Textinn er hvorki vistaður né skráður.

import { getSmsActor } from "@/lib/sms-actor";
import { clientIp, sameOrigin, throttle } from "@/lib/vinnustod/auth";
import { cleanText, fail, json, readJson } from "@/lib/vinnustod/server";
import { TRIAGE_MAX, redactPersonal, triageMessage } from "@/lib/vinnustod/triage";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  if (!sameOrigin(req)) return fail("Ógild beiðni", 403);
  const actor = await getSmsActor(req);
  if (!actor) return fail("Ekki innskráð(ur)", 401);
  if (!(await throttle(`triage:${actor.kind}:${actor.id}`, 30, 3600)) || !(await throttle(`triage-ip:${clientIp(req)}`, 60, 3600))) {
    return fail("Of mörg möt á stuttum tíma. Reyndu aftur eftir smá stund.", 429);
  }
  const body = await readJson(req);
  const raw = cleanText(body.message, TRIAGE_MAX + 1);
  if (raw.length < 5) return fail("Límdu inn skilaboðin frá sjúklingnum.");
  if (raw.length > TRIAGE_MAX) return fail(`Textinn má vera að hámarki ${TRIAGE_MAX} stafir.`);
  if (!process.env.OPENAI_API_KEY) return fail("Gervigreindarmat er ekki virkt.", 503);

  const { text, removed } = redactPersonal(raw);
  try {
    const result = await triageMessage(text);
    return json({ ok: true, result, removed });
  } catch {
    // Villuboð líkansins geta innihaldið textann — ekkert þeirra fer í svarið eða skrána.
    return fail("Ekki tókst að meta erindið núna. Reyndu aftur eða notaðu leitina.", 502);
  }
}
