// Samtal notanda við Fjarlækningar — EITT á hvern notanda. GET skilar því
// (í lista, 0 eða 1), POST bætir skilaboðum við það (og stofnar það ef þarf).
// Allir sem komast inn í vinnustöðina skrifa — nema stjórnandi hennar, sem svarar.

import { supabaseAdmin } from "@/lib/supabase-admin";
import { getSmsActor } from "@/lib/sms-actor";
import { clientIp, sameOrigin, throttle } from "@/lib/vinnustod/auth";
import { cleanLine, cleanText, fail, json, originOf, readJson } from "@/lib/vinnustod/server";
import { MAX_BODY, MAX_SUBJECT, subjectFrom, THREAD_COLUMNS, addMessage, canAsk, notifyStaff, ownerColumn, threadFor, unreadFor, type ThreadRow } from "@/lib/vinnustod/threads";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const actor = await getSmsActor(req);
  if (!actor || !canAsk(actor)) return fail("Ekki heimild", 403);
  const { data } = await supabaseAdmin.from("gatt_threads").select(THREAD_COLUMNS)
    .eq(ownerColumn(actor.kind), actor.id).order("last_message_at", { ascending: false }).limit(100);
  const threads = ((data ?? []) as ThreadRow[]).map((t) => ({ ...t, unread: unreadFor(t, "user") }));
  return json({ ok: true, threads });
}

export async function POST(req: Request) {
  if (!sameOrigin(req)) return fail("Ógild beiðni", 403);
  const actor = await getSmsActor(req);
  if (!actor || !canAsk(actor)) return fail("Ekki heimild", 403);
  if (!(await throttle(`thread:${actor.id}`, 20, 3600)) || !(await throttle(`thread-ip:${clientIp(req)}`, 40, 3600))) {
    return fail("Of margar spurningar á stuttum tíma. Reyndu aftur eftir smá stund.", 429);
  }
  const body = await readJson(req);
  const text = cleanText(body.body, MAX_BODY);
  // Fyrirsögn er valkvæð (eldri útgáfur sendu hana); annars fyrsta lína skilaboðanna.
  const subject = cleanLine(body.subject, MAX_SUBJECT) || subjectFrom(text);
  if (!text) return fail("Skrifaðu spurninguna.");

  // Eitt samtal á mann: ný skilaboð fara í það sem er fyrir.
  const thread = await threadFor(actor, text);
  if (!thread) return fail("Vistun mistókst", 500);
  await addMessage({ threadId: thread.id, kind: "user", askerKind: actor.kind, authorId: actor.id, authorName: actor.name, body: text });
  notifyStaff({ origin: originOf(req), userName: actor.name, workplace: actor.workplace ?? "", subject, body: text, isNew: thread.created, replyTo: actor.email ?? "" });
  return json({ ok: true, id: thread.id });
}
