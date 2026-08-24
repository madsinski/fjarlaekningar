// The Fjarlækningar print documents for the HSU pilot. Each is a single A4
// portrait page (`.a4`) rendered from a Doc (see content.ts). The collateral is
// a dynamic list, so a document is duplicatable/deletable in the studio. Shared
// brand styling lives in collateral-css.ts; logos live in /public.

import qrcode from "qrcode-generator";
import {
  Clock, Pill, Undo2, Lock, FileText, Stethoscope, ShieldCheck,
  Send, CheckCircle2, Bell, MessageSquare, House,
  PersonStanding, HeartPulse, Droplet, Gauge, ClipboardCheck, Smartphone,
  ClipboardList, Leaf, CalendarClock,
  type LucideIcon,
} from "lucide-react";

// Curated lucide set for the referral "what happens next" markers.
const AFTER_ICONS: Record<string, LucideIcon> = {
  clock: Clock, pill: Pill, undo: Undo2, lock: Lock, doc: FileText,
  stethoscope: Stethoscope, shield: ShieldCheck, send: Send,
  check: CheckCircle2, bell: Bell, message: MessageSquare, home: House,
};
export const AFTER_ICON_KEYS = Object.keys(AFTER_ICONS);

// Lucide set for the Lifeline health-check benefits.
const BENEFIT_ICONS: Record<string, LucideIcon> = {
  body: PersonStanding, heart: HeartPulse, drop: Droplet, gauge: Gauge,
  report: ClipboardCheck, app: Smartphone, stethoscope: Stethoscope,
  shield: ShieldCheck, check: CheckCircle2, clock: Clock,
  list: ClipboardList, leaf: Leaf, calendar: CalendarClock,
};
export const BENEFIT_ICON_KEYS = Object.keys(BENEFIT_ICONS);
import { frameGeometry, FRIDGE_CARD } from "./content";
import type {
  Doc,
  FridgeFields,
  PosterFields,
  ReferralFields,
  AdvertFields,
  LifelineFields,
} from "./content";

function ico(icon: string) {
  // Icons matching the live patient portal: 256px tiles, artwork fitted to a
  // 208px box, on a TRANSPARENT ground. They used to carry a white background,
  // which drew a white square wherever an icon sat on a tint — visible on the
  // fridge back, where the erindi cards use --wash. Whites inside the artwork
  // (the sclera of the eye, highlights on the stethoscope) are preserved; only
  // the background connected to the edge was cleared.
  return `/fjarlaekningar-icons/portal/${icon}.png`;
}

// Isomorphic QR (browser-safe, no Buffer): renders the matrix as an SVG path so
// it regenerates live from an editable URL on both server and client.
function QrSvg({ value, size = "26mm" }: { value: string; size?: string }) {
  const qr = qrcode(0, "M");
  qr.addData(value || " ");
  qr.make();
  const n = qr.getModuleCount();
  let d = "";
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (qr.isDark(r, c)) d += `M${c} ${r}h1v1h-1z`;
    }
  }
  return (
    <svg viewBox={`0 0 ${n} ${n}`} shapeRendering="crispEdges" aria-hidden
      style={{ width: size, height: size, display: "block" }}>
      <rect width={n} height={n} fill="#ffffff" />
      <path d={d} fill="#0b1220" />
    </svg>
  );
}

// Render a free-form heading: line breaks split lines; ==double equals== wraps
// blue-coloured words. Everything else stays the hero default (white).
function renderHeading(text: string, accent = "#5fe0ff") {
  return text.split("\n").map((line, li) => (
    <span key={li}>
      {li > 0 && <br />}
      {line.split(/==(.+?)==/g).map((part, i) =>
        i % 2 === 1
          ? <span key={i} style={{ color: accent }}>{part}</span>
          : <span key={i}>{part}</span>,
      )}
    </span>
  ));
}

function FjarLogo({ onDark = false, height }: { onDark?: boolean; height?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      className="fjar-logo"
      src={onDark ? "/fjarlaekningar-logo-white.svg" : "/fjarlaekningar-logo.svg"}
      alt="Fjarlækningar"
      style={height ? { height } : undefined}
    />
  );
}

// A white outline that follows the logo's actual (flower) silhouette rather than
// a rectangular box: layered zero-blur drop-shadows around 8 directions trace the
// transparent PNG/WebP edges. Requires the logo to have a transparent background.
const HSU_OUTLINE = (() => {
  const w = "0.55mm";
  const n = `-${w}`;
  return [
    [w, "0"], [n, "0"], ["0", w], ["0", n],
    [w, w], [n, w], [w, n], [n, n],
  ]
    .map(([x, y]) => `drop-shadow(${x} ${y} 0 #ffffff)`)
    .join(" ");
})();

// HSU co-brand lockup — "Í samstarfi við HSU" + their logo. The print-friendly
// adaptation of the website's HSU cooperation section.
function HsuCobrand({ label = "Í samstarfi við HSU", height = "11mm", onDark = false, lines = "2", stroke = true }: { label?: string; height?: string; onDark?: boolean; lines?: "1" | "2" | "3"; stroke?: boolean }) {
  // How the label wraps: 1 line (no wrap), or a FIXED width that yields ~2 or ~3
  // lines for the full institution name. A fixed width (not max-width) is what
  // makes text-align:right actually right-align every line — otherwise the label
  // shrinks to its longest line and the shorter lines read as centred.
  const wrap: React.CSSProperties =
    lines === "1"
      ? { whiteSpace: "nowrap" }
      : { width: lines === "3" ? "32mm" : "58mm", flexShrink: 0 };
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "3mm" }}>
      <span style={{ display: "block", fontSize: "9px", fontWeight: 800, letterSpacing: ".06em", textTransform: "uppercase", color: onDark ? "#eafaff" : "var(--muted)", textAlign: "right", lineHeight: 1.3, ...wrap }}>{label}</span>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/hsu-logo.webp"
        alt="Heilbrigðisstofnun Suðurlands"
        style={{ height, width: "auto", display: "block", ...(onDark && stroke ? { filter: HSU_OUTLINE } : {}) }}
      />
    </div>
  );
}

