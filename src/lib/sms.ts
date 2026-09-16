// SMS um Twilio — sendandi er nafn ("Fjarlaeknir"), ekki símanúmer.
//
// DEGRADES GRACEFULLY — án TWILIO-lykla skrifar þetta skeytið í loggið og
// skilar ok, svo ekkert brotni áður en aðgangurinn er kominn í Vercel.
//
// TVENNT SEM ER AUÐVELT AÐ MISSA AF:
//
//   * Íslensku stafirnir á/ð/þ/í/ó/ú/ý eru EKKI í GSM-7 stafrófinu. Skeyti með
//     þeim fer í UCS-2 og þá komast 70 stafir í hlutann í stað 160 — sami texti
//     verður því tvöfalt dýrari. `smsSegments` segir til um þetta fyrirfram.
//   * Íslenskir farsímar sía skeyti sem innihalda vefslóð. Twilio þarf að setja
//     slóðina á hvítlista; fyrr en það er gert koma skeytin til baka sem
//     `undelivered` með villu 30007 — ekki sem villa við sendingu. Þess vegna
//     er StatusCallback skráð og svörin vistuð (sjá /api/sms/status).

const ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
// Twilio mælir með API-lykli fyrir þjóna: hann má afturkalla einan og sér.
const API_KEY_SID = process.env.TWILIO_API_KEY_SID;
const API_KEY_SECRET = process.env.TWILIO_API_KEY_SECRET;
const AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;

/** Nafn sendanda. Hámark 11 stafir, aðeins ASCII — það er regla í SMS-staðlinum. */
export const SMS_SENDER = (process.env.SMS_SENDER_ID || "Fjarlaeknir").slice(0, 11);

export const smsConfigured = () => Boolean(ACCOUNT_SID && (API_KEY_SECRET || AUTH_TOKEN));

// ── Símanúmer ───────────────────────────────────────────────────────────────

/**
 * Íslenskt símanúmer → E.164. Sjö tölustafir fá +354 framan á sig; erlend númer
 * verða að koma með + og landsnúmeri. Skilar null sé númerið ekki nothæft.
 */
export function toE164(raw: string): string | null {
  const trimmed = (raw || "").trim();
  const plus = trimmed.startsWith("+") || trimmed.startsWith("00");
  const digits = trimmed.replace(/\D/g, "").replace(/^00/, "");
  if (!digits) return null;
  if (!plus) {
    // Innlent: 7 tölustafir. 3547xxxxxx er líka slegið inn af og til.
    if (digits.length === 7) return `+354${digits}`;
    if (digits.length === 10 && digits.startsWith("354")) return `+${digits}`;
    return null;
  }
  return digits.length >= 8 && digits.length <= 15 ? `+${digits}` : null;
}

/** Snyrt til fyrir augað: 555 1234. Aðeins íslensk númer. */
export function prettyPhone(e164: string): string {
  const m = /^\+354(\d{3})(\d{4})$/.exec(e164);
  return m ? `${m[1]} ${m[2]}` : e164;
}

// ── Lengd og verð ───────────────────────────────────────────────────────────

// GSM-7 grunnstafróf (3GPP 23.038). Stafir utan þess neyða skeytið í UCS-2.
const GSM7 =
  "@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !\"#¤%&'()*+,-./0123456789:;<=>?" +
  "¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà";
const GSM7_EXT = "^{}\\[~]|€";

export interface SmsSize {
  encoding: "GSM-7" | "UCS-2";
  chars: number;
  segments: number;
  /** Stafir sem neyða skeytið í UCS-2 — gagnlegt til að sýna hvers vegna. */
  outside: string[];
}

