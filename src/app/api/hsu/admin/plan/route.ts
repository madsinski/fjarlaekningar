// Búa til vaktaplan: tryggja að vaktir séu til og skipta þeim sjálfvirkt.
//
// Skrifar beint í vaktatöfluna. Það er öruggt á meðan mánuðurinn er í smíðum —
// enginn læknir sér planið fyrr en það er birt — og yfirlæknir getur keyrt
// skiptinguna aftur eða dregið lækna til eftir á. Í birtum mánuði krefst
// endurskipting staðfestingar og dagatöl samstillast strax.

import { after } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { audit } from "@/lib/hsu/auth";
import { hsuSync } from "@/lib/hsu/calendar";
import { planMonth, type PlanPrefs } from "@/lib/hsu/plan";
import {
  MONTH_RE, ensureSlots, fail, json, listDoctors, loadMonth, loadMonthShifts, loadPreferences, loadShiftTypes, readJson, requireManager,
} from "@/lib/hsu/server";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const auth = await requireManager(req);
  if ("res" in auth) return auth.res;
  const body = await readJson(req);
  const month = String(body.month ?? "");
  if (!MONTH_RE.test(month)) return fail("Ógildur mánuður");
  const mode = body.mode === "all" ? "all" : "empty";
  const action = body.action === "slots" ? "slots" : "plan";

  try {
    let m = await loadMonth(month);
    if (m?.status === "published" && mode === "all" && !body.confirm) {
      return json({ ok: false, needsConfirm: "published", error: "Mánuðurinn er birtur. Endurskipting breytir vöktum sem læknar hafa þegar séð." }, 409);
    }

    const created = await ensureSlots(month);
    if (action === "slots") {
      await audit(auth.actor.label, "plan.slots", month, { created });
      return json({ ok: true, created });
    }

    const [shifts, types, doctors, prefRows] = await Promise.all([
      loadMonthShifts(month), loadShiftTypes(), listDoctors(false), loadPreferences(month),
    ]);
    const rest = new Map(types.map((t) => [t.id, t.rest_days_after]));
    const prefs: Record<string, PlanPrefs> = {};
    for (const p of prefRows) prefs[p.doctor_id] = p;

    const before = new Map(shifts.map((s) => [s.id, s.doctor_id]));
    const result = planMonth(
      shifts.map((s) => ({ key: s.id, date: s.shift_date, typeId: s.shift_type_id, restAfter: s.shift_type_id ? rest.get(s.shift_type_id) ?? 0 : 0, doctorId: s.doctor_id })),
      doctors.map((d) => ({ id: d.id, name: d.name, fte: d.fte, active: d.active })),
      prefs,
      { mode },
    );

    // Aðeins breyttar vaktir skrifaðar, flokkaðar eftir lækni: ein uppfærsla á
    // lækni í stað einnar á vakt.
    const byDoctor = new Map<string | null, string[]>();
    for (const [id, doc] of Object.entries(result.assignments)) {
      if ((before.get(id) ?? null) === (doc ?? null)) continue;
      const list = byDoctor.get(doc ?? null) ?? [];
      list.push(id);
      byDoctor.set(doc ?? null, list);
    }
    let changed = 0;
    for (const [doc, ids] of byDoctor) {
      const { error } = await supabaseAdmin.from("hsu_shifts").update({ doctor_id: doc, status: "assigned" }).in("id", ids);
      if (error) throw new Error(error.message);
      changed += ids.length;
    }
    // Opin boð á vöktum sem skiptu um lækni eiga ekki lengur við.
    const moved = [...byDoctor.values()].flat();
    if (moved.length) {
      await supabaseAdmin.from("hsu_swaps").update({ status: "cancelled", resolved_at: new Date().toISOString() }).in("shift_id", moved).in("status", ["pending", "awaiting_approval"]);
    }

    if (!m || m.status === "collecting" || m.status === "review") {
      const { data } = await supabaseAdmin.from("hsu_months").upsert({ month, status: "planning" }, { onConflict: "month" }).select("*").single();
      m = data;
    }
    if (m?.status === "published" && changed) after(async () => { await hsuSync.syncAllConnected(); });

    await audit(auth.actor.label, "plan.generate", month, { mode, created, changed, unfilled: result.unfilled.length });
    return json({ ok: true, created, changed, unfilled: result.unfilled, stats: result.stats, month: m });
  } catch (e) {
    return fail(e instanceof Error ? e.message : String(e), 500);
  }
}
