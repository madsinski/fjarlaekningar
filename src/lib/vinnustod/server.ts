// Vinnustöð — sameiginleg föll á þjóni. Server-only.

import { sendEmail } from "@/lib/email";
import { escapeHtml, renderFjarlaekningarEmail } from "@/lib/email-render";

export { fail, json, originOf, readJson, UUID_RE } from "@/lib/hsu/server";

const FROM = process.env.VINNUSTOD_FROM_EMAIL || "Fjarlækningar <fjarlaekningar@fjarlaekningar.is>";

/** Tölvupóstur í útliti Fjarlækninga. Málsgreinar eru hreinn texti. */
export async function sendVsEmail(opts: {
  to: string;
  subject: string;
  heading: string;
  paragraphs: string[];
  cta?: { label: string; url: string };
  foot?: string;
  replyTo?: string;
}) {
  const bodyHtml = opts.paragraphs
    .map((p) => `<p style="margin:0 0 14px;color:#334155;font-size:15px;line-height:1.65;white-space:pre-wrap;">${escapeHtml(p)}</p>`)
    .join("");
  const html = renderFjarlaekningarEmail({
    heading: opts.heading,
    bodyHtml,
    preheader: opts.paragraphs[0]?.slice(0, 120),
    ctaLabel: opts.cta?.label,
    ctaHref: opts.cta?.url,
    unsubscribeUrl: "",
    footerNote: opts.foot ?? "Þú færð þennan póst vegna aðgangs þíns að vinnustöð Fjarlækninga.",
  });
  const text = [opts.heading, "", ...opts.paragraphs, ...(opts.cta ? ["", `${opts.cta.label}: ${opts.cta.url}`] : []), "", "—", "Fjarlækningar ehf. · www.fjarlaekningar.is"].join("\n");
  return sendEmail({ to: opts.to, subject: opts.subject, html, text, from: FROM, replyTo: opts.replyTo });
}

/** Ein lína, t.d. fyrirsögn sem fer í efnislínu tölvupósts: engin línubil. */
export function cleanLine(v: unknown, max: number): string {
  return cleanText(String(v ?? "").replace(/[\r\n\t]+/g, " "), max).replace(/ {2,}/g, " ");
}

/** Snyrtir frjálsan texta: engin stýritákn, hámarkslengd. */
export function cleanText(v: unknown, max: number): string {
  return String(v ?? "").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "").trim().slice(0, max);
}
