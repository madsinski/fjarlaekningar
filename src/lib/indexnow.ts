// IndexNow — tell Bing (and Copilot / ChatGPT search, which read the same
// index) that a URL changed, instead of waiting for the next crawl. Google
// does not participate; it keeps using the sitemap.
//
// The protocol is a key you host as a text file at the site root, echoed back
// in the ping. The key is public by design — it only proves that whoever pings
// controls the domain.

import { SITE_URL } from "./seo";
import { SITE_PAGES } from "./site-content/registry";
import { erindi } from "@/erindi";

export const INDEXNOW_KEY = "54705076ee46a6c6377aa0af20bde5d5";
const ENDPOINT = "https://api.indexnow.org/indexnow";
const HOST = new URL(SITE_URL).host;

/**
 * Which public URLs a CMS page key affects. "chrome" touches the header and
 * footer of everything, so it submits the lot; "erindi" is the ten landing
 * pages; the rest map to their own path.
 */
export function urlsForPage(pageKey: string): string[] {
  if (pageKey === "chrome") {
    const paths = SITE_PAGES.map((p) => p.path).filter((p): p is string => !!p);
    return paths.map((p) => `${SITE_URL}${p}`);
  }
  if (pageKey === "erindi") {
    return erindi.map((e) => `${SITE_URL}/erindi/${e.slug}`);
  }
  const path = SITE_PAGES.find((p) => p.key === pageKey)?.path;
  return path ? [`${SITE_URL}${path}`] : [];
}

/**
 * Fire-and-forget ping. Never throws and never blocks the caller's response:
 * publishing must succeed even if IndexNow is down.
 */
export async function pingIndexNow(urlList: string[]): Promise<{ ok: boolean; status?: number }> {
  if (!urlList.length) return { ok: false };
  try {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({
        host: HOST,
        key: INDEXNOW_KEY,
        keyLocation: `${SITE_URL}/${INDEXNOW_KEY}.txt`,
        urlList,
      }),
      signal: AbortSignal.timeout(5000),
    });
    return { ok: res.ok, status: res.status };
  } catch {
    return { ok: false };
  }
}
