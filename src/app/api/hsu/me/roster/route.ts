// Heildarvaktaplan mánaðar fyrir lækni — aðeins birtir mánuðir.

import { supabaseAdmin } from "@/lib/supabase-admin";
import { MONTH_RE, fail, json, loadMonth, loadMonthShifts, loadShiftTypes, requireDoctor } from "@/lib/hsu/server";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const auth = await requireDoctor(req);
  if ("res" in auth) return auth.res;
  const month = new URL(req.url).searchParams.get("month") ?? "";
  if (!MONTH_RE.test(month)) return fail("Ógildur mánuður");
  const m = await loadMonth(month);
  if (m?.status !== "published") return json({ ok: true, published: false, shifts: [] });
  const [allShifts, types, doctors] = await Promise.all([
    loadMonthShifts(month, true),
    loadShiftTypes(),
    supabaseAdmin.from("hsu_doctors").select("id, name, color").then((r) => r.data ?? []),
  ]);
  // Tóm bakvakt er ekki gat í planinu (hún er aðeins mönnuð þegar þörf er á).
  const bakvakt = new Set(types.filter((t) => t.kind === "bakvakt").map((t) => t.id));
  const shifts = allShifts.filter((s) => s.doctor_id || !s.shift_type_id || !bakvakt.has(s.shift_type_id));
  return json({ ok: true, published: true, shifts, doctors });
}
