// Innhólf Fjarlækninga: spurningar úr vinnustöðinni — frá hjúkrunarfræðingum,
// starfsfólki Fjarlækninga og læknum vaktakerfisins.
//
// POST { kind, id, body } — stjórnandi hefur samtal við einhvern þeirra.
// Fyrirsögnin er fyrsta lína skilaboðanna (subjectFrom).

import { supabaseAdmin } from "@/lib/supabase-admin";
import { getVsAdmin } from "@/lib/vinnustod/admin";
import { UUID_RE, cleanLine, cleanText, fail, json, originOf, readJson } from "@/lib/vinnustod/server";
import {
  MAX_BODY, MAX_SUBJECT, subjectFrom, THREAD_COLUMNS, addMessage, askersFor, listRecipients, notifyUser, threadFor, unreadFor, type ThreadRow,
} from "@/lib/vinnustod/threads";

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

export async function POST(req: Request) {
  const admin = await getVsAdmin(req);
  if (!admin) return fail("Krefst stjórnanda með tveggja þrepa auðkenningu", 403);
  const body = await readJson(req);
  const kind = String(body.kind ?? "");
  const id = String(body.id ?? "");
  if (!["vs", "staff", "hsu"].includes(kind) || !UUID_RE.test(id)) return fail("Veldu viðtakanda.");
  const to = (await listRecipients()).find((r) => r.kind === kind && r.id === id);
  if (!to) return fail("Viðtakandinn fannst ekki eða er óvirkur.", 404);
  const text = cleanText(body.body, MAX_BODY);
  // Fyrirsögn er valkvæð (eldri útgáfur sendu hana); annars fyrsta lína skilaboðanna.
  const subject = cleanLine(body.subject, MAX_SUBJECT) || subjectFrom(text);
  if (!text) return fail("Skeytið er tómt.");

  // Eitt samtal á mann: bætist við samtalið ef það er til.
  const thread = await threadFor(to, text);
  if (!thread) return fail("Vistun mistókst", 500);
  await addMessage({ threadId: thread.id, kind: "staff", authorId: admin.id, authorName: admin.name, body: text });
  if (to.email) {
    notifyUser({ origin: originOf(req), to: to.email, name: to.name, subject, body: text, staffName: admin.name, isNew: thread.created });
  }
  return json({ ok: true, id: thread.id });
}
