// Vaktaóskir læknisins, skráðar af honum sjálfum.
//
// Sömu reitir og stjórnandi sér í /admin/roster — ein tafla, ekki tvær sem
// geta orðið ósammála. Læknirinn skráir óskina, stjórnandinn sér hana.

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";

const PREF_FIELDS = "id, name, max_shifts_per_month, allowed_weekdays, preferred_run_length, shift_note";

/**
 * Returns the doctor, or an error worth showing.
 *
 * The two are told apart deliberately. A failed read — a migration not yet run,
 * say — used to come back as "no doctor found", which sends whoever is
 * debugging it to look at the token instead of at the database.
 */
async function doctorFor(token: string): Promise<{ doctor: DoctorPrefs | null; error: string | null }> {
  if (!token || token.length < 16) return { doctor: null, error: null };
  const { data, error } = await supabaseAdmin
    .from("roster_doctors")
    .select(PREF_FIELDS)
    .eq("access_token", token)
    .maybeSingle();
  if (error) return { doctor: null, error: error.message };
  return { doctor: (data as DoctorPrefs) ?? null, error: null };
}

type DoctorPrefs = {
  id: string; name: string;
  max_shifts_per_month: number | null;
  allowed_weekdays: number[] | null;
  preferred_run_length: number | null;
  shift_note: string;
};

async function absencesFor(doctorId: string) {
  const { data } = await supabaseAdmin
    .from("roster_doctor_absences")
    .select("id, starts_on, ends_on, note")
    .eq("doctor_id", doctorId)
    .order("starts_on");
  return data ?? [];
}

export async function GET(_req: Request, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params;
  const { doctor, error } = await doctorFor(token);
  if (error) return NextResponse.json({ ok: false, error }, { status: 500 });
  if (!doctor) return NextResponse.json({ ok: false, error: "Læknir fannst ekki" }, { status: 404 });
  return NextResponse.json({ ok: true, prefs: doctor, absences: await absencesFor(doctor.id) });
}

export async function PUT(req: Request, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params;
  const { doctor, error: readErr } = await doctorFor(token);
  if (readErr) return NextResponse.json({ ok: false, error: readErr }, { status: 500 });
  if (!doctor) return NextResponse.json({ ok: false, error: "Læknir fannst ekki" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const patch: Record<string, unknown> = {};

  if ("max_shifts_per_month" in body) {
    const n = Number(body.max_shifts_per_month);
    // Empty means "no ceiling", which is not the same as a ceiling of zero.
    patch.max_shifts_per_month =
      body.max_shifts_per_month == null || body.max_shifts_per_month === "" || !Number.isFinite(n)
        ? null
        : Math.max(0, Math.floor(n));
  }

  if ("preferred_run_length" in body) {
    const n = Number(body.preferred_run_length);
    patch.preferred_run_length =
      body.preferred_run_length == null || body.preferred_run_length === "" || !Number.isFinite(n)
        ? null
        // Clamped rather than rejected: the column has the same check, and a
        // slider that silently refuses to save is worse than one that stops.
        : Math.min(10, Math.max(1, Math.floor(n)));
  }

  if (Array.isArray(body.allowed_weekdays)) {
    const days: number[] = (body.allowed_weekdays as unknown[])
      .map(Number)
      .filter((d) => Number.isInteger(d) && d >= 0 && d <= 6);
    patch.allowed_weekdays = [...new Set(days)].sort((a, b) => a - b);
  }

  if (typeof body.shift_note === "string") patch.shift_note = body.shift_note.slice(0, 500);

  if (Object.keys(patch).length === 0) return NextResponse.json({ ok: true, prefs: doctor });
  patch.prefs_updated_at = new Date().toISOString();

  const { data, error } = await supabaseAdmin
    .from("roster_doctors")
    .update(patch)
    .eq("id", doctor.id)
    .select(PREF_FIELDS)
    .single();
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, prefs: data });
}
