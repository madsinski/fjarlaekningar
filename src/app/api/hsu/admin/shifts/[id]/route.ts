// Breyta einni vakt (læknir, athugasemd, tími) eða eyða henni.

import { after } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { audit } from "@/lib/hsu/auth";
import { hsuSync } from "@/lib/hsu/calendar";
import { ShiftRuleError, applyShiftChanges, say } from "@/lib/hsu/shift-edit";
import { shiftPhrase } from "@/lib/hsu/market";
import { notifyDoctors } from "@/lib/hsu/notify";
import { hhmm } from "@/lib/hsu/types";
import { SHIFT_COLUMNS, UUID_RE, fail, json, originOf, readJson, requireManager } from "@/lib/hsu/server";
import { tr } from "@/lib/hsu/i18n/server";
import { apiAdmin } from "@/lib/hsu/i18n/messages/api-admin";

export const runtime = "nodejs";

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireManager(req);
  if ("res" in auth) return auth.res;
  const t = tr(req, apiAdmin);
  const { id } = await ctx.params;
  if (!UUID_RE.test(id)) return fail(t("err.badRequest"));
  const body = await readJson(req);

  const { data: shift } = await supabaseAdmin.from("hsu_shifts").select(SHIFT_COLUMNS).eq("id", id).maybeSingle();
  if (!shift) return fail(t("err.shiftNotFound"), 404);

  try {
    if ("doctor_id" in body) {
      const doc = body.doctor_id ? String(body.doctor_id) : null;
      if (doc && !UUID_RE.test(doc)) return fail(t("err.badRequest"));
      await applyShiftChanges([{ id, doctor_id: doc }], { actor: auth.actor.label, origin: originOf(req), notify: body.notify !== false, lang: t.lang });
    }
    const patch: Record<string, unknown> = {};
    if (typeof body.note === "string") patch.note = body.note.slice(0, 300);
    if (typeof body.label === "string") patch.label = body.label.slice(0, 30);
    if (typeof body.starts === "string" && TIME_RE.test(body.starts)) patch.starts = body.starts;
    if (typeof body.ends === "string" && TIME_RE.test(body.ends)) patch.ends = body.ends;
    if (Object.keys(patch).length) {
      const { error } = await supabaseAdmin.from("hsu_shifts").update(patch).eq("id", id);
      if (error) return fail(error.message, 500);
      if (shift.published && shift.doctor_id) after(async () => { await hsuSync.syncDoctors([shift.doctor_id]); });
      // Læknirinn á birtri vakt á að vita af breyttum tíma eða athugasemd —
      // en aðeins ef læknirinn breyttist ekki í sömu aðgerð (þá fékk hann þegar tilkynningu).
      if (shift.published && shift.doctor_id && !("doctor_id" in body) && body.notify !== false) {
        // Hver breyting sem fall af þýðanda, svo línan verði á tungumáli læknisins.
        type AdminT = Parameters<Parameters<typeof say>[0]>[0];
        const what: ((l: AdminT) => string)[] = [];
        if (patch.starts || patch.ends) {
          const times = { from: hhmm(String(patch.starts ?? shift.starts)), to: hhmm(String(patch.ends ?? shift.ends)) };
          what.push((l) => l("shiftEdit.time", times));
        }
        if (patch.label && patch.label !== shift.label) {
          const label = String(patch.label);
          what.push((l) => l("shiftEdit.label", { label }));
        }
        if (typeof patch.note === "string" && patch.note !== shift.note) {
          const note = patch.note;
          what.push((l) => (note ? l("shiftEdit.note", { note }) : l("shiftEdit.noteRemoved")));
        }
        if (what.length) {
          notifyDoctors({
            origin: originOf(req),
            subject: say((l) => l("shiftEdit.subject")),
            heading: say((l) => l("shiftEdit.subject")),
            notices: [{
              doctorId: shift.doctor_id,
              line: say((l) => l("shiftEdit.line", { by: auth.actor.label, shift: shiftPhrase(shift, l.lang), changes: what.map((w) => w(l)).join(", ") })),
            }],
            category: "shifts",
          });
        }
      }
    }
    const { data: fresh } = await supabaseAdmin.from("hsu_shifts").select(SHIFT_COLUMNS).eq("id", id).single();
    if (Object.keys(patch).length) await audit(auth.actor.label, "shift.edit", shift.shift_date.slice(0, 7), { shiftId: id, fields: Object.keys(patch) });
    return json({ ok: true, shift: fresh });
  } catch (e) {
    return fail(e instanceof Error ? e.message : String(e), e instanceof ShiftRuleError ? 400 : 500);
  }
}

export async function DELETE(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireManager(req);
  if ("res" in auth) return auth.res;
  const t = tr(req, apiAdmin);
  const { id } = await ctx.params;
  if (!UUID_RE.test(id)) return fail(t("err.badRequest"));
  const { data: shift } = await supabaseAdmin.from("hsu_shifts").select("doctor_id, shift_date, starts, ends, label, published, confirm_status").eq("id", id).maybeSingle();
  if (!shift) return fail(t("err.shiftNotFound"), 404);
  const { error } = await supabaseAdmin.from("hsu_shifts").delete().eq("id", id);
  if (error) return fail(error.message, 500);
  if (shift.doctor_id && (shift.published || shift.confirm_status === "requested")) {
    notifyDoctors({
      origin: originOf(req),
      subject: say((l) => l("cancelled.subject")),
      heading: say((l) => l("cancelled.subject")),
      notices: [{ doctorId: shift.doctor_id, line: say((l) => l("cancelled.line", { by: auth.actor.label, shift: shiftPhrase(shift, l.lang) })) }],
      category: "shifts",
    });
  }
  // Atburðurinn í dagatali læknisins hverfur við næstu samstillingu, því
  // vörpunarlínan lifir vaktina af (sjá calendar-sync.ts).
  if (shift.published && shift.doctor_id) after(async () => { await hsuSync.syncDoctors([shift.doctor_id]); });
  await audit(auth.actor.label, "shift.delete", shift.shift_date.slice(0, 7), { shiftId: id });
  return json({ ok: true });
}
