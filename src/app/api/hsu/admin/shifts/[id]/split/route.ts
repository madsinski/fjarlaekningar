// Skipta einni vakt um hádegi — eða sameina helmingana aftur.
//
// Hálfur dagur er undantekning: flestir eru allan daginn, en stundum tekur einn
// læknir fyrri hlutann og annar þann síðari. Þetta er því aðgerð á stakri vakt,
// ekki regla á vaktategundinni.

import { after } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { audit } from "@/lib/hsu/auth";
import { hsuSync } from "@/lib/hsu/calendar";
import { shiftPhrase } from "@/lib/hsu/market";
import { notifyDoctors } from "@/lib/hsu/notify";
import { SHIFT_COLUMNS, UUID_RE, fail, json, originOf, readJson, requireManager } from "@/lib/hsu/server";
import { hhmm, isOvernight, minutesOf, splitTimeOf } from "@/lib/hsu/types";

export const runtime = "nodejs";

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireManager(req);
  if ("res" in auth) return auth.res;
  const { id } = await ctx.params;
  if (!UUID_RE.test(id)) return fail("Ógild beiðni");
  const body = await readJson(req);
  const action = body.action === "merge" ? "merge" : "split";

  const { data: shift } = await supabaseAdmin.from("hsu_shifts").select(SHIFT_COLUMNS).eq("id", id).maybeSingle();
  if (!shift) return fail("Vaktin fannst ekki", 404);
  const { data: type } = shift.shift_type_id
    ? await supabaseAdmin.from("hsu_shift_types").select("id, short, name, starts, ends, split_at").eq("id", shift.shift_type_id).maybeSingle()
    : { data: null };
  const base = (type?.short || type?.name || shift.label || "Vakt").slice(0, 20);
  const origin = originOf(req);
  const month = shift.shift_date.slice(0, 7);

  // Systkini sömu tegundar sama dag, til að finna hinn helminginn.
  const { data: siblings } = await supabaseAdmin
    .from("hsu_shifts").select(SHIFT_COLUMNS)
    .eq("shift_date", shift.shift_date)
    .eq("shift_type_id", shift.shift_type_id ?? "")
    .neq("id", id);

  const tellDoctor = (line: string, doctorId: string | null) => {
    if (!doctorId || !shift.published) return;
    notifyDoctors({ origin, subject: "Breyting á vakt", heading: "Breyting á vakt", notices: [{ doctorId, line }] });
    after(async () => { await hsuSync.syncDoctors([doctorId]); });
  };

  if (action === "split") {
    if (isOvernight(shift.starts, shift.ends)) return fail("Aðeins má skipta vakt sem er innan sama dags.");
    const at = typeof body.at === "string" && TIME_RE.test(body.at) ? body.at : splitTimeOf(type ?? {});
    const [s, e, m] = [minutesOf(shift.starts), minutesOf(shift.ends), minutesOf(at)];
    if (!(s < m && m < e)) return fail(`Skiptingin verður að vera á milli ${hhmm(shift.starts)} og ${hhmm(shift.ends)}.`);

    const used = new Set((siblings ?? []).map((x) => x.slot_index ?? 0));
    let index = 0;
    while (used.has(index) || index === (shift.slot_index ?? 0)) index++;

    const { error: upErr } = await supabaseAdmin.from("hsu_shifts").update({ ends: at, label: `${base} f.h.` }).eq("id", id);
    if (upErr) return fail(upErr.message, 500);
    const { data: created, error } = await supabaseAdmin.from("hsu_shifts").insert({
      shift_date: shift.shift_date, shift_type_id: shift.shift_type_id, slot_index: index,
      label: `${base} e.h.`, starts: at, ends: shift.ends, status: "assigned", published: shift.published, note: shift.note,
    }).select(SHIFT_COLUMNS).single();
    if (error) return fail(error.message, 500);

    await audit(auth.actor.label, "shift.split", month, { shiftId: id, at });
    tellDoctor(`Vaktinni þinni ${shiftPhrase(shift)} var skipt: þú ert nú á ${hhmm(shift.starts)}–${hhmm(at)}.`, shift.doctor_id);
    return json({ ok: true, shift: { ...shift, ends: at, label: `${base} f.h.` }, created });
  }

  // Sameina: finna hinn helminginn (á undan eða eftir) og gera eina heila vakt.
  const before = (siblings ?? []).find((x) => x.ends.slice(0, 5) === shift.starts.slice(0, 5));
  const afterHalf = (siblings ?? []).find((x) => x.starts.slice(0, 5) === shift.ends.slice(0, 5));
  const other = afterHalf ?? before;
  if (!other) return fail("Enginn samliggjandi helmingur fannst.");
  if (other.doctor_id && shift.doctor_id && other.doctor_id !== shift.doctor_id) {
    return fail("Læknar eru á báðum helmingum. Taktu annan af áður en þú sameinar.");
  }
  const keep = afterHalf ? shift : other;   // fyrri helmingurinn lifir
  const drop = afterHalf ? other : shift;
  const doctor = keep.doctor_id ?? drop.doctor_id;

  const { error: upErr } = await supabaseAdmin
    .from("hsu_shifts")
    .update({ ends: drop.ends, label: base, doctor_id: doctor, confirm_status: keep.confirm_status ?? drop.confirm_status })
    .eq("id", keep.id);
  if (upErr) return fail(upErr.message, 500);
  const { error: delErr } = await supabaseAdmin.from("hsu_shifts").delete().eq("id", drop.id);
  if (delErr) return fail(delErr.message, 500);

  await audit(auth.actor.label, "shift.merge", month, { kept: keep.id, removed: drop.id });
  tellDoctor(`Vaktin þín ${shiftPhrase(keep)} nær nú yfir allan daginn: ${hhmm(keep.starts)}–${hhmm(drop.ends)}.`, doctor);
  return json({ ok: true, merged: keep.id });
}
