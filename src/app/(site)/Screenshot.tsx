// A screenshot with optional highlight boxes drawn over it.
//
// Highlights are stored as CMS text — "x,y,w,h" in PERCENT of the image, with
// several separated by ";" — because percentages survive the image being
// re-exported at a different resolution, which absolute pixels would not.
//
// Everything is absolutely positioned inside an aspect-preserving wrapper, so
// the boxes track the image as it scales down on narrow screens.

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
  const boxes = parseHighlights(highlights);
  return (
    <div className={`relative overflow-hidden rounded-xl border border-slate-200 bg-white ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={alt} className="block w-full h-auto" />
      {boxes.map((b, i) => (
        <span
          key={i}
          aria-hidden
          className="absolute rounded-md ring-2 ring-[var(--primary)] bg-[var(--primary)]/10"
          style={{
            left: `${b.x}%`,
            top: `${b.y}%`,
            width: `${b.w}%`,
            height: `${b.h}%`,
          }}
        />
      ))}
    </div>
  );
}
