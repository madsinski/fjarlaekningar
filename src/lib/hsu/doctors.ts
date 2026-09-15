// Læknaskráning HSU — reglur um notandanafn og boðspóstur. Server-only.

import { hsuEmailHtml, sendHsuEmail } from "./server";
import { HSU_EMAIL_DOMAIN } from "./types";

/** 0=sun … 6=lau, án endurtekninga. Tómt fylki = allir dagar. */
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

export async function sendInviteEmail(origin: string, to: { name: string; email: string }, url: string, invitedBy: string) {
  return sendHsuEmail(
    to.email,
    "Aðgangur að vaktakerfi HSU",
    hsuEmailHtml({
      origin,
      heading: "Velkomin(n) í vaktakerfið",
      paragraphs: [
        `Sæl/l ${to.name}.`,
        `${invitedBy} hefur stofnað aðgang fyrir þig að vaktakerfi lækna á Heilsugæslunni í Vestmannaeyjum. Þar skráir þú vaktaóskir, sérð vaktirnar þínar og getur skipt vöktum á vaktamarkaði.`,
        `Notandanafnið þitt er ${to.email}. Veldu lykilorð — og, ef þú vilt, fjögurra stafa aðgangskóða til að skrá þig hratt inn í símanum.`,
      ],
      cta: { label: "Virkja aðganginn", url },
      foot: "Hlekkurinn gildir í 14 daga.",
    }),
    `Virkjaðu aðganginn þinn að vaktakerfi HSU: ${url}`,
  );
}
