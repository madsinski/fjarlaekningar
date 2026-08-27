// Per-doctor calendar feed. Subscribe to this URL in Google/Apple Calendar and
// the doctor's shifts stay in sync. Token-gated.
//
// Shifts are emitted as ALL-DAY events titled "FL: 10-22". Dates carry no
// timezone at all, which sidesteps the question entirely — and a shift is a
// day you are working, not a twelve-hour appointment.

import { supabaseAdmin } from "@/lib/supabase-admin";
import { shiftEventTitle, hhmm } from "@/lib/roster";

export const runtime = "nodejs";

const pad = (n: number) => String(n).padStart(2, "0");
const stamp = (d: Date) =>
  `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`;
const day = (date: string) => date.replace(/-/g, "");
/** All-day DTEND is exclusive, so a one-day event ends on the following date. */
const nextDay = (date: string) => {
  const [y, m, d] = date.split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + 1));
  return `${t.getUTCFullYear()}${pad(t.getUTCMonth() + 1)}${pad(t.getUTCDate())}`;
};
const esc = (s: string) => s.replace(/([,;\\])/g, "\\$1").replace(/\n/g, "\\n");

export async function GET(req: Request, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params;
  const { data: doctor } = await supabaseAdmin
    .from("roster_doctors")
    .select("id, name")
    .eq("access_token", token)
    .maybeSingle();
  if (!doctor) return new Response("Not found", { status: 404 });

  const { data: shifts } = await supabaseAdmin
    .from("roster_shifts")
    .select("id, shift_date, starts, ends, note, status")
    .eq("doctor_id", doctor.id)
    .neq("status", "open")
    .order("shift_date");

  const now = stamp(new Date());
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Fjarlaekningar//Vaktir//IS",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:Fjarlækningar — vaktir (${esc(doctor.name)})`,
    // How often a subscribed calendar should come back for changes.
    //
    // Apple and Outlook honour this; Google does not — it refreshes external
    // feeds on a schedule of its own (hours, sometimes a day) and offers no way
    // to be pushed. So an hour here is the floor for the clients that listen,
    // and Google users have to be told that their copy lags.
    "REFRESH-INTERVAL;VALUE=DURATION:PT1H",
    "X-PUBLISHED-TTL:PT1H",
    "X-WR-TIMEZONE:Atlantic/Reykjavik",
  ];
  for (const s of shifts ?? []) {
    lines.push(
      "BEGIN:VEVENT",
      `UID:${s.id}@fjarlaekningar.is`,
      `DTSTAMP:${now}`,
      // All-day rather than a timed 10–22 block: a twelve-hour busy block fills
      // the entire day column and hides everything else. TRANSP:TRANSPARENT
      // keeps the doctor showing as free, since being on shift is not the same
      // as being unavailable to whoever else reads their calendar.
      `DTSTART;VALUE=DATE:${day(s.shift_date)}`,
      `DTEND;VALUE=DATE:${nextDay(s.shift_date)}`,
      `SUMMARY:${esc(shiftEventTitle(s.starts, s.ends))}`,
      "TRANSP:TRANSPARENT",
      `DESCRIPTION:${esc(`Vakt hjá Fjarlækningum ${hhmm(s.starts)}–${hhmm(s.ends)}.${s.note ? `\n\n${s.note}` : ""}`)}`,
      "END:VEVENT",
    );
  }
  lines.push("END:VCALENDAR");

  return new Response(lines.join("\r\n"), {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'inline; filename="fjarlaekningar-vaktir.ics"',
      "Cache-Control": "no-store",
    },
  });
}
