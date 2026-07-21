// Pure email rendering — NO secrets, NO env reads.
//
// Split out of email.ts so the admin composer can import it into a CLIENT
// component to render a live preview. email.ts (which reads RESEND_API_KEY)
// must never reach the browser bundle.

const CYAN_DARK = "#0488a4";
const INK = "#1f2937";
const MUTED = "#6b7280";
const BORDER = "#e8eaed";
const CANVAS = "#f5f7fa";

const SITE_URL = "https://www.fjarlaekningar.is";
const LOGO_URL = `${SITE_URL}/fjarlaekningar-logo.png`;

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// ── Markdown → email HTML ───────────────────────────────────────────────────
// Same block grammar as src/lib/markdown.tsx (headings, paragraphs, lists,
// rules, **bold**, *italic*, [links]) but emitting inline-styled HTML strings,
// since email clients drop <style> blocks and most class-based CSS.

function renderInline(text: string): string {
  let out = escapeHtml(text);
  // [label](url) — only http(s)/mailto survive, anything else renders as text.
  out = out.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_m, label: string, href: string) => {
    const safe = /^(https?:|mailto:)/i.test(href) ? href : "";
    if (!safe) return label;
    return `<a href="${escapeHtml(safe)}" style="color:${CYAN_DARK};text-decoration:underline;">${label}</a>`;
  });
  out = out.replace(/\*\*([^*]+)\*\*/g, `<strong style="color:${INK};">$1</strong>`);
  out = out.replace(/\*([^*]+)\*/g, "<em>$1</em>");
  return out;
}

