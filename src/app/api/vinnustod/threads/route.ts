// Spurningar notanda til Fjarlækninga: listi og ný spurning.

import { supabaseAdmin } from "@/lib/supabase-admin";
import { getSmsActor } from "@/lib/sms-actor";
import { clientIp, sameOrigin, throttle } from "@/lib/vinnustod/auth";
import { cleanLine, cleanText, fail, json, originOf, readJson } from "@/lib/vinnustod/server";
import { MAX_BODY, MAX_SUBJECT, THREAD_COLUMNS, addMessage, notifyStaff, unreadFor, type ThreadRow } from "@/lib/vinnustod/threads";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const actor = await getSmsActor(req);
  if (!actor || actor.kind !== "vs") return fail("Ekki heimild", 403);
  const { data } = await supabaseAdmin.from("gatt_threads").select(THREAD_COLUMNS)
    .eq("user_id", actor.id).order("last_message_at", { ascending: false }).limit(100);
  const threads = ((data ?? []) as ThreadRow[]).map((t) => ({ ...t, unread: unreadFor(t, "user") }));
  return json({ ok: true, threads });
}

export async function POST(req: Request) {
  if (!sameOrigin(req)) return fail("Ógild beiðni", 403);
  const actor = await getSmsActor(req);
  if (!actor || actor.kind !== "vs") return fail("Ekki heimild", 403);
  if (!(await throttle(`thread:${actor.id}`, 20, 3600)) || !(await throttle(`thread-ip:${clientIp(req)}`, 40, 3600))) {
    return fail("Of margar spurningar á stuttum tíma. Reyndu aftur eftir smá stund.", 429);
  }
  const body = await readJson(req);
  const subject = cleanLine(body.subject, MAX_SUBJECT);
  const text = cleanText(body.body, MAX_BODY);
  if (!subject) return fail("Skrifaðu fyrirsögn.");
  if (!text) return fail("Skrifaðu spurninguna.");

  const { data: thread, error } = await supabaseAdmin.from("gatt_threads")
    .insert({ user_id: actor.id, subject }).select("id").single();
  if (error || !thread) return fail(error?.message ?? "Vistun mistókst", 500);
  await addMessage({ threadId: thread.id, kind: "user", authorId: actor.id, authorName: actor.name, body: text });
  notifyStaff({ origin: originOf(req), userName: actor.name, workplace: actor.workplace ?? "", subject, body: text, isNew: true, replyTo: actor.email ?? "" });
  return json({ ok: true, id: thread.id });
}
