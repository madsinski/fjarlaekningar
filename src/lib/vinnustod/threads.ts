// Spurningar starfsfólks til Fjarlækninga — tvíhliða samtöl. Server-only.
//
// Hver spurning er þráður; svör beggja vegna fara í sama þráð. Hvor hlið sér
// hvað er ólesið út frá því hvenær hún las síðast og hver skrifaði síðast.
// Tölvupóstur fer út við hvert nýtt skeyti, svo enginn þurfi að sitja við
// skjáinn til að vita af svari.

import { after } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import type { SmsActor } from "@/lib/sms-actor";
import { notifyEmails } from "./auth";
import { sendVsEmail } from "./server";

export const MAX_BODY = 4000;
export const MAX_SUBJECT = 140;

export interface ThreadRow {
  id: string;
  user_id: string | null;
  owner_kind: SmsActor["kind"];
  owner_name: string;
  owner_email: string;
  owner_workplace: string;
  subject: string;
  status: "open" | "closed";
  created_at: string;
  last_message_at: string;
  last_author: "user" | "staff";
  user_read_at: string | null;
  staff_read_at: string | null;
}

export const THREAD_COLUMNS = "id, user_id, owner_kind, owner_name, owner_email, owner_workplace, subject, status, created_at, last_message_at, last_author, user_read_at, staff_read_at";

/**
 * Hver má spyrja: allir sem komast inn í vinnustöðina nema stjórnandi
 * Fjarlækninga, sem svarar spurningunum.
 */
export const canAsk = (a: SmsActor) => !(a.kind === "staff" && a.isAdmin);

/** Dálkurinn sem tengir þráð við eiganda sinn. */
export function ownerColumn(kind: SmsActor["kind"]): "user_id" | "owner_staff" | "owner_hsu" {
  return kind === "vs" ? "user_id" : kind === "staff" ? "owner_staff" : "owner_hsu";
}

/** Reitir nýs þráðar fyrir þennan eiganda. */
export function ownerFields(a: SmsActor) {
  return {
    owner_kind: a.kind,
    [ownerColumn(a.kind)]: a.id,
    owner_name: a.name,
    owner_email: a.email ?? "",
    owner_workplace: a.workplace ?? "",
  };
}

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
  /** Hvaðan spyrjandinn kemur (aðeins þegar kind er "user"). */
  askerKind?: SmsActor["kind"];
  authorId: string;
  authorName: string;
  body: string;
}) {
  const now = new Date().toISOString();
  const { error } = await supabaseAdmin.from("gatt_messages").insert({
    thread_id: opts.threadId,
    author_kind: opts.kind,
    author_user: opts.kind === "user" && (opts.askerKind ?? "vs") === "vs" ? opts.authorId : null,
    author_staff: opts.kind === "staff" || opts.askerKind === "staff" ? opts.authorId : null,
    author_hsu: opts.kind === "user" && opts.askerKind === "hsu" ? opts.authorId : null,
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

/** Spyrjandinn fær póst þegar Fjarlækningar svara. */
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

export interface Asker { kind: SmsActor["kind"]; name: string; email: string; workplace: string; title: string; active: boolean }

const KIND_LABEL: Record<SmsActor["kind"], string> = { vs: "", staff: "Starfsmaður Fjarlækninga", hsu: "Læknir í vaktakerfi HSU" };

/**
 * Hver spurði — fyrir innhólfið. Notandi vinnustöðvar er flettur upp (hann gæti
 * hafa breytt nafni eða verið gerður óvirkur); hinir eftir afritinu í þræðinum
 * og því hvort þeir eru enn virkir.
 */
export async function askersFor(threads: ThreadRow[]): Promise<Map<string, Asker>> {
  const vsIds = [...new Set(threads.map((t) => t.user_id).filter((x): x is string => Boolean(x)))];
  const { data: users } = vsIds.length
    ? await supabaseAdmin.from("gatt_users").select("id, name, email, workplace, title, active").in("id", vsIds)
    : { data: [] };
  const byId = new Map((users ?? []).map((u) => [u.id as string, u]));
  const ids = threads.map((t) => t.id);
  const { data: owners } = ids.length
    ? await supabaseAdmin.from("gatt_threads").select("id, owner_staff, owner_hsu").in("id", ids)
    : { data: [] };
  const staffIds = [...new Set((owners ?? []).map((o) => o.owner_staff).filter(Boolean))];
  const hsuIds = [...new Set((owners ?? []).map((o) => o.owner_hsu).filter(Boolean))];
  const [{ data: staff }, { data: docs }] = await Promise.all([
    staffIds.length ? supabaseAdmin.from("staff").select("id, active").in("id", staffIds) : Promise.resolve({ data: [] }),
    hsuIds.length ? supabaseAdmin.from("hsu_doctors").select("id, active").in("id", hsuIds) : Promise.resolve({ data: [] }),
  ]);
  const activeIds = new Set([...(staff ?? []), ...(docs ?? [])].filter((r) => r.active).map((r) => r.id as string));
  const ownerOf = new Map((owners ?? []).map((o) => [o.id as string, (o.owner_staff ?? o.owner_hsu) as string | null]));

  const out = new Map<string, Asker>();
  for (const t of threads) {
    const u = t.user_id ? byId.get(t.user_id) : undefined;
    if (t.owner_kind === "vs") {
      out.set(t.id, {
        kind: "vs", name: u?.name ?? t.owner_name, email: u?.email ?? t.owner_email,
        workplace: u?.workplace ?? t.owner_workplace, title: u?.title ?? "", active: Boolean(u?.active),
      });
    } else {
      const oid = ownerOf.get(t.id);
      out.set(t.id, {
        kind: t.owner_kind, name: t.owner_name, email: t.owner_email, workplace: t.owner_workplace,
        title: KIND_LABEL[t.owner_kind], active: Boolean(oid && activeIds.has(oid)),
      });
    }
  }
  return out;
}
