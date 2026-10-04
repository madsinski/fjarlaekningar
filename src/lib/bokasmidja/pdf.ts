// Bókasmiðjan — PDF export, built in the browser.
//
// Each book page is painted on a canvas (the SVG illustration plus the text in
// the book's own fonts) and placed in the PDF as one image. That keeps the
// export identical on every device and lets Icelandic, Norwegian and Hungarian
// letters render in the real typeface, which pdf-lib's built-in fonts cannot.
//
// Three formats:
//   read    — 3:4 pages for tablets and phones, small file
//   print   — A4 with margins, for a home printer
//   publish — 8 × 10 in trim with 0.125 in bleed at 300 dpi, for a print shop
//
// Client-only.

import { PDFDocument } from "pdf-lib";
import { ART_H, ART_W } from "./types";

export type PdfKind = "read" | "print" | "publish";

interface Spec { wPt: number; hPt: number; scale: number; bleedPt: number; marginPt: number; inset: boolean; quality: number }
const SPECS: Record<PdfKind, Spec> = {
  read: { wPt: 600, hPt: 800, scale: 2, bleedPt: 0, marginPt: 34, inset: false, quality: 0.82 },
  print: { wPt: 595.28, hPt: 841.89, scale: 200 / 72, bleedPt: 0, marginPt: 40, inset: true, quality: 0.9 },
  publish: { wPt: 594, hPt: 738, scale: 300 / 72, bleedPt: 9, marginPt: 36, inset: false, quality: 0.92 },
};

export interface PdfStory { title: string; credit: string; pages: { text: string; svg: string | null; textFirst?: boolean; noPicture?: boolean }[] }
export interface PdfInput {
  kind: PdfKind;
  /** Set for a collection: adds a book cover page before the stories. */
  cover: { title: string; subtitle: string; emoji: string } | null;
  color: string;
  stories: PdfStory[];
  fonts: { display: string; body: string };
  onProgress?: (done: number, total: number) => void;
}

const PAPER = "#fffdf7";
const INK = "#1f2937";

function loadSvg(svg: string): Promise<HTMLImageElement | null> {
  // An explicit size makes every browser rasterise the picture at full canvas resolution.
  const sized = svg.replace(/^<svg /, `<svg width="${ART_W * 2}" height="${ART_H * 2}" `);
  const url = URL.createObjectURL(new Blob([sized], { type: "image/svg+xml" }));
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); resolve(null); };
    img.src = url;
  });
}

function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const lines: string[] = [];
  for (const para of text.split(/\n+/)) {
    let line = "";
    for (const word of para.split(/\s+/).filter(Boolean)) {
      const next = line ? `${line} ${word}` : word;
      if (line && ctx.measureText(next).width > maxWidth) { lines.push(line); line = word; } else line = next;
    }
    if (line) lines.push(line);
  }
  return lines;
}

/** Draws centred text in a box, shrinking the type until it fits. */
function fitText(ctx: CanvasRenderingContext2D, text: string, font: (px: number) => string, box: { x: number; y: number; w: number; h: number }, startPx: number, minPx: number, lineHeight = 1.42) {
  let px = startPx;
  let lines: string[] = [];
  for (; px >= minPx; px -= Math.max(1, Math.round(startPx * 0.04))) {
    ctx.font = font(px);
    lines = wrap(ctx, text, box.w);
    if (lines.length * px * lineHeight <= box.h) break;
  }
  ctx.font = font(px);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const total = lines.length * px * lineHeight;
  let y = box.y + (box.h - total) / 2 + (px * lineHeight) / 2;
  for (const line of lines) { ctx.fillText(line, box.x + box.w / 2, y); y += px * lineHeight; }
}

