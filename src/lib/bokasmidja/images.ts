// Bókasmiðjan — painted pictures from an image model.
//
// Stories made in the app get their pictures here: the characters are painted
// once on a character sheet, and every page is then painted with that sheet as
// a reference image, which keeps the hero the same from page to page. Pages
// are independent of each other, so the app paints several at once and a whole
// story is illustrated in a minute or two.
//
// (The hand-made stories and the older in-app illustrator use layered SVG
// instead; see agents.ts. BOKASMIDJA_ART=svg switches the app back to that.)
//
// Server-only. Needs OPENAI_API_KEY.

import { supabaseAdmin } from "@/lib/supabase-admin";
import { AgentError } from "./agents";
import { ART_H, ART_W } from "./types";

const MODEL = "gpt-image-2";
const SIZE = "1536x1024";
const BUCKET = "bokasmidja";

export type ArtMode = "image" | "svg";
/** How the app illustrates new stories. */
export const artMode = (): ArtMode => (process.env.BOKASMIDJA_ART !== "svg" && process.env.OPENAI_API_KEY ? "image" : "svg");

const STYLE = `Style: a warm, painterly modern picture-book illustration with soft light and rich colour. Characters have big expressive eyes and clear, funny expressions. One clear moment, with the main character large in the picture. The whole frame is a painted scene. No text, letters, numbers, speech bubbles, borders or signatures anywhere. Keep faces and the main action away from the left and right edges. Suitable for young children: nothing frightening, gross or rude; funny moments are joyful cartoon exaggeration.`;

export interface ArtNotes { characters?: { name: string; look: string }[]; setting?: string; palette?: string }
const cast = (art: ArtNotes) => (art.characters || []).map((c) => `${c.name}: ${c.look}`).join("\n") || "Invent the characters from the scene.";

interface Ref { bytes: Buffer; type: "image/jpeg" | "image/png" }

/** One picture from the image model, as JPEG bytes. Reference images, when given, guide the characters. */
async function paint(prompt: string, refs: Ref[] = []): Promise<Buffer> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new AgentError("failed");
  const common = { model: MODEL, prompt, size: SIZE, quality: "medium", output_format: "jpeg", output_compression: "85" };
  type Reply = { data?: { b64_json?: string }[]; error?: { code?: string; message?: string } } | null;
  // The account has a per-minute limit on images; when it is reached the request
  // waits as long as the service asks and tries again, so a page queues instead of failing.
  for (let attempt = 0; ; attempt++) {
    let res: Response;
    try {
      if (refs.length) {
        const form = new FormData();
        for (const [k, v] of Object.entries(common)) form.append(k, v);
        refs.forEach((r, i) => form.append("image[]", new Blob([new Uint8Array(r.bytes)], { type: r.type }), `ref${i}.${r.type === "image/png" ? "png" : "jpg"}`));
        res = await fetch("https://api.openai.com/v1/images/edits", { method: "POST", headers: { Authorization: `Bearer ${key}` }, body: form, signal: AbortSignal.timeout(240_000) });
      } else {
        res = await fetch("https://api.openai.com/v1/images/generations", {
          method: "POST",
          headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
          body: JSON.stringify({ ...common, output_compression: 85 }),
          signal: AbortSignal.timeout(240_000),
        });
      }
    } catch (e) {
      console.error("[bokasmidja] image request failed", e instanceof Error ? e.message : e);
      throw new AgentError("failed");
    }
    const data = (await res.json().catch(() => null)) as Reply;
    const b64 = data?.data?.[0]?.b64_json;
    if (res.ok && b64) return Buffer.from(b64, "base64");
    if (res.status === 429 && attempt < 7) {
      const asked = Number(/try again in (\d+(?:\.\d+)?)s/.exec(data?.error?.message || "")?.[1]);
      await new Promise((r) => setTimeout(r, (Number.isFinite(asked) ? asked : 12) * 1000 + 1500 + Math.random() * 3000));
      continue;
    }
    console.error("[bokasmidja] image model error", res.status, data?.error?.code, data?.error?.message?.slice(0, 200));
    throw new AgentError(data?.error?.code === "moderation_blocked" ? "refused" : "failed");
  }
}

async function store(path: string, bytes: Buffer): Promise<string> {
  const { error } = await supabaseAdmin.storage.from(BUCKET).upload(path, bytes, { contentType: "image/jpeg", upsert: true });
  if (error) { console.error("[bokasmidja] image upload failed", error.message); throw new AgentError("failed"); }
  return path;
}

