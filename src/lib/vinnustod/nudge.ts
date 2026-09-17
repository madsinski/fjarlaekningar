// SMS-áminning til stjórnanda Fjarlækninga um spurningar sem enginn hefur opnað.
// Server-only. Keyrt af cron (/api/cron/vinnustod-nudge) á 5 mín. fresti.
//
// Regla: spurning (síðasta skeyti frá starfsmanni) sem hefur ekki verið opnuð í
// `nudge_after_minutes` mínútur → eitt SMS í `nudge_phone`, sem telur allar
// slíkar spurningar. Sama samtal veldur ekki öðru SMS fyrr en stjórnandi hefur
// opnað það (staff_read_at eftir admin_nudged_at) og nýtt skeyti berst.

import { supabaseAdmin } from "@/lib/supabase-admin";
import { SMS_SENDER, sendSms, smsSegments, toE164 } from "@/lib/sms";

const SITE = process.env.HSU_PUBLIC_ORIGIN || "https://www.fjarlaekningar.is";

export async function nudgeSettings(): Promise<{ phone: string | null; afterMinutes: number }> {
  const { data } = await supabaseAdmin.from("gatt_settings").select("key, value").in("key", ["nudge_phone", "nudge_after_minutes"]);
  const get = (k: string) => data?.find((r) => r.key === k)?.value;
  const phone = typeof get("nudge_phone") === "string" ? toE164(String(get("nudge_phone"))) : null;
  const n = Number(get("nudge_after_minutes"));
  return { phone, afterMinutes: Number.isFinite(n) && n >= 1 ? Math.min(n, 24 * 60) : 10 };
}

export async function runNudge(): Promise<{ sent: boolean; threads: number; reason?: string }> {
  const { phone, afterMinutes } = await nudgeSettings();
  if (!phone) return { sent: false, threads: 0, reason: "no phone" };
  const cutoff = new Date(Date.now() - afterMinutes * 60_000).toISOString();

  const { data } = await supabaseAdmin.from("gatt_threads")
    .select("id, subject, owner_name, last_message_at, staff_read_at, admin_nudged_at")
    .eq("status", "open").eq("last_author", "user").lte("last_message_at", cutoff)
    .order("last_message_at", { ascending: true }).limit(50);
  const due = (data ?? []).filter((t) => {
    const unseen = !t.staff_read_at || t.staff_read_at < t.last_message_at;
    // Einu sinni: ekki aftur nema stjórnandi hafi opnað samtalið eftir síðustu áminningu.
    const notYet = !t.admin_nudged_at || (t.staff_read_at && t.staff_read_at > t.admin_nudged_at && t.admin_nudged_at < t.last_message_at);
    return unseen && notYet;
  });
  if (!due.length) return { sent: false, threads: 0 };

  const first = due[0];
  const who = `${first.owner_name}: ${String(first.subject).slice(0, 50)}`;
  const body = due.length === 1
    ? `Fjarlækningar: ósvöruð spurning frá ${who}. Svaraðu hér: ${SITE}/admin/vinnustod?t=spurningar`
    : `Fjarlækningar: ${due.length} ósvaraðar spurningar, t.d. frá ${who}. Svaraðu hér: ${SITE}/admin/vinnustod?t=spurningar`;

  // Merkt fyrst, svo tvær samhliða keyrslur sendi ekki tvö skeyti: hvert samtal
  // er aðeins uppfært ef fyrri áminningartíminn er óbreyttur.
  const now = new Date().toISOString();
  const claimed: string[] = [];
  for (const t of due) {
    let q = supabaseAdmin.from("gatt_threads").update({ admin_nudged_at: now }).eq("id", t.id);
    q = t.admin_nudged_at ? q.eq("admin_nudged_at", t.admin_nudged_at) : q.is("admin_nudged_at", null);
    const { data: row } = await q.select("id").maybeSingle();
    if (row) claimed.push(row.id);
  }
  if (!claimed.length) return { sent: false, threads: 0, reason: "claimed elsewhere" };

  const result = await sendSms({ to: phone, body, statusCallback: `${SITE}/api/sms/status` });
  const size = smsSegments(body);
  await supabaseAdmin.from("sms_messages").insert({
    sent_by_name: "Kerfið (áminning)",
    to_number: phone,
    sender_id: SMS_SENDER,
    body,
    template: "admin-nudge",
    segments: size.segments,
    encoding: size.encoding,
    provider_sid: result.sid ?? "",
    status: result.status ?? (result.ok ? "queued" : "failed"),
    error_code: result.code ?? null,
    error_text: result.ok ? "" : result.error ?? "",
  });
  if (!result.ok) console.warn("[vinnustod] nudge SMS failed", result.code ?? result.error);
  return { sent: result.ok, threads: claimed.length, reason: result.ok ? undefined : result.error };
}
