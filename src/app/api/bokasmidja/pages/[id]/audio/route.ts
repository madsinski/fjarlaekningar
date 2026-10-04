// Upplestur einnar síðu sem mp3. Búinn til einu sinni (OpenAI TTS), geymdur í
// lokaðri geymslu og lyklaður á tætigildi textans, svo leiðréttur texti fær
// nýjan upplestur. Vanti lykilinn eða bregðist þjónustan svarar leiðin 503 og
// lesarinn notar þá talgervil vafrans.
//   GET /api/bokasmidja/pages/:id/audio?lang=is&length=2&voice=storyteller
//     length: útgáfa sögunnar (sjálfgefið 1); voice: sögumaður (storyteller, hero, gentle)

import { createHash } from "node:crypto";
import { openai } from "@ai-sdk/openai";
import { experimental_generateSpeech as generateSpeech } from "ai";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { throttle } from "@/lib/bokasmidja/auth";
import { AUDIO_BUCKET, UUID_RE, fail, requireViewer, viewerId } from "@/lib/bokasmidja/server";
import { LANG_ENGLISH, isLang, isNarrator, type Narrator } from "@/lib/bokasmidja/types";

export const runtime = "nodejs";
export const maxDuration = 120;

const MODEL = "gpt-4o-mini-tts";

// Sögumenn: rödd og leikstjórn. Líkanið fylgir fyrirmælum um flutning, svo
// munurinn á þeim er fyrst og fremst í því hvernig lesið er.
const NARRATOR: Record<Narrator, { voice: string; direction: string }> = {
  storyteller: {
    voice: "fable",
    direction: "You are a master storyteller performing a picture book for children of five to seven, and you mean every word. Tell it with drama and conviction: vary your pace and volume, lean into the suspense before something happens, and let the big moments be BIG. Words written in capitals are shouted or boomed with relish; sound effects are performed, not read. Give each character their own distinct voice and attitude. The narrator's dry asides are delivered deadpan, with a raised eyebrow. When the story winds down at the end, slow right down to a warm, hushed, sleepy voice.",
  },
  hero: {
    voice: "ash",
    direction: "You are an energetic, larger-than-life narrator reading an adventure to children of five to seven, like the voice of an action film made for kids. Bold, punchy and full of conviction, with real excitement in the chases and blasts, a grin in the funny parts, and gasps at the cliffhangers. Words written in capitals are shouted with gusto; sound effects are acted out. Characters get strong, funny voices. For the last, sleepy lines, drop to a calm, satisfied, quiet voice.",
  },
  gentle: {
    voice: "coral",
    direction: "You are reading a bedtime picture book aloud to a child. Warm, unhurried and expressive: give the characters a little life, pause at the full stops, and never rush.",
  },
};

const mp3 = (bytes: Uint8Array | ArrayBuffer) =>
  new Response(Buffer.from(bytes as ArrayBuffer), {
    headers: { "Content-Type": "audio/mpeg", "Cache-Control": "private, max-age=86400" },
  });

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireViewer(req);
  if ("res" in auth) return auth.res;
  const { id } = await ctx.params;
  const lang = new URL(req.url).searchParams.get("lang");
  if (!UUID_RE.test(id) || !isLang(lang)) return fail("bad_request");

  // Texti útgáfunnar, eða næstu styttri útgáfu ef síðan á ekki sinn eigin þar.
  const wanted = Number(new URL(req.url).searchParams.get("length"));
  const length = wanted === 2 || wanted === 3 ? wanted : 1;
  const { data: rows } = await supabaseAdmin.from("bk_page_texts")
    .select("text, length").eq("page_id", id).eq("lang", lang).lte("length", length).order("length", { ascending: false }).limit(1);
  const row = rows?.[0];
  if (!row?.text) return fail("not_found", 404);
  const asked = new URL(req.url).searchParams.get("voice");
  const who: Narrator = isNarrator(asked) ? asked : "storyteller";
  const narrator = NARRATOR[who];
  const hash = createHash("sha256").update(`${MODEL}:${narrator.voice}:${narrator.direction.length}:${row.text}`).digest("hex").slice(0, 24);

  const { data: have } = await supabaseAdmin.from("bk_audio").select("text_hash, storage_path").eq("page_id", id).eq("lang", lang).eq("length", row.length).eq("voice", who).maybeSingle();
  if (have?.text_hash === hash) {
    const { data: file } = await supabaseAdmin.storage.from(AUDIO_BUCKET).download(have.storage_path);
    if (file) return mp3(await file.arrayBuffer());
  }

  if (!process.env.OPENAI_API_KEY) return fail("not_configured", 503);
  if (!(await throttle(`audio:${viewerId(auth.viewer) ?? "parent"}`, 300, 86400))) return fail("daily_limit", 429);

  try {
    const { audio } = await generateSpeech({
      model: openai.speech(MODEL),
      text: row.text,
      voice: narrator.voice,
      outputFormat: "mp3",
      instructions: `${narrator.direction} Read in ${LANG_ENGLISH[lang]}, with native ${LANG_ENGLISH[lang]} pronunciation.`,
    });
    const path = `audio/${id}/${lang}-${row.length}-${who}-${hash}.mp3`;
    const { error } = await supabaseAdmin.storage.from(AUDIO_BUCKET)
      .upload(path, Buffer.from(audio.uint8Array), { contentType: "audio/mpeg", upsert: true });
    if (!error) {
      if (have && have.storage_path !== path) await supabaseAdmin.storage.from(AUDIO_BUCKET).remove([have.storage_path]);
      await supabaseAdmin.from("bk_audio").upsert({ page_id: id, lang, length: row.length, voice: who, text_hash: hash, storage_path: path, created_at: new Date().toISOString() });
    }
    return mp3(audio.uint8Array);
  } catch (e) {
    console.error("[bokasmidja] speech failed", e);
    return fail("audio_failed", 503);
  }
}
