// Leynihlekkur á .ics-áskrift (Apple, Outlook, Google). Búinn til við fyrstu
// notkun; POST með rotate=true ógildir gamla hlekkinn.

import { supabaseAdmin } from "@/lib/supabase-admin";
import { newToken } from "@/lib/hsu/auth";
import { json, originOf, readJson, requireDoctor } from "@/lib/hsu/server";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const auth = await requireDoctor(req);
  if ("res" in auth) return auth.res;
  const rotate = Boolean((await readJson(req)).rotate);
  const { data: d } = await supabaseAdmin.from("hsu_doctors").select("calendar_token").eq("id", auth.doctor.id).single();
  let token = d?.calendar_token as string | null;
  if (!token || rotate) {
    token = newToken(24);
    await supabaseAdmin.from("hsu_doctors").update({ calendar_token: token }).eq("id", auth.doctor.id);
  }
  return json({ ok: true, url: `${originOf(req)}/api/hsu/calendar/${token}.ics` });
}
