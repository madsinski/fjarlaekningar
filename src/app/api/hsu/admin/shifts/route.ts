// Bæta við aukavakt á dag (utan vaktategunda, t.d. aukamönnun um Þjóðhátíð).

import { supabaseAdmin } from "@/lib/supabase-admin";
import { ShiftRuleError, applyShiftChanges } from "@/lib/hsu/shift-edit";
import { audit } from "@/lib/hsu/auth";
import { DATE_RE, SHIFT_COLUMNS, UUID_RE, fail, json, loadMonth, originOf, readJson, requireManager } from "@/lib/hsu/server";

export const runtime = "nodejs";

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

export async function POST(req: Request) {
  const auth = await requireManager(req);
  if ("res" in auth) return auth.res;
  const body = await readJson(req);
  const date = String(body.shift_date ?? "");
  if (!DATE_RE.test(date)) return fail("Ógild dagsetning");

  // Aukavakt af þekktri tegund (t.d. þriðji læknir á flýtimóttöku þennan dag):
  // tímar, heiti og númer koma úr tegundinni sjálfri.
  const typeId = body.shift_type_id ? String(body.shift_type_id) : null;
  if (typeId && !UUID_RE.test(typeId)) return fail("Ógild beiðni");
  if (typeId) {
    const { data: t } = await supabaseAdmin.from("hsu_shift_types").select("id, short, name, starts, ends").eq("id", typeId).maybeSingle();
    if (!t) return fail("Vaktategund fannst ekki", 404);
    const { data: sameDay } = await supabaseAdmin.from("hsu_shifts").select("slot_index").eq("shift_date", date).eq("shift_type_id", typeId);
    const used = new Set((sameDay ?? []).map((x) => x.slot_index ?? 0));
    let index = 0;
    while (used.has(index)) index++;
    const m0 = await loadMonth(date.slice(0, 7));
    const { data, error } = await supabaseAdmin.from("hsu_shifts").insert({
      shift_date: date, shift_type_id: typeId, slot_index: index, label: (t.short || t.name).slice(0, 30),
      starts: t.starts, ends: t.ends, status: "assigned", published: m0?.status === "published",
    }).select(SHIFT_COLUMNS).single();
    if (error) return fail(error.message, 500);
    await audit(auth.actor.label, "shift.create", date.slice(0, 7), { shiftId: data.id, date, type: t.short });
    if (body.doctor_id) {
      const doc = String(body.doctor_id);
      if (!UUID_RE.test(doc)) return fail("Ógild beiðni");
      try {
        await applyShiftChanges([{ id: data.id, doctor_id: doc }], { actor: auth.actor.label, origin: originOf(req), notify: true });
      } catch (e) {
        return fail(e instanceof Error ? e.message : String(e), e instanceof ShiftRuleError ? 400 : 500);
      }
    }
    const { data: fresh } = await supabaseAdmin.from("hsu_shifts").select(SHIFT_COLUMNS).eq("id", data.id).single();
    return json({ ok: true, shift: fresh ?? data });
  }
  const starts = String(body.starts ?? "08:00");
  const ends = String(body.ends ?? "16:00");
  if (!TIME_RE.test(starts) || !TIME_RE.test(ends)) return fail("Ógildur tími");
  const doctorId = body.doctor_id ? String(body.doctor_id) : null;
  if (doctorId && !UUID_RE.test(doctorId)) return fail("Ógild beiðni");
  const m = await loadMonth(date.slice(0, 7));

  const { data, error } = await supabaseAdmin
    .from("hsu_shifts")
    .insert({
      shift_date: date, shift_type_id: null, label: String(body.label ?? "Aukavakt").slice(0, 30),
      starts, ends, doctor_id: null, status: "assigned", note: String(body.note ?? "").slice(0, 300),
      published: m?.status === "published",
    })
    .select(SHIFT_COLUMNS)
    .single();
  if (error) return fail(error.message, 500);
  await audit(auth.actor.label, "shift.create", date.slice(0, 7), { shiftId: data.id, date });
  // Læknirinn settur á eftir á, sömu leið og þegar dregið er: hámark (beiðni),
  // réttindi, dagatal og póstur gilda eins.
  if (doctorId) {
    try {
      await applyShiftChanges([{ id: data.id, doctor_id: doctorId }], { actor: auth.actor.label, origin: originOf(req), notify: true });
    } catch (e) {
      return fail(e instanceof Error ? e.message : String(e), e instanceof ShiftRuleError ? 400 : 500);
    }
  }
  const { data: fresh } = await supabaseAdmin.from("hsu_shifts").select(SHIFT_COLUMNS).eq("id", data.id).single();
  return json({ ok: true, shift: fresh ?? data });
}
