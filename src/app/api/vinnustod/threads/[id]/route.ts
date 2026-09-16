// Eitt samtal: lesa (og merkja lesið) eða svara.

import { supabaseAdmin } from "@/lib/supabase-admin";
import { getSmsActor } from "@/lib/sms-actor";
import { sameOrigin, throttle } from "@/lib/vinnustod/auth";
import { UUID_RE, cleanText, fail, json, originOf, readJson } from "@/lib/vinnustod/server";
import { MAX_BODY, THREAD_COLUMNS, addMessage, loadMessages, notifyStaff, type ThreadRow } from "@/lib/vinnustod/threads";

export const runtime = "nodejs";

/** Þráðurinn — aðeins ef hann tilheyrir þessum notanda. */
async function ownThread(req: Request, id: string) {
  const actor = await getSmsActor(req);
  if (!actor || actor.kind !== "vs" || !UUID_RE.test(id)) return null;
  const { data } = await supabaseAdmin.from("gatt_threads").select(THREAD_COLUMNS).eq("id", id).eq("user_id", actor.id).maybeSingle();
  return data ? { actor, thread: data as ThreadRow } : null;
}

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const own = await ownThread(req, id);
  if (!own) return fail("Samtalið fannst ekki", 404);
  const messages = await loadMessages(id);
  // Hlekkur frá annarri síðu á ekki að geta merkt svar lesið.
  if (sameOrigin(req)) await supabaseAdmin.from("gatt_threads").update({ user_read_at: new Date().toISOString() }).eq("id", id);
  return json({ ok: true, thread: own.thread, messages });
}

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!sameOrigin(req)) return fail("Ógild beiðni", 403);
  const { id } = await ctx.params;
  const own = await ownThread(req, id);
  if (!own) return fail("Samtalið fannst ekki", 404);
  if (!(await throttle(`reply:${own.actor.id}`, 60, 3600))) return fail("Of mörg skeyti á stuttum tíma.", 429);
  const body = await readJson(req);
  const text = cleanText(body.body, MAX_BODY);
  if (!text) return fail("Skeytið er tómt.");
  await addMessage({ threadId: id, kind: "user", authorId: own.actor.id, authorName: own.actor.name, body: text });
  notifyStaff({
    origin: originOf(req), userName: own.actor.name, workplace: own.actor.workplace ?? "",
    subject: own.thread.subject, body: text, isNew: false, replyTo: own.actor.email ?? "",
  });
  return json({ ok: true });
}
