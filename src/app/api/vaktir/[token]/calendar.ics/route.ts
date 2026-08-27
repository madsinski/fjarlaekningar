// Per-doctor calendar feed. Subscribe to this URL in Google/Apple Calendar and
// the doctor's shifts stay in sync. Token-gated. Iceland is UTC year-round, so
// shift times are emitted as UTC (…Z) — unambiguous, no DST.

import { supabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";

const pad = (n: number) => String(n).padStart(2, "0");
const stamp = (d: Date) =>
  `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`;
const dt = (date: string, time: string) => `${date.replace(/-/g, "")}T${(time || "00:00:00").replace(/:/g, "").padEnd(6, "0")}Z`;
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
    // How often a subscribed calendar should come back for changes. Without
    // these, Google decides on its own and can sit on a stale copy for a day —
    // long enough for a swapped shift to be missed.
    "REFRESH-INTERVAL;VALUE=DURATION:PT2H",
    "X-PUBLISHED-TTL:PT2H",
    "X-WR-TIMEZONE:Atlantic/Reykjavik",
  ];
  for (const s of shifts ?? []) {
    lines.push(
      "BEGIN:VEVENT",
      `UID:${s.id}@fjarlaekningar.is`,
      `DTSTAMP:${now}`,
      `DTSTART:${dt(s.shift_date, s.starts)}`,
      `DTEND:${dt(s.shift_date, s.ends)}`,
      "SUMMARY:Vakt — Fjarlækningar",
      ...(s.note ? [`DESCRIPTION:${esc(s.note)}`] : []),
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
