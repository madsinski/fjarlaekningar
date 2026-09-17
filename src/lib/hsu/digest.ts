// Samantektarpóstur til lækna um breytingar á vaktaplani. Server-only.
//
// Breytingar yfirlæknis eru skráðar strax á „Mínar vaktir“ (hsu_notifications,
// email_pending). Þessi keyrsla (cron á 5 mín. fresti) sendir hverjum lækni EINN
// póst með öllum breytingunum þegar engin ný breyting hefur bæst við í
// QUIET_MINUTES mínútur — svo tíu tilfærslur í röð verða að einum pósti.

import { supabaseAdmin } from "@/lib/supabase-admin";
import { hsuEmailHtml, sendHsuEmail } from "./server";
import { DEFAULT_LANG, isLang, translator } from "./i18n/core";
import { notifyMsgs } from "./i18n/messages/notify";

const QUIET_MINUTES = 10;
const ORIGIN = process.env.HSU_PUBLIC_ORIGIN || "https://www.fjarlaekningar.is";

export async function runShiftDigest(): Promise<{ doctors: number; notices: number }> {
  const { data: pending } = await supabaseAdmin.from("hsu_notifications")
    .select("id, doctor_id, created_at, lines")
    .eq("email_pending", true).is("emailed_at", null)
    .order("created_at", { ascending: true }).limit(500);
  const byDoctor = new Map<string, { id: string; created_at: string; lines: string[] }[]>();
  for (const n of pending ?? []) {
    const list = byDoctor.get(n.doctor_id) ?? [];
    list.push(n);
    byDoctor.set(n.doctor_id, list);
  }
  const quietSince = Date.now() - QUIET_MINUTES * 60_000;
  let doctors = 0, notices = 0;

  for (const [doctorId, list] of byDoctor) {
    // Yfirlæknir er enn að breyta: bíða þar til hlé er komið.
    if (new Date(list[list.length - 1].created_at).getTime() > quietSince) continue;
    // Tekið frá fyrst, svo tvær keyrslur sendi ekki sama póstinn.
    const now = new Date().toISOString();
    const { data: claimed } = await supabaseAdmin.from("hsu_notifications")
      .update({ emailed_at: now, email_pending: false })
      .in("id", list.map((n) => n.id)).is("emailed_at", null).select("id, lines");
    if (!claimed?.length) continue;

    const { data: doc } = await supabaseAdmin.from("hsu_doctors").select("name, email, active, lang").eq("id", doctorId).maybeSingle();
    if (!doc?.active) continue;
    // Inngangslínur („X breytti vaktaplaninu:“) koma einu sinni; sömu línur einu sinni.
    const seen = new Set<string>();
    const lines: string[] = [];
    for (const n of list) {
      for (const l of n.lines ?? []) {
        if (l.trim().endsWith(":") || seen.has(l)) continue;
        seen.add(l);
        lines.push(l);
      }
    }
    if (!lines.length) continue;
    const link = "/hsu/min-sida?t=vaktir";
    const lang = isLang(doc.lang) ? doc.lang : DEFAULT_LANG;
    const t = translator(notifyMsgs, lang);
    await sendHsuEmail(
      doc.email,
      lines.length === 1 ? t("digest.subjectSingle") : t.n("digest.subject", lines.length),
      hsuEmailHtml({
        origin: ORIGIN,
        lang,
        heading: t("digest.heading"),
        paragraphs: [t("hello", { name: doc.name }), t("digest.intro"), ...lines.map((l) => `• ${l}`)],
        cta: { label: t("cta.myShifts"), url: `${ORIGIN}${link}` },
      }),
      [t("digest.intro"), ...lines.map((l) => `- ${l}`), `${ORIGIN}${link}`].join("\n"),
    );
    doctors++;
    notices += claimed.length;
  }
  return { doctors, notices };
}
