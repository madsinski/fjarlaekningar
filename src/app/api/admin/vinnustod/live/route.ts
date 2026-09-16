// Staða innhólfsins fyrir /admin/vinnustod: fjöldi sem bíður svars, leynileg
// rás stjórnenda fyrir tafarlaus merki og lykill fyrir tilkynningar í tæki.
// Alltaf sem stjórnandi — óháð því hvort vafrinn er líka skráður inn í
// Vinnustöðina eða vaktakerfið.

import { supabaseAdmin } from "@/lib/supabase-admin";
import { getVsAdmin } from "@/lib/vinnustod/admin";
import { liveTopic, vapidPublicKey } from "@/lib/vinnustod/live";
import { fail, json } from "@/lib/vinnustod/server";

export const runtime = "nodejs";

export async function GET(req: Request) {
  if (!(await getVsAdmin(req))) return fail("Krefst stjórnanda með tveggja þrepa auðkenningu", 403);
  const { count } = await supabaseAdmin.from("gatt_threads")
    .select("id", { count: "exact", head: true }).eq("status", "open").eq("last_author", "user");
  return json({ ok: true, awaiting: count ?? 0, topic: liveTopic({ admins: true }), vapidKey: vapidPublicKey() });
}
