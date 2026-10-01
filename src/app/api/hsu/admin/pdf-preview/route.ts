// Sýnidæmi af prentskjalinu — svo yfirlæknir geti séð útlitið hvenær sem er,
// líka áður en nokkurt vaktaplan er til. Les aðeins; ekkert er vistað.
//   GET /api/hsu/admin/pdf-preview[?m=2026-10][&doctorId=…]
// Án doctorId er blaðið sýnt eins og yfirlæknirinn sjálfur fengi það.

import { MONTH_RE, UUID_RE, fail, listDoctors, loadShiftTypes, pdfUnitName, requireManager } from "@/lib/hsu/server";
import { buildShiftPdf } from "@/lib/hsu/shift-pdf";
import { demoShifts } from "@/lib/hsu/pdf/demo";
import { monthKey } from "@/lib/hsu/types";
import { getHsuLang, tr } from "@/lib/hsu/i18n/server";
import { apiAdmin } from "@/lib/hsu/i18n/messages/api-admin";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const auth = await requireManager(req);
  if ("res" in auth) return auth.res;
  const t = tr(req, apiAdmin);
  const u = new URL(req.url);
  const month = u.searchParams.get("m") ?? monthKey(new Date());
  if (!MONTH_RE.test(month)) return fail(t("err.badMonth"));
  const doctorId = u.searchParams.get("doctorId");
  if (doctorId && !UUID_RE.test(doctorId)) return fail(t("err.badRequest"));

  const [types, doctors, unitName] = await Promise.all([loadShiftTypes(), listDoctors(false), pdfUnitName()]);
  const people = doctors.filter((d) => d.active).map((d) => ({ id: d.id, name: d.name, color: d.color }));
  if (!people.length || !types.some((x) => x.active)) return fail(t("err.noPlan"), 404);

  // Sjálfgefið: eins og sá sem er að skoða fengi blaðið — annars valinn læknir.
  // Staff-aðgangur (Mads) er ekki læknir á listanum — þá er fyrsti læknirinn sýndur.
  const self = auth.actor.kind === "doctor" ? auth.actor.doctor.id : null;
  const who = doctorId ? people.find((d) => d.id === doctorId) : (self ? people.find((d) => d.id === self) : undefined) ?? people[0];

  const pdf = await buildShiftPdf({
    month,
    lang: await getHsuLang(),
    doctor: who,
    shifts: demoShifts(month, types, people),
    types,
    doctors: people,
    unitName,
    publishedAt: null,
  });
  return new Response(Buffer.from(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="syn-vaktaplan-${month}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
