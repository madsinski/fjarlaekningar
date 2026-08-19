import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  turbopack: {
    root: path.resolve(__dirname),
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
