// Læknaskráning HSU — reglur um notandanafn og boðspóstur. Server-only.

import { supabaseAdmin } from "@/lib/supabase-admin";
import { translator, type Lang } from "./i18n/core";
import { accountEmails } from "./i18n/messages/account-emails";
import { hsuEmailHtml, sendHsuEmail } from "./server";
import { HSU_EMAIL_DOMAIN, isDayWorkKind, type DayWork } from "./types";

/** 0=sun … 6=lau, án endurtekninga. Tómt fylki = allir dagar. */
/**
 * Þak á flýtimóttökuvöktum: heil tala innan marka, eða null (ekkert þak).
 * Tómur strengur og null þýða hvort tveggja „ekkert þak"; undefined = óbreytt.
 */
/**
 * Dagvinnuvika úr beiðni: {"1":"fm","2":"mottaka"}. Ógild gildi falla burt.
 * undefined = óbreytt.
 */
export function cleanDayWork(v: unknown): DayWork | undefined {
  if (v === undefined) return undefined;
  if (v === null) return {};
  if (typeof v !== "object") return undefined;
  const out: DayWork = {};
  for (const [wd, kind] of Object.entries(v as Record<string, unknown>)) {
    const n = Number(wd);
    if (!Number.isInteger(n) || n < 0 || n > 6) continue;
    if (isDayWorkKind(kind)) out[String(n)] = kind;
  }
  return out;
}

export function cleanFmMax(v: unknown, max: number): number | null | undefined {
  if (v === undefined) return undefined;
  if (v === null || v === "") return null;
  const n = Math.round(Number(v));
  if (!Number.isFinite(n) || n < 0 || n > max) return undefined;
  return n;
}

export function cleanWeekdays(v: unknown): number[] | null {
  if (!Array.isArray(v)) return null;
  return [...new Set(v.map(Number).filter((d) => Number.isInteger(d) && d >= 0 && d <= 6))].sort();
}

/** @hsu.is er reglan. Önnur lén aðeins ef HSU_EXTRA_EMAIL_DOMAINS leyfir (t.d. til prófana). */
export function emailAllowed(email: string): boolean {
  const extra = (process.env.HSU_EXTRA_EMAIL_DOMAINS ?? "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
  const domain = email.split("@")[1] ?? "";
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) && (domain === HSU_EMAIL_DOMAIN || extra.includes(domain));
}

/** Tengiliður Fjarlækninga (sama og neyðarnúmer vinnustöðvarinnar), t.d. „Mads Christian Aanesen, 767 4393“. */
async function supportContact(): Promise<string | null> {
  const { data } = await supabaseAdmin.from("gatt_settings").select("value").eq("key", "emergency_contact").maybeSingle();
  const c = (data?.value ?? null) as { name?: string; phone?: string } | null;
  const phone = String(c?.phone ?? "").replace(/^\+354\s*/, "").replace(/^(\d{3})(\d{4})$/, "$1 $2");
  return c?.name && phone ? `${c.name}, ${phone}` : null;
}

/**
 * Boð um aðgang. Yfirlæknir fær eigin texta um hlutverkið og fyrstu skrefin.
 * kind = "reset": aðgangur þegar virkur, hlekkurinn velur nýtt lykilorð og
 * gildir í 2 klst. (sjá issueAccessLink) — textinn segir það rétt.
 */
export async function sendInviteEmail(
  origin: string,
  to: { name: string; email: string; role?: string; lang?: Lang },
  url: string,
  invitedBy: string,
  kind: "invite" | "reset" = "invite",
) {
  const lang = to.lang ?? "is";
  const t = translator(accountEmails, lang);
  const head = to.role === "head";
  const reset = kind === "reset";
  const contact = head ? await supportContact() : null;
  const paragraphs = head
    ? [
        t("invite.hello", { name: to.name }),
        reset ? t("invite.bodyReset", { by: invitedBy }) : t("head.body", { by: invitedBy }),
        t("invite.username", { email: to.email }),
        t("head.steps"),
        t("head.own"),
        ...(contact ? [t("head.help", { contact })] : []),
      ]
    : [
        t("invite.hello", { name: to.name }),
        reset ? t("invite.bodyReset", { by: invitedBy }) : t("invite.body", { by: invitedBy }),
        t("invite.username", { email: to.email }),
        ...(reset ? [] : [t("invite.tour")]),
      ];
  return sendHsuEmail(
    to.email,
    t(head ? "head.subject" : "invite.subject"),
    hsuEmailHtml({
      origin, lang, heading: t(head ? "head.heading" : "invite.heading"), paragraphs,
      cta: { label: t(reset ? "invite.ctaReset" : "invite.cta"), url },
      foot: t(reset ? "invite.footReset" : "invite.foot"),
    }),
    t(reset ? "invite.textReset" : head ? "head.text" : "invite.text", { url }),
  );
}

/** Læknir með virkan aðgang gerður að yfirlækni. */
export async function sendPromotedEmail(origin: string, to: { name: string; email: string; lang?: Lang }, invitedBy: string) {
  const lang = to.lang ?? "is";
  const t = translator(accountEmails, lang);
  const contact = await supportContact();
  const url = `${origin}/hsu/stjorn`;
  return sendHsuEmail(
    to.email,
    t("promoted.subject"),
    hsuEmailHtml({
      origin, lang, heading: t("promoted.heading"),
      paragraphs: [t("invite.hello", { name: to.name }), t("promoted.body", { by: invitedBy }), t("promoted.steps"), ...(contact ? [t("head.help", { contact })] : [])],
      cta: { label: t("promoted.cta"), url },
    }),
    t("promoted.text", { url }),
  );
}
