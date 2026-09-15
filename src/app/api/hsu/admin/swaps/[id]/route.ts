// Yfirlæknir samþykkir eða hafnar vaktaskiptum, eða fellir boð niður.

import { after } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { audit } from "@/lib/hsu/auth";
import { shiftPhrase, transferShift } from "@/lib/hsu/market";
import { UUID_RE, fail, hsuEmailHtml, json, originOf, readJson, requireManager, sendHsuEmail } from "@/lib/hsu/server";

export const runtime = "nodejs";

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireManager(req);
  if ("res" in auth) return auth.res;
  const { id } = await ctx.params;
  if (!UUID_RE.test(id)) return fail("Ógild beiðni");
  const action = String((await readJson(req)).action ?? "");
  const origin = originOf(req);

  const { data: swap } = await supabaseAdmin
    .from("hsu_swaps")
    .select("id, shift_id, from_doctor, to_doctor, taken_by, status, shift:hsu_shifts(shift_date, starts, ends, label, doctor_id)")
    .eq("id", id)
    .maybeSingle();
  if (!swap) return fail("Fannst ekki", 404);
  const shift = swap.shift as unknown as { shift_date: string; starts: string; ends: string; label: string; doctor_id: string | null };
  const now = new Date().toISOString();

  if (action === "approve") {
    if (swap.status !== "awaiting_approval" || !swap.taken_by) return fail("Ekkert bíður samþykkis", 409);
    await transferShift({ swapId: swap.id, shiftId: swap.shift_id, fromDoctor: swap.from_doctor, toDoctor: swap.taken_by, actor: auth.actor.label, origin });
    return json({ ok: true });
  }

  if (action === "reject") {
    if (swap.status !== "awaiting_approval") return fail("Ekkert bíður samþykkis", 409);
    await supabaseAdmin.from("hsu_swaps").update({ status: "pending", taken_by: null }).eq("id", swap.id);
    await audit(auth.actor.label, "market.reject", shift.shift_date.slice(0, 7), { swapId: swap.id });
    after(async () => {
      const { data: d } = await supabaseAdmin.from("hsu_doctors").select("name, email").eq("id", swap.taken_by).maybeSingle();
      if (d) {
        await sendHsuEmail(d.email, "Vaktaskiptum hafnað", hsuEmailHtml({
          origin, heading: "Vaktaskiptum hafnað",
          paragraphs: [`Sæl/l ${d.name}.`, `${auth.actor.label} samþykkti ekki að þú tækir vaktina ${shiftPhrase(shift)}.`],
        }), `Vaktaskiptum hafnað: ${shiftPhrase(shift)}.`);
      }
    });
    return json({ ok: true });
  }

  if (action === "cancel") {
    if (!["pending", "awaiting_approval"].includes(swap.status)) return fail("Boðið er ekki virkt", 409);
    await supabaseAdmin.from("hsu_swaps").update({ status: "cancelled", resolved_at: now }).eq("id", swap.id);
    await supabaseAdmin.from("hsu_shifts").update({ status: "assigned" }).eq("id", swap.shift_id);
    await audit(auth.actor.label, "market.cancel", shift.shift_date.slice(0, 7), { swapId: swap.id });
    return json({ ok: true });
  }

  return fail("Óþekkt aðgerð");
}
