// Afritanlegir textar vinnustöðvarinnar — stjórnandi vistar eigin útgáfu fyrir alla.
//
// PUT { id, text }        vista (texti eins og sá sjálfgefni = eyða yfirskrift)
// PUT { id, text: null }  aftur í sjálfgefinn texta
//
// Einn lykill á hvern texta (`text:<id>`) svo tveir stjórnendur sem vista sinn
// hvorn textann skrifi ekki yfir hvor annan.

import { supabaseAdmin } from "@/lib/supabase-admin";
import { getVsAdmin } from "@/lib/vinnustod/admin";
import { sameOrigin } from "@/lib/vinnustod/auth";
import { cleanText, fail, json, readJson } from "@/lib/vinnustod/server";
import { defaultText, hasPortalLink, textNeedsLink } from "@/lib/nurse-guide";

export const runtime = "nodejs";

const MAX = 2000;

export async function PUT(req: Request) {
  if (!sameOrigin(req)) return fail("Ógild beiðni", 403);
  const admin = await getVsAdmin(req);
  if (!admin) return fail("Krefst stjórnanda með tveggja þrepa auðkenningu", 403);
  const body = await readJson(req);
  const id = String(body.id ?? "");
  const fallback = defaultText(id);
  if (fallback === null) return fail("Óþekktur texti", 404);

  const key = `text:${id}`;
  const text = body.text === null ? "" : cleanText(body.text, MAX + 1);
  if (text.length > MAX) return fail(`Textinn má vera að hámarki ${MAX} stafir.`);
  if (!text || text === fallback) {
    await supabaseAdmin.from("gatt_settings").delete().eq("key", key);
    return json({ ok: true, text: fallback, custom: false });
  }
  if (textNeedsLink(id) && !hasPortalLink(text)) return fail("Hlekkinn vantar — textinn til sjúklings verður að innihalda slóð.");
  const at = new Date().toISOString();
  const { error } = await supabaseAdmin.from("gatt_settings")
    .upsert({ key, value: { text, by: admin.name, at }, updated_at: at });
  if (error) return fail("Ekki tókst að vista", 500);
  return json({ ok: true, text, custom: true, by: admin.name, at });
}
