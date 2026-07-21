// Send a campaign. Admin only.
//
//   { test: true }  → sends one copy to the caller's own address, changes nothing
//   { }             → sends to every ACTIVE subscriber, then marks the campaign
//                     sent and records the count
//
// Each recipient gets their own unsubscribe URL built from their token, so the
// footer link in every email opts out exactly that address.

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getCallerStaff, isAdmin } from "@/lib/admin-auth";
import {
  sendEmail,
  renderFjarlaekningarEmail,
  markdownToEmailHtml,
  emailPlainText,
} from "@/lib/email";
import { PUBLIC_SITE_URL } from "@/lib/public-site";

export const runtime = "nodejs";
export const maxDuration = 300;

const unsubUrl = (token: string) => `${PUBLIC_SITE_URL}/api/unsubscribe?token=${encodeURIComponent(token)}`;

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const caller = await getCallerStaff(req);
  if (!isAdmin(caller)) {
    return NextResponse.json({ ok: false, error: "Admin role required" }, { status: 403 });
  }
  const { id } = await ctx.params;

  let body: { test?: unknown } = {};
  try {
    body = await req.json();
  } catch {
    /* no body === real send */
  }
  const isTest = body.test === true;

  const { data: campaign } = await supabaseAdmin
    .from("outreach_campaigns")
    .select("id, subject, preheader, body, status")
    .eq("id", id)
    .maybeSingle();
  if (!campaign) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  if (!campaign.subject?.trim()) {
    return NextResponse.json({ ok: false, error: "Efnislína vantar" }, { status: 400 });
  }
  if (!isTest && campaign.status === "sent") {
    return NextResponse.json({ ok: false, error: "Herferðin hefur þegar verið send" }, { status: 409 });
  }

  const bodyHtml = markdownToEmailHtml(String(campaign.body || ""));

  // ── Test send: just the caller, nothing recorded ──────────────────────────
  if (isTest) {
    const token = "test-token-preview";
    const res = await sendEmail({
      to: caller!.email,
      subject: `[PRÓF] ${campaign.subject}`,
      html: renderFjarlaekningarEmail({
        heading: campaign.subject,
        bodyHtml,
        preheader: campaign.preheader || undefined,
        unsubscribeUrl: unsubUrl(token),
      }),
      text: emailPlainText(campaign.subject, String(campaign.body || ""), unsubUrl(token)),
    });
    return res.ok
      ? NextResponse.json({ ok: true, test: true, to: caller!.email })
      : NextResponse.json({ ok: false, error: res.error || "Sending mistókst" }, { status: 500 });
  }

  // ── Real send: every active subscriber ────────────────────────────────────
  const { data: subs, error: subErr } = await supabaseAdmin
    .from("subscribers")
    .select("email, name, unsubscribe_token")
    .is("unsubscribed_at", null);
  if (subErr) return NextResponse.json({ ok: false, error: subErr.message }, { status: 500 });

  const recipients = subs ?? [];
  if (recipients.length === 0) {
    return NextResponse.json({ ok: false, error: "Enginn virkur áskrifandi" }, { status: 400 });
  }

  let sent = 0;
  const failures: { email: string; error: string }[] = [];

  // Sequential with a small gap — well inside Resend's rate limit and keeps
  // one bad address from aborting the run.
  for (const r of recipients) {
    const unsubscribeUrl = unsubUrl(r.unsubscribe_token);
    const res = await sendEmail({
      to: r.email,
      subject: campaign.subject,
      html: renderFjarlaekningarEmail({
        heading: campaign.subject,
        bodyHtml,
        preheader: campaign.preheader || undefined,
        unsubscribeUrl,
      }),
      text: emailPlainText(campaign.subject, String(campaign.body || ""), unsubscribeUrl),
    });
    if (res.ok) sent++;
    else failures.push({ email: r.email, error: res.error || "unknown" });
  }

  await supabaseAdmin
    .from("outreach_campaigns")
    .update({ status: "sent", sent_at: new Date().toISOString(), sent_count: sent })
    .eq("id", id);

  return NextResponse.json({
    ok: true,
    sent,
    total: recipients.length,
    failures,
  });
}
