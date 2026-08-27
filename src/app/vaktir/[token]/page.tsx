import type { Metadata } from "next";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { PUBLIC_SITE_URL } from "@/lib/public-site";
import { monthKey, type RosterShift, type RosterSettings, type RosterDoctor, type RosterSwap } from "@/lib/roster";
import DoctorShifts from "./DoctorShifts";
import DoctorBilling from "./DoctorBilling";

// Personal, token-gated doctor page (no login). Chrome-free, proxy-bypassed.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Mínar vaktir — Fjarlækningar",
  robots: { index: false, follow: false },
};

export default async function DoctorRosterPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  const { data: doctor } = await supabaseAdmin
    .from("roster_doctors")
    .select("id, name")
    .eq("access_token", token)
    .maybeSingle();

  if (!doctor) {
    return (
      <div className="grid min-h-screen place-items-center bg-slate-50 px-6 text-center">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Hlekkurinn er ekki gildur</h1>
          <p className="mt-2 text-slate-600">Hafðu samband við stjórnanda til að fá nýjan hlekk.</p>
        </div>
      </div>
    );
  }

  // Shifts from the start of the current month onward.
  const fromDate = `${monthKey(new Date())}-01`;
  const { data: shifts } = await supabaseAdmin
    .from("roster_shifts")
    .select("id, shift_date, starts, ends, doctor_id, status, patients_seen, note")
    .eq("doctor_id", doctor.id)
    .gte("shift_date", fromDate)
    .order("shift_date")
    .order("starts");

  const { data: settings } = await supabaseAdmin
    .from("roster_settings")
    .select("per_patient_salary, currency")
    .eq("id", 1)
    .maybeSingle();

  const { data: doctors } = await supabaseAdmin
    .from("roster_doctors")
    .select("id, name, color, active, staff_id")
    .eq("active", true)
    .order("name");

  const { data: swaps } = await supabaseAdmin
    .from("roster_swaps")
    .select("id, shift_id, from_doctor, to_doctor, status, shift:roster_shifts(shift_date, starts, ends)")
    .eq("status", "pending");

  return (
    <div className="min-h-screen bg-slate-50 py-10 sm:py-14">
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <DoctorShifts
          token={token}
          doctorId={doctor.id}
          doctorName={doctor.name}
          initialShifts={(shifts ?? []) as RosterShift[]}
          doctors={(doctors ?? []) as RosterDoctor[]}
          initialSwaps={(swaps ?? []) as unknown as RosterSwap[]}
          settings={(settings ?? { per_patient_salary: 3000, currency: "kr." }) as RosterSettings}
          calendarUrl={`${PUBLIC_SITE_URL}/api/vaktir/${token}/calendar.ics`}
        />
        <DoctorBilling token={token} doctorName={doctor.name} />
      </div>
    </div>
  );
}
