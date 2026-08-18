import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";

// The admin, the token-gated preview routes and the API are kept out of the
// index — they are auth-gated anyway, but there is no reason to spend crawl
// budget on them or surface them in results.
const PRIVATE = ["/admin", "/api/", "/present/", "/vaktir/", "/kynning/", "/samstarf/", "/coming-soon"];

// Answer engines are allowed deliberately, not by accident. Being readable by
// these is how Fjarlækningar can be cited when someone asks an assistant
// "hvar fæ ég lækni á netinu á Íslandi?". Each is named so the permission
// survives any future tightening of the "*" rule, and so it is an explicit
// decision on the record — remove a line to opt that crawler out.
const ANSWER_ENGINES = [
  "OAI-SearchBot", // ChatGPT search index
  "ChatGPT-User", // ChatGPT fetching a page for a user
  "GPTBot", // OpenAI crawler
  "Claude-SearchBot", // Claude search index
  "Claude-User", // Claude fetching a page for a user
  "ClaudeBot", // Anthropic crawler
  "PerplexityBot",
  "Perplexity-User",
  "Google-Extended", // Gemini / AI Overviews grounding
  "Applebot-Extended",
  "CCBot", // Common Crawl, which many models are built from
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: PRIVATE },
      ...ANSWER_ENGINES.map((userAgent) => ({ userAgent, allow: "/", disallow: PRIVATE })),
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
