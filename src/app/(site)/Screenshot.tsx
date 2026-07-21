"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { ZoomIn } from "lucide-react";

// A screenshot in a laptop mockup, with optional highlight boxes and
// click-to-enlarge — the same presentation the Lifeline deck these came from
// uses, so a slide and this page show the same thing.
//
// Two details carried over from that deck deliberately:
//   * the screen is 16/10 and the image is object-contain, which is also what
//     makes three steps with three differently-shaped source images render at
//     one uniform size.
//   * highlights are a cyan STROKE with no fill, so nothing is tinted over the
//     UI being pointed at.
//
// Highlight rects are CMS text, "x,y,w,h" in PERCENT, ";"-separated — the same
// format the deck stores, so values port across as literals. The source images
// are padded to exactly 16/10 so those percentages map to the image itself
// rather than to a letterboxed frame.

export type Highlight = { x: number; y: number; w: number; h: number };

/** Parse "12,40,55,12; 12,60,55,10" into highlight boxes. Malformed entries are
 *  dropped rather than throwing — a typo in the CMS should cost you a box, not
 *  the page. */
export function parseHighlights(v?: string): Highlight[] {
  return (v ?? "")
    .split(";")
    .map((part) => part.split(",").map((n) => Number(n.trim())))
    .filter((n) => n.length === 4 && n.every((v) => Number.isFinite(v)))
    .map(([x, y, w, h]) => ({ x, y, w, h }));
}

function Boxes({ boxes }: { boxes: Highlight[] }) {
  return (
    <>
      {boxes.map((b, i) => (
        <span
          key={i}
          aria-hidden
          className="absolute rounded-md border-2 border-[var(--primary)]"
          style={{
            left: `${b.x}%`,
            top: `${b.y}%`,
            width: `${b.w}%`,
            height: `${b.h}%`,
            boxShadow: "0 0 18px rgba(0,168,204,.35)",
          }}
        />
      ))}
    </>
  );
}

/** The screen itself: 16/10, dark bezel, image contained and top-aligned. */
function Screen({
  src,
  alt,
  boxes,
  rounded = "rounded-t-xl",
}: {
  src: string;
  alt: string;
  boxes: Highlight[];
  rounded?: string;
}) {
  return (
    <div className={`relative aspect-[16/10] overflow-hidden border-[6px] border-b-0 border-[#16181c] bg-[#f4f4f5] ${rounded}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={alt} className="block h-full w-full object-contain object-top" />
      <Boxes boxes={boxes} />
    </div>
  );
}

/** Full-size view in a portal. Click anywhere / Escape closes. */
function Lightbox({
  src,
  alt,
  boxes,
  onClose,
}: {
  src: string;
  alt: string;
  boxes: Highlight[];
  onClose: () => void;
}) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={alt}
      onClick={onClose}
      className="fixed inset-0 z-[10060] grid place-items-center gap-4 p-[4vmin] cursor-zoom-out"
      style={{ background: "rgba(8,20,26,.93)" }}
    >
      <div className="w-full max-w-[min(94vw,1100px)]" onClick={(e) => e.stopPropagation()}>
        <div className="relative">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt={alt}
            className="block w-full rounded-lg"
            style={{ boxShadow: "0 40px 90px -24px rgba(0,0,0,.85)" }}
          />
          <Boxes boxes={boxes} />
        </div>
      </div>
      <p className="text-sm text-white/70">Smelltu hvar sem er til að loka</p>
    </div>,
    document.body,
  );
}

export default function Screenshot({
  src,
  alt,
  highlights = "",
  variant = "laptop",
  className = "",
}: {
  src: string;
  alt: string;
  highlights?: string;
  /** "laptop" frames it as a screen; "plain" is for images that are not a
   *  screen (a product photo in a laptop bezel would be a lie). Both are 16/10
   *  and end up the same height. */
  variant?: "laptop" | "plain";
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const boxes = parseHighlights(highlights);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`Stækka mynd: ${alt}`}
        className={`group relative block w-full cursor-zoom-in focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] rounded-xl ${className}`}
      >
        {variant === "laptop" ? (
          <>
            <Screen src={src} alt={alt} boxes={boxes} />
            {/* Base bar, tapered wider than the screen like a real lid hinge. */}
            <div className="-mx-[7%] h-3 rounded-b-md bg-gradient-to-b from-[#cfd3d9] to-[#9aa0a8] shadow-[0_14px_22px_-14px_rgba(0,0,0,.45)] relative">
              <span
                aria-hidden
                className="absolute left-1/2 top-0 h-1.5 w-[14%] -translate-x-1/2 rounded-b-lg bg-black/15"
              />
            </div>
          </>
        ) : (
          <>
            <div className="relative aspect-[16/10] overflow-hidden rounded-xl border border-slate-200 bg-white">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt={alt} className="block h-full w-full object-contain" />
              <Boxes boxes={boxes} />
            </div>
            {/* Matches the laptop base so all three steps end up the same
                height, without pretending this is a screen. */}
            <div aria-hidden className="h-3" />
          </>
        )}

        {/* Always-visible affordance. Touch devices have no hover, so a
            hover-only cue would leave the zoom undiscoverable there. */}
        <span className="pointer-events-none absolute bottom-5 right-2 inline-flex items-center gap-1.5 rounded-full bg-slate-900/75 px-2.5 py-1 text-[11px] font-medium text-white backdrop-blur-sm transition-colors group-hover:bg-slate-900">
          <ZoomIn className="w-3.5 h-3.5" />
          Stækka
        </span>
      </button>

      {open && <Lightbox src={src} alt={alt} boxes={boxes} onClose={() => setOpen(false)} />}
    </>
  );
}
