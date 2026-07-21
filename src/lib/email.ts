// Email sending + the branded Fjarlækningar email shell.
//
// Mirrors lifeline-website's src/lib/email.ts: a thin Resend REST wrapper that
// DEGRADES GRACEFULLY — with no RESEND_API_KEY it logs the message and reports
// success, so drafting/previewing/testing all work before the key exists.
//
// Server-only (reads secrets). Never import from a "use client" file.

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_ADDRESS =
  process.env.OUTREACH_FROM_EMAIL || "Fjarlækningar <frettir@fjarlaekningar.is>";

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
}

export interface SendEmailResult {
  ok: boolean;
  id?: string;
  error?: string;
}

/**
 * Send one email through Resend.
 *
 * Without RESEND_API_KEY this logs and returns ok — so nothing breaks before
 * the key is provisioned, and local/dev never sends real mail by accident.
 */
export async function sendEmail(opts: SendEmailOptions): Promise<SendEmailResult> {
  if (!RESEND_API_KEY) {
    console.warn("[email] RESEND_API_KEY not set — logging instead of sending");
    console.log("[email] TO:", opts.to, "SUBJECT:", opts.subject);
    return { ok: true, id: "dev-log" };
  }
  try {
    const payload: Record<string, unknown> = {
      from: FROM_ADDRESS,
      to: [opts.to],
      subject: opts.subject,
      html: opts.html,
    };
    if (opts.text) payload.text = opts.text;
    if (opts.replyTo) payload.reply_to = opts.replyTo;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { ok: false, error: json?.error?.message || json?.message || `HTTP ${res.status}` };
    }
    return { ok: true, id: json?.id };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

// Re-export the pure renderers so server routes can import everything from
// "@/lib/email" as before.
export {
  escapeHtml,
  markdownToEmailHtml,
  renderFjarlaekningarEmail,
  emailPlainText,
  type FjarlaekningarEmailInput,
} from "./email-render";
