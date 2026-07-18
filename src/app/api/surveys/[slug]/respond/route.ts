// Public survey submission (no auth). Validates required answers against the
// published survey's questions, then records a response via the service role.

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { validateAnswers, type SurveyQuestion } from "@/lib/survey-types";

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

  // Keep only answers that correspond to real question ids.
  const allowed = new Set(questions.map((q) => q.id));
  const clean: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(answers)) {
    if (allowed.has(k)) clean[k] = typeof v === "string" ? v.slice(0, 5000) : v;
  }

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null;
  const { error } = await supabaseAdmin.from("survey_responses").insert({
    survey_id: survey.id,
    answers: clean,
    ip,
  });
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