async function load(path: string | null | undefined): Promise<Ref | null> {
  if (!path) return null;
  const { data } = await supabaseAdmin.storage.from(BUCKET).download(path);
  return data ? { bytes: Buffer.from(await data.arrayBuffer()), type: path.endsWith(".png") ? "image/png" : "image/jpeg" } : null;
}

const stamp = () => Date.now().toString(36);

/** Paints the story's characters side by side. Returns the stored path. */
export async function paintSheet(input: { storyId: string; art: ArtNotes; title: string; summary: string }): Promise<string> {
  const bytes = await paint(`A character sheet for the children's picture book "${input.title}". ${input.summary}

Show every character standing side by side on a plain, pale background, full body, facing the viewer, each clearly separate, with a friendly expression. This sheet is the design every page of the book will be painted from.

The characters:
${cast(input.art)}

${STYLE}`);
  return store(`art/${input.storyId}/sheet-${stamp()}.jpg`, bytes);
}

export interface PagePaintInput {
  storyId: string;
  pageId: string;
  art: ArtNotes;
  title: string;
  scene: string;
  pageText: string;
  /** Stored path of the character sheet, if the story has one. */
  sheetPath?: string | null;
  /** The child's own drawing for this page, to be repainted as the illustration. */
  drawing?: { bytes: Buffer; type: "image/jpeg" | "image/png" } | null;
}

/** Paints one page. Returns the stored path. */
export async function paintPage(input: PagePaintInput): Promise<string> {
  const sheet = await load(input.sheetPath);
  const refs: Ref[] = [...(sheet ? [sheet] : []), ...(input.drawing ? [input.drawing] : [])];
  const which = sheet && input.drawing ? "The first reference image is the book's character sheet; the second is a child's own drawing for this page."
    : sheet ? "The reference image is the book's character sheet."
    : input.drawing ? "The reference image is a child's own drawing for this page." : "";
  const prompt = `One page of the children's picture book "${input.title}".

${input.drawing
    ? `Repaint the child's drawing as a finished book illustration, the way an illustrator works from a child's sketch: keep what the child drew — the same things, in the same places, with their colours and their funny details — and make it polished. Do not replace their idea, and do not copy any writing from the drawing.${input.scene ? `\n\nWhat happens on this page, for context: ${input.scene}` : ""}`
    : `What the picture shows: ${input.scene || input.pageText}`}

${which}${sheet ? " Paint the characters exactly as they are designed on the character sheet: the same shapes, proportions, colours, clothes and details. Only their pose and expression change." : ""}

The characters:
${cast(input.art)}

The world: ${input.art.setting || "as the scene suggests"}

${STYLE}`;
  const bytes = await paint(prompt, refs);
  return store(`art/${input.storyId}/${input.pageId}-${stamp()}.jpg`, bytes);
}

/** Paints a book cover from what the book contains. Returns the stored path. */
export async function paintCover(input: { bookId: string; title: string; about: string; art: ArtNotes; sheetPath?: string | null; drawing?: PagePaintInput["drawing"] }): Promise<string> {
  const sheet = await load(input.sheetPath);
  const refs: Ref[] = [...(sheet ? [sheet] : []), ...(input.drawing ? [input.drawing] : [])];
  const prompt = `The front cover picture for the children's book "${input.title || "a book of stories"}".

${input.drawing ? "Repaint the child's drawing as a finished cover illustration: keep what the child drew and make it polished." : "One bold, inviting image that makes a child want to open the book: the main hero (or heroes) large and full of character, in the world of the stories. A simple, iconic composition."}

${input.about}

${sheet ? "A reference image shows the book's characters; paint them exactly as designed there." : ""}
${input.art.characters?.length ? `The characters:\n${cast(input.art)}` : ""}

${STYLE} The title is printed separately, so the picture itself has no lettering.`;
  const bytes = await paint(prompt, refs);
  return store(`covers/${input.bookId}-${stamp()}.jpg`, bytes);
}

/** Removes stored pictures (after a repaint or a delete). */
export async function removePictures(paths: (string | null | undefined)[]) {
  const real = paths.filter((p): p is string => !!p);
  if (real.length) await supabaseAdmin.storage.from(BUCKET).remove(real);
}

/**
 * A painted picture, wrapped as SVG markup so that every screen can treat it
 * exactly like a drawn one. The <image> points at the page's own image route;
 * `v` changes whenever the picture does, so browsers fetch the new one.
 */
export function pictureSvg(pageId: string, imagePath: string): string {
  const v = encodeURIComponent(imagePath.slice(-14));
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${ART_W} ${ART_H}"><g class="bk-photo"><image href="/api/bokasmidja/pages/${pageId}/image?v=${v}" width="${ART_W}" height="${ART_H}" preserveAspectRatio="xMidYMid slice"/></g></svg>`;
}
