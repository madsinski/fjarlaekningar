// Resolve a swap offer: accept (take the shift), decline (targeted recipient),
// or cancel (the offering doctor). Token-gated.

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";

export async function PATCH(req: Request, ctx: { params: Promise<{ token: string; id: string }> }) {
  const { token, id } = await ctx.params;
  const { data: doctor } = await supabaseAdmin.from("roster_doctors").select("id").eq("access_token", token).maybeSingle();
  if (!doctor) return NextResponse.json({ ok: false, error: "Læknir fannst ekki" }, { status: 404 });

  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }
  const action = String(body.action || "");

  const { data: swap } = await supabaseAdmin
    .from("roster_swaps")
    .select("id, shift_id, from_doctor, to_doctor, status")
    .eq("id", id)
    .maybeSingle();
  if (!swap || swap.status !== "pending") {
    return NextResponse.json({ ok: false, error: "Beiðnin er ekki lengur virk" }, { status: 409 });
  }

  const now = new Date().toISOString();

  if (action === "accept") {
    const mayTake = swap.to_doctor ? swap.to_doctor === doctor.id : swap.from_doctor !== doctor.id;
    if (!mayTake) return NextResponse.json({ ok: false, error: "Ekki heimilt" }, { status: 403 });
    await supabaseAdmin.from("roster_shifts").update({ doctor_id: doctor.id, status: "assigned" }).eq("id", swap.shift_id);
    await supabaseAdmin.from("roster_swaps").update({ status: "accepted", resolved_at: now }).eq("id", swap.id);
    // Retire any other live offers on the same shift.
    await supabaseAdmin.from("roster_swaps").update({ status: "cancelled", resolved_at: now }).eq("shift_id", swap.shift_id).eq("status", "pending");
    return NextResponse.json({ ok: true });
  }

  if (action === "decline") {
    if (swap.to_doctor !== doctor.id) return NextResponse.json({ ok: false, error: "Ekki heimilt" }, { status: 403 });
    await supabaseAdmin.from("roster_swaps").update({ status: "declined", resolved_at: now }).eq("id", swap.id);
    await supabaseAdmin.from("roster_shifts").update({ status: "assigned" }).eq("id", swap.shift_id);
    return NextResponse.json({ ok: true });
  }

  if (action === "cancel") {
    if (swap.from_doctor !== doctor.id) return NextResponse.json({ ok: false, error: "Ekki heimilt" }, { status: 403 });
    await supabaseAdmin.from("roster_swaps").update({ status: "cancelled", resolved_at: now }).eq("id", swap.id);
    await supabaseAdmin.from("roster_shifts").update({ status: "assigned" }).eq("id", swap.shift_id);
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ ok: false, error: "Óþekkt aðgerð" }, { status: 400 });
}
