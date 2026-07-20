// Canonical public site + the coming-soon preview-bypass key.
//
// The key is deliberately NOT a secret (it also lives in src/proxy.ts and is
// visible in any shared preview link) — it's a cosmetic pre-launch gate, not a
// security boundary. Exposing it to the admin bundle is fine and lets us build
// "view live site" links without a round-trip.
//
// Override with NEXT_PUBLIC_PREVIEW_KEY — proxy.ts reads the same variable, so
// setting it once keeps the gate and these links in sync.

export const PUBLIC_SITE_URL = "https://www.fjarlaekningar.is";

export const PREVIEW_KEY = process.env.NEXT_PUBLIC_PREVIEW_KEY || "fjarforskodun2026";

/** Public URL for `path` with the coming-soon gate bypassed. */
export function previewUrl(path = "/"): string {
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${PUBLIC_SITE_URL}${p}?preview=${encodeURIComponent(PREVIEW_KEY)}`;
}
