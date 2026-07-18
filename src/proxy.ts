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

  // Let the coming-soon screen itself render.
  if (request.nextUrl.pathname === "/coming-soon") {
    return NextResponse.next();
  }

  // The staff admin has its own auth + MFA gate and must stay reachable even
  // while the public site is behind the coming-soon wall. Published legal
  // documents (/skjol/*) are also always public — a privacy policy must be
  // reachable regardless of the marketing-site launch state.
  if (
    request.nextUrl.pathname.startsWith("/admin") ||
    request.nextUrl.pathname.startsWith("/skjol")
  ) {
    return NextResponse.next();
  }

  const url = request.nextUrl.clone();
  url.pathname = "/coming-soon";
  return NextResponse.rewrite(url);
}

export const config = {
  matcher: ["/((?!_next|api|.*\\.[\\w]+$).*)"],
};
