// Forskoðun vaktaplans á PDF fyrir yfirlækni — sama skjal og læknar fá með
// birtingarpóstinum, en fyrir mánuð í hvaða stöðu sem er (líka óbirtan).
//   GET /api/hsu/admin/months/2026-10/pdf              → mánaðarplanið
//   GET /api/hsu/admin/months/2026-10/pdf?doctorId=…   → eins og sá læknir fær það

import { MONTH_RE, UUID_RE, fail, listDoctors, loadMonth, loadMonthShifts, loadShiftTypes, requireManager } from "@/lib/hsu/server";
import { buildShiftPdf, shiftPdfName } from "@/lib/hsu/shift-pdf";
import { getHsuLang } from "@/lib/hsu/i18n/server";
import { tr } from "@/lib/hsu/i18n/server";
import { apiAdmin } from "@/lib/hsu/i18n/messages/api-admin";

export const runtime = "nodejs";

export async function GET(req: Request, ctx: { params: Promise<{ month: string }> }) {
  const auth = await requireManager(req);
  if ("res" in auth) return auth.res;
  const t = tr(req, apiAdmin);
  const { month } = await ctx.params;
  if (!MONTH_RE.test(month)) return fail(t("err.badMonth"));

  const doctorId = new URL(req.url).searchParams.get("doctorId");
  if (doctorId && !UUID_RE.test(doctorId)) return fail(t("err.badRequest"));

  const [m, shifts, types, doctors] = await Promise.all([
    loadMonth(month), loadMonthShifts(month), loadShiftTypes(), listDoctors(false),
  ]);
  if (!shifts.length) return fail(t("err.noPlan"), 404);

  const people = doctors.map((d) => ({ id: d.id, name: d.name, color: d.color }));
  const who = doctorId ? people.find((d) => d.id === doctorId) : undefined;
  if (doctorId && !who) return fail(t("err.theDoctorNotFound"), 404);

  const pdf = await buildShiftPdf({
    month,
    lang: await getHsuLang(),
    doctor: who,
    shifts, types,
    doctors: people,
    publishedAt: m?.published_at ?? null,
  });
  return new Response(Buffer.from(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${shiftPdfName(month)}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
