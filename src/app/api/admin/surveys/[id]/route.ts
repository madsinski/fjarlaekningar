// Read (survey + responses) / update / delete a survey (admin for writes).

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getCallerStaff, isAdmin } from "@/lib/admin-auth";
import type { SurveyQuestion } from "@/lib/survey-types";

export const runtime = "nodejs";

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const caller = await getCallerStaff(req);
  if (!caller) return NextResponse.json({ ok: false, error: "Not authenticated" }, { status: 401 });
  const { id } = await ctx.params;

  const { data: survey } = await supabaseAdmin.from("surveys").select("*").eq("id", id).maybeSingle();
  if (!survey) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  const { data: responses } = await supabaseAdmin
    .from("survey_responses")
    .select("id, answers, submitted_at")
    .eq("survey_id", id)
    .order("submitted_at", { ascending: false });

  return NextResponse.json({ ok: true, survey, responses: responses || [] });
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const caller = await getCallerStaff(req);
  if (!isAdmin(caller)) return NextResponse.json({ ok: false, error: "Admin role required" }, { status: 403 });
  const { id } = await ctx.params;

  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const update: Record<string, unknown> = {};
  if (typeof body.title === "string" && body.title.trim()) update.title = body.title.trim();
  if (typeof body.description === "string") update.description = body.description;
  if (Array.isArray(body.questions)) update.questions = body.questions as SurveyQuestion[];
  if (body.status === "published" || body.status === "draft") update.status = body.status;

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ ok: false, error: "Ekkert að uppfæra" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin.from("surveys").update(update).eq("id", id).select().single();
  if (error || !data) return NextResponse.json({ ok: false, error: error?.message || "Villa" }, { status: 500 });
  return NextResponse.json({ ok: true, survey: data });
}

export async function DELETE(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const caller = await getCallerStaff(req);
  if (!isAdmin(caller)) return NextResponse.json({ ok: false, error: "Admin role required" }, { status: 403 });
  const { id } = await ctx.params;
  const { error } = await supabaseAdmin.from("surveys").delete().eq("id", id);
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
