// The logged-in staff member's own account data: their roster (if they're a
// doctor) and their email signature. Any active staff member.

import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getCallerStaff } from "@/lib/admin-auth";
import { monthKey } from "@/lib/roster";
import { PUBLIC_SITE_URL } from "@/lib/public-site";

export const runtime = "nodejs";

function slug(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 20) || "sig";
}

export async function GET(req: Request) {
  const caller = await getCallerStaff(req);
  if (!caller) return NextResponse.json({ ok: false, error: "Not authenticated" }, { status: 401 });

  // ── Own email signature (match by email; create one if missing) ──
  let { data: signature } = await supabaseAdmin
    .from("email_signatures")
    .select("key, name, title, phone, email")
    .eq("email", caller.email)
    .maybeSingle();
  if (!signature) {
    const key = `${slug(caller.name)}-${caller.id.slice(0, 6)}`;
    const { data } = await supabaseAdmin
      .from("email_signatures")
      .insert({ key, name: caller.name, title: "", phone: "", email: caller.email })
      .select("key, name, title, phone, email")
      .maybeSingle();
    signature = data ?? { key, name: caller.name, title: "", phone: "", email: caller.email };
  }

  // ── Roster (only for doctors) ──
  let roster: unknown = null;
  if (caller.roles.includes("doctor")) {
    let { data: profile } = await supabaseAdmin.from("roster_doctors").select("*").eq("staff_id", caller.id).maybeSingle();
    if (!profile) {
      const { data } = await supabaseAdmin
        .from("roster_doctors")
        .insert({ staff_id: caller.id, name: caller.name, email: caller.email, color: "#00a8cc", access_token: randomBytes(24).toString("hex") })
        .select("*")
        .maybeSingle();
      profile = data;
    }
    if (profile) {
      const fromDate = `${monthKey(new Date())}-01`;
      const [shifts, settings, doctors, swaps] = await Promise.all([
        supabaseAdmin.from("roster_shifts").select("*").eq("doctor_id", profile.id).gte("shift_date", fromDate).order("shift_date").order("starts"),
        supabaseAdmin.from("roster_settings").select("per_patient_salary, currency").eq("id", 1).maybeSingle(),
        supabaseAdmin.from("roster_doctors").select("id, name, color, active, staff_id"),
        supabaseAdmin.from("roster_swaps").select("id, shift_id, from_doctor, to_doctor, status, shift:roster_shifts(shift_date, starts, ends)").eq("status", "pending"),
      ]);
      roster = {
        doctorId: profile.id,
        doctorName: caller.name,
        token: profile.access_token,
        calendarUrl: `${PUBLIC_SITE_URL}/api/vaktir/${profile.access_token}/calendar.ics`,
        shifts: shifts.data ?? [],
        settings: settings.data ?? { per_patient_salary: 3000, currency: "kr." },
        doctors: doctors.data ?? [],
        swaps: swaps.data ?? [],
      };
    }
  }

  return NextResponse.json({
    ok: true,
    me: { name: caller.name, email: caller.email, roles: caller.roles },
    signature,
    roster,
  });
}
