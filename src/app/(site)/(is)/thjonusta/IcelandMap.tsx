"use client";

import { useState } from "react";
import { ICELAND_PATH, MAP_H, MAP_W, townPosition } from "@/lib/iceland-map";

// "Hvar er þjónustan virk?" as a picture: a flat, single-colour Iceland with a
// solid dot for every heilsugæsla open today and an outline dot for those that
// are coming. Driven by the same CMS list as the cards below it (live_locations),
// so the map can never disagree with the list. Names the map does not know are
// left off the map but still appear in the list.
//
// Emerald, like the rest of this section: it means "you can use this today".
//
// Hovering (or tabbing to) a dot pops its name and status up at once — the
// browser's own tooltip waits a second or more. The label is drawn after all
// dots, so no neighbouring dot can cover it (SVG has no z-index).

export type MapPoint = { name: string; active: boolean };

export default function IcelandMap({
  points,
  liveLabel,
  soonLabel,
}: {
  points: MapPoint[];
  liveLabel: string;
  soonLabel: string;
}) {
  const placed = points
    .map((p) => ({ ...p, pos: townPosition(p.name) }))
    .filter((p): p is MapPoint & { pos: { x: number; y: number; label: string } } => !!p.pos)
    // Open ones last, so they draw on top where dots overlap.
    .sort((a, b) => Number(a.active) - Number(b.active));
  const summary = `${liveLabel}: ${points.filter((p) => p.active).map((p) => p.name).join(", ") || "–"}. ${soonLabel}: ${points.filter((p) => !p.active).map((p) => p.name).join(", ") || "–"}.`;

  const [hover, setHover] = useState<string | null>(null);
  const tip = placed.find((p) => p.name === hover);
  const TIP_W = 240;

  return (
    <figure className="w-full max-w-xl justify-self-center lg:justify-self-end">
      <svg viewBox={`-8 -8 ${MAP_W + 16} ${MAP_H + 24}`} role="img" aria-label={summary} className="h-auto w-full overflow-visible">
        <path d={ICELAND_PATH} className="fill-slate-200 stroke-slate-300" strokeWidth={1} strokeLinejoin="round" />
        {placed.map((p) => {
          const on = hover === p.name;
          const show = () => setHover(p.name);
          const hide = () => setHover((h) => (h === p.name ? null : h));
          return (
            <g
              key={p.name}
              tabIndex={0}
              aria-label={`${p.name} — ${p.active ? liveLabel : soonLabel}`}
              onMouseEnter={show}
              onMouseLeave={hide}
              onFocus={show}
              onBlur={hide}
              className="cursor-default outline-none"
            >
              {/* A little bigger than the dot, but small enough that the
                  close-set towns (Selfoss, Hveragerði, Þorlákshöfn are ~13 px
                  apart) don't steal each other's hover. */}
              <circle cx={p.pos.x} cy={p.pos.y} r={9} fill="transparent" />
              {p.active ? (
                <>
                  <circle cx={p.pos.x} cy={p.pos.y} r={15} className="fill-emerald-500/20" />
                  <circle
                    cx={p.pos.x}
                    cy={p.pos.y}
                    r={7.5}
                    className={`fill-emerald-600 stroke-white origin-center transition-transform duration-150 [transform-box:fill-box] ${on ? "scale-125" : ""}`}
                    strokeWidth={2}
                  />
                  {/* Labels sit on the sea side (left), clear of neighbouring dots
                      along the coast; right-hand side only in the far west. */}
                  <text
                    x={p.pos.x < 120 ? p.pos.x + 16 : p.pos.x - 16}
                    y={p.pos.y + 5}
                    textAnchor={p.pos.x < 120 ? "start" : "end"}
                    className={`fill-slate-800 text-[15px] font-semibold transition-opacity ${on ? "opacity-0" : ""}`}
                    style={{ paintOrder: "stroke", stroke: "white", strokeWidth: 4, strokeLinejoin: "round" }}
                  >
                    {p.pos.label}
                  </text>
                </>
              ) : (
                <circle
                  cx={p.pos.x}
                  cy={p.pos.y}
                  r={6}
                  className={`stroke-emerald-600 origin-center transition-transform duration-150 [transform-box:fill-box] ${on ? "scale-150 fill-emerald-50" : "fill-white"}`}
                  strokeWidth={2.5}
                />
              )}
            </g>
          );
        })}
        {tip && (
          // Last, so it is on top of every dot. Kept inside the map's edges.
          <foreignObject
            key={tip.name}
            x={Math.min(Math.max(tip.pos.x - TIP_W / 2, -8), MAP_W + 8 - TIP_W)}
            y={tip.pos.y - 62}
            width={TIP_W}
            height={48}
            className="pointer-events-none overflow-visible"
          >
            <div className="flex h-full items-end justify-center">
              <div className="map-tip whitespace-nowrap rounded-xl bg-slate-900 px-3 py-1.5 text-center shadow-lg">
                <span className="block text-[15px] font-semibold leading-tight text-white">{tip.pos.label}</span>
                <span className={`block text-xs leading-tight ${tip.active ? "text-emerald-300" : "text-slate-300"}`}>
                  {tip.active ? liveLabel : soonLabel}
                </span>
              </div>
            </div>
          </foreignObject>
        )}
      </svg>
      <figcaption className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-slate-600">
        <span className="inline-flex items-center gap-2">
          <span aria-hidden className="h-3 w-3 rounded-full bg-emerald-600" />
          {liveLabel}
        </span>
        <span className="inline-flex items-center gap-2">
          <span aria-hidden className="h-3 w-3 rounded-full border-[2.5px] border-emerald-600 bg-white" />
          {soonLabel}
        </span>
      </figcaption>
    </figure>
  );
}
