"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { Slide } from "@/lib/presentations/types";
import { DECK_CSS } from "./deck-css";
import { DeckDefs, SlideView, brandClass, bgStyleClass } from "./SlideView";

function hasBg(s: Slide): boolean {
  return (s.type === "title" || s.type === "closing") && !!s.bg;
}

// PDF / print layout. Each slide is laid out as its own fixed 1280×720 page and
// rendered with the deck's `is-stage` mode (the single-slide preview variant,
// so every slide is visible at once rather than only the active one). The print
// stylesheet maps one page per physical sheet at 16:9 landscape and forces
// background graphics so gradients/photos survive "Save as PDF".
const PRINT_CSS = `
.ll-pdf{position:fixed;inset:0;z-index:10000;overflow:auto;background:#3b3f45;}
.ll-pdf-scroll{display:flex;flex-direction:column;align-items:center;gap:22px;padding:78px 22px 60px;}
.ll-pdf-page{width:1920px;height:1080px;position:relative;overflow:hidden;background:#000;
  box-shadow:0 14px 50px -10px rgba(0,0,0,.6);}
.ll-pdf-page .lldeck{width:100%;height:100%;}
.ll-pdf-bar{position:fixed;top:0;left:0;right:0;z-index:10001;display:flex;align-items:center;gap:12px;
  padding:12px 18px;background:rgba(20,22,26,.96);color:#e7eef0;
  font-family:var(--font-inter),Inter,system-ui,sans-serif;}
.ll-pdf-bar .grow{flex:1 1 auto;font-size:.82rem;color:#aeb6bb;}
.ll-pdf-bar button{border:0;border-radius:8px;padding:.5rem .95rem;font-size:.85rem;font-weight:600;cursor:pointer;}
.ll-pdf-bar .primary{background:#10B981;color:#04241b;}
.ll-pdf-bar .primary:hover{background:#0ea372;}
.ll-pdf-bar .ghost{background:rgba(255,255,255,.1);color:#e7eef0;}
.ll-pdf-bar .ghost:hover{background:rgba(255,255,255,.18);}
.ll-pdf-bar button:disabled{opacity:.5;cursor:default;}

@media print{
  /* Render the print stage at the full 1920x1080 16:9 page so the PDF matches
     the full-screen present view (not a smaller 1280x720). Dropping
     container-type:size to normal makes the deck's cqw/cqh units resolve
     against the 1920x1080 print page instead of the deck root, so the layout
     is byte-identical to present mode and no per-size px pins are needed.
     Print-only; screen and present mode are untouched. */
  /* Width pins the page + cq viewport fallback to 1920; height must stay auto
     so the document grows to ALL pages (a fixed body height clips the printed
     output to a single page). Each .ll-pdf-page sets its own 1080px height. */
  html,body{margin:0!important;padding:0!important;background:#fff!important;width:1920px!important;}
  /* The print surface is portalled to <body>; hide every other body child
     (admin chrome, app shell) so only the slides print. */
  body > *:not(.ll-pdf){display:none!important;}
  .ll-pdf{display:block!important;position:static!important;background:#fff;overflow:visible!important;width:1920px!important;height:auto!important;}
  .ll-pdf-bar{display:none!important;}
  .ll-pdf-scroll{display:block!important;padding:0!important;gap:0!important;overflow:visible!important;width:1920px!important;}
  .ll-pdf-page{box-shadow:none;margin:0;width:1920px!important;height:1080px!important;overflow:hidden!important;break-after:page;page-break-after:always;}
  .ll-pdf-page .lldeck,.ll-pdf-page .lldeck.is-stage{width:1920px!important;height:1080px!important;container-type:normal!important;}
  .ll-pdf-page:last-child{break-after:auto;page-break-after:auto;}
  .ll-pdf-page,.ll-pdf-page *{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important;}
  /* (Accent text → solid colour in print is handled globally in DECK_CSS so it
     applies on every print path, not just this export overlay.) */
  @page{size:1920px 1080px;margin:0;}
}
`;

function PrintStyle() {
  return <style dangerouslySetInnerHTML={{ __html: DECK_CSS + PRINT_CSS }} />;
}

/** Filename-safe deck title; keeps Icelandic letters, drops path-hostile ones. */
function fileSafe(title?: string): string {
  const t = (title || "").replace(/[\\/:*?"<>|]+/g, "-").replace(/\s+/g, " ").trim();
  return t || "kynning";
}

/** Wait until every image in the overlay has loaded and the deck has
 *  re-rendered around it. The laptop mock-up sizes its frame from the
 *  screenshot's own ratio once that image is decoded, so capturing earlier
 *  would freeze a slide in its pre-measurement 16:10 shape. */
async function settle(root: HTMLElement) {
  const imgs = Array.from(root.querySelectorAll("img"));
  await Promise.all(
    imgs.map((img) =>
      img.complete
        ? img.decode().catch(() => undefined)
        : new Promise<void>((resolve) => {
            img.addEventListener("load", () => resolve(), { once: true });
            img.addEventListener("error", () => resolve(), { once: true });
          }),
    ),
  );
  await document.fonts.ready;
  await new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())));
}

type PptxState =
  | { phase: "idle" }
  | { phase: "working"; cur: number; total: number }
  | { phase: "error"; msg: string };

