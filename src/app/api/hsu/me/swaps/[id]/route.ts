// Taka vakt af vaktamarkaði, hafna beinu boði eða draga eigið boð til baka.

import { after } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { audit } from "@/lib/hsu/auth";
import { hasShiftThatDay, shiftPhrase, transferShift } from "@/lib/hsu/market";
import { hsuSync } from "@/lib/hsu/calendar";
import { UUID_RE, fail, hsuEmailHtml, json, originOf, readJson, requireDoctor, sendHsuEmail } from "@/lib/hsu/server";

export const runtime = "nodejs";

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireDoctor(req);
  if ("res" in auth) return auth.res;
  const me = auth.doctor;
  const { id } = await ctx.params;
  if (!UUID_RE.test(id)) return fail("Ógild beiðni");
  const action = String((await readJson(req)).action ?? "");

  const { data: swap } = await supabaseAdmin
    .from("hsu_swaps")
    .select("id, shift_id, from_doctor, to_doctor, taken_by, status, shift:hsu_shifts(shift_date, starts, ends, label, doctor_id)")
    .eq("id", id)
    .maybeSingle();
  if (!swap) return fail("Boðið fannst ekki", 404);
  const shift = swap.shift as unknown as { shift_date: string; starts: string; ends: string; label: string; doctor_id: string | null } | null;
  if (!shift) return fail("Vaktin fannst ekki", 404);
  const now = new Date().toISOString();
  const origin = originOf(req);

  if (action === "accept") {
    if (swap.status !== "pending") return fail("Boðið er ekki lengur virkt", 409);
    const mayTake = swap.to_doctor ? swap.to_doctor === me.id : swap.from_doctor !== me.id;
    if (!mayTake) return fail("Ekki heimilt", 403);
    if (shift.doctor_id !== swap.from_doctor) return fail("Vaktin hefur þegar skipt um hendur", 409);
    if (shift.shift_date < now.slice(0, 10)) return fail("Vaktin er liðin.");
    if (await hasShiftThatDay(me.id, shift.shift_date, swap.shift_id)) return fail("Þú ert þegar á vakt þennan dag.", 409);

    const { data: settings } = await supabaseAdmin.from("hsu_settings").select("market_requires_approval").eq("id", 1).maybeSingle();
    if (settings?.market_requires_approval) {
      await supabaseAdmin.from("hsu_swaps").update({ status: "awaiting_approval", taken_by: me.id }).eq("id", swap.id).eq("status", "pending");
      await audit(me.name, "market.request", shift.shift_date.slice(0, 7), { swapId: swap.id });
      after(async () => {
        const { data: heads } = await supabaseAdmin.from("hsu_doctors").select("email").eq("role", "head").eq("active", true);
        for (const h of heads ?? []) {
          await sendHsuEmail(
            h.email,
            "Vaktaskipti bíða samþykkis",
            hsuEmailHtml({
              origin,
              heading: "Vaktaskipti bíða samþykkis",
              paragraphs: [`${me.name} vill taka vaktina ${shiftPhrase(shift)}.`],
              cta: { label: "Opna vaktaskipulag", url: `${origin}/hsu/stjorn?t=markadur` },
            }),
            `${me.name} vill taka vaktina ${shiftPhrase(shift)}.`,
          );
        }
      });
      return json({ ok: true, awaitingApproval: true });
    }

    await transferShift({ swapId: swap.id, shiftId: swap.shift_id, fromDoctor: swap.from_doctor, toDoctor: me.id, actor: me.name, origin });
    return json({ ok: true });
  }

  if (action === "decline") {
    if (swap.status !== "pending" || swap.to_doctor !== me.id) return fail("Ekki heimilt", 403);
    await supabaseAdmin.from("hsu_swaps").update({ status: "declined", resolved_at: now }).eq("id", swap.id);
    await supabaseAdmin.from("hsu_shifts").update({ status: "assigned" }).eq("id", swap.shift_id);
    await audit(me.name, "market.decline", shift.shift_date.slice(0, 7), { swapId: swap.id });
    after(async () => {
      const { data: from } = await supabaseAdmin.from("hsu_doctors").select("email").eq("id", swap.from_doctor).maybeSingle();
      if (from) {
        await sendHsuEmail(from.email, `${me.name} gat ekki tekið vaktina`, hsuEmailHtml({
          origin, heading: "Boði hafnað",
          paragraphs: [`${me.name} gat ekki tekið vaktina ${shiftPhrase(shift)}. Hún er áfram þín.`, "Þú getur boðið hana öðrum lækni eða sett hana á vaktamarkað."],
          cta: { label: "Opna mína síðu", url: `${origin}/hsu/min-sida` },
        }), `${me.name} gat ekki tekið vaktina ${shiftPhrase(shift)}.`);
      }
    });
    return json({ ok: true });
  }

  if (action === "cancel") {
    if (!["pending", "awaiting_approval"].includes(swap.status) || swap.from_doctor !== me.id) return fail("Ekki heimilt", 403);
    await supabaseAdmin.from("hsu_swaps").update({ status: "cancelled", resolved_at: now }).eq("id", swap.id);
    await supabaseAdmin.from("hsu_shifts").update({ status: "assigned" }).eq("id", swap.shift_id);
    await audit(me.name, "market.cancel", shift.shift_date.slice(0, 7), { swapId: swap.id });
    after(async () => { await hsuSync.syncDoctors([me.id]); });
    return json({ ok: true });
  }

  return fail("Óþekkt aðgerð");
}
