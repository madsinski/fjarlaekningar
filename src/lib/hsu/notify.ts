// Tilkynningar til lækna um breytingar sem snerta þá. Server-only.
//
// Regla: eftir að vaktaplan er birt fær hver læknir tölvupóst um sérhverja
// breytingu á sínum vöktum — hver sem gerði hana og hvaðan. Póstar eru
// flokkaðir: ein breyting sem snertir marga vaktir sama læknis verður einn póstur.

import { after } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { hsuEmailHtml, sendHsuEmail } from "./server";

export interface DoctorNotice {
  doctorId: string;
  line: string;
}

/**
 * Senda hverjum lækni einn póst með öllum línum sem hann varða. Keyrt eftir
 * svarið (after), svo hægur póstþjónn tefji ekki viðmótið.
 */
export function notifyDoctors(opts: {
  origin: string;
  subject: string;
  heading: string;
  intro?: string;
  notices: DoctorNotice[];
  cta?: { label: string; path: string };
}) {
  const ids = [...new Set(opts.notices.map((n) => n.doctorId))];
  if (!ids.length) return;
  after(async () => {
    const { data: docs } = await supabaseAdmin.from("hsu_doctors").select("id, name, email, active").in("id", ids);
    for (const d of docs ?? []) {
      if (!d.active) continue;
      const lines = opts.notices.filter((n) => n.doctorId === d.id).map((n) => n.line);
      if (!lines.length) continue;
      const cta = opts.cta ?? { label: "Sjá vaktirnar mínar", path: "/hsu/min-sida?t=vaktir" };
      await sendHsuEmail(
        d.email,
        opts.subject,
        hsuEmailHtml({
          origin: opts.origin,
          heading: opts.heading,
          paragraphs: [`Sæl/l ${d.name}.`, ...(opts.intro ? [opts.intro] : []), ...lines],
          cta: { label: cta.label, url: `${opts.origin}${cta.path}` },
        }),
        [...(opts.intro ? [opts.intro] : []), ...lines, `${opts.origin}${cta.path}`].join("\n"),
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
