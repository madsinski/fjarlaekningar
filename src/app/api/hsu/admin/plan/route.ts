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
import { planMonth, toPlanDoctors, toPlanSlots, type PlanPrefs } from "@/lib/hsu/plan";
import { shiftPhrase } from "@/lib/hsu/market";
import { notifyDoctors, type DoctorNotice } from "@/lib/hsu/notify";
import {
  MONTH_RE, ensureSlots, fail, json, listDoctors, loadMonth, loadMonthShifts, loadPreferences, loadShiftTypes, originOf, readJson, requireManager,
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
    const prefs: Record<string, PlanPrefs> = {};
    for (const p of prefRows) prefs[p.doctor_id] = p;

    const before = new Map(shifts.map((s) => [s.id, s.doctor_id]));
    const result = planMonth(
      toPlanSlots(shifts, types),
      toPlanDoctors(doctors),
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
      const { error } = await supabaseAdmin.from("hsu_shifts").update({ doctor_id: doc, status: "assigned", confirm_status: null, requested_by: "", requested_at: null }).in("id", ids);
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
    if (m?.status === "published" && changed) {
      after(async () => { await hsuSync.syncAllConnected(); });
      // Birt plan: hver læknir sem missti eða fékk vakt fær að vita það.
      const shiftById = new Map(shifts.map((s) => [s.id, s]));
      const notices: DoctorNotice[] = [];
      for (const [doc, ids] of byDoctor) {
        for (const id of ids) {
          const s = shiftById.get(id)!;
          if (s.doctor_id) notices.push({ doctorId: s.doctor_id, line: `Þú ert ekki lengur á vaktinni ${shiftPhrase(s)}.` });
          if (doc) notices.push({ doctorId: doc, line: `Þú hefur verið sett(ur) á vaktina ${shiftPhrase(s)}.` });
        }
      }
      notifyDoctors({ origin: originOf(req), subject: "Breyting á vaktaplani", heading: "Breyting á vaktaplani", intro: `${auth.actor.label} endurraðaði vaktaplaninu:`, notices });
    }

    await audit(auth.actor.label, "plan.generate", month, { mode, created, changed, unfilled: result.unfilled.length });
    return json({ ok: true, created, changed, unfilled: result.unfilled, stats: result.stats, month: m });
  } catch (e) {
    return fail(e instanceof Error ? e.message : String(e), 500);
  }
}