// ── 0. Fridge card ───────────────────────────────────────────────────────
//
// A6 take-home card, printed both sides: the offer + QR on the front, the list
// of erindi on the back. Sized so a phone camera can read the QR from the
// distance you stand at a fridge door.
//
// A face is normally its own page (`.a4` at A6 size). When imposed 4-up on an
// A4 sheet it must NOT be a page: `.a4` inside `.a4` would give every card its
// own page break in print. In that mode it becomes a plain cell filling the
// grid slot instead — see FridgeImposition.
function FridgeCardSheet({ children, imposed }: { children: React.ReactNode; imposed?: boolean }) {
  if (imposed) {
    return (
      <div className="a6cell" style={{ width: "100%", height: "100%" }}>
        {children}
      </div>
    );
  }
  return (
    <div
      className="a4"
      style={{
        width: `${FRIDGE_CARD.w}mm`,
        height: `${FRIDGE_CARD.h}mm`,
        ["--sheet-h" as string]: `${FRIDGE_CARD.h}mm`,
      }}
    >
      {children}
    </div>
  );
}

/**
 * Front of the card, in one of four layouts — see FridgeLayout in content.ts.
 *
 * The constraint that shapes all of them: this is a magnet on a fridge door,
 * read at two metres by someone who was not looking for it. Whatever is biggest
 * has to be the thing that gets a phone pointed at it, and on every layout but
 * "classic" that is the QR code itself.
 */
/**
 * The scan face: logo, one very large QR, the address. Nothing else.
 *
 * This is the whole bet behind the "minimal" and "scan" layouts, and it is the
 * back of the "list" layout too. The card is a magnet read from two metres by
 * someone who was not looking for it, so the only thing that earns size is the
 * code that gets a phone pointed at it.
 */
/**
 * The scan face: the wordmark, the instruction, one very large QR, the address.
 *
 * Used by "minimal" and "scan", and as the back of "list". Everything on it is
 * sized for a fridge door read at two metres, which is also why there is no
 * co-branding here — the HSU lockup is legible at arm's length at best, and at
 * this distance it only competed with the code for attention. It still appears
 * on the Klassískt front, where the card is read close up.
 *
 * The instruction sits ABOVE the code: you want it read before the camera comes
 * up, not after.
 */
function QrFace({ f, onDark, imposed }: { f: FridgeFields; onDark: boolean; imposed?: boolean }) {
  return (
    <FridgeCardSheet imposed={imposed}>
      <div
        className={onDark ? "hero" : undefined}
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "7mm",
          padding: "10mm 7mm 10mm",
          background: onDark ? undefined : "#fff",
        }}
      >
        <FjarLogo onDark={onDark} height="21mm" />

        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "5mm" }}>
          <div
            className="eyebrow"
            style={{
              fontSize: "13px",
              letterSpacing: ".1em",
              textAlign: "center",
              color: onDark ? "var(--cyan)" : undefined,
            }}
          >
            {f.qrLabel}
          </div>

          <div
            style={{
              background: "#fff",
              border: onDark ? "none" : "1px solid var(--line)",
              borderRadius: "3mm",
              padding: onDark ? "3.5mm" : "3mm",
              boxShadow: onDark ? "0 6mm 14mm -8mm rgba(0,0,0,.5)" : "none",
            }}
          >
            <QrSvg value={f.portalUrl} size="60mm" />
          </div>
        </div>

        <div
          style={{
            fontSize: "30px",
            fontWeight: 800,
            color: onDark ? "#fff" : "var(--ink)",
            lineHeight: 1.05,
            letterSpacing: "-.01em",
            textAlign: "center",
          }}
        >
          {f.url}
        </div>
      </div>
    </FridgeCardSheet>
  );
}

/**
 * The erindi, as the whole face. `hero` is the "list" FRONT (a header above a
 * tighter list); everything else is the back, where the layout is chosen per
 * card — see FridgeBackLayout.
 */
