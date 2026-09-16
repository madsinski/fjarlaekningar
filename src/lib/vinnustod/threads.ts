// Spurningar starfsfólks til Fjarlækninga — tvíhliða samtöl. Server-only.
//
// Hver spurning er þráður; svör beggja vegna fara í sama þráð. Hvor hlið sér
// hvað er ólesið út frá því hvenær hún las síðast og hver skrifaði síðast.
// Tölvupóstur fer út við hvert nýtt skeyti, svo enginn þurfi að sitja við
// skjáinn til að vita af svari.

import { after } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { notifyEmails } from "./auth";
import { sendVsEmail } from "./server";

export const MAX_BODY = 4000;
export const MAX_SUBJECT = 140;

export interface ThreadRow {
  id: string;
  user_id: string;
  subject: string;
  status: "open" | "closed";
  created_at: string;
  last_message_at: string;
  last_author: "user" | "staff";
  user_read_at: string | null;
  staff_read_at: string | null;
}

export const THREAD_COLUMNS = "id, user_id, subject, status, created_at, last_message_at, last_author, user_read_at, staff_read_at";

export function unreadFor(t: ThreadRow, side: "user" | "staff"): boolean {
  const other = side === "user" ? "staff" : "user";
  const readAt = side === "user" ? t.user_read_at : t.staff_read_at;
  return t.last_author === other && (!readAt || readAt < t.last_message_at);
}

export async function loadMessages(threadId: string) {
  const { data } = await supabaseAdmin.from("gatt_messages")
    .select("id, author_kind, author_name, body, created_at")
    .eq("thread_id", threadId).order("created_at", { ascending: true });
  return data ?? [];
}

/** Bætir skeyti við þráð og uppfærir stöðu hans. */
export async function addMessage(opts: {
  threadId: string;
  kind: "user" | "staff";
  authorId: string;
  authorName: string;
  body: string;
}) {
  const now = new Date().toISOString();
  const { error } = await supabaseAdmin.from("gatt_messages").insert({
    thread_id: opts.threadId,
    author_kind: opts.kind,
    author_user: opts.kind === "user" ? opts.authorId : null,
    author_staff: opts.kind === "staff" ? opts.authorId : null,
    author_name: opts.authorName,
    body: opts.body,
    created_at: now,
  });
  if (error) throw new Error(error.message);
  // Sá sem skrifar hefur um leið lesið allt í þræðinum.
  await supabaseAdmin.from("gatt_threads").update({
    last_message_at: now,
    last_author: opts.kind,
    status: "open",
    ...(opts.kind === "user" ? { user_read_at: now } : { staff_read_at: now }),
  }).eq("id", opts.threadId);
}

/** Starfsfólk Fjarlækninga fær póst um nýja spurningu eða svar frá notanda. */
export function notifyStaff(opts: { origin: string; userName: string; workplace: string; subject: string; body: string; isNew: boolean; replyTo: string }) {
  after(async () => {
    const to = await notifyEmails();
    for (const addr of to) {
      await sendVsEmail({
        to: addr,
        replyTo: opts.replyTo,
        subject: `${opts.isNew ? "Ný spurning" : "Svar"} úr vinnustöð: ${opts.subject}`,
        heading: opts.isNew ? "Ný spurning frá starfsmanni" : "Nýtt svar í samtali",
        paragraphs: [
          `${opts.userName}${opts.workplace ? ` (${opts.workplace})` : ""} skrifaði:`,
          opts.body,
        ],
        cta: { label: "Svara í stjórnborði", url: `${opts.origin}/admin/vinnustod?t=spurningar` },
        foot: "Svaraðu í stjórnborðinu svo svarið birtist starfsmanninum í vinnustöðinni.",
      });
    }
  });
}

/** Starfsmaðurinn fær póst þegar Fjarlækningar svara. */
export function notifyUser(opts: { origin: string; to: string; name: string; subject: string; body: string; staffName: string }) {
  after(async () => {
    await sendVsEmail({
      to: opts.to,
      subject: `Svar frá Fjarlækningum: ${opts.subject}`,
      heading: "Fjarlækningar svöruðu spurningunni þinni",
      paragraphs: [`Sæl/l ${opts.name}.`, `${opts.staffName} svaraði:`, opts.body],
      cta: { label: "Opna vinnustöðina", url: `${opts.origin}/vinnustod?t=spurningar` },
      foot: "Svaraðu helst í vinnustöðinni, svo svarið fylgi samtalinu.",
    });
  });
}
