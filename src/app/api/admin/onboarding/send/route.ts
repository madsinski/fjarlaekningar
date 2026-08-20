// Send one station's innleiðingarpakki to its contact person.
//
// GET  ?institution=&station=  — render the email without sending it, so the
//      admin page can show exactly what would go out.
// POST { institutionId, stationId } — send it, then record on the station that
//      it went, and to which address.
//
// The state is re-read from the database rather than taken from the request, so
// the email is built from what is actually saved: a browser that is mid-edit
// cannot cause a message addressed to a half-typed name.

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getCallerStaff, isAdmin } from "@/lib/admin-auth";
import { sendEmail, renderFjarlaekningarEmail, markdownToEmailHtml, emailPlainText } from "@/lib/email";
import { mergeOnboarding, type OnboardingState } from "@/lib/station-onboarding";
import { buildPackageEmail, packageBlocker, packageUrl } from "@/lib/onboarding-package";

export const runtime = "nodejs";

const KEY = "station_onboarding";

async function readState(): Promise<OnboardingState> {
  const { data } = await supabaseAdmin.from("site_settings").select("value").eq("key", KEY).maybeSingle();
  return mergeOnboarding(data?.value);
}

/** Locate the institution + station, or explain which one is missing. */
function locate(state: OnboardingState, institutionId: string, stationId: string) {
  const inst = state.institutions.find((i) => i.id === institutionId);
  if (!inst) return { error: "Stofnun fannst ekki." as const };
  const station = inst.stations.find((s) => s.id === stationId);
  if (!station) return { error: "Stöð fannst ekki." as const };
  return { inst, station };
}

export async function GET(req: Request) {
  const caller = await getCallerStaff(req);
  if (!isAdmin(caller)) return NextResponse.json({ ok: false, error: "Admin role required" }, { status: 403 });

  const url = new URL(req.url);
  const found = locate(await readState(), url.searchParams.get("institution") ?? "", url.searchParams.get("station") ?? "");
  if ("error" in found) return NextResponse.json({ ok: false, error: found.error }, { status: 404 });

  const email = buildPackageEmail(found.inst, found.station);
  return NextResponse.json({
    ok: true,
    to: found.station.contact.email ?? "",
    blocker: packageBlocker(found.station),
    subject: email.subject,
    markdown: email.markdown,
    deckUrl: packageUrl(),
  });
}

export async function POST(req: Request) {
  const caller = await getCallerStaff(req);
  if (!isAdmin(caller)) return NextResponse.json({ ok: false, error: "Admin role required" }, { status: 403 });

  const body = (await req.json().catch(() => ({}))) as { institutionId?: string; stationId?: string };
  const state = await readState();
  const found = locate(state, body.institutionId ?? "", body.stationId ?? "");
  if ("error" in found) return NextResponse.json({ ok: false, error: found.error }, { status: 404 });

  const { inst, station } = found;
  const blocker = packageBlocker(station);
  if (blocker) return NextResponse.json({ ok: false, error: blocker }, { status: 400 });

  const to = station.contact.email!.trim();
  const email = buildPackageEmail(inst, station);

  const sent = await sendEmail({
    to,
    subject: email.subject,
    replyTo: email.replyTo,
    html: renderFjarlaekningarEmail({
      heading: email.heading,
      preheader: email.preheader,
      bodyHtml: markdownToEmailHtml(email.markdown),
      ctaLabel: email.ctaLabel,
      ctaHref: email.ctaHref,
      // Transactional: the recipient is a named contact, not a subscriber.
      unsubscribeUrl: "",
      footerNote: email.footerNote,
      template: "announcement-dark",
    }),
    text: emailPlainText(email.heading, email.markdown, ""),
  });

  if (!sent.ok) {
    return NextResponse.json({ ok: false, error: sent.error || "Sending mistókst" }, { status: 502 });
  }

  // Record the send on the station. Written against the state we just read, so
  // this never resurrects fields an admin deleted in the meantime.
  const sentAt = new Date().toISOString();
  const next: OnboardingState = {
    ...state,
    institutions: state.institutions.map((i) =>
      i.id !== inst.id
        ? i
        : {
            ...i,
            stations: i.stations.map((s) =>
              s.id !== station.id ? s : { ...s, packageSentAt: sentAt, packageSentTo: to },
            ),
          },
    ),
  };

  const { error } = await supabaseAdmin
    .from("site_settings")
    .upsert({ key: KEY, value: next, updated_by: caller!.id }, { onConflict: "key" });

  // The mail is already gone; a failed bookkeeping write must not read as a
  // failed send, or an admin will send it twice.
  return NextResponse.json({
    ok: true,
    to,
    sentAt,
    state: next,
    ...(error ? { warning: `Sent, en skráning mistókst: ${error.message}` } : {}),
  });
}
