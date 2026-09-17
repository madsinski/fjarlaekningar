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
    .select("id, doctor_id, created_at, lines, category, link")
    .eq("email_pending", true).is("emailed_at", null)
    .order("created_at", { ascending: true }).limit(500);
  type Row = { id: string; created_at: string; lines: string[]; category: string | null; link: string | null };
  const byDoctor = new Map<string, Row[]>();
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
    // Línur raðast eftir flokki, svo einn póstur getur borið breytingar, beiðnir
    // og annað án þess að renna saman.
    const seen = new Set<string>();
    const byCat = new Map<string, string[]>();
    let lineCount = 0;
    for (const n of list) {
      const cat = n.category ?? "other";
      for (const l of n.lines ?? []) {
        if (l.trim().endsWith(":") || seen.has(l)) continue;
        seen.add(l);
        byCat.set(cat, [...(byCat.get(cat) ?? []), l]);
        lineCount++;
      }
    }
    if (!lineCount) continue;
    const cats = [...byCat.keys()];
    const onlyShifts = cats.length === 1 && cats[0] === "shifts";
    // Hlekkurinn: sameiginlegur ef allar tilkynningarnar vísa á sama stað.
    const links = new Set(list.map((n) => n.link).filter(Boolean) as string[]);
    const link = links.size === 1 ? [...links][0] : "/hsu/min-sida?t=vaktir";
    const lang = isLang(doc.lang) ? doc.lang : DEFAULT_LANG;
    const t = translator(notifyMsgs, lang);
    const subject = onlyShifts
      ? (lineCount === 1 ? t("digest.subjectSingle") : t.n("digest.subject", lineCount))
      : (lineCount === 1 ? t("digest.mixed.subjectSingle") : t.n("digest.mixed.subject", lineCount));
    const body: string[] = [];
    for (const cat of cats) {
      const ls = byCat.get(cat) ?? [];
      if (!onlyShifts) body.push(`${t.dyn(`digest.section.${cat}`)}:`);
      body.push(...ls.map((l) => `• ${l}`));
    }
    await sendHsuEmail(
      doc.email,
      subject,
      hsuEmailHtml({
        origin: ORIGIN,
        lang,
        heading: t(onlyShifts ? "digest.heading" : "digest.mixed.heading"),
        paragraphs: [t("hello", { name: doc.name }), t(onlyShifts ? "digest.intro" : "digest.mixed.intro"), ...body],
        cta: { label: t(link.startsWith("/hsu/stjorn") ? "cta.planner" : "cta.myShifts"), url: `${ORIGIN}${link}` },
      }),
      [t(onlyShifts ? "digest.intro" : "digest.mixed.intro"), ...body.map((l) => l.replace("• ", "- ")), `${ORIGIN}${link}`].join("\n"),
    );
    doctors++;
    notices += claimed.length;
  }
  return { doctors, notices };
}
