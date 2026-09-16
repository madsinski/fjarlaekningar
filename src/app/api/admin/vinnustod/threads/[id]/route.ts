// Eitt samtal í innhólfi Fjarlækninga: lesa, svara, loka, opna aftur eða eyða.

import { after } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { ownerTarget, signalSync } from "@/lib/vinnustod/live";
import { getVsAdmin } from "@/lib/vinnustod/admin";
import { UUID_RE, cleanText, fail, json, originOf, readJson } from "@/lib/vinnustod/server";
import { MAX_BODY, THREAD_COLUMNS, addMessage, askersFor, loadMessages, notifyUser, type ThreadRow } from "@/lib/vinnustod/threads";

export const runtime = "nodejs";

const DENY = "Krefst stjórnanda með tveggja þrepa auðkenningu";

async function load(id: string) {
  if (!UUID_RE.test(id)) return null;
  const { data } = await supabaseAdmin.from("gatt_threads").select(THREAD_COLUMNS).eq("id", id).maybeSingle();
  return (data as ThreadRow | null) ?? null;
}

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const admin = await getVsAdmin(req);
  if (!admin) return fail(DENY, 403);
  const { id } = await ctx.params;
  const thread = await load(id);
  if (!thread) return fail("Samtalið fannst ekki", 404);
  const [askers, messages] = await Promise.all([askersFor([thread]), loadMessages(id)]);
  const user = askers.get(id) ?? null;
  await supabaseAdmin.from("gatt_threads").update({ staff_read_at: new Date().toISOString() }).eq("id", id);
  return json({ ok: true, thread, user, messages });
}

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const admin = await getVsAdmin(req);
  if (!admin) return fail(DENY, 403);
  const { id } = await ctx.params;
  const thread = await load(id);
  if (!thread) return fail("Samtalið fannst ekki", 404);
  const body = await readJson(req);
  const text = cleanText(body.body, MAX_BODY);
  if (!text) return fail("Svarið er tómt.");
  await addMessage({ threadId: id, kind: "staff", authorId: admin.id, authorName: admin.name, body: text });
  const user = (await askersFor([thread])).get(id);
  if (user?.active && user.email) {
    notifyUser({ origin: originOf(req), to: user.email, name: user.name, subject: thread.subject, body: text, staffName: admin.name });
  }
  return json({ ok: true });
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const admin = await getVsAdmin(req);
  if (!admin) return fail(DENY, 403);
  const { id } = await ctx.params;
  if (!(await load(id))) return fail("Samtalið fannst ekki", 404);
  const body = await readJson(req);
  if (body.status !== "open" && body.status !== "closed") return fail("Ógild staða");
  await supabaseAdmin.from("gatt_threads").update({ status: body.status }).eq("id", id);
  const { data: t } = await supabaseAdmin.from("gatt_threads").select("owner_kind, user_id, owner_staff, owner_hsu").eq("id", id).maybeSingle();
  after(() => signalSync(t ? ownerTarget(t) : null).catch(() => {}));
  return json({ ok: true });
}

/** Eyða samtali — hverfur líka hjá viðtakandanum. */
export async function DELETE(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const admin = await getVsAdmin(req);
  if (!admin) return fail(DENY, 403);
  const { id } = await ctx.params;
  if (!UUID_RE.test(id)) return fail("Samtalið fannst ekki", 404);
  const { data: t } = await supabaseAdmin.from("gatt_threads").select("owner_kind, user_id, owner_staff, owner_hsu").eq("id", id).maybeSingle();
  if (!t) return fail("Samtalið fannst ekki", 404);
  const { error } = await supabaseAdmin.from("gatt_threads").delete().eq("id", id);
  if (error) return fail("Ekki tókst að eyða", 500);
  after(() => signalSync(ownerTarget(t)).catch(() => {}));
  return json({ ok: true });
}
