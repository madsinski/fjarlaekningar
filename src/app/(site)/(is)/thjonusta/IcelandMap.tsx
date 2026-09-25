import { ICELAND_PATH, MAP_H, MAP_W, townPosition } from "@/lib/iceland-map";

// "Hvar er þjónustan virk?" as a picture: a flat, single-colour Iceland with a
// solid dot for every heilsugæsla open today and an outline dot for those that
// are coming. Driven by the same CMS list as the cards below it (live_locations),
// so the map can never disagree with the list. Names the map does not know are
// left off the map but still appear in the list.
//
// Emerald, like the rest of this section: it means "you can use this today".

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

  return (
    <figure className="w-full max-w-xl justify-self-center lg:justify-self-end">
      <svg viewBox={`-8 -8 ${MAP_W + 16} ${MAP_H + 24}`} role="img" aria-label={summary} className="h-auto w-full">
        <path d={ICELAND_PATH} className="fill-slate-200 stroke-slate-300" strokeWidth={1} strokeLinejoin="round" />
        {placed.map((p) =>
          p.active ? (
            <g key={p.name}>
              <title>{`${p.name} — ${liveLabel}`}</title>
              <circle cx={p.pos.x} cy={p.pos.y} r={15} className="fill-emerald-500/20" />
              <circle cx={p.pos.x} cy={p.pos.y} r={7.5} className="fill-emerald-600 stroke-white" strokeWidth={2} />
              {/* Labels sit on the sea side (left), clear of neighbouring dots
                  along the coast; right-hand side only in the far west. */}
              <text
                x={p.pos.x < 120 ? p.pos.x + 16 : p.pos.x - 16}
                y={p.pos.y + 5}
                textAnchor={p.pos.x < 120 ? "start" : "end"}
                className="fill-slate-800 text-[15px] font-semibold"
                style={{ paintOrder: "stroke", stroke: "white", strokeWidth: 4, strokeLinejoin: "round" }}
              >
                {p.pos.label}
              </text>
            </g>
          ) : (
            <g key={p.name}>
              <title>{`${p.name} — ${soonLabel}`}</title>
              <circle cx={p.pos.x} cy={p.pos.y} r={6} className="fill-white stroke-emerald-600" strokeWidth={2.5} />
            </g>
          ),
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
