import type { NextConfig } from "next";
import path from "node:path";

const isDev = process.env.NODE_ENV !== "production";
// The Vercel toolbar (comments, flags) is injected on preview deployments only.
const vercelLive = process.env.VERCEL_ENV === "preview" ? " https://vercel.live" : "";

// Content-Security-Policy.
//
// No nonces: a nonce has to be minted per request, which would turn every
// prerendered marketing page dynamic. Next's inline hydration scripts therefore
// need 'unsafe-inline'. What the policy still buys: scripts only from our own
// origin, no plugins, no <base> hijacking, forms only post back to us, and —
// the one that matters most for a health service — nobody can frame the site.
//
// img-src/connect-src allow any https origin because CMS images (press photos,
// partner logos) come from arbitrary hosts and the admin's screenshot export
// fetches them to inline them. The browser talks to Supabase directly.
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}${vercelLive}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  `connect-src 'self' https: wss://*.supabase.co${isDev ? " ws:" : ""}`,
  "media-src 'self' blob: https:",
  "worker-src 'self' blob:",
  `frame-src 'self'${vercelLive}`,
  "frame-ancestors 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  ...(isDev ? [] : ["upgrade-insecure-requests"]),
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  // Legacy twin of frame-ancestors, for browsers that predate it.
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Nothing on the site uses camera, microphone, location or payments — the
  // consultation itself happens in the Medalia portal. Fullscreen stays for
  // the presentation decks; clipboard is left at its same-origin default.
  {
    key: "Permissions-Policy",
    value:
      "camera=(), microphone=(), geolocation=(), payment=(), usb=(), serial=(), hid=(), midi=(), magnetometer=(), gyroscope=(), accelerometer=(), browsing-topics=(), fullscreen=(self)",
  },
  // Strict-Transport-Security is already sent by Vercel on every response.
];

const nextConfig: NextConfig = {
  turbopack: {
    root: path.resolve(__dirname),
  },
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  // The erindi pages moved from /erindi/<slug> to /thjonusta/<slug>, which is
  // where they always belonged — the breadcrumb already said Þjónusta / <erindi>.
  // They were live, in the sitemap and submitted to IndexNow before the move, so
  // the old URLs redirect permanently rather than 404.
  async redirects() {
    return [
      { source: "/erindi/:slug", destination: "/thjonusta/:slug", permanent: true },
      { source: "/en/erindi/:slug", destination: "/en/thjonusta/:slug", permanent: true },
    ];
  },
};

export default nextConfig;
