// .ics-áskrift læknis HSU. Apple/Outlook sækja á klukkustundarfresti (Apple
// stillanlegt niður í 5 mín), Google á nokkurra klukkustunda fresti.
// Aðeins birtar vaktir. Hlekkurinn sjálfur er auðkennið.

import { supabaseAdmin } from "@/lib/supabase-admin";
import { hsuEventDescription, hsuEventTitle } from "@/lib/hsu/calendar";
import { DEFAULT_LANG, isLang, translator } from "@/lib/hsu/i18n/core";
import { notifyMsgs } from "@/lib/hsu/i18n/messages/notify";

export const runtime = "nodejs";

const pad = (n: number) => String(n).padStart(2, "0");
const stamp = (d: Date) =>
  `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`;
const day = (date: string) => date.replace(/-/g, "");
const nextDay = (date: string) => {
  const [y, m, d] = date.split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + 1));
  return `${t.getUTCFullYear()}${pad(t.getUTCMonth() + 1)}${pad(t.getUTCDate())}`;
};
const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/([,;])/g, "\\$1").replace(/\r\n?|\n/g, "\\n");

/** RFC 5545: línur lengri en 75 bæti eru brotnar með CRLF + bili. */
function fold(line: string): string {
  const bytes = Buffer.from(line, "utf8");
  if (bytes.length <= 75) return line;
  const parts: string[] = [];
  let start = 0;
  while (start < bytes.length) {
    let end = Math.min(start + (start === 0 ? 75 : 74), bytes.length);
    // Ekki brjóta í miðjum UTF-8 staf (ð, þ, æ eru tvö bæti).
    while (end < bytes.length && (bytes[end] & 0xc0) === 0x80) end--;
    parts.push(bytes.subarray(start, end).toString("utf8"));
    start = end;
  }
  return parts.join("\r\n ");
}

export async function GET(_req: Request, ctx: { params: Promise<{ token: string }> }) {
  const token = (await ctx.params).token.replace(/\.ics$/, "");
  if (token.length < 20) return new Response("Not found", { status: 404 });
  const { data: doctor } = await supabaseAdmin
    .from("hsu_doctors")
    .select("id, name, active, lang")
    .eq("calendar_token", token)
    .maybeSingle();
  if (!doctor?.active) return new Response("Not found", { status: 404 });

  const since = new Date(Date.now() - 60 * 86400_000).toISOString().slice(0, 10);
  const { data: shifts } = await supabaseAdmin
    .from("hsu_shifts")
    .select("id, shift_date, starts, ends, note, status, label")
    .eq("doctor_id", doctor.id)
    .eq("published", true)
    .is("confirm_status", null)
    .gte("shift_date", since)
    .order("shift_date");

  const lang = isLang(doctor.lang) ? doctor.lang : DEFAULT_LANG;
  const t = translator(notifyMsgs, lang);
  const now = stamp(new Date());
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//HSU//Vaktir//IS",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${esc(t("calendar.name", { name: doctor.name }))}`,
    "REFRESH-INTERVAL;VALUE=DURATION:PT1H",
    "X-PUBLISHED-TTL:PT1H",
    "X-WR-TIMEZONE:Atlantic/Reykjavik",
  ];
  for (const s of shifts ?? []) {
    lines.push(
      "BEGIN:VEVENT",
      `UID:hsu-${s.id}@fjarlaekningar.is`,
      `DTSTAMP:${now}`,
      `DTSTART;VALUE=DATE:${day(s.shift_date)}`,
      `DTEND;VALUE=DATE:${nextDay(s.shift_date)}`,
      `SUMMARY:${esc(hsuEventTitle(s.label, s.starts, s.ends))}`,
      "TRANSP:TRANSPARENT",
      `DESCRIPTION:${esc(hsuEventDescription(s, lang))}`,
      "END:VEVENT",
    );
  }
  lines.push("END:VCALENDAR");

  return new Response(lines.map(fold).join("\r\n") + "\r\n", {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'inline; filename="hsu-vaktir.ics"',
      "Cache-Control": "no-store",
    },
  });
}
