// Eitt samtal í innhólfi Fjarlækninga: lesa, svara, loka eða opna aftur.

import { supabaseAdmin } from "@/lib/supabase-admin";
import { getVsAdmin } from "@/lib/vinnustod/admin";
import { UUID_RE, cleanText, fail, json, originOf, readJson } from "@/lib/vinnustod/server";
import { MAX_BODY, THREAD_COLUMNS, addMessage, loadMessages, notifyUser, type ThreadRow } from "@/lib/vinnustod/threads";

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
  const [{ data: user }, messages] = await Promise.all([
    supabaseAdmin.from("gatt_users").select("id, name, email, workplace, title").eq("id", thread.user_id).maybeSingle(),
    loadMessages(id),
  ]);
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
  const { data: user } = await supabaseAdmin.from("gatt_users").select("name, email, active").eq("id", thread.user_id).maybeSingle();
  if (user?.active) {
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
  return json({ ok: true });
}
