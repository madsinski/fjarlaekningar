// Tilkynningar til lækna um breytingar sem snerta þá. Server-only.
//
// Regla: eftir að vaktaplan er birt fær hver læknir að vita af sérhverri
// breytingu á sínum vöktum. Tilkynningin birtist ALLTAF á „Mínar vaktir“.
// Tölvupóstur fer strax þegar læknirinn þarf að bregðast við (beiðni um
// aukavakt, lykilorð, vaktamarkaður, óskir). Breytingar yfirlæknis á vaktaplani
// (email: "digest") safnast saman og fara í EINUM samantektarpósti þegar hann
// hefur ekki breytt neinu í 10 mín. — sjá src/lib/hsu/digest.ts.
// Línur eru flokkaðar: ein aðgerð sem snertir margar vaktir sama læknis verður
// ein tilkynning.

import { after } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { hsuEmailHtml, sendHsuEmail } from "./server";
import { DEFAULT_LANG, isLang, type Lang } from "./i18n/core";

/**
 * Texti á tungumáli viðtakandans: fastur strengur (eins á öllum málum) eða
 * fall sem skilar textanum fyrir tungumál læknisins, t.d.
 * `(lang) => translator(notifyMsgs, lang)("shift.moved", { date })`.
 * Tilkynningin er vistuð á tungumáli læknisins þegar hún verður til.
 */
export type Localized = string | ((lang: Lang) => string);
export const localize = (v: Localized, lang: Lang): string => (typeof v === "function" ? v(lang) : v);

export interface DoctorNotice {
  doctorId: string;
  line: Localized;
}

/**
 * Senda hverjum lækni einn póst með öllum línum sem hann varða. Keyrt eftir
 * svarið (after), svo hægur póstþjónn tefji ekki viðmótið.
 */
export function notifyDoctors(opts: {
  origin: string;
  subject: Localized;
  heading: Localized;
  intro?: Localized;
  notices: DoctorNotice[];
  cta?: { label: Localized; path: string };
  /** Tölvupóstur: true = strax (sjálfgefið), "digest" = í samantekt síðar, false = enginn. */
  email?: boolean | "digest";
}) {
  const ids = [...new Set(opts.notices.map((n) => n.doctorId))];
  if (!ids.length) return;
  after(async () => {
    const { data: docs } = await supabaseAdmin.from("hsu_doctors").select("id, name, email, active, lang").in("id", ids);
    const cta = opts.cta ?? { label: "Sjá vaktirnar mínar", path: "/hsu/min-sida?t=vaktir" };
    const active = (docs ?? []).filter((d) => d.active);
    const langOf = (d: { lang?: string | null }): Lang => (isLang(d.lang) ? d.lang : DEFAULT_LANG);
    const intro = (lang: Lang) => (opts.intro ? [localize(opts.intro, lang)] : []);
    const linesFor = (id: string, lang: Lang) => opts.notices.filter((n) => n.doctorId === id).map((n) => localize(n.line, lang));
    // Í kerfinu: ein tilkynning á lækni, á hans tungumáli.
    const rows = active
      .map((d) => ({
        doctor_id: d.id,
        title: localize(opts.heading, langOf(d)),
        lines: [...intro(langOf(d)), ...linesFor(d.id, langOf(d))],
        link: cta.path,
        email_pending: opts.email === "digest",
      }))
      .filter((r) => r.lines.length > (opts.intro ? 1 : 0));
    if (rows.length) await supabaseAdmin.from("hsu_notifications").insert(rows);
    if (opts.email === false || opts.email === "digest") return; // samantekt sér um póstinn

    for (const d of active) {
      const lang = langOf(d);
      const lines = linesFor(d.id, lang);
      if (!lines.length) continue;
      await sendHsuEmail(
        d.email,
        localize(opts.subject, lang),
        hsuEmailHtml({
          origin: opts.origin,
          lang,
          heading: localize(opts.heading, lang),
          paragraphs: [`Sæl/l ${d.name}.`, ...intro(lang), ...lines],
          cta: { label: localize(cta.label, lang), url: `${opts.origin}${cta.path}` },
        }),
        [...intro(lang), ...lines, `${opts.origin}${cta.path}`].join("\n"),
      );
    }
  });
}

/** Póstur til yfirlækna (t.d. þegar læknir svarar beiðni). */
export function notifyHeads(opts: { origin: string; subject: string; heading: string; lines: string[]; path?: string }) {
  after(async () => {
    const { data: heads } = await supabaseAdmin.from("hsu_doctors").select("name, email").eq("role", "head").eq("active", true);
    for (const h of heads ?? []) {
      await sendHsuEmail(
        h.email,
        opts.subject,
        hsuEmailHtml({
          origin: opts.origin,
          heading: opts.heading,
          paragraphs: opts.lines,
          cta: { label: "Opna vaktaskipulag", url: `${opts.origin}${opts.path ?? "/hsu/stjorn"}` },
        }),
        opts.lines.join("\n"),
      );
    }
  });
}
