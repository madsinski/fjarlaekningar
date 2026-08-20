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

// Content palette for the card blocks below (kept local to the renderer).
const MD_BODY = "#334155";
const MD_PRIMARY = "#00a8cc";
const MD_CYAN = "#00d6ff";
const MD_WASH = "#f2f9fc";
const MD_WASH_LINE = "#dbeef6";

// A paragraph that is nothing but a single [label](url) becomes a pill button.
const SOLE_LINK = /^\[([^\]]+)\]\(([^)]+)\)$/;

/**
 * Convert the campaign's markdown body into inline-styled email HTML, rendering
 * block elements as email-safe cards so newsletters look designed, not plain:
 *   - unordered list  → tinted check-list card (✓ badges)
 *   - ordered list    → numbered step cards (gradient number badge)
 *   - > blockquote    → cyan callout card with an accent bar
 *   - a lone link     → pill CTA button
 * Everything is table-based with inline styles for email-client compatibility.
 */
export function markdownToEmailHtml(md: string): string {
  const lines = (md || "").replace(/\r\n/g, "\n").split("\n");
  const out: string[] = [];
  let para: string[] = [];
  let list: { ordered: boolean; items: string[] } | null = null;
  let quote: string[] = [];

  const flushPara = () => {
    if (!para.length) return;
    const joined = para.join(" ").trim();
    const link = joined.match(SOLE_LINK);
    if (link && /^(https?:|mailto:)/i.test(link[2])) {
      out.push(
        `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:6px 0 20px;"><tr><td style="border-radius:999px;background:${CYAN_DARK};"><a href="${escapeHtml(link[2])}" style="display:inline-block;padding:13px 30px;color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;border-radius:999px;">${escapeHtml(link[1])}</a></td></tr></table>`,
      );
    } else {
      out.push(`<p style="margin:0 0 16px;color:${MD_BODY};font-size:15px;line-height:1.65;">${renderInline(joined)}</p>`);
    }
    para = [];
  };

  const flushQuote = () => {
    if (!quote.length) return;
    out.push(
      `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 16px;background:${MD_WASH};border-left:4px solid ${MD_PRIMARY};border-radius:0 10px 10px 0;"><tr><td style="padding:14px 18px;color:${INK};font-size:15px;line-height:1.6;">${renderInline(quote.join(" "))}</td></tr></table>`,
    );
    quote = [];
  };

  const flushList = () => {
    if (!list) return;
    if (list.ordered) {
      // Numbered step cards.
      const cards = list.items
        .map(
          (item, i) =>
            `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 10px;background:#ffffff;border:1px solid ${BORDER};border-radius:12px;"><tr><td width="56" valign="middle" style="padding:14px 0 14px 16px;"><table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td width="30" height="30" align="center" valign="middle" style="width:30px;height:30px;background:${MD_PRIMARY};background-image:linear-gradient(135deg,${MD_PRIMARY},${MD_CYAN});border-radius:50%;color:#ffffff;font-weight:800;font-size:14px;line-height:30px;">${i + 1}</td></tr></table></td><td valign="middle" style="padding:12px 16px 12px 12px;color:${MD_BODY};font-size:15px;line-height:1.5;">${renderInline(item)}</td></tr></table>`,
        )
        .join("");
      out.push(cards);
    } else {
      // Tinted check-list card.
      const rows = list.items
        .map(
          (item) =>
            `<tr><td width="30" valign="top" style="padding:5px 10px 5px 0;"><table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td width="20" height="20" align="center" valign="middle" style="width:20px;height:20px;background:${MD_PRIMARY};border-radius:50%;color:#ffffff;font-size:12px;font-weight:700;line-height:20px;">&#10003;</td></tr></table></td><td valign="top" style="padding:5px 0;color:${MD_BODY};font-size:15px;line-height:1.5;">${renderInline(item)}</td></tr>`,
        )
        .join("");
      out.push(
        `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 16px;background:${MD_WASH};border:1px solid ${MD_WASH_LINE};border-radius:12px;"><tr><td style="padding:12px 18px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${rows}</table></td></tr></table>`,
      );
    }
    list = null;
  };

  const flushAll = () => {
    flushPara();
    flushList();
    flushQuote();
  };

  for (const raw of lines) {
    const line = raw.trimEnd();
    if (!line.trim()) {
      flushAll();
      continue;
    }
    if (/^---+$/.test(line.trim())) {
      flushAll();
      out.push(`<hr style="border:0;border-top:1px solid ${BORDER};margin:24px 0;" />`);
      continue;
    }
    const h = line.match(/^(#{1,3})\s+(.*)$/);
    if (h) {
      flushAll();
      const size = h[1].length === 1 ? 22 : h[1].length === 2 ? 18 : 16;
      out.push(
        `<h${h[1].length} style="margin:24px 0 10px;font-size:${size}px;font-weight:700;color:${INK};line-height:1.3;">${renderInline(h[2])}</h${h[1].length}>`,
      );
      continue;
    }
    const bq = line.match(/^\s*>\s?(.*)$/);
    if (bq) {
      flushPara();
      flushList();
      quote.push(bq[1]);
      continue;
    }
    const ol = line.match(/^\s*\d+\.\s+(.*)$/);
    const ul = line.match(/^\s*[-*]\s+(.*)$/);
    if (ol) {
      flushPara();
      flushQuote();
      if (!list || !list.ordered) { flushList(); list = { ordered: true, items: [] }; }
      list.items.push(ol[1]);
      continue;
    }
    if (ul) {
      flushPara();
      flushQuote();
      if (!list || list.ordered) { flushList(); list = { ordered: false, items: [] }; }
      list.items.push(ul[1]);
      continue;
    }
    flushList();
    flushQuote();
    para.push(line.trim());
  }
  flushAll();
  return out.join("\n");
}

// ── Branded shell ───────────────────────────────────────────────────────────

export type EmailTemplate =
  | "classic"
  | "hero"
  | "minimal"
  | "announcement"
  | "announcement-dark"
  | "announcement-band"
  | "announcement-accent";

/** Selectable designs, surfaced in the /admin/outreach composer. */
export const EMAIL_TEMPLATES: { id: EmailTemplate; label: string; hint: string }[] = [
  { id: "announcement", label: "Tilkynning – ljós", hint: "„NÝTT“ merki, ljós haus — fyrir kynningar" },
  { id: "announcement-dark", label: "Tilkynning – dökk", hint: "Dökkur borði með cyan glæðum, líkt og veggspjaldið" },
  { id: "announcement-band", label: "Tilkynning – borði", hint: "Cyan litaborði með fyrirsögn í hvítu" },
  { id: "announcement-accent", label: "Tilkynning – áhersla", hint: "Bleik (magenta) áhersla og merki" },
  { id: "classic", label: "Klassískt", hint: "Hvítt spjald, merki efst — rólegt og traust" },
  { id: "hero", label: "Blár haus", hint: "Dökkblár haus með fyrirsögn í hvítu" },
  { id: "minimal", label: "Einfalt", hint: "Hreint bréf, lítið merki, mikið hvítt rými" },
];

// Shared eyebrow + body/CTA/footer tail for the "Tilkynning" family, so the
// variants differ only in their header treatment.
const annEyebrow = (color: string) =>
  `<div style="font-size:12px;font-weight:800;letter-spacing:0.14em;text-transform:uppercase;color:${color};margin:0 0 10px;">Nýtt</div>`;

const CYAN_TINT = "#e6f4f7";
// Fjarlækningar print/deck brand palette (mirrors collateral-css.ts) so the
// "Tilkynning" email family matches the veggspjald / blaðaauglýsing look.
const BRAND_PRIMARY = "#00a8cc";
const BRAND_CYAN = "#00d6ff";
const BRAND_DARK1 = "#062a38";
const BRAND_DARK2 = "#0a4a5e";
const BRAND_ACCENT = "#cf147b";
const BRAND_ACCENT_DARK = "#af146a";
const BRAND_ACCENT_TINT = "#fbe3ef";
const FONT = "Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";

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
  /**
   * Replaces the "you signed up for our newsletter" line and its unsubscribe
   * link. Set this on transactional mail, where neither statement is true.
   */
  footerNote?: string;
  /** Visual design; defaults to "classic". */
  template?: EmailTemplate;
}

// ── Shared building blocks (all table-based, inline-styled) ──────────────────

const logoRow = (opts: { border?: boolean; small?: boolean } = {}) =>
  `<tr><td style="padding:${opts.small ? "8px 0 0" : "24px 32px"};${opts.border ? `border-bottom:1px solid ${BORDER};` : ""}">
    <a href="${SITE_URL}" style="text-decoration:none;display:inline-block;">
      <img src="${LOGO_URL}" alt="Fjarlækningar" width="${opts.small ? 140 : 170}" style="display:block;height:auto;max-width:${opts.small ? 140 : 170}px;border:0;" />
    </a>
  </td></tr>`;

const ctaBlock = (label?: string, href?: string, margin = "28px 0 4px") =>
  label && href
    ? `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:${margin};">
        <tr><td style="border-radius:999px;background:${CYAN_DARK};">
          <a href="${escapeHtml(href)}" style="display:inline-block;padding:13px 30px;color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;border-radius:999px;">${escapeHtml(label)}</a>
        </td></tr>
      </table>`
    : "";

// The second line explains why the message arrived. For newsletters that is the
// mailing list and an unsubscribe link; a transactional email — sent to one
// named person because of something we agreed with them — passes `footerNote`
// instead, since telling a hospital contact they joined a mailing list would be
// untrue and the unsubscribe would do nothing for them.
const footerRow = (unsubscribeUrl: string, footerNote?: string) =>
  `<tr><td style="padding:20px 32px 28px;border-top:1px solid ${BORDER};background:#fbfcfd;">
    <p style="margin:0 0 6px;color:${MUTED};font-size:12px;line-height:1.6;">
      Fjarlækningar ehf. · Ísland ·
      <a href="mailto:fjarlaekningar@fjarlaekningar.is" style="color:${CYAN_DARK};text-decoration:none;">fjarlaekningar@fjarlaekningar.is</a>
    </p>
    ${
      footerNote
        ? `<p style="margin:0;color:${MUTED};font-size:12px;line-height:1.6;">${escapeHtml(footerNote)}</p>`
        : `<p style="margin:0;color:${MUTED};font-size:12px;line-height:1.6;">
      Þú færð þennan póst af því að þú skráðir þig á fréttalista okkar.
      <a href="${escapeHtml(unsubscribeUrl)}" style="color:${MUTED};text-decoration:underline;">Afskrá mig</a>.
    </p>`
    }
  </td></tr>`;

const card = (rows: string, radius = true) =>
  `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;background:#ffffff;border:1px solid ${BORDER};${radius ? "border-radius:16px;" : ""}overflow:hidden;font-family:${FONT};">${rows}</table>`;

const page = (heading: string, preheader: string | undefined, inner: string) =>
  `<!doctype html>
<html lang="is"><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width,initial-scale=1" /><title>${escapeHtml(heading)}</title></head>
<body style="margin:0;padding:0;background:${CANVAS};">
  ${preheader ? `<div style="display:none;overflow:hidden;line-height:1px;opacity:0;max-height:0;max-width:0;">${escapeHtml(preheader)}</div>` : ""}
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${CANVAS};padding:32px 12px;">
    <tr><td align="center">
      ${inner}
    </td></tr>
  </table>
</body></html>`;

const wwwLine = `<div style="max-width:600px;margin:14px auto 0;color:#9aa4b2;font-size:11px;font-family:${FONT};">
        <a href="${SITE_URL}" style="color:#9aa4b2;text-decoration:none;">www.fjarlaekningar.is</a>
      </div>`;

// Body + CTA + footer that follows every "Tilkynning" header variant.
const annTail = (input: FjarlaekningarEmailInput) => `
        <tr><td style="padding:18px 32px 4px;">
          ${input.bodyHtml}
        </td></tr>
        <tr><td style="padding:0 32px 30px;">
          ${ctaBlock(input.ctaLabel, input.ctaHref, "12px 0 0")}
        </td></tr>
        ${footerRow(input.unsubscribeUrl, input.footerNote)}`;

/**
 * Wrap body HTML in the Fjarlækningar look. Selectable designs share the logo,
 * brand palette and unsubscribe footer; they differ in header treatment and
 * emphasis. The "Tilkynning" family mirrors the print collateral (dark hero
 * band with cyan/magenta glow, cyan band, magenta accent). Table-based with
 * inline styles for email-client compatibility.
 */
export function renderFjarlaekningarEmail(input: FjarlaekningarEmailInput): string {
  const h = escapeHtml(input.heading);
  const cta = ctaBlock(input.ctaLabel, input.ctaHref);

  switch (input.template) {
    // Blue hero band: logo, then the heading reversed out in white on cyan.
    case "hero":
      return page(input.heading, input.preheader, `${card(`
        ${logoRow({ border: true })}
        <tr><td style="padding:34px 32px;background:${CYAN_DARK};">
          <h1 style="margin:0;font-size:26px;line-height:1.25;font-weight:800;color:#ffffff;letter-spacing:-0.01em;">${h}</h1>
        </td></tr>
        <tr><td style="padding:32px;">
          ${input.bodyHtml}
          ${cta}
        </td></tr>
        ${footerRow(input.unsubscribeUrl, input.footerNote)}`)}
      ${wwwLine}`);

    // Letter style: no card chrome, small left logo, generous whitespace.
    case "minimal":
      return page(input.heading, input.preheader, card(`
        <tr><td style="padding:8px 8px 0;">
          <a href="${SITE_URL}" style="text-decoration:none;display:inline-block;">
            <img src="${LOGO_URL}" alt="Fjarlækningar" width="140" style="display:block;height:auto;max-width:140px;border:0;" />
          </a>
        </td></tr>
        <tr><td style="padding:20px 8px 8px;">
          <hr style="border:0;border-top:1px solid ${BORDER};margin:0 0 22px;" />
          <h1 style="margin:0 0 18px;font-size:22px;line-height:1.3;font-weight:800;color:${INK};letter-spacing:-0.01em;">${h}</h1>
          ${input.bodyHtml}
          ${cta}
        </td></tr>
        <tr><td style="padding:22px 8px 8px;border-top:1px solid ${BORDER};">
          <p style="margin:0;color:${MUTED};font-size:12px;line-height:1.6;">
            Fjarlækningar ehf. ·
            <a href="mailto:fjarlaekningar@fjarlaekningar.is" style="color:${CYAN_DARK};text-decoration:none;">fjarlaekningar@fjarlaekningar.is</a> ·
            <a href="${escapeHtml(input.unsubscribeUrl)}" style="color:${MUTED};text-decoration:underline;">Afskrá</a>
          </p>
        </td></tr>`, false));

    // Launch style: cyan-tint "NÝTT" badge over a big heading (light).
    case "announcement":
      return page(input.heading, input.preheader, `${card(`
        ${logoRow({ border: true })}
        <tr><td style="padding:30px 32px 0;">
          <span style="display:inline-block;background:${CYAN_TINT};color:${CYAN_DARK};font-size:12px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;padding:5px 12px;border-radius:999px;">Nýtt</span>
          <h1 style="margin:14px 0 0;font-size:27px;line-height:1.2;font-weight:800;color:${INK};letter-spacing:-0.01em;">${h}</h1>
        </td></tr>
        ${annTail(input)}`)}
      ${wwwLine}`);

    // Dark hero band with cyan + magenta glow — the veggspjald/advert look.
    // bgcolor is the solid fallback for clients that drop the gradient image.
    case "announcement-dark":
      return page(input.heading, input.preheader, `${card(`
        ${logoRow({ border: true })}
        <tr><td bgcolor="${BRAND_DARK1}" style="background:${BRAND_DARK1};background-image:radial-gradient(120% 120% at 90% -10%, rgba(0,214,255,0.45), transparent 55%),radial-gradient(120% 120% at -10% 120%, rgba(207,20,123,0.35), transparent 55%),linear-gradient(135deg,${BRAND_DARK1},${BRAND_DARK2});padding:34px 32px;">
          ${annEyebrow(BRAND_CYAN)}
          <h1 style="margin:0;font-size:27px;line-height:1.2;font-weight:800;color:#ffffff;letter-spacing:-0.01em;">${h}</h1>
        </td></tr>
        ${annTail(input)}`)}
      ${wwwLine}`);

    // Bright cyan gradient band, heading reversed out in white.
    case "announcement-band":
      return page(input.heading, input.preheader, `${card(`
        ${logoRow({ border: true })}
        <tr><td bgcolor="${BRAND_PRIMARY}" style="background:${BRAND_PRIMARY};background-image:linear-gradient(120deg,${BRAND_PRIMARY},${BRAND_CYAN});padding:32px;">
          ${annEyebrow("#eafaff")}
          <h1 style="margin:0;font-size:26px;line-height:1.22;font-weight:800;color:#ffffff;letter-spacing:-0.01em;">${h}</h1>
        </td></tr>
        ${annTail(input)}`)}
      ${wwwLine}`);

    // Magenta accent: pink "NÝTT" pill + heading with a magenta rule.
    case "announcement-accent":
      return page(input.heading, input.preheader, `${card(`
        ${logoRow({ border: true })}
        <tr><td style="padding:30px 32px 0;">
          <span style="display:inline-block;background:${BRAND_ACCENT_TINT};color:${BRAND_ACCENT_DARK};font-size:12px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;padding:5px 12px;border-radius:999px;">Nýtt</span>
          <div style="border-left:4px solid ${BRAND_ACCENT};padding-left:14px;margin:16px 0 0;">
            <h1 style="margin:0;font-size:27px;line-height:1.2;font-weight:800;color:${INK};letter-spacing:-0.01em;">${h}</h1>
          </div>
        </td></tr>
        ${annTail(input)}`)}
      ${wwwLine}`);

    // Classic (default): white card, logo header, heading in body.
    default:
      return page(input.heading, input.preheader, `${card(`
        ${logoRow({ border: true })}
        <tr><td style="padding:32px;">
          <h1 style="margin:0 0 18px;font-size:24px;line-height:1.25;font-weight:800;color:${INK};letter-spacing:-0.01em;">${h}</h1>
          ${input.bodyHtml}
          ${cta}
        </td></tr>
        ${footerRow(input.unsubscribeUrl, input.footerNote)}`)}
      ${wwwLine}`);
  }
}

/**
 * Double opt-in confirmation email. Sent on signup; the address only becomes an
 * active subscriber after the recipient clicks the button. No unsubscribe link
 * (there is nothing to unsubscribe from until they confirm) — instead a plain
 * "ignore this if it wasn't you" note.
 */
export function renderConfirmationEmail(confirmUrl: string): string {
  return `<!doctype html>
<html lang="is"><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width,initial-scale=1" /><title>Staðfestu áskrift</title></head>
<body style="margin:0;padding:0;background:${CANVAS};">
  <div style="display:none;overflow:hidden;line-height:1px;opacity:0;max-height:0;max-width:0;">Staðfestu áskrift að fréttabréfi Fjarlækninga.</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${CANVAS};padding:32px 12px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;background:#ffffff;border:1px solid ${BORDER};border-radius:16px;overflow:hidden;font-family:Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">

        <tr><td style="padding:24px 32px;border-bottom:1px solid ${BORDER};">
          <a href="${SITE_URL}" style="text-decoration:none;display:inline-block;">
            <img src="${LOGO_URL}" alt="Fjarlækningar" width="170" style="display:block;height:auto;max-width:170px;border:0;" />
          </a>
        </td></tr>

        <tr><td style="padding:32px;">
          <h1 style="margin:0 0 18px;font-size:24px;line-height:1.25;font-weight:800;color:${INK};letter-spacing:-0.01em;">Staðfestu áskrift</h1>
          <p style="margin:0 0 16px;color:#334155;font-size:15px;line-height:1.65;">Takk fyrir að skrá þig á fréttalista Fjarlækninga. Til að ljúka skráningunni þarftu að staðfesta netfangið þitt með því að smella á hnappinn hér að neðan.</p>
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:28px 0 8px;">
            <tr><td style="border-radius:999px;background:${CYAN_DARK};">
              <a href="${escapeHtml(confirmUrl)}" style="display:inline-block;padding:13px 30px;color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;border-radius:999px;">Staðfesta áskrift</a>
            </td></tr>
          </table>
          <p style="margin:16px 0 0;color:${MUTED};font-size:13px;line-height:1.6;">Ef hnappurinn virkar ekki, afritaðu þessa slóð í vafrann þinn:<br /><a href="${escapeHtml(confirmUrl)}" style="color:${CYAN_DARK};text-decoration:underline;word-break:break-all;">${escapeHtml(confirmUrl)}</a></p>
        </td></tr>

        <tr><td style="padding:20px 32px 28px;border-top:1px solid ${BORDER};background:#fbfcfd;">
          <p style="margin:0 0 6px;color:${MUTED};font-size:12px;line-height:1.6;">
            Fjarlækningar ehf. · Ísland ·
            <a href="mailto:fjarlaekningar@fjarlaekningar.is" style="color:${CYAN_DARK};text-decoration:none;">fjarlaekningar@fjarlaekningar.is</a>
          </p>
          <p style="margin:0;color:${MUTED};font-size:12px;line-height:1.6;">
            Ef þú baðst ekki um þessa áskrift geturðu einfaldlega hunsað þennan póst — ekkert gerist nema þú staðfestir.
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body></html>`;
}

/** Plain-text fallback for the confirmation email. */
export function confirmationPlainText(confirmUrl: string): string {
  return `Staðfestu áskrift\n\nTakk fyrir að skrá þig á fréttalista Fjarlækninga. Til að ljúka skráningunni þarftu að staðfesta netfangið þitt með því að opna þessa slóð:\n\n${confirmUrl}\n\nEf þú baðst ekki um þessa áskrift geturðu hunsað þennan póst.\n\n—\nFjarlækningar ehf. · www.fjarlaekningar.is\n`;
}

/** Plain-text fallback so the email isn't HTML-only (helps deliverability). */
export function emailPlainText(heading: string, markdownBody: string, unsubscribeUrl: string): string {
  const body = (markdownBody || "")
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1 ($2)")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/^#{1,3}\s+/gm, "")
    .replace(/^\s*>\s?/gm, "");
  return `${heading}\n\n${body}\n\n—\nFjarlækningar ehf. · www.fjarlaekningar.is\nAfskrá: ${unsubscribeUrl}\n`;
}
