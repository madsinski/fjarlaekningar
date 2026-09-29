// Public survey submission (no auth). Validates required answers against the
// published survey's questions, then records a response via the service role.

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { validateAnswers, type SurveyQuestion } from "@/lib/survey-types";
import { HSU_STATIONS } from "@/lib/station-onboarding";

/** "vestmannaeyjar", "Höfn í Hornafirði" and "hofn-i-hornafirdi" all name the
 *  same station — links are typed by hand into Medalia templates. */
const fold = (s: string) =>
  s.toLowerCase().replace(/ð/g, "d").replace(/þ/g, "th").replace(/æ/g, "ae").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "");
const STATION_BY_KEY = new Map(HSU_STATIONS.map((s) => [fold(s), s]));

export const runtime = "nodejs";

export async function POST(req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;

  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }
  const answers = (body.answers && typeof body.answers === "object" ? body.answers : {}) as Record<string, unknown>;

  const { data: survey } = await supabaseAdmin
    .from("surveys")
    .select("id, questions, status")
    .eq("slug", slug)
    .maybeSingle();

  if (!survey || survey.status !== "published") {
    return NextResponse.json({ ok: false, error: "Könnun fannst ekki" }, { status: 404 });
  }

  const questions = (survey.questions || []) as SurveyQuestion[];
  const validationError = validateAnswers(questions, answers);
  if (validationError) {
    return NextResponse.json({ ok: false, error: validationError }, { status: 400 });
  }

  // Keep only answers that correspond to real question ids; cap sizes.
  const allowed = new Set(questions.map((q) => q.id));
  const clean: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(answers)) {
    if (!allowed.has(k)) continue;
    if (typeof v === "string") clean[k] = v.slice(0, 5000);
    else if (Array.isArray(v)) clean[k] = v.slice(0, 40).map((x) => String(x).slice(0, 200));
    else clean[k] = v;
  }

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null;
  // Only a known station is stored; anything else is dropped rather than
  // trusted, since the value comes from a URL.
  const station = typeof body.station === "string" ? STATION_BY_KEY.get(fold(body.station)) ?? null : null;
  const { error } = await supabaseAdmin.from("survey_responses").insert({
    survey_id: survey.id,
    answers: clean,
    ip,
    station,
  });
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
