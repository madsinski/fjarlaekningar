import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";

export async function DELETE(_req: Request, ctx: { params: Promise<{ token: string; id: string }> }) {
  const { token, id } = await ctx.params;
  if (!token || token.length < 16) return NextResponse.json({ ok: false, error: "Ógildur hlekkur" }, { status: 400 });

  const { data: doctor } = await supabaseAdmin
    .from("roster_doctors").select("id").eq("access_token", token).maybeSingle();
  if (!doctor) return NextResponse.json({ ok: false, error: "Læknir fannst ekki" }, { status: 404 });

  // Scoped to the doctor's own id, so a guessed absence id from someone else's
  // calendar deletes nothing.
  const { error } = await supabaseAdmin
    .from("roster_doctor_absences")
    .delete()
    .eq("id", id)
    .eq("doctor_id", doctor.id);
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
