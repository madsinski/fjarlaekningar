// Vaktaplan mánaðarins á PDF til að prenta — sama skjal og fylgir
// birtingarpóstinum. Aðeins birtir mánuðir: óbirt plan má læknir ekki sjá.
//   GET /api/hsu/me/shifts-pdf?m=2026-10

import { listDoctors, loadMonth, loadMonthShifts, loadShiftTypes, requireDoctor } from "@/lib/hsu/server";
import { buildShiftPdf, shiftPdfName } from "@/lib/hsu/shift-pdf";
import { MONTH_RE, fail } from "@/lib/hsu/server";
import { doctorLang, tr } from "@/lib/hsu/i18n/server";
import { apiDoctor } from "@/lib/hsu/i18n/messages/api-doctor";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const auth = await requireDoctor(req);
  if ("res" in auth) return auth.res;
  const t = tr(req, apiDoctor);
  const month = new URL(req.url).searchParams.get("m") ?? "";
  if (!MONTH_RE.test(month)) return fail(t("req.invalidMonth"));

  const m = await loadMonth(month);
  if (m?.status !== "published") return fail(t("pdf.notPublished"), 404);

  const [shifts, types, doctors] = await Promise.all([loadMonthShifts(month), loadShiftTypes(), listDoctors(false)]);
  const lang = await doctorLang(auth.doctor.id);
  const pdf = await buildShiftPdf({
    month, lang,
    doctor: { id: auth.doctor.id, name: auth.doctor.name },
    shifts, types,
    doctors: doctors.map((d) => ({ id: d.id, name: d.name })),
    publishedAt: m.published_at,
  });
  return new Response(Buffer.from(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${shiftPdfName(month)}"`,
      // Persónulegt skjal: aldrei í skyndiminni milliliða.
      "Cache-Control": "private, no-store",
    },
  });
}
