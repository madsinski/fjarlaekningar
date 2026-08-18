import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";

// The admin, the token-gated preview routes and the API are kept out of the
// index — they are auth-gated anyway, but there is no reason to spend crawl
// budget on them or surface them in results.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/api/", "/present/", "/vaktir/", "/kynning/", "/samstarf/", "/coming-soon"],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