/** Hve marga hluta skeytið kostar, og hvers vegna. */
export function smsSegments(body: string): SmsSize {
  const outside = [...new Set([...body].filter((c) => !GSM7.includes(c) && !GSM7_EXT.includes(c)))];
  if (!outside.length) {
    const chars = [...body].reduce((n, c) => n + (GSM7_EXT.includes(c) ? 2 : 1), 0);
    return { encoding: "GSM-7", chars, segments: chars <= 160 ? 1 : Math.ceil(chars / 153), outside };
  }
  // UCS-2: stafir utan BMP (t.d. emoji) taka tvö pláss.
  const chars = [...body].reduce((n, c) => n + ((c.codePointAt(0) ?? 0) > 0xffff ? 2 : 1), 0);
  return { encoding: "UCS-2", chars, segments: chars <= 70 ? 1 : Math.ceil(chars / 67), outside };
}

// ── Sending ─────────────────────────────────────────────────────────────────

export interface SendSmsResult {
  ok: boolean;
  /** Auðkenni skeytisins hjá Twilio (SM…). Vantar í þurrkeyrslu. */
  sid?: string;
  status?: string;
  error?: string;
  /** Villunúmer Twilio, t.d. 21408 (land ekki opnað) eða 30007 (síað). */
  code?: number;
  size: SmsSize;
  dryRun?: boolean;
}

/**
 * Sendir eitt skeyti. `to` má vera íslenskt númer á hvaða formi sem er.
 * `statusCallback` er slóð sem Twilio hringir í þegar staðan breytist.
 */
export async function sendSms(opts: { to: string; body: string; statusCallback?: string }): Promise<SendSmsResult> {
  const size = smsSegments(opts.body);
  const to = toE164(opts.to);
  if (!to) return { ok: false, error: "Ógilt símanúmer", size };
  if (!opts.body.trim()) return { ok: false, error: "Skeytið er tómt", size };

  if (!smsConfigured()) {
    console.warn(`[sms] TWILIO lyklar vantar — skrifa í logg í stað þess að senda:\n  til: ${to}\n  frá: ${SMS_SENDER}\n  ${opts.body}`);
    return { ok: true, status: "dry-run", size, dryRun: true };
  }

  const form = new URLSearchParams({ To: to, From: SMS_SENDER, Body: opts.body });
  if (opts.statusCallback) form.set("StatusCallback", opts.statusCallback);

  // API-lykill ef hann er til, annars reikningslykillinn.
  const user = API_KEY_SECRET ? API_KEY_SID! : ACCOUNT_SID!;
  const pass = API_KEY_SECRET ?? AUTH_TOKEN!;

  try {
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${ACCOUNT_SID}/Messages.json`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${user}:${pass}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: form.toString(),
    });
    const j = (await res.json().catch(() => ({}))) as { sid?: string; status?: string; message?: string; code?: number };
    if (!res.ok) {
      return { ok: false, error: twilioMessage(j.code, j.message), code: j.code, size };
    }
    return { ok: true, sid: j.sid, status: j.status, size };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e), size };
  }
}

/** Villur sem koma fyrir í raun, á íslensku. Annað fer óbreytt í gegn. */
function twilioMessage(code: number | undefined, fallback: string | undefined): string {
  switch (code) {
    case 21408:
      return "Ísland er ekki opnað fyrir SMS á Twilio-reikningnum (Messaging → Settings → Geo permissions).";
    case 21606:
    case 21612:
      return "Sendandinn er ekki nothæfur á þessa leið. Athugaðu að nafnasendandi sé virkur á reikningnum.";
    case 21211:
      return "Símanúmerið er ekki gilt.";
    case 30007:
      return "Símafyrirtækið síaði skeytið — líklega vegna vefslóðar sem á eftir að fara á hvítlista hjá Twilio.";
    case 63038:
      return "Dagskammtur Twilio er búinn.";
    default:
      return fallback || "Sendingin mistókst";
  }
}

/** Staða skeytis frá Twilio → íslenska. */
export const SMS_STATUS_IS: Record<string, string> = {
  queued: "Í biðröð",
  accepted: "Móttekið",
  sending: "Í sendingu",
  sent: "Sent",
  delivered: "Komið til skila",
  undelivered: "Komst ekki til skila",
  failed: "Mistókst",
  "dry-run": "Þurrkeyrsla (engir lyklar)",
};
