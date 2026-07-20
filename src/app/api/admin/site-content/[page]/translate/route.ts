// AI-translate a page's draft content between Icelandic and English, in place.
// Admin only. Reads the draft's `from` locale (falling back to the Icelandic
// defaults for the home page), translates each field into `to`, writes the
// results into draft[to], saves, and returns the updated draft.

import { NextResponse } from "next/server";
import { generateText, Output } from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getCallerStaff, isAdmin } from "@/lib/admin-auth";
import { getSitePage } from "@/lib/site-content/registry";
import type { SiteContentBlob } from "@/lib/site-content/types";

export const runtime = "nodejs";
export const maxDuration = 300;

// Direct OpenAI provider with OPENAI_API_KEY (same pattern + model as
// lifeline-website's AI routes; AI Gateway migration is deferred for this stack).
const MODEL = "gpt-5.4";

const outSchema = z.object({
  translations: z.array(z.object({ i: z.number(), text: z.string() })),
});

const SYSTEM = `You are a professional translator for Fjarlækningar ehf., an Icelandic telemedicine company. You translate marketing website copy between Icelandic ("is") and English ("en").

Rules:
- Translate naturally and concisely for a healthcare marketing website — clear, trustworthy, warm.
- Keep the meaning and tone; keep numbers, times (e.g. "10–22"), and units intact.
- Do NOT translate brand/product names: "Fjarlækningar", "Medalia", "HSU", "Heilbrigðisstofnun Suðurlands".
- Use correct medical terminology in the target language.
- Return ONLY the translation for each item, no notes.`;

export async function POST(req: Request, ctx: { params: Promise<{ page: string }> }) {
  const caller = await getCallerStaff(req);
  if (!isAdmin(caller)) {
    return NextResponse.json({ ok: false, error: "Admin role required" }, { status: 403 });
  }
  const { page } = await ctx.params;
  const sitePage = getSitePage(page);
  if (!sitePage) {
    return NextResponse.json({ ok: false, error: "Unsupported page" }, { status: 400 });
  }
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ ok: false, error: "OPENAI_API_KEY er ekki uppsett" }, { status: 400 });
  }

  let body: { from?: string; to?: string } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }
  const from = body.from === "en" ? "en" : "is";
  const to = body.to === "en" ? "en" : "is";
  if (from === to) return NextResponse.json({ ok: false, error: "from og to eru eins" }, { status: 400 });

  const { data: row } = await supabaseAdmin.from("site_content").select("draft").eq("page", page).maybeSingle();
  const draft = (row?.draft as SiteContentBlob) ?? {};
  const fromMap = draft[from] ?? {};

  // Build the list of fields to translate (non-empty source text).
  // Icon fields hold an icon KEY (e.g. "shield-check"), never prose — translating
  // one would break the icon lookup, so they're skipped.
  const items: { i: number; key: string; text: string }[] = [];
  sitePage.fields.forEach((f, i) => {
    if (f.type === "icon") return;
    const src = fromMap[f.key]?.trim() || (from === "is" ? sitePage.defaultsIs[f.key] : "");
    if (src && src.trim()) items.push({ i, key: f.key, text: src });
  });
  if (items.length === 0) {
    return NextResponse.json({ ok: false, error: "Ekkert efni til að þýða" }, { status: 400 });
  }

  let translated: Map<number, string>;
  try {
    const result = await generateText({
      model: openai(MODEL),
      output: Output.object({ schema: outSchema }),
      system: SYSTEM,
      prompt: `Translate each item's "text" from ${from} to ${to}. Return a translation for every item, keyed by the same "i".\n\n${JSON.stringify(
        items.map(({ i, text }) => ({ i, text })),
      )}`,
      maxOutputTokens: 8000,
    });
    const out = result.experimental_output as z.infer<typeof outSchema> | undefined;
    if (!out) return NextResponse.json({ ok: false, error: "Engin svör frá þýðingavél" }, { status: 502 });
    translated = new Map(out.translations.map((t) => [t.i, t.text]));
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : "translate_failed" }, { status: 500 });
  }

  const nextTo = { ...(draft[to] ?? {}) };
  for (const it of items) {
    const t = translated.get(it.i);
    if (t) nextTo[it.key] = t;
  }
  const nextDraft: SiteContentBlob = { ...draft, [to]: nextTo };

  const { error: saveErr } = await supabaseAdmin
    .from("site_content")
    .upsert(
      { page, draft: nextDraft, updated_at: new Date().toISOString(), updated_by: caller!.id },
      { onConflict: "page" },
    );
  if (saveErr) return NextResponse.json({ ok: false, error: saveErr.message }, { status: 500 });

  return NextResponse.json({ ok: true, draft: nextDraft, count: items.length });
}
