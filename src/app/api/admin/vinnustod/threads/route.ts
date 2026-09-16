// Innhólf Fjarlækninga: spurningar úr vinnustöðinni — frá hjúkrunarfræðingum,
// starfsfólki Fjarlækninga og læknum vaktakerfisins.

import { supabaseAdmin } from "@/lib/supabase-admin";
import { getVsAdmin } from "@/lib/vinnustod/admin";
import { fail, json } from "@/lib/vinnustod/server";
import { THREAD_COLUMNS, askersFor, unreadFor, type ThreadRow } from "@/lib/vinnustod/threads";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const admin = await getVsAdmin(req);
  if (!admin) return fail("Krefst stjórnanda með tveggja þrepa auðkenningu", 403);
  const status = new URL(req.url).searchParams.get("status");
  let q = supabaseAdmin.from("gatt_threads").select(THREAD_COLUMNS).order("last_message_at", { ascending: false }).limit(200);
  if (status === "open" || status === "closed") q = q.eq("status", status);
  const { data } = await q;
  const threads = (data ?? []) as ThreadRow[];
  const askers = await askersFor(threads);
  return json({
    ok: true,
    threads: threads.map((t) => ({ ...t, unread: unreadFor(t, "staff"), user: askers.get(t.id) ?? null })),
  });
}
