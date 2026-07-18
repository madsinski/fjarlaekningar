import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Coming-soon gate.
 *
 * When COMING_SOON === "true" (set only on the Production environment in
 * Vercel), every page request is rewritten to /coming-soon. Preview and
 * local dev leave the flag unset, so the full working site renders there.
 *
 * The matcher excludes Next internals (_next), API routes, and any path with
 * a file extension (assets), so only page navigations are gated.
 */
export function proxy(request: NextRequest) {
  if (process.env.COMING_SOON !== "true") {
    return NextResponse.next();
  }

  // Preview bypass: a shareable `?preview=<key>` link ungates the ENTIRE site
  // for that visitor and drops a 30-day `site_preview` cookie so they don't
  // need the query param again. Cosmetic gate only — not a security boundary
  // (the key lives in source / env). Override the key via the PREVIEW_KEY env.
  const PREVIEW_KEY = process.env.PREVIEW_KEY || "fjarforskodun2026";
  const previewParam = request.nextUrl.searchParams.get("preview");
  const previewCookie = request.cookies.get("site_preview")?.value;
  if (previewParam === PREVIEW_KEY || previewCookie === PREVIEW_KEY) {
    const res = NextResponse.next();
    if (previewParam === PREVIEW_KEY) {
      res.cookies.set("site_preview", PREVIEW_KEY, { path: "/", maxAge: 60 * 60 * 24 * 30 });
    }
    return res;
  }

  // Let the coming-soon screen itself render.
  if (request.nextUrl.pathname === "/coming-soon") {
    return NextResponse.next();
  }

  // The staff admin has its own auth + MFA gate and must stay reachable even
  // while the public site is behind the coming-soon wall. Published legal
  // documents (/skjol/*) are also always public — a privacy policy must be
  // reachable regardless of the marketing-site launch state.
  const alwaysPublic = ["/admin", "/skjol", "/kynning", "/breytingaskra", "/fyrirspurn", "/personuverndarbeidni", "/kannanir", "/present"];
  if (alwaysPublic.some((p) => request.nextUrl.pathname.startsWith(p))) {
    return NextResponse.next();
  }

  const url = request.nextUrl.clone();
  url.pathname = "/coming-soon";
  return NextResponse.rewrite(url);
}

export const config = {
  matcher: ["/((?!_next|api|.*\\.[\\w]+$).*)"],
};