function ServicesFace({ f, hero, imposed }: { f: FridgeFields; hero: boolean; imposed?: boolean }) {
  const back = f.backLayout ?? "cards";
  const cols = !hero && back === "grid" ? 3 : !hero && back === "cards" ? 2 : 1;

  return (
    <FridgeCardSheet imposed={imposed}>
      {hero ? (
        <div className="hero" style={{ padding: "8mm 8mm 6mm" }}>
          <FjarLogo onDark />
          <h1 style={{ fontSize: "15px", marginTop: "4mm", lineHeight: 1.15 }}>
            {renderHeading(f.servicesTitle)}
          </h1>
        </div>
      ) : (
        <div style={{ padding: "10mm 8mm 6mm" }}>
          <h2 style={{ fontSize: "15px", lineHeight: 1.2 }}>{f.servicesTitle}</h2>
        </div>
      )}

      {cols > 1 ? (
        // Cards fill the width the single column left empty, and the icon sits
        // above the label so a long erindi name gets the whole card to wrap in.
        <div
          style={{
            padding: "0 8mm",
            display: "grid",
            gridTemplateColumns: `repeat(${cols}, 1fr)`,
            gap: cols === 3 ? "2.5mm" : "3mm",
          }}
        >
          {f.services.map((s, i) => (
            <div
              key={`${s.icon}-${i}`}
              style={{
                display: "flex",
                flexDirection: cols === 3 ? "column" : "row",
                alignItems: "center",
                gap: cols === 3 ? "1.5mm" : "2.5mm",
                textAlign: cols === 3 ? "center" : "left",
                border: "1px solid var(--line)",
                borderRadius: "2.5mm",
                background: "var(--wash)",
                padding: cols === 3 ? "2.5mm 1.5mm" : "2.5mm 2.5mm",
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={ico(s.icon)}
                alt=""
                style={{ width: "8mm", height: "8mm", flexShrink: 0 }}
              />
              <span
                style={{
                  fontSize: cols === 3 ? "8.5px" : "9.5px",
                  fontWeight: 700,
                  color: "var(--ink)",
                  lineHeight: 1.15,
                }}
              >
                {s.label}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <div
          style={{
            padding: hero ? "5mm 8mm 0" : "0 8mm",
            display: "flex",
            flexDirection: "column",
            gap: hero ? "2.4mm" : "2.1mm",
          }}
        >
          {f.services.map((s, i) => (
            <div key={`${s.icon}-${i}`} style={{ display: "flex", alignItems: "center", gap: hero ? "2.5mm" : "4mm" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={ico(s.icon)}
                alt=""
                style={{ width: hero ? "5.5mm" : "9mm", height: hero ? "5.5mm" : "9mm", flexShrink: 0 }}
              />
              <span
                style={{
                  fontSize: hero ? "10px" : "12px",
                  fontWeight: 700,
                  color: "var(--ink)",
                  lineHeight: 1.2,
                }}
              >
                {s.label}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* The one thing on this side that must not be skimmed past. It was a
          grey footnote beside the web address; the address is on the other side
          in 30px, so this gets the space instead. */}
      <div style={{ marginTop: "auto", padding: "5mm 8mm 8mm" }}>
        <div
          style={{
            display: "flex",
            gap: "3mm",
            alignItems: "flex-start",
            border: "1px solid #E9C46A",
            background: "#FDF6E3",
            borderRadius: "2.5mm",
            padding: "3.5mm",
          }}
        >
          <span aria-hidden style={{ fontSize: "13px", lineHeight: 1.1, color: "#B4801A" }}>⚠</span>
          <p style={{ fontSize: "10.5px", fontWeight: 600, color: "#6B4E16", lineHeight: 1.35, margin: 0 }}>
            {f.backNote}
          </p>
        </div>
      </div>
    </FridgeCardSheet>
  );
}

/** The original card: slogan and lead paragraph above a smaller QR. */
function ClassicFace({ f, imposed }: { f: FridgeFields; imposed?: boolean }) {
  return (
    <FridgeCardSheet imposed={imposed}>
      <div className="hero" style={{ padding: "9mm 8mm 8mm" }}>
        <FjarLogo onDark />
        <h1 style={{ fontSize: "18px", marginTop: "6mm", lineHeight: 1.15 }}>{renderHeading(f.slogan)}</h1>
        <p style={{ marginTop: "3mm", fontSize: "11px", lineHeight: 1.45, color: "#cdeefb" }}>{f.lead}</p>
      </div>

      <div style={{ marginTop: "auto", padding: "7mm 8mm 0", display: "flex", alignItems: "center", gap: "5mm" }}>
        <div style={{ border: "1px solid var(--line)", borderRadius: "2mm", padding: "1.5mm", background: "#fff", flexShrink: 0 }}>
          <QrSvg value={f.portalUrl} size="27mm" />
        </div>
        <div style={{ minWidth: 0 }}>
          <div className="eyebrow" style={{ fontSize: "10px", letterSpacing: ".1em", marginBottom: "2mm" }}>{f.qrLabel}</div>
          <div className="grad-text" style={{ fontSize: "17px", fontWeight: 800, color: "var(--ink)", lineHeight: 1.1 }}>{f.url}</div>
          <p style={{ fontSize: "10.5px", color: "var(--muted)", marginTop: "2mm", lineHeight: 1.35 }}>{f.footerNote}</p>
        </div>
      </div>

      <div style={{ marginTop: "auto", padding: "0 8mm 8mm" }}>
        <div style={{ borderTop: "1px solid var(--line)", paddingTop: "5mm" }}>
          <HsuCobrand label={f.badge} lines="3" height="9mm" />
        </div>
      </div>
    </FridgeCardSheet>
  );
}

/**
 * Front and back, per layout — see FridgeLayout in content.ts.
 *
 * "list" is the one that reorders rather than restyles: it spends its front on
 * the erindi and its back on the scan face, so the card reads "here is what we
 * treat" / "here is how you reach us" instead of saying the same thing twice.
 */
function fridgeFaces(f: FridgeFields, imposed?: boolean): [React.ReactNode, React.ReactNode] {
  const layout = f.layout ?? "classic";
  if (layout === "minimal" || layout === "scan") {
    return [
      <QrFace key="f" f={f} onDark={layout === "scan"} imposed={imposed} />,
      <ServicesFace key="b" f={f} hero={false} imposed={imposed} />,
    ];
  }
  if (layout === "list") {
    return [
      <ServicesFace key="f" f={f} hero imposed={imposed} />,
      <QrFace key="b" f={f} onDark={false} imposed={imposed} />,
    ];
  }
  return [
    <ClassicFace key="f" f={f} imposed={imposed} />,
    <ServicesFace key="b" f={f} hero={false} imposed={imposed} />,
  ];
}

function FridgeCard({ f }: { f: FridgeFields }) {
  const [front, back] = fridgeFaces(f);
  return (
    <>
      {front}
      {back}
    </>
  );
}

// ── Fridge card, imposed 4-up on A4 for double-sided printing ───────────────
//
// Four cards on an A4 sheet, each with its own crop marks — the form a print
// shop expects, where every mark sits OUTSIDE the trim box and is thrown away
// with the waste. That is what sets the geometry: butting the cards together
// would leave nowhere to put a mark except on the neighbouring card, so the
// trim boxes need a gutter between them and a margin to the paper edge, and the
// cards give up the space.
//
// So they are no longer true A6. The face is still DESIGNED at 105×148 and
// scaled down as a whole (transform, not a smaller box) — the layout uses px
// type against mm padding, so resizing the box would reflow the card while
// scaling it just makes the same card smaller.
//
// The block stays centred, which keeps the sheet FLIP-INVARIANT: margins and
// gutters are equal on opposite sides, so whichever way the printer turns the
// paper for the second side — long edge or short — every trim box lands back on
// a trim box. Front and back register either way, leaving only the printer's
// own duplex tolerance, which no layout can fix.
const A4 = { w: 210, h: 297 };

const IMPOSE = {
  cols: 2,
  rows: 2,
  /**
   * Paper edge → trim box. Sized for the sheet's real destination: an office
   * laser printer, which cannot print to the edge at all. 14mm leaves the
   * outermost mark 8mm in, clearing even the ~6.35mm rim of the worst offenders
   * — and since no bleed is possible on that hardware, nothing on the sheet
   * wants to reach the edge anyway.
   */
  margin: 14,
  /** Between two trim boxes. Holds the two marks that face each other. */
  gutter: 12,
  /** Trim edge → start of a mark, so no mark ever touches the card. */
  markOffset: 2,
  markLen: 4,
  hair: 0.25,
};

/**
 * Where the four trim boxes sit and how far the design is scaled to fit them.
 * Derived rather than hard-coded, so changing a margin re-fits the cards.
 */
function impositionLayout() {
  const { cols, rows, margin, gutter } = IMPOSE;
  const availW = A4.w - 2 * margin - (cols - 1) * gutter;
  const availH = A4.h - 2 * margin - (rows - 1) * gutter;
  // One scale for both axes: the card keeps its A6 proportions.
  const scale = Math.min(availW / (cols * FRIDGE_CARD.w), availH / (rows * FRIDGE_CARD.h));
  const w = FRIDGE_CARD.w * scale;
  const h = FRIDGE_CARD.h * scale;
  const x0 = (A4.w - (cols * w + (cols - 1) * gutter)) / 2;
  const y0 = (A4.h - (rows * h + (rows - 1) * gutter)) / 2;
  const cards: { x: number; y: number }[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) cards.push({ x: x0 + c * (w + gutter), y: y0 + r * (h + gutter) });
  }
  return { scale, w, h, cards };
}

export const FRIDGE_TRIM = (() => {
  const { w, h, scale } = impositionLayout();
  return { w: Math.round(w * 10) / 10, h: Math.round(h * 10) / 10, scale };
})();

/**
 * Standard corner crop marks for one trim box: at each corner, one mark on the
 * vertical trim line and one on the horizontal, both running AWAY from the card
 * so the cut removes them. Never an L touching the corner — that would mark the
 * card itself.
 */
function CornerMarks({ x, y, w, h }: { x: number; y: number; w: number; h: number }) {
  const { markOffset: o, markLen: L, hair } = IMPOSE;
  const base: React.CSSProperties = { position: "absolute", background: "#111" };
  const marks: React.CSSProperties[] = [];

  for (const [cx, isLeft] of [[x, true], [x + w, false]] as const) {
    for (const [cy, isTop] of [[y, true], [y + h, false]] as const) {
      // On the vertical trim line, extending up from the top edge / down from
      // the bottom.
      marks.push({
        left: `${cx - hair / 2}mm`,
        top: `${isTop ? cy - o - L : cy + o}mm`,
        width: `${hair}mm`,
        height: `${L}mm`,
      });
      // On the horizontal trim line, extending left / right.
      marks.push({
        top: `${cy - hair / 2}mm`,
        left: `${isLeft ? cx - o - L : cx + o}mm`,
        height: `${hair}mm`,
        width: `${L}mm`,
      });
    }
  }
  return (
    <>
      {marks.map((m, i) => (
        <div key={i} style={{ ...base, ...m }} />
      ))}
    </>
  );
}

/** One A4 sheet carrying four copies of a single face, each with its own marks. */
function ImposedSheet({ face }: { face: React.ReactNode }) {
  const { w, h, scale, cards } = impositionLayout();
  return (
    <div
      className="a4 imposed"
      style={{
        width: `${A4.w}mm`,
        height: `${A4.h}mm`,
        ["--sheet-h" as string]: `${A4.h}mm`,
        display: "block",
        position: "relative",
        padding: 0,
      }}
    >
      {cards.map((c, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            left: `${c.x}mm`,
            top: `${c.y}mm`,
            width: `${w}mm`,
            height: `${h}mm`,
            overflow: "hidden",
          }}
        >
          {/* The face is built at 105×148mm; scaling it keeps the design intact
              where resizing the box would reflow it. */}
          <div
            style={{
              width: `${FRIDGE_CARD.w}mm`,
              height: `${FRIDGE_CARD.h}mm`,
              transform: `scale(${scale})`,
              transformOrigin: "top left",
            }}
          >
            {face}
          </div>
        </div>
      ))}
      <div aria-hidden style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 5 }}>
        {cards.map((c, i) => (
          <CornerMarks key={i} x={c.x} y={c.y} w={w} h={h} />
        ))}
      </div>
    </div>
  );
}

/**
 * The print form of the fridge card: two A4 sheets, four cards each. Sheet one
 * is the front, sheet two the back — print double-sided, cut each card out on
 * its own crop marks, and you have four finished cards.
 */
export function FridgeImposition({ f }: { f: FridgeFields }) {
  const [front, back] = fridgeFaces(f, true);
  return (
    <>
      <ImposedSheet face={front} />
      <ImposedSheet face={back} />
    </>
  );
}

function Poster({ p }: { p: PosterFields }) {
  const g = frameGeometry(p.frame, p.headerLayout);
  const sheet = (
    <div
      className={g.framed ? "a4 framed" : "a4"}
      style={{
        width: `${g.w}mm`,
        height: `${g.h}mm`,
        ["--sheet-h" as string]: `${g.h}mm`,
      }}
    >
      {g.framed ? (
        <div
          className="frame-art"
          style={{ transform: `scale(${g.scale})`, position: "relative", top: `${g.shiftY}mm` }}
        >
          <PosterArt p={p} />
        </div>
      ) : (
        <PosterArt p={p} />
      )}
    </div>
  );
  return sheet;
}

// The artwork itself, always laid out at A4 size.
function PosterArt({ p }: { p: PosterFields }) {
  return (
    <>
      {p.headerLayout === "hero" ? (
        // Full-bleed dark hero with the logos inside it.
        <div className="hero" style={{ padding: "14mm 14mm 12mm" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10mm" }}>
            <FjarLogo onDark />
            <HsuCobrand onDark height="10mm" label={p.badge} lines={p.cobrandLines} stroke={p.cobrandStroke} />
          </div>
          <div className="eyebrow" style={{ marginBottom: "3.5mm" }}>{p.eyebrow}</div>
          <h1 style={{ fontSize: "33px", maxWidth: "165mm" }}>{renderHeading(p.heading)}</h1>
          <p style={{ marginTop: "4mm", fontSize: "13px", lineHeight: 1.5, maxWidth: "165mm", color: "#cdeefb" }}>{p.lead}</p>
        </div>
      ) : (
        // Veggspjald style: logos on a white strip, then an inset dark hero.
        <>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "11mm 14mm 6mm" }}>
            <FjarLogo />
            <HsuCobrand label={p.badge} lines={p.cobrandLines} />
          </div>
          <div className="hero" style={{ padding: "10mm 14mm 10mm", margin: "0 14mm", borderRadius: "6mm" }}>
            <div className="eyebrow" style={{ marginBottom: "3.5mm" }}>{p.eyebrow}</div>
            <h1 style={{ fontSize: "31px", maxWidth: "155mm" }}>{renderHeading(p.heading)}</h1>
            <p style={{ marginTop: "4mm", fontSize: "13px", lineHeight: 1.5, maxWidth: "155mm", color: "#cdeefb" }}>{p.lead}</p>
          </div>
        </>
      )}

      <div style={{ padding: "8mm 14mm 0" }}>
        <h2 style={{ fontSize: "15px", marginBottom: "4mm" }}>{p.servicesTitle}</h2>
        <div className="svc-grid">
          {p.services.map((s, i) => (
            <div className="svc" key={`${s.icon}-${i}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={ico(s.icon)} alt="" />
              <span>{s.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ padding: "4mm 14mm 0" }}>
        <h2 style={{ fontSize: "15px", marginBottom: "4mm" }}>{p.stepsTitle}</h2>
        <div className="steps row">
          {p.steps.map((st, i) => (
            <div className="step" key={i}>
              <div className="n">{i + 1}</div>
              <h3>{st.title}</h3>
              <p>{st.body}</p>
            </div>
          ))}
        </div>
      </div>

      <div style={{ marginTop: "auto", padding: "8mm 14mm 10mm" }}>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: "8mm", borderTop: "1px solid var(--line)", paddingTop: "6mm" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "6mm" }}>
            <div style={{ textAlign: "center", flexShrink: 0 }}>
              <div style={{ border: "1px solid var(--line)", borderRadius: "2mm", padding: "1.5mm", background: "#fff" }}>
                <QrSvg value={p.portalUrl} size="26mm" />
              </div>
              <div style={{ fontSize: "10px", color: "var(--muted)", marginTop: "1.5mm", fontWeight: 600 }}>Skannaðu til að opna</div>
            </div>
            <div>
              <div className="eyebrow" style={{ marginBottom: "2mm" }}>{p.ctaLabel}</div>
              <div style={{ fontSize: "26px", fontWeight: 800, color: "var(--ink)" }} className="grad-text">{p.url}</div>
              <p style={{ fontSize: "11px", color: "var(--muted)", marginTop: "2mm" }}>{p.footerNote}</p>
            </div>
          </div>
          <div className="safety" style={{ textAlign: "right", justifyContent: "flex-end" }}>
            <span><b>{p.safety.bold}</b>{p.safety.text}</span>
          </div>
        </div>
      </div>
    </>
  );
}

// ── 2. Internal referral guide (for HSU staff) ───────────────────────────
function Referral({ r }: { r: ReferralFields }) {
  return (
    <div className="a4">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "9mm 14mm 4mm" }}>
        <FjarLogo />
        <HsuCobrand label={r.cobrandLabel} lines={r.cobrandLines} />
      </div>

      <div style={{ padding: "0 14mm" }}>
        <div className="eyebrow" style={{ marginBottom: "2.5mm" }}>{r.eyebrow}</div>
        <h1 style={{ fontSize: "26px", maxWidth: "165mm" }}>
          {r.heading}<span className="grad-text">{r.headingAccent}</span>
        </h1>
        <p style={{ marginTop: "2.5mm", fontSize: "11px", lineHeight: 1.4, color: "var(--body)", maxWidth: "172mm" }}>{r.intro}</p>
      </div>

      <div style={{ padding: "4mm 14mm 0" }}>
        <div className="cols2">
          <div className="panel yes">
            <h3>{r.yesTitle}</h3>
            <ul className="ticklist">{r.yes.map((t, i) => <li key={i}>{t}</li>)}</ul>
          </div>
          <div className="panel no">
            <h3>{r.noTitle}</h3>
            <ul className="ticklist">{r.no.map((t, i) => <li key={i}>{t}</li>)}</ul>
          </div>
        </div>
      </div>

      <div style={{ padding: "4mm 14mm 0" }}>
        <div className="sec-rule" />
        <h2 className="sec-h2">{r.referTitle}</h2>
        <div className="steps row">
          {r.referSteps.map((st, i) => (
            <div className="step" key={i}>
              <div className="n">{i + 1}</div>
              <h3>{st.title}</h3>
              <p>{st.body}</p>
            </div>
          ))}
        </div>
      </div>

      <div style={{ padding: "4mm 14mm 0" }}>
        <div className="sec-rule" />
        <h2 className="sec-h2">{r.afterTitle}</h2>
        <div className="rows">
          {r.after.map((a, i) => {
            const Ico = a.icon ? AFTER_ICONS[a.icon] : undefined;
            return (
              <div className="rowitem" key={i}>
                <span className="k">{Ico ? <Ico size={17} strokeWidth={2.2} /> : a.k}</span>
                <span className="t"><b>{a.bold}</b>{a.text}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Three ways to share the service with a patient */}
      <div style={{ padding: "4mm 14mm 0" }}>
        <div className="sec-rule" />
        <h2 className="sec-h2">{r.shareTitle}</h2>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: "4mm", alignItems: "stretch" }}>
          <div className="share-card">
            <div className="share-head"><span className="share-n">1</span><span className="eyebrow">Vefslóð</span></div>
            <div className="grad-text" style={{ fontSize: "18px", fontWeight: 800 }}>{r.url}</div>
            <div className="share-note">Sláðu inn í vafra</div>
          </div>
          <div className="share-card">
            <div className="share-head"><span className="share-n">2</span><span className="eyebrow">Beinn tengill</span></div>
            <div style={{ fontSize: "9.5px", color: "var(--body)", wordBreak: "break-all", lineHeight: 1.35, fontFamily: "ui-monospace,SFMono-Regular,Menlo,monospace" }}>{r.portalUrl}</div>
            <div className="share-note">Deildu tenglinum beint</div>
          </div>
          <div className="share-card" style={{ alignItems: "center", textAlign: "center" }}>
            <div className="share-head"><span className="share-n">3</span><span className="eyebrow">QR-kóði</span></div>
            <div style={{ border: "1px solid var(--line)", borderRadius: "2mm", padding: "1mm", background: "#fff" }}>
              <QrSvg value={r.portalUrl} size="15mm" />
            </div>
            <div className="share-note" style={{ fontWeight: 700 }}>Skannaðu</div>
          </div>
        </div>
      </div>

      <div style={{ marginTop: "auto", padding: "4mm 14mm 7mm" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8mm", borderTop: "1px solid var(--line)", paddingTop: "4mm" }}>
          <div className="safety"><span><b>{r.safety.bold}</b>{r.safety.text}</span></div>
          <div style={{ fontSize: "11px", color: "var(--muted)", textAlign: "right" }}>
            {r.contactLabel} <b style={{ color: "var(--ink)" }}>{r.contactEmail}</b>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── 2b. Referral back side — medications we do not renew ─────────────────
// A clinician-facing exclusion list, printed on the reverse of the referral
// guide. Item lines read "Virka efnið: sérlyfjaheiti" — the substance before
// the first colon is bolded so the page scans quickly at the desk.
function MedLine({ text }: { text: string }) {
  const i = text.indexOf(":");
  if (i === -1) return <li>{text}</li>;
  return <li><b>{text.slice(0, i)}</b>{text.slice(i)}</li>;
}

function ReferralMeds({ r }: { r: ReferralFields }) {
  return (
    <div className="a4">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "9mm 14mm 4mm" }}>
        <FjarLogo />
        <HsuCobrand label={r.cobrandLabel} lines={r.cobrandLines} />
      </div>

      <div style={{ padding: "0 14mm" }}>
        <div className="eyebrow" style={{ marginBottom: "2.5mm" }}>{r.medsEyebrow}</div>
        <h1 style={{ fontSize: "26px", maxWidth: "165mm" }}>
          {r.medsHeading}<span style={{ color: "var(--accent-dark)" }}>{r.medsHeadingAccent}</span>
        </h1>
        <p style={{ marginTop: "2.5mm", fontSize: "11px", lineHeight: 1.4, color: "var(--body)", maxWidth: "172mm" }}>{r.medsIntro}</p>
      </div>

      <div style={{ padding: "4mm 14mm 0" }}>
        <div className="sec-rule" />
        <div className="med-cols">
          {r.medsCategories.map((c, i) => (
            <div className={`med-cat${c.tone === "info" ? " info" : ""}`} key={i}>
              <div className="med-cat-head">
                <span className="med-key">{c.key}</span>
                <h3>{c.title}</h3>
              </div>
              {c.groups.map((g, j) => (
                <div className="med-group" key={j}>
                  {g.title ? <div className="gt">{g.title}</div> : null}
                  <ul className="med-list">
                    {g.items.map((t, k) => <MedLine key={k} text={t} />)}
                  </ul>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      <div style={{ marginTop: "auto", padding: "4mm 14mm 7mm" }}>
        <div style={{ borderTop: "1px solid var(--line)", paddingTop: "4mm" }}>
          <p style={{ fontSize: "10px", lineHeight: 1.4, color: "var(--muted)" }}>{r.medsFooter}</p>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8mm", marginTop: "3mm" }}>
            <div className="safety"><span><b>{r.safety.bold}</b>{r.safety.text}</span></div>
            <div style={{ fontSize: "11px", color: "var(--muted)", textAlign: "right" }}>
              {r.contactLabel} <b style={{ color: "var(--ink)" }}>{r.contactEmail}</b>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── 3. Newspaper advert ──────────────────────────────────────────────────
function Advert({ a }: { a: AdvertFields }) {
  return (
    <div className="a4">
      {a.headerLayout === "hero" ? (
        // Classic: full-bleed dark hero with the logos inside it.
        <div className="hero" style={{ padding: "16mm 16mm 15mm" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12mm" }}>
            <FjarLogo onDark />
            <HsuCobrand onDark height="10mm" label={a.cobrandLabel} lines={a.cobrandLines} stroke={a.cobrandStroke} />
          </div>
          <div className="eyebrow" style={{ marginBottom: "3.5mm", color: "#5fe0ff" }}>{a.badge}</div>
          <h1 style={{ fontSize: "46px", color: "#fff", maxWidth: "165mm" }}>
            {a.headingA}<br /><span style={{ color: "#5fe0ff" }}>{a.headingAccent}</span>
          </h1>
          <p style={{ marginTop: "6mm", fontSize: "15px", lineHeight: 1.5, maxWidth: "160mm" }}>{a.lead}</p>
        </div>
      ) : (
        // Veggspjald style: logos on a white strip, then an inset dark hero.
        <>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14mm 16mm 6mm" }}>
            <FjarLogo />
            <HsuCobrand label={a.cobrandLabel} lines={a.cobrandLines} />
          </div>
          <div className="hero" style={{ padding: "11mm 16mm 12mm", margin: "0 16mm", borderRadius: "6mm" }}>
            <div className="eyebrow" style={{ marginBottom: "3.5mm", color: "#5fe0ff" }}>{a.badge}</div>
            <h1 style={{ fontSize: "40px", color: "#fff", maxWidth: "150mm" }}>
              {a.headingA}<br /><span style={{ color: "#5fe0ff" }}>{a.headingAccent}</span>
            </h1>
            <p style={{ marginTop: "5mm", fontSize: "14px", lineHeight: 1.5, maxWidth: "150mm", color: "#cdeefb" }}>{a.lead}</p>
          </div>
        </>
      )}

      <div style={{ padding: "11mm 16mm 0" }}>
        <div className="eyebrow" style={{ marginBottom: "4mm" }}>{a.servicesTitle}</div>
        <div className="svc-chips">
          {a.services.map((s, i) => (
            <span className="chip" key={`${s.icon}-${i}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={ico(s.icon)} alt="" />{s.label}
            </span>
          ))}
        </div>
      </div>

      <div style={{ padding: "11mm 16mm 0" }}>
        <div className="steps row">
          {a.steps.map((st, i) => (
            <div className="step" key={i}>
              <div className="n">{i + 1}</div>
              <h3>{st.title}</h3>
              <p>{st.body}</p>
            </div>
          ))}
        </div>
      </div>

      <div style={{ marginTop: "auto", padding: "9mm 16mm 13mm" }}>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: "8mm", borderTop: "1px solid var(--line)", paddingTop: "7mm" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "6mm" }}>
            <div style={{ textAlign: "center", flexShrink: 0 }}>
              <div style={{ border: "1px solid var(--line)", borderRadius: "2mm", padding: "1.5mm", background: "#fff" }}>
                <QrSvg value={a.portalUrl} size="26mm" />
              </div>
              <div style={{ fontSize: "10px", color: "var(--muted)", marginTop: "1.5mm", fontWeight: 600 }}>Skannaðu til að opna</div>
            </div>
            <div>
              <div className="eyebrow" style={{ marginBottom: "2mm" }}>{a.ctaLabel}</div>
              <div style={{ fontSize: "26px", fontWeight: 800, color: "var(--ink)" }} className="grad-text">{a.url}</div>
            </div>
          </div>
          <div className="safety" style={{ textAlign: "right", justifyContent: "flex-end" }}>
            <span><b>{a.safety.bold}</b>{a.safety.text}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── 4. Lifeline × Lyfja health-check poster ──────────────────────────────
function LifelinePoster({ l }: { l: LifelineFields }) {
  const EM = "#10B981", EM_DARK = "#047857", EM_DEEP = "#065f46";
  const MINT = "#6ee7b7";
  return (
    <div className="a4" style={{ color: "#334155" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "11mm 14mm 5mm" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/lifeline-logo-rebrand.svg" alt="Lifeline" style={{ height: "9mm", width: "auto", display: "block" }} />
        <div style={{ display: "flex", alignItems: "center", gap: "3mm" }}>
          <span style={{ fontSize: "9px", fontWeight: 800, letterSpacing: ".08em", textTransform: "uppercase", color: "#6b7280" }}>{l.cobrandLabel}</span>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/partner-lyfja.png" alt="Lyfja" style={{ height: "11mm", width: "auto", display: "block" }} />
        </div>
      </div>

      <div style={{ margin: "0 14mm", borderRadius: "6mm", padding: "7.5mm 12mm", color: "#fff", position: "relative", overflow: "hidden", flexShrink: 0,
        background: "radial-gradient(120% 120% at 85% -10%, rgba(52,211,153,.5), transparent 55%), linear-gradient(135deg," + EM_DEEP + "," + EM_DARK + ")" }}>
        <div style={{ fontSize: "11px", fontWeight: 800, letterSpacing: ".14em", textTransform: "uppercase", color: MINT, marginBottom: "3.5mm" }}>{l.eyebrow}</div>
        <h1 style={{ fontSize: "28px", maxWidth: "150mm", color: "#fff" }}>{renderHeading(l.heading, MINT)}</h1>
        <p style={{ marginTop: "3.5mm", fontSize: "13px", lineHeight: 1.5, maxWidth: "150mm", color: "rgba(255,255,255,.92)" }}>{l.lead}</p>
      </div>

      <div style={{ padding: "4mm 14mm 0" }}>
        <h2 style={{ fontSize: "15px", marginBottom: "3mm" }}>{l.benefitsTitle}</h2>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "3mm" }}>
          {l.benefits.map((b, i) => {
            const Ico = BENEFIT_ICONS[b.icon];
            return (
              <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: "3.5mm", padding: "3mm 4mm", borderRadius: "3.5mm", background: "#f0fdf4", border: "1px solid #bbf7d0" }}>
                <span style={{ flex: "0 0 auto", width: "8.5mm", height: "8.5mm", borderRadius: "2.5mm", display: "flex", alignItems: "center", justifyContent: "center", background: EM, color: "#fff" }}>
                  {Ico ? <Ico size={18} strokeWidth={2} /> : null}
                </span>
                <div>
                  <div style={{ fontSize: "12px", fontWeight: 800, color: "#065f46", lineHeight: 1.2 }}>{b.label}</div>
                  {b.detail ? <div style={{ fontSize: "10px", color: "#475569", lineHeight: 1.28, marginTop: "0.8mm" }}>{b.detail}</div> : null}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ padding: "4mm 14mm 0" }}>
        <div style={{ background: "#ecfdf5", border: "1px solid #a7f3d0", borderRadius: "4mm", padding: "3.5mm 6mm" }}>
          <div style={{ fontSize: "10.5px", fontWeight: 800, letterSpacing: ".1em", textTransform: "uppercase", color: EM_DARK, marginBottom: "1.5mm" }}>{l.whyTitle}</div>
          <p style={{ fontSize: "12px", lineHeight: 1.5, color: "#334155" }}>{l.why}</p>
        </div>
      </div>

      <div style={{ padding: "4mm 14mm 0" }}>
        <h2 style={{ fontSize: "15px", marginBottom: "3mm" }}>{l.stepsTitle}</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "4mm" }}>
          {l.steps.map((st, i) => (
            <div key={i}>
              <div style={{ width: "7.5mm", height: "7.5mm", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(135deg," + EM + ",#34d399)", color: "#fff", fontWeight: 800, fontSize: "12px", marginBottom: "2.2mm" }}>{i + 1}</div>
              <h3 style={{ margin: "0 0 1mm", fontSize: "12px", fontWeight: 800, color: "#0f2733" }}>{st.title}</h3>
              <p style={{ margin: 0, fontSize: "10.5px", lineHeight: 1.32, color: "#334155" }}>{st.body}</p>
            </div>
          ))}
        </div>
      </div>

      <div style={{ marginTop: "auto", padding: "6mm 14mm 9mm" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8mm", borderRadius: "5mm", padding: "6mm 8mm", color: "#fff",
          background: "linear-gradient(135deg," + EM_DEEP + "," + EM_DARK + ")" }}>
          <div style={{ textAlign: "center", flexShrink: 0 }}>
            <div style={{ background: "#fff", borderRadius: "2.5mm", padding: "2mm" }}>
              <QrSvg value={l.portalUrl} size="30mm" />
            </div>
            <div style={{ fontSize: "10px", marginTop: "1.5mm", fontWeight: 700, color: "#ecfdf5" }}>{l.ctaLabel}</div>
          </div>
          <div>
            <div style={{ fontSize: "11px", fontWeight: 800, letterSpacing: ".1em", textTransform: "uppercase", color: MINT, marginBottom: "2mm" }}>Byrjaðu hér</div>
            <div style={{ fontSize: "23px", fontWeight: 800, lineHeight: 1.12, marginBottom: "2.5mm" }}>{l.ctaHeading}</div>
            <div style={{ fontSize: "13px", fontWeight: 700, color: "#d1fae5" }}>{l.url}</div>
            <p style={{ fontSize: "10.5px", color: "rgba(255,255,255,.82)", marginTop: "2.5mm", maxWidth: "85mm" }}>{l.footerNote}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export function CollateralDoc({ doc }: { doc: Doc }) {
  // The referral guide is two sheets: the guide itself and — when enabled —
  // the medication exclusion list on the back.
  if (doc.type === "referral") {
    return (
      <>
        <Referral r={doc.referral} />
        {doc.referral.medsEnabled !== false && <ReferralMeds r={doc.referral} />}
      </>
    );
  }
  if (doc.type === "fridge") return <FridgeCard f={doc.fridge} />;
  if (doc.type === "advert") return <Advert a={doc.advert} />;
  if (doc.type === "lifelinecheck") return <LifelinePoster l={doc.lifeline} />;
  return <Poster p={doc.poster} />;
}

/**
 * What goes on PAPER, which is not always what goes on screen.
 *
 * The fridge card is designed and previewed as a single A6 card, but printed
 * four-up on A4 so an office printer can produce a batch double-sided and the
 * cards can be cut apart. Every other document prints as it previews.
 */
export function CollateralPrintDoc({ doc }: { doc: Doc }) {
  if (doc.type === "fridge") return <FridgeImposition f={doc.fridge} />;
  return <CollateralDoc doc={doc} />;
}

/** The paper size a document prints on, in mm. */
export function printSheetSize(doc: Doc | undefined): { w: number; h: number } | null {
  return doc?.type === "fridge" ? { ...A4 } : null;
}