/**
 * Full-screen print/PDF view. Renders every slide as a page and exposes
 * "Save as PDF" (browser print dialog) and "Save as PowerPoint". Pass the
 * slides already resolved for the desired language.
 *
 * The PowerPoint is built in the browser from these same 1920×1080 pages: each
 * slide becomes one full-bleed image, with its presenter note in the speaker
 * notes. Images rather than native text boxes on purpose — the deck's type,
 * gradients, SVG diagrams and mock-ups have no faithful PowerPoint equivalent,
 * and a venue PC without Archivo or IBM Plex installed would substitute fonts
 * and reflow every slide. This way the file looks exactly like the deck on any
 * machine, offline. The trade-off is that slide text is not editable.
 */
export function DeckPrint({ slides, design, title, autoPptx, onClose }: {
  slides: Slide[]; design?: string; title?: string; autoPptx?: boolean; onClose: () => void;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const running = useRef(false);
  const [pptx, setPptx] = useState<PptxState>({ phase: "idle" });
  const busy = pptx.phase === "working";

  const exportPptx = useCallback(async () => {
    const root = rootRef.current;
    if (!root || running.current) return;
    running.current = true;
    try {
      const pages = Array.from(root.querySelectorAll<HTMLElement>(".ll-pdf-page"));
      // Loaded on demand, so neither library weighs on the deck for viewers
      // who never export.
      const [{ domToJpeg }, { default: PptxGenJS }] = await Promise.all([
        import("modern-screenshot"),
        import("pptxgenjs"),
      ]);
      setPptx({ phase: "working", cur: 0, total: pages.length });
      await settle(root);

      // Every wordmark is a <use href="#…"> into one hidden <svg> of symbols at
      // the top of this overlay. A capture is a standalone image, so those
      // references would resolve to nothing and the logos would vanish — each
      // cloned page therefore carries its own copy of the symbol sheet.
      const symbols = root.querySelector("symbol#ll-wordmark")?.closest("svg") ?? null;

      const deck = new PptxGenJS();
      deck.layout = "LAYOUT_WIDE"; // 13.333 × 7.5 in, i.e. 16:9
      deck.title = title || "Kynning";

      for (let n = 0; n < pages.length; n++) {
        setPptx({ phase: "working", cur: n + 1, total: pages.length });
        const jpeg = await domToJpeg(pages[n], {
          width: 1920,
          height: 1080,
          scale: 1,
          quality: 0.95,
          backgroundColor: "#000000",
          onCloneNode: (cloned) => {
            if (symbols && cloned instanceof Element) cloned.prepend(symbols.cloneNode(true));
          },
        });
        const slide = deck.addSlide();
        // pptxgenjs takes base64 image data without the "data:" scheme.
        slide.addImage({ data: jpeg.replace(/^data:/, ""), x: 0, y: 0, w: 13.333, h: 7.5 });
        const notes = slides[n]?.notes;
        if (notes) slide.addNotes(notes);
      }

      await deck.writeFile({ fileName: `${fileSafe(title)}.pptx`, compression: true });
      setPptx({ phase: "idle" });
    } catch (err) {
      setPptx({ phase: "error", msg: err instanceof Error ? err.message : String(err) });
    } finally {
      running.current = false;
    }
  }, [slides, title]);

  // Opened from the deck's "PPTX" button: start straight away.
  useEffect(() => {
    if (autoPptx) void exportPptx();
  }, [autoPptx, exportPptx]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      else if ((e.key === "p" || e.key === "P") && (e.metaKey || e.ctrlKey)) { e.preventDefault(); window.print(); }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (typeof document === "undefined") return null;

  const status =
    pptx.phase === "working"
      ? `Building PowerPoint… slide ${pptx.cur} of ${pptx.total}. Keep this window open.`
      : pptx.phase === "error"
        ? `PowerPoint export failed: ${pptx.msg}`
        : `PDF: in the print dialog set Margins → None and enable Background graphics. PowerPoint: one image per slide, presenter notes included. ${slides.length} slides.`;

  return createPortal(
    <div className="ll-pdf" ref={rootRef}>
      <PrintStyle />
      {/* One shared symbol sheet for every page (ids are global). */}
      <DeckDefs />
      <div className="ll-pdf-bar">
        <strong style={{ fontSize: ".9rem" }}>Export</strong>
        <span className="grow" role="status" aria-live="polite">{status}</span>
        <button className="primary" disabled={busy} onClick={() => window.print()}>Save as PDF</button>
        <button className="primary" disabled={busy} onClick={() => void exportPptx()}>
          {busy ? "Building…" : "Save as PowerPoint"}
        </button>
        <button className="ghost" onClick={onClose}>Close</button>
      </div>
      <div className="ll-pdf-scroll">
        {slides.map((s) => (
          <div key={s.id} className="ll-pdf-page">
            <div className="lldeck is-stage" data-design={design || "lifeline"}>
              <section className={`slide ${s.theme}${brandClass(s.brand)}${hasBg(s) ? " has-bg" : ""}${bgStyleClass(s)} active`}>
                <SlideView slide={s} />
              </section>
            </div>
          </div>
        ))}
      </div>
    </div>,
    document.body,
  );
}
