// Allt sem vaktaskipulagið þarf fyrir einn mánuð, í einu kalli.

import { supabaseAdmin } from "@/lib/supabase-admin";
import {
  MONTH_RE, fail, json, listDoctors, loadMonth, loadMonthShifts, loadPendingSwaps, loadPreferences, loadShiftTypes, requireManager,
} from "@/lib/hsu/server";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const auth = await requireManager(req);
  if ("res" in auth) return auth.res;
  const month = new URL(req.url).searchParams.get("month") ?? "";
  if (!MONTH_RE.test(month)) return fail("Ógildur mánuður");

  try {
    const today = new Date().toISOString().slice(0, 10);
    const [settings, shiftTypes, doctors, m, prefs, shifts, swaps, auditRows, months] = await Promise.all([
      supabaseAdmin.from("hsu_settings").select("unit_name, market_requires_approval").eq("id", 1).maybeSingle().then((r) => r.data),
      loadShiftTypes(),
      listDoctors(),
      loadMonth(month),
      loadPreferences(month),
      loadMonthShifts(month),
      loadPendingSwaps(),
      supabaseAdmin.from("hsu_audit").select("at, actor, action, detail").eq("month", month).order("at", { ascending: false }).limit(40).then((r) => r.data ?? []),
      supabaseAdmin.from("hsu_months").select("month, status").order("month").then((r) => r.data ?? []),
    ]);
    const actor = auth.actor;
    return json({
      ok: true,
      actor: {
        kind: actor.kind,
        label: actor.label,
        doctorId: actor.kind === "doctor" ? actor.doctor.id : null,
      },
      settings: settings ?? { unit_name: "Heilsugæslan í Vestmannaeyjum", market_requires_approval: false },
      shiftTypes,
      doctors,
      month: m,
      months,
      preferences: prefs,
      shifts,
      // Allar opnar færslur á vaktamarkaði, ekki bara þessa mánaðar: yfirlæknir
      // á að sjá það sem bíður hans óháð því hvaða mánuð hann er að skipuleggja.
      swaps: swaps.filter((s) => s.shift && s.shift.shift_date >= today),
      audit: auditRows,
    });
  } catch (e) {
    return fail(e instanceof Error ? e.message : String(e), 500);
  }
}