/** Convert the campaign's markdown body into inline-styled email HTML. */
export function markdownToEmailHtml(md: string): string {
  const lines = (md || "").replace(/\r\n/g, "\n").split("\n");
  const out: string[] = [];
  let para: string[] = [];
  let list: { ordered: boolean; items: string[] } | null = null;

  const flushPara = () => {
    if (!para.length) return;
    out.push(
      `<p style="margin:0 0 16px;color:#334155;font-size:15px;line-height:1.65;">${renderInline(para.join(" "))}</p>`,
    );
    para = [];
  };
  const flushList = () => {
    if (!list) return;
    const tag = list.ordered ? "ol" : "ul";
    const items = list.items
      .map((i) => `<li style="margin:0 0 8px;color:#334155;font-size:15px;line-height:1.6;">${renderInline(i)}</li>`)
      .join("");
    out.push(`<${tag} style="margin:0 0 16px;padding-left:22px;">${items}</${tag}>`);
    list = null;
  };

  for (const raw of lines) {
    const line = raw.trimEnd();
    if (!line.trim()) {
      flushPara();
      flushList();
      continue;
    }
    if (/^---+$/.test(line.trim())) {
      flushPara();
      flushList();
      out.push(`<hr style="border:0;border-top:1px solid ${BORDER};margin:24px 0;" />`);
      continue;
    }
    const h = line.match(/^(#{1,3})\s+(.*)$/);
    if (h) {
      flushPara();
      flushList();
      const size = h[1].length === 1 ? 22 : h[1].length === 2 ? 18 : 16;
      out.push(
        `<h${h[1].length} style="margin:24px 0 10px;font-size:${size}px;font-weight:700;color:${INK};line-height:1.3;">${renderInline(h[2])}</h${h[1].length}>`,
      );
      continue;
    }
    const ol = line.match(/^\s*\d+\.\s+(.*)$/);
    const ul = line.match(/^\s*[-*]\s+(.*)$/);
    if (ol) {
      flushPara();
      if (!list || !list.ordered) { flushList(); list = { ordered: true, items: [] }; }
      list.items.push(ol[1]);
      continue;
    }
    if (ul) {
      flushPara();
      if (!list || list.ordered) { flushList(); list = { ordered: false, items: [] }; }
      list.items.push(ul[1]);
      continue;
    }
    flushList();
    para.push(line.trim());
  }
  flushPara();
  flushList();
  return out.join("\n");
}

// ── Branded shell ───────────────────────────────────────────────────────────

export interface FjarlaekningarEmailInput {
  heading: string;
  /** Already-rendered HTML for the body (use markdownToEmailHtml). */
  bodyHtml: string;
  /** Hidden inbox preview line shown next to the subject. */
  preheader?: string;
  ctaLabel?: string;
  ctaHref?: string;
  /** Required for marketing email — every send must be opt-out-able. */
  unsubscribeUrl: string;
}

/**
 * Wrap body HTML in the Fjarlækningar look: white card on the light canvas,
 * cyan accents, logo header, and a footer carrying the unsubscribe link.
 * Table-based with inline styles for email-client compatibility.
 */
export function renderFjarlaekningarEmail(input: FjarlaekningarEmailInput): string {
  const preheader = input.preheader
    ? `<div style="display:none;overflow:hidden;line-height:1px;opacity:0;max-height:0;max-width:0;">${escapeHtml(input.preheader)}</div>`
    : "";

  const cta =
    input.ctaLabel && input.ctaHref
      ? `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:28px 0 4px;">
          <tr><td style="border-radius:999px;background:${CYAN_DARK};">
            <a href="${escapeHtml(input.ctaHref)}" style="display:inline-block;padding:13px 30px;color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;border-radius:999px;">${escapeHtml(input.ctaLabel)}</a>
          </td></tr>
        </table>`
      : "";

  return `<!doctype html>
<html lang="is"><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width,initial-scale=1" /><title>${escapeHtml(input.heading)}</title></head>
<body style="margin:0;padding:0;background:${CANVAS};">
  ${preheader}
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${CANVAS};padding:32px 12px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;background:#ffffff;border:1px solid ${BORDER};border-radius:16px;overflow:hidden;font-family:Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">

        <tr><td style="padding:24px 32px;border-bottom:1px solid ${BORDER};">
          <a href="${SITE_URL}" style="text-decoration:none;display:inline-block;">
            <img src="${LOGO_URL}" alt="Fjarlækningar" width="170" style="display:block;height:auto;max-width:170px;border:0;" />
          </a>
        </td></tr>

        <tr><td style="padding:32px;">
          <h1 style="margin:0 0 18px;font-size:24px;line-height:1.25;font-weight:800;color:${INK};letter-spacing:-0.01em;">${escapeHtml(input.heading)}</h1>
          ${input.bodyHtml}
          ${cta}
        </td></tr>

        <tr><td style="padding:20px 32px 28px;border-top:1px solid ${BORDER};background:#fbfcfd;">
          <p style="margin:0 0 6px;color:${MUTED};font-size:12px;line-height:1.6;">
            Fjarlækningar ehf. · Ísland ·
            <a href="mailto:fjarlaekningar@fjarlaekningar.is" style="color:${CYAN_DARK};text-decoration:none;">fjarlaekningar@fjarlaekningar.is</a>
          </p>
          <p style="margin:0;color:${MUTED};font-size:12px;line-height:1.6;">
            Þú færð þennan póst af því að þú skráðir þig á fréttalista okkar.
            <a href="${escapeHtml(input.unsubscribeUrl)}" style="color:${MUTED};text-decoration:underline;">Afskrá mig</a>.
          </p>
        </td></tr>

      </table>
      <div style="max-width:600px;margin:14px auto 0;color:#9aa4b2;font-size:11px;font-family:Inter,-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
        <a href="${SITE_URL}" style="color:#9aa4b2;text-decoration:none;">www.fjarlaekningar.is</a>
      </div>
    </td></tr>
  </table>
</body></html>`;
}

/** Plain-text fallback so the email isn't HTML-only (helps deliverability). */
export function emailPlainText(heading: string, markdownBody: string, unsubscribeUrl: string): string {
  const body = (markdownBody || "")
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1 ($2)")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/^#{1,3}\s+/gm, "");
  return `${heading}\n\n${body}\n\n—\nFjarlækningar ehf. · www.fjarlaekningar.is\nAfskrá: ${unsubscribeUrl}\n`;
}