function roundedClip(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export async function buildPdf(input: PdfInput): Promise<Uint8Array> {
  const spec = SPECS[input.kind];
  const W = Math.round(spec.wPt * spec.scale);
  const H = Math.round(spec.hPt * spec.scale);
  const bleed = spec.bleedPt * spec.scale;
  const safe = bleed + spec.marginPt * spec.scale;
  const display = (px: number) => `800 ${px}px ${input.fonts.display}, system-ui, sans-serif`;
  const body = (px: number) => `700 ${px}px ${input.fonts.body}, system-ui, sans-serif`;
  await Promise.all([document.fonts.load(display(40)), document.fonts.load(body(40))]).catch(() => {});

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas");
  const pdf = await PDFDocument.create();
  pdf.setTitle(input.cover?.title || input.stories[0]?.title || "");

  const total = (input.cover ? 1 : 0) + input.stories.reduce((n, s) => n + 1 + s.pages.length, 0);
  let done = 0;
  const flush = async () => {
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", spec.quality));
    if (!blob) throw new Error("jpeg");
    const jpg = await pdf.embedJpg(await blob.arrayBuffer());
    pdf.addPage([spec.wPt, spec.hPt]).drawImage(jpg, { x: 0, y: 0, width: spec.wPt, height: spec.hPt });
    input.onProgress?.(++done, total);
    // Let the browser paint the progress text between pages.
    await new Promise((r) => setTimeout(r, 0));
  };
  const colourPage = () => {
    const g = ctx.createLinearGradient(0, 0, W, H);
    g.addColorStop(0, input.color);
    g.addColorStop(1, "#0f172a");
    ctx.fillStyle = input.color;
    ctx.fillRect(0, 0, W, H);
    ctx.globalAlpha = 0.45;
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    ctx.globalAlpha = 1;
  };
  const picture = async (svg: string | null, x: number, y: number, w: number, radius: number) => {
    const h = (w * ART_H) / ART_W;
    ctx.save();
    roundedClip(ctx, x, y, w, h, radius);
    ctx.clip();
    ctx.fillStyle = "#e0f2fe";
    ctx.fillRect(x, y, w, h);
    const img = svg ? await loadSvg(svg) : null;
    if (img) ctx.drawImage(img, x, y, w, h);
    ctx.restore();
    return h;
  };

  if (input.cover) {
    colourPage();
    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = `${Math.round(H * 0.14)}px system-ui, sans-serif`;
    ctx.fillText(input.cover.emoji, W / 2, H * 0.24);
    fitText(ctx, input.cover.title, display, { x: safe, y: H * 0.34, w: W - 2 * safe, h: H * 0.3 }, H * 0.085, H * 0.04, 1.15);
    ctx.globalAlpha = 0.9;
    fitText(ctx, input.cover.subtitle, body, { x: safe, y: H * 0.66, w: W - 2 * safe, h: H * 0.12 }, H * 0.032, H * 0.02);
    ctx.globalAlpha = 1;
    await flush();
  }

  let pageNo = 0;
  for (const story of input.stories) {
    // Story title page: title, the first picture in a frame, and the credit.
    colourPage();
    ctx.fillStyle = "#ffffff";
    fitText(ctx, story.title, display, { x: safe, y: safe, w: W - 2 * safe, h: H * 0.24 }, H * 0.07, H * 0.035, 1.15);
    const frameW = W - 2 * safe;
    const frameY = safe + H * 0.27;
    const frameH = await picture(story.pages[0]?.svg ?? null, safe, frameY, frameW, frameW * 0.04);
    ctx.fillStyle = "#ffffff";
    ctx.globalAlpha = 0.92;
    fitText(ctx, story.credit, body, { x: safe, y: frameY + frameH, w: frameW, h: H - safe - (frameY + frameH) }, H * 0.03, H * 0.018);
    ctx.globalAlpha = 1;
    await flush();

    for (const page of story.pages) {
      pageNo++;
      ctx.fillStyle = PAPER;
      ctx.fillRect(0, 0, W, H);
      const numberPx = H * 0.016;
      const gap = spec.marginPt * spec.scale * 0.7;
      const artW = spec.inset ? W - 2 * safe : W;
      const artHeight = page.noPicture ? 0 : (artW * ART_H) / ART_W;
      const edge = spec.inset ? safe : 0;
      const bottom = H - safe - numberPx * 2; // the text never runs into the page number
      // The picture sits at the top, or at the bottom when the page is text-first.
      let box = { x: safe, y: safe, w: W - 2 * safe, h: bottom - safe };
      if (!page.noPicture && page.textFirst) {
        const artY = spec.inset ? bottom - artHeight : H - artHeight;
        await picture(page.svg, edge, artY, artW, spec.inset ? artW * 0.03 : 0);
        box = { ...box, h: artY - gap - safe };
      } else if (!page.noPicture) {
        await picture(page.svg, edge, edge, artW, spec.inset ? artW * 0.03 : 0);
        box = { ...box, y: edge + artHeight + gap, h: bottom - (edge + artHeight + gap) };
      }
      ctx.fillStyle = INK;
      fitText(ctx, page.text, body, box, H * 0.03, H * 0.014);
      // A full-bleed picture at the bottom covers the number's place; skip it there.
      if (page.textFirst && !page.noPicture && !spec.inset) { await flush(); continue; }
      ctx.fillStyle = "#94a3b8";
      ctx.font = body(numberPx);
      ctx.fillText(String(pageNo), W / 2, H - safe);
      await flush();
    }
  }
  return pdf.save();
}
