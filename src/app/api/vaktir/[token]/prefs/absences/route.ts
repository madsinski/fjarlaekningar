// Skrá frí. Einn dagur er tímabil þar sem upphaf og endir er sami dagur.

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export async function POST(req: Request, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params;
  if (!token || token.length < 16) return NextResponse.json({ ok: false, error: "Ógildur hlekkur" }, { status: 400 });

  const { data: doctor } = await supabaseAdmin
    .from("roster_doctors").select("id").eq("access_token", token).maybeSingle();
  if (!doctor) return NextResponse.json({ ok: false, error: "Læknir fannst ekki" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const starts_on = String(body.starts_on || "");
  // One-day holidays are the common case, so an empty end means the same day
  // rather than an error.
  const ends_on = String(body.ends_on || starts_on);

  if (!ISO_DATE.test(starts_on) || !ISO_DATE.test(ends_on)) {
    return NextResponse.json({ ok: false, error: "Ógild dagsetning" }, { status: 400 });
  }
  if (ends_on < starts_on) {
    return NextResponse.json({ ok: false, error: "Lokadagur má ekki vera á undan upphafsdegi" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("roster_doctor_absences")
    .insert({ doctor_id: doctor.id, starts_on, ends_on, note: String(body.note || "").slice(0, 200) })
    .select("id, starts_on, ends_on, note")
    .single();
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, absence: data }, { status: 201 });
}
