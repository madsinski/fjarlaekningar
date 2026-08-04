// AI summary + recommendations for a survey's responses.
//   GET  — any active staff: return the cached summary (or null).
//   POST — admin only: re-aggregate responses, ask the model, cache + return.
// Follows the repo's AI convention (Vercel AI SDK + @ai-sdk/openai, gpt-5.4);
// the AI Gateway migration is deferred for this stack.

import { NextResponse } from "next/server";
import { generateText, Output } from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getCallerStaff, isAdmin } from "@/lib/admin-auth";
import { aggregateSurvey, type SurveyQuestion } from "@/lib/survey-types";

export const runtime = "nodejs";
export const maxDuration = 300;

const MODEL = "gpt-5.4";

const insightSchema = z.object({
  summary_md: z.string(),
  themes: z.array(z.object({ title: z.string(), description: z.string() })),
  praise: z.array(z.object({ title: z.string(), description: z.string() })),
  concerns: z.array(
    z.object({ title: z.string(), description: z.string(), severity: z.enum(["low", "medium", "high"]) }),
  ),
  action_items: z.array(
    z.object({ title: z.string(), description: z.string(), priority: z.enum(["low", "medium", "high"]) }),
  ),
});

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const caller = await getCallerStaff(req);
  if (!caller) return NextResponse.json({ ok: false, error: "Not authenticated" }, { status: 401 });
  const { id } = await ctx.params;
  const { data } = await supabaseAdmin
    .from("survey_ai_summaries")
    .select("*")
    .eq("survey_id", id)
    .maybeSingle();
  return NextResponse.json({ ok: true, summary: data ?? null });
}

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const caller = await getCallerStaff(req);
  if (!isAdmin(caller)) return NextResponse.json({ ok: false, error: "Admin role required" }, { status: 403 });
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ ok: false, error: "OPENAI_API_KEY er ekki uppsett" }, { status: 400 });
  }
  const { id } = await ctx.params;

  const { data: survey } = await supabaseAdmin
    .from("surveys")
    .select("id, title, questions")
    .eq("id", id)
    .maybeSingle();
  if (!survey) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });

  const { data: responses } = await supabaseAdmin
    .from("survey_responses")
    .select("answers")
    .eq("survey_id", id);
  const rows = (responses ?? []) as { answers: Record<string, unknown> }[];
  if (rows.length === 0) {
    return NextResponse.json({ ok: false, error: "Engin svör til að greina" }, { status: 400 });
  }

  const questions = (survey.questions || []) as SurveyQuestion[];
  const { total, perQuestion } = aggregateSurvey(questions, rows);

  // Build a compact markdown data block for the model.
  const blocks: string[] = [`Heildarfjöldi svara: ${total}`];
  for (const s of perQuestion) {
    const q = s.question;
    const lines = [`## ${q.label} [${q.type}] — svör: ${s.answered}`];
    if (q.type === "scale" || q.type === "nps") {
      if (s.mean != null) lines.push(`Meðaltal: ${s.mean.toFixed(2)} af ${s.scaleMax}`);
      lines.push(`Dreifing: ${s.distribution.map((d) => `${d.value}=${d.count}`).join(", ")}`);
      if (s.nps) lines.push(`NPS: ${s.nps.score} (meðmælendur ${s.nps.promoters}, hlutlausir ${s.nps.passives}, letjendur ${s.nps.detractors})`);
    } else if (q.type === "text" || q.type === "textarea") {
      const quotes = s.texts.slice(0, 50).map((t) => `- "${t.slice(0, 600)}"`);
      lines.push(quotes.length ? `Frítextasvör (${s.texts.length}):\n${quotes.join("\n")}` : "Engin frítextasvör.");
    } else {
      lines.push(`Dreifing: ${s.distribution.map((d) => `${d.label}=${d.count}`).join(", ")}`);
    }
    blocks.push(lines.join("\n"));
  }
  const dataBlock = blocks.join("\n\n");

  const systemPrompt = `Þú ert reyndur sérfræðingur í þjónustuupplifun hjá Fjarlækningum, íslenskri fjarlækningaþjónustu. Þú greinir þjónustukannanir sjúklinga og skilar hnitmiðuðum, hagnýtum niðurstöðum fyrir stjórnendur og læknateymi.

Tónn: faglegur, beinskeyttur, án uppfyllingar. Svaraðu á íslensku.

Reglur:
- Byggðu allar fullyrðingar á gögnunum; vísaðu í tölur eða þróun þegar það á við.
- Ekki búa til tilvitnanir. Ef þú vísar í tilvitnun verður hún að koma úr gögnunum.
- Alvarleiki (severity) og forgangur (priority) verða að endurspegla gögnin (high = margir verða fyrir áhrifum EÐA öryggis-/klínískt áhyggjuefni).
- summary_md á að vera ~80–150 orð og segja teyminu hvað gögnin sýna í raun, í íslensku markdown.
- Gefðu 3–6 þemu, 0–5 hrós, 0–6 áhyggjuefni og 3–8 aðgerðir.`;

  const userPrompt = `Könnun: "${survey.title}"
Heildarfjöldi svara: ${total}

Samanteknar niðurstöður að neðan. Frítextasvör eru beinar tilvitnanir frá sjúklingum.

---
${dataBlock}
---`;

  let parsed: z.infer<typeof insightSchema>;
  try {
    const result = await generateText({
      model: openai(MODEL),
      output: Output.object({ schema: insightSchema }),
      system: systemPrompt,
      prompt: userPrompt,
      maxOutputTokens: 2500,
    });
    parsed = result.experimental_output;
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "AI villa" },
      { status: 500 },
    );
  }

  const callerName = (caller as { name?: string | null }).name ?? null;
  const row = {
    survey_id: id,
    summary_md: parsed.summary_md,
    themes_jsonb: parsed.themes,
    praise_jsonb: parsed.praise,
    concerns_jsonb: parsed.concerns,
    action_items_jsonb: parsed.action_items,
    responses_count: total,
    model: MODEL,
    generated_by: caller!.id,
    generated_by_name: callerName,
    generated_at: new Date().toISOString(),
  };
  const { data, error } = await supabaseAdmin
    .from("survey_ai_summaries")
    .upsert(row, { onConflict: "survey_id" })
    .select()
    .single();
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, summary: data });
}
