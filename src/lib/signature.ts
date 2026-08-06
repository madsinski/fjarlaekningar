// Shared email-signature model + HTML builders, used by the admin signatures
// page and each staff member's account page. Pure/client-safe.

export interface SignatureFields {
  key: string;
  name: string;
  title: string;
  phone: string; // E.164 ideally, e.g. +354 767 4393
  email: string;
}

export const SITE_URL = "https://www.fjarlaekningar.is";
export const WEB_LABEL = "fjarlaekningar.is";

function assetBase(): string {
  return typeof window !== "undefined" ? window.location.origin : SITE_URL;
}

export type DesignKey = "stacked" | "compact" | "card";

export const DESIGN_LABELS: Record<DesignKey, string> = {
  stacked: "Súla",
  compact: "Þétt",
  card: "Spjald",
};

export const DESIGN_BLURBS: Record<DesignKey, string> = {
  stacked: "Fullt orðmerki efst með cyan-línu undir nafninu. Best fyrir fyrstu kynningarpósta.",
  compact: "Merki vinstra megin, upplýsingar hægra megin. Minna pláss — hentar svörum og þráðum.",
  card: "Merki + upplýsingar í mjúku cyan-lituðu spjaldi. Sterkust vörumerkjanotkun — fyrir kynningarpósta.",
};

function contact(text: string, color: string, extraStyle = ""): string {
  return `<span style="color:${color};text-decoration:none;${extraStyle}">${escapeHtml(text)}</span>`;
}

const ZWSP = "​";
function noAutoLinkUrl(text: string): string {
  return text.replace(/\.([a-z]{2,})(?=$|\/|\b)/i, `${ZWSP}.$1`);
}
function noAutoLinkEmail(email: string): string {
  return noAutoLinkUrl(email.replace("@", `@${ZWSP}`));
}

export function escapeHtml(s: string): string {
  return s.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}

function buildStacked(s: SignatureFields): string {
  const LOGO_URL = `${assetBase()}/fjarlaekningar-logo.png`;
  return [
    `<table cellpadding="0" cellspacing="0" border="0" style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#1F2937;line-height:1.4;">`,
    `<tr><td style="padding-bottom:10px;">`,
    `<a href="${SITE_URL}" style="text-decoration:none;border-bottom:0;">`,
    `<img src="${LOGO_URL}" alt="Fjarlækningar" width="200" style="display:block;border:0;outline:none;width:200px;height:auto;">`,
    `</a></td></tr>`,
    `<tr><td style="padding-bottom:8px;border-bottom:2px solid #00a8cc;">`,
    `<span style="font-size:15px;font-weight:700;color:#111827;">${escapeHtml(s.name)}</span><br>`,
    `<span style="font-size:12px;color:#6B7280;letter-spacing:0.2px;">${escapeHtml(s.title)}</span>`,
    `</td></tr>`,
    `<tr><td style="padding-top:8px;font-size:12px;color:#4B5563;">`,
    contact(s.phone, "#4B5563"),
    ` &middot; `,
    contact(noAutoLinkEmail(s.email), "#4B5563"),
    ` &middot; `,
    contact(noAutoLinkUrl(WEB_LABEL), "#0891b2", "font-weight:600;"),
    `</td></tr>`,
    `</table>`,
  ].join("");
}

function buildCompact(s: SignatureFields): string {
  const MARK_URL = `${assetBase()}/fjarlaekningar-mark.svg`;
  return [
    `<table cellpadding="0" cellspacing="0" border="0" style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#1F2937;line-height:1.35;">`,
    `<tr>`,
    `<td valign="top" style="padding-right:12px;border-right:1px solid #E5E7EB;">`,
    `<a href="${SITE_URL}" style="text-decoration:none;border-bottom:0;">`,
    `<img src="${MARK_URL}" alt="Fjarlækningar" width="44" height="44" style="display:block;border:0;outline:none;width:44px;height:44px;">`,
    `</a>`,
    `</td>`,
    `<td valign="top" style="padding-left:12px;">`,
    `<div style="font-size:14px;font-weight:700;color:#111827;">${escapeHtml(s.name)}</div>`,
    `<div style="font-size:11.5px;color:#6B7280;padding-bottom:4px;">${escapeHtml(s.title)}</div>`,
    `<div style="font-size:11.5px;color:#4B5563;">`,
    contact(s.phone, "#4B5563"),
    ` &middot; `,
    contact(noAutoLinkEmail(s.email), "#4B5563"),
    `</div>`,
    `<div style="font-size:11.5px;padding-top:1px;">`,
    contact(noAutoLinkUrl(WEB_LABEL), "#0891b2", "font-weight:600;"),
    `</div>`,
    `</td>`,
    `</tr>`,
    `</table>`,
  ].join("");
}

function buildCard(s: SignatureFields): string {
  const LOGO_URL = `${assetBase()}/fjarlaekningar-logo.png`;
  return [
    `<table cellpadding="0" cellspacing="0" border="0" style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#1F2937;line-height:1.4;">`,
    `<tr><td style="background-color:#ECFEFF;border:1px solid #A5F3FC;border-radius:12px;padding:16px 18px;">`,
    `<a href="${SITE_URL}" style="text-decoration:none;border-bottom:0;">`,
    `<img src="${LOGO_URL}" alt="Fjarlækningar" width="180" style="display:block;border:0;outline:none;width:180px;height:auto;margin-bottom:12px;">`,
    `</a>`,
    `<div style="font-size:15px;font-weight:700;color:#0E4A5B;">${escapeHtml(s.name)}</div>`,
    `<div style="font-size:12px;color:#0E7490;padding-bottom:10px;">${escapeHtml(s.title)}</div>`,
    `<div style="font-size:12px;color:#155E75;line-height:1.7;">`,
    contact(s.phone, "#155E75"),
    ` &middot; `,
    contact(noAutoLinkEmail(s.email), "#155E75"),
    ` &middot; `,
    contact(noAutoLinkUrl(WEB_LABEL), "#0891b2", "font-weight:700;"),
    `</div>`,
    `</td></tr>`,
    `</table>`,
  ].join("");
}

export const DESIGN_BUILDERS: Record<DesignKey, (s: SignatureFields) => string> = {
  stacked: buildStacked,
  compact: buildCompact,
  card: buildCard,
};
