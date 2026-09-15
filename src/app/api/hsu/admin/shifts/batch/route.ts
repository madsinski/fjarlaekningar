// Margar vaktabreytingar í einu — t.d. þegar læknar skipta á dögum með því að
// draga einn ofan á annan (tvær vaktir breytast saman).

import { audit } from "@/lib/hsu/auth";
import { ShiftRuleError, applyShiftChanges, type ShiftChange } from "@/lib/hsu/shift-edit";
import { UUID_RE, fail, json, originOf, readJson, requireManager } from "@/lib/hsu/server";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const auth = await requireManager(req);
  if ("res" in auth) return auth.res;
  const body = await readJson(req);
  const raw = Array.isArray(body.changes) ? body.changes : [];
  const changes: ShiftChange[] = [];
  for (const c of raw.slice(0, 200)) {
    const id = String((c as ShiftChange)?.id ?? "");
    const doc = (c as ShiftChange)?.doctor_id ? String((c as ShiftChange).doctor_id) : null;
    if (!UUID_RE.test(id) || (doc && !UUID_RE.test(doc))) return fail("Ógild beiðni");
    changes.push({ id, doctor_id: doc });
  }
  try {
    const r = await applyShiftChanges(changes, { actor: auth.actor.label, origin: originOf(req), notify: body.notify !== false });
    if (r.changed) await audit(auth.actor.label, "shift.assign", typeof body.month === "string" ? body.month : null, { changes: changes.slice(0, 20) });
    return json({ ok: true, ...r });
  } catch (e) {
    return fail(e instanceof Error ? e.message : String(e), e instanceof ShiftRuleError ? 400 : 500);
  }
}
