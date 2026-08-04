// AI-translate a survey's Icelandic content into English (admin only).
// Fills title_en / description_en on the survey and labelEn/helperEn/optionsEn/
// minLabelEn/maxLabelEn on each question, then saves. Same AI convention as the
// site-content translate route (AI SDK + @ai-sdk/openai, gpt-5.4).

import { NextResponse } from "next/server";
import { generateText, Output } from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getCallerStaff, isAdmin } from "@/lib/admin-auth";
import type { SurveyQuestion } from "@/lib/survey-types";

export const runtime = "nodejs";
export const maxDuration = 300;

const MODEL = "gpt-5.4";

const outSchema = z.object({
  translations: z.array(z.object({ i: z.number(), text: z.string() })),
});

const SYSTEM = `You are a professional translator for Fjarlækningar, an Icelandic telemedicine company. You translate patient-survey copy from Icelandic ("is") into English ("en").

Rules:
- Translate naturally and concisely for a healthcare survey — clear, warm, trustworthy.
- Keep meaning and tone; keep numbers and units intact.
- Do NOT translate the brand name "Fjarlækningar".
- Use correct medical terminology in English.
- Return ONLY the translation for each numbered item, no notes.`;

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const caller = await getCallerStaff(req);
  if (!isAdmin(caller)) return NextResponse.json({ ok: false, error: "Admin role required" }, { status: 403 });
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ ok: false, error: "OPENAI_API_KEY er ekki uppsett" }, { status: 400 });
  }
  const { id } = await ctx.params;

  const { data: survey } = await supabaseAdmin
    .from("surveys")
    .select("id, title, description, questions")
    .eq("id", id)
    .maybeSingle();
  if (!survey) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });

  const questions = (survey.questions || []) as SurveyQuestion[];

  // Collect every Icelandic string to translate, tagged with a path key.
  const items: { key: string; text: string }[] = [];
  const add = (key: string, text: string | undefined) => {
    if (text && text.trim()) items.push({ key, text });
  };
  add("title", survey.title);
  add("description", survey.description);
  for (const q of questions) {
    add(`q:${q.id}:label`, q.label);
    add(`q:${q.id}:helper`, q.helper);
    add(`q:${q.id}:min`, q.minLabel);
    add(`q:${q.id}:max`, q.maxLabel);
    (q.options || []).forEach((o, i) => add(`q:${q.id}:opt:${i}`, o));
  }
  if (items.length === 0) {
    return NextResponse.json({ ok: false, error: "Ekkert efni til að þýða" }, { status: 400 });
  }

  const list = items.map((it, i) => `${i}. ${it.text}`).join("\n");

  let translations: { i: number; text: string }[];
  try {
    const result = await generateText({
      model: openai(MODEL),
      output: Output.object({ schema: outSchema }),
      system: SYSTEM,
      prompt: `Translate each item from Icelandic to English. Return an array with the same index i for each.\n\n${list}`,
      maxOutputTokens: 3000,
    });
    translations = result.experimental_output.translations;
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : "AI villa" }, { status: 500 });
  }

  const byIndex = new Map<number, string>();
  for (const t of translations) byIndex.set(t.i, t.text);
  const tr: Record<string, string> = {};
  items.forEach((it, i) => {
    const v = byIndex.get(i);
    if (typeof v === "string" && v.trim()) tr[it.key] = v.trim();
  });

  const update: Record<string, unknown> = {};
  if (tr["title"]) update.title_en = tr["title"];
  if (tr["description"]) update.description_en = tr["description"];

  const newQuestions = questions.map((q) => {
    const nq: SurveyQuestion = { ...q };
    if (tr[`q:${q.id}:label`]) nq.labelEn = tr[`q:${q.id}:label`];
    if (tr[`q:${q.id}:helper`]) nq.helperEn = tr[`q:${q.id}:helper`];
    if (tr[`q:${q.id}:min`]) nq.minLabelEn = tr[`q:${q.id}:min`];
    if (tr[`q:${q.id}:max`]) nq.maxLabelEn = tr[`q:${q.id}:max`];
    if (q.options && q.options.length) {
      nq.optionsEn = q.options.map((_, i) => tr[`q:${q.id}:opt:${i}`] ?? nq.optionsEn?.[i] ?? "");
    }
    return nq;
  });
  update.questions = newQuestions;

  const { data, error } = await supabaseAdmin.from("surveys").update(update).eq("id", id).select().single();
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, survey: data, translated: items.length });
}
