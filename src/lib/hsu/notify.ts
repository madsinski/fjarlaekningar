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
import { DEFAULT_LANG, isLang, translator, type Lang } from "./i18n/core";
import { notifyMsgs } from "./i18n/messages/notify";
import { normalizeEmailPrefs, type EmailCategory, type EmailMode } from "./email-prefs";

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
  /** Flokkur tilkynningar — stilling hvers viðtakanda (hsu_doctors.email_prefs) ræður póstinum. */
  category?: EmailCategory;
  /** Handvirkt val sem gengur framar flokknum: true = strax, "digest", false = enginn póstur. */
  email?: boolean | "digest";
}) {
  const ids = [...new Set(opts.notices.map((n) => n.doctorId))];
  if (!ids.length) return;
  after(async () => {
    // Hver viðtakandi ræður sínum pósti (Mín síða → Stillingar), nema kallandinn
    // taki annað fram (t.d. öryggistilkynningar: alltaf strax).
    const forced: EmailMode | null = opts.email !== undefined
      ? (opts.email === false ? "off" : opts.email === "digest" ? "digest" : "now")
      : opts.category ? null : "now";
    const { data: docs } = await supabaseAdmin.from("hsu_doctors").select("id, name, email, active, lang, email_prefs").in("id", ids);
    const modeOf = (d: { email_prefs?: unknown }): EmailMode => forced ?? normalizeEmailPrefs(d.email_prefs)[opts.category!];
    const cta = opts.cta ?? { label: (l: Lang) => translator(notifyMsgs, l)("cta.myShifts"), path: "/hsu/min-sida?t=vaktir" };
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
        category: opts.category ?? null,
        email_pending: modeOf(d) === "digest",
      }))
      .filter((r) => r.lines.length > (opts.intro ? 1 : 0));
    if (rows.length) await supabaseAdmin.from("hsu_notifications").insert(rows);
    for (const d of active) {
      if (modeOf(d) !== "now") continue; // samantekt (eða slökkt) — enginn póstur núna
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
          paragraphs: [translator(notifyMsgs, lang)("hello", { name: d.name }), ...intro(lang), ...lines],
          cta: { label: localize(cta.label, lang), url: `${opts.origin}${cta.path}` },
        }),
        [...intro(lang), ...lines, `${opts.origin}${cta.path}`].join("\n"),
      );
    }
  });
}

/**
 * Til yfirlækna (t.d. þegar læknir svarar beiðni). Fer sömu leið og aðrar
 * tilkynningar: birtist í kerfinu hjá hverjum yfirlækni og hlítir stillingunni
 * fyrir flokkinn „head“ — sjálfgefið ein samantekt í stað pósts við hverja aðgerð.
 */
export function notifyHeads(opts: { origin: string; subject: Localized; heading: Localized; lines: Localized[]; path?: string; category?: EmailCategory }) {
  after(async () => {
    const { data: heads } = await supabaseAdmin.from("hsu_doctors").select("id").eq("role", "head").eq("active", true);
    const ids = (heads ?? []).map((h) => h.id as string);
    if (!ids.length) return;
    notifyDoctors({
      origin: opts.origin,
      subject: opts.subject,
      heading: opts.heading,
      category: opts.category ?? "head",
      notices: ids.flatMap((id) => opts.lines.map((line) => ({ doctorId: id, line }))),
      cta: { label: (l: Lang) => translator(notifyMsgs, l)("cta.planner"), path: opts.path ?? "/hsu/stjorn" },
    });
  });
}
