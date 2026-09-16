// Innhólf Fjarlækninga: spurningar starfsfólks úr vinnustöðinni.

import { supabaseAdmin } from "@/lib/supabase-admin";
import { getVsAdmin } from "@/lib/vinnustod/admin";
import { fail, json } from "@/lib/vinnustod/server";
import { THREAD_COLUMNS, unreadFor, type ThreadRow } from "@/lib/vinnustod/threads";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const admin = await getVsAdmin(req);
  if (!admin) return fail("Krefst stjórnanda með tveggja þrepa auðkenningu", 403);
  const status = new URL(req.url).searchParams.get("status");
  let q = supabaseAdmin.from("gatt_threads").select(THREAD_COLUMNS).order("last_message_at", { ascending: false }).limit(200);
  if (status === "open" || status === "closed") q = q.eq("status", status);
  const { data } = await q;
  const threads = (data ?? []) as ThreadRow[];
  const ids = [...new Set(threads.map((t) => t.user_id))];
  const { data: users } = ids.length
    ? await supabaseAdmin.from("gatt_users").select("id, name, email, workplace, title").in("id", ids)
    : { data: [] as { id: string; name: string; email: string; workplace: string; title: string }[] };
  const byId = new Map((users ?? []).map((u) => [u.id, u]));
  return json({
    ok: true,
    threads: threads.map((t) => ({ ...t, unread: unreadFor(t, "staff"), user: byId.get(t.user_id) ?? null })),
  });
}
