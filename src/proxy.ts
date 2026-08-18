import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { isGateEnabled } from "@/lib/site-gate";
import { PATHNAME_HEADER } from "@/lib/locale";

/**
 * Forward the request path to the app as a header.
 *
 * A layout gets no route params, so `src/app/layout.tsx` (which sets <html lang>)
 * and the site chrome would have no way to know whether they are rendering
 * /thjonusta or /en/thjonusta. Stamping the path here is what lets getLocale()
 * read the language off the URL instead of off the cookie. Every branch below
 * goes through this, so the header is never missing on a page request.
 */
function withPathname(request: NextRequest) {
  const headers = new Headers(request.headers);
  headers.set(PATHNAME_HEADER, request.nextUrl.pathname);
  return { request: { headers } };
}

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
export async function proxy(request: NextRequest) {
  // Gate state lives in the DB (toggleable from /admin/website) and falls back
  // to the COMING_SOON env var. Cached ~30s — see src/lib/site-gate.ts.
  if (!(await isGateEnabled())) {
    return NextResponse.next(withPathname(request));
  }

  // Preview bypass: a shareable `?preview=<key>` link ungates the ENTIRE site
  // for that visitor and drops a 30-day `site_preview` cookie so they don't
  // need the query param again. Cosmetic gate only — not a security boundary
  // (the key lives in source / env). Override the key via the PREVIEW_KEY env.
  // NEXT_PUBLIC_PREVIEW_KEY is also read by src/lib/public-site.ts so the admin's
  // "view live site" links stay in sync with this gate from a single env var.
  const PREVIEW_KEY =
    process.env.PREVIEW_KEY || process.env.NEXT_PUBLIC_PREVIEW_KEY || "fjarforskodun2026";
  const previewParam = request.nextUrl.searchParams.get("preview");
  const previewCookie = request.cookies.get("site_preview")?.value;
  if (previewParam === PREVIEW_KEY || previewCookie === PREVIEW_KEY) {
    const res = NextResponse.next(withPathname(request));
    if (previewParam === PREVIEW_KEY) {
      res.cookies.set("site_preview", PREVIEW_KEY, { path: "/", maxAge: 60 * 60 * 24 * 30 });
    }
    return res;
  }

  // Let the coming-soon screen itself render.
  if (request.nextUrl.pathname === "/coming-soon") {
    return NextResponse.next(withPathname(request));
  }

  // The staff admin has its own auth + MFA gate and must stay reachable even
  // while the public site is behind the coming-soon wall. Published legal
  // documents (/skjol/*) are also always public — a privacy policy must be
  // reachable regardless of the marketing-site launch state.
  // "/afskra" must stay reachable even while gated — an unsubscribe link in a
  // marketing email has to work unconditionally.
  const alwaysPublic = ["/admin", "/skjol", "/kynning", "/breytingaskra", "/fyrirspurn", "/personuverndarbeidni", "/kannanir", "/present", "/afskra", "/vaktir", "/samstarf"];
  if (alwaysPublic.some((p) => request.nextUrl.pathname.startsWith(p))) {
    return NextResponse.next(withPathname(request));
  }

  const url = request.nextUrl.clone();
  url.pathname = "/coming-soon";
  return NextResponse.rewrite(url, withPathname(request));
}

export const config = {
  matcher: ["/((?!_next|api|.*\\.[\\w]+$).*)"],
};
