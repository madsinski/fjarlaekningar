// Bókasmiðjan — renders an illustration to PNG so the illustrator can look at
// what it drew (see reviewPicture in agents.ts). Server-only.

import { Resvg } from "@resvg/resvg-js";

/** PNG bytes of a sanitized SVG, base64-encoded. Null when it cannot be rendered. */
export function renderPng(svg: string, width = 1000): string | null {
  try {
    const png = new Resvg(svg, { fitTo: { mode: "width", value: width }, background: "#ffffff" }).render().asPng();
    return Buffer.from(png).toString("base64");
  } catch (e) {
    console.error("[bokasmidja] render failed", e instanceof Error ? e.message : e);
    return null;
  }
}
