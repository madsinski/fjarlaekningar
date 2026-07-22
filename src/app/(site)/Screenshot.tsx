"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { ZoomIn } from "lucide-react";
import { ui } from "@/lib/site-content/ui-strings";
import type { Locale } from "@/lib/site-content/types";

// A framed screenshot with optional highlight boxes and click-to-enlarge.
//
// The frame is deliberately plain — a thin border, soft shadow, rounded corners
// — rather than a device mockup. A laptop bezel is decoration borrowed from a
// slide deck: it adds chrome, costs vertical space, and says nothing true about
// the content (one of these three images is a product photo, not a screen). A
// quiet frame does the one job that matters here: separating the screenshot
// from the white page so it reads as a picture of something rather than part of
// the layout.
//
// The 16/10 box is kept, because it is what makes three differently-shaped
// source images render at one uniform size. The images are padded to exactly
// 16/10 so highlight percentages map to the image itself, not to a letterboxed
// frame.
//
// Highlights are a cyan STROKE with no fill, so nothing is tinted over the UI
// being pointed at.

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

/** Full-size view in a portal. Click anywhere / Escape closes. */
function Lightbox({
  src,
  alt,
  boxes,
  closeHint,
  onClose,
}: {
  src: string;
  alt: string;
  boxes: Highlight[];
  closeHint: string;
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
      className="fixed inset-0 z-[10060] flex flex-col items-center justify-center gap-3 p-[2vmin] cursor-zoom-out"
      style={{ background: "rgba(8,20,26,.94)" }}
    >
      {/* The box is sized by ASPECT, bounded by both viewport axes, so it fills
          as much of the screen as 16/10 allows. Sizing the wrapper rather than
          the <img> keeps it shrink-wrapped to the image, which is what makes the
          highlight percentages land in the right place. */}
      <div
        className="relative aspect-[16/10] rounded-lg overflow-hidden ring-1 ring-white/15"
        style={{
          width: "min(96vw, calc(90vh * 1.6), 2000px)",
          boxShadow: "0 40px 90px -24px rgba(0,0,0,.85)",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={alt} className="block h-full w-full object-contain object-top" />
        <Boxes boxes={boxes} />
      </div>
      <p className="text-sm text-white/60">{closeHint}</p>
    </div>,
    document.body,
  );
}

export default function Screenshot({
  src,
  alt,
  highlights = "",
  locale = "is",
  className = "",
}: {
  src: string;
  alt: string;
  highlights?: string;
  locale?: Locale;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const boxes = parseHighlights(highlights);
  const t = ui(locale);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`${t.enlargeImage}: ${alt}`}
        className={`group relative block w-full aspect-[16/10] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm cursor-zoom-in transition-shadow hover:shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] ${className}`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={alt} className="block h-full w-full object-contain object-top" />
        <Boxes boxes={boxes} />

        {/* Always-visible affordance. Touch devices have no hover, so a
            hover-only cue would leave the zoom undiscoverable there. */}
        <span className="pointer-events-none absolute bottom-2 right-2 inline-flex items-center gap-1.5 rounded-full bg-slate-900/75 px-2.5 py-1 text-[11px] font-medium text-white backdrop-blur-sm transition-colors group-hover:bg-slate-900">
          <ZoomIn className="w-3.5 h-3.5" />
          {t.enlarge}
        </span>
      </button>

      {open && <Lightbox src={src} alt={alt} boxes={boxes} closeHint={t.clickToClose} onClose={() => setOpen(false)} />}
    </>
  );
}
