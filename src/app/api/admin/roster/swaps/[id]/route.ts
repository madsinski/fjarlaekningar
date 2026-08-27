// Admin cancels a pending swap/market offer (e.g. to override the schedule).

import { NextResponse, after } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { syncDoctors } from "@/lib/roster-google-sync";
import { getCallerStaff, isAdmin } from "@/lib/admin-auth";

export const runtime = "nodejs";

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const caller = await getCallerStaff(req);
  if (!isAdmin(caller)) {
    return NextResponse.json({ ok: false, error: "Admin role required" }, { status: 403 });
  }
  const { id } = await ctx.params;

  const { data: swap } = await supabaseAdmin.from("roster_swaps").select("id, shift_id, status").eq("id", id).maybeSingle();
  if (!swap) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });

  await supabaseAdmin.from("roster_swaps").update({ status: "cancelled", resolved_at: new Date().toISOString() }).eq("id", id);
  if (swap.status === "pending") {
    await supabaseAdmin.from("roster_shifts").update({ status: "assigned" }).eq("id", swap.shift_id);
  }

  // Back off the market means back into its holder's calendar.
  const { data: shift } = await supabaseAdmin
    .from("roster_shifts").select("doctor_id").eq("id", swap.shift_id).maybeSingle();
  after(async () => { await syncDoctors([shift?.doctor_id]); });

  return NextResponse.json({ ok: true });
}
