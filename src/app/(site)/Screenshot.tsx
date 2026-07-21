"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { ZoomIn } from "lucide-react";

// A screenshot with optional highlight boxes, click-to-enlarge.
//
// Highlights are stored as CMS text — "x,y,w,h" in PERCENT of the image, with
// several separated by ";" — the same shape the Lifeline presentation module
// uses, so rectangles authored there port over as literal values. Percentages
// also survive the image being re-exported at another resolution, which
// absolute pixels would not.
//
// The zoom affordance is deliberately always visible, not hover-only: a
// hover-reveal tells a touch user nothing, and a screenshot that happens to be
// clickable is a screenshot nobody clicks.

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
          className="absolute rounded-md ring-2 ring-[var(--primary)] bg-[var(--primary)]/10"
          style={{ left: `${b.x}%`, top: `${b.y}%`, width: `${b.w}%`, height: `${b.h}%` }}
        />
      ))}
    </>
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
      <div className="relative max-h-[86vh] max-w-[min(94vw,1100px)]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={alt}
          className="block max-h-[86vh] w-auto rounded-xl object-contain"
          style={{ boxShadow: "0 40px 90px -24px rgba(0,0,0,.85)" }}
        />
        <Boxes boxes={boxes} />
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
  className = "",
}: {
  src: string;
  alt: string;
  highlights?: string;
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
        className={`group relative block w-full overflow-hidden rounded-xl border border-slate-200 bg-white cursor-zoom-in transition-shadow hover:shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] ${className}`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={alt} className="block w-full h-auto" />
        <Boxes boxes={boxes} />

        {/* Always-visible affordance. Touch devices have no hover, so a
            hover-only cue would leave the zoom undiscoverable there. */}
        <span className="pointer-events-none absolute bottom-2 right-2 inline-flex items-center gap-1.5 rounded-full bg-slate-900/75 px-2.5 py-1 text-[11px] font-medium text-white backdrop-blur-sm transition-colors group-hover:bg-slate-900">
          <ZoomIn className="w-3.5 h-3.5" />
          Stækka
        </span>
      </button>

      {open && <Lightbox src={src} alt={alt} boxes={boxes} onClose={() => setOpen(false)} />}
    </>
  );
}
