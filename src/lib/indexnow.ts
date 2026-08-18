// IndexNow — tell Bing (and Copilot / ChatGPT search, which read the same
// index) that a URL changed, instead of waiting for the next crawl. Google
// does not participate; it keeps using the sitemap.
//
// The protocol is a key you host as a text file at the site root, echoed back
// in the ping. The key is public by design — it only proves that whoever pings
// controls the domain.

import { SITE_URL } from "./seo";
import { englishReady, SITE_PAGES } from "./site-content/registry";
import { getPublishedBlob } from "./site-content/server";
import { localeHref } from "./locale";
import { erindi } from "@/erindi";

export const INDEXNOW_KEY = "54705076ee46a6c6377aa0af20bde5d5";
const ENDPOINT = "https://api.indexnow.org/indexnow";
const HOST = new URL(SITE_URL).host;

/**
 * Both URLs of a page, or just the Icelandic one when the English rendering is
 * still mostly Icelandic text — that version is served `noindex`, so submitting
 * it would only ask a crawler to fetch a page we have told it to ignore.
 */
async function bothLocales(pageKey: string, paths: string[]): Promise<string[]> {
  const enReady = englishReady(pageKey, await getPublishedBlob(pageKey));
  return paths.flatMap((p) =>
    enReady ? [`${SITE_URL}${p}`, `${SITE_URL}${localeHref(p, "en")}`] : [`${SITE_URL}${p}`],
  );
}

/**
 * Which public URLs a CMS page key affects. "chrome" touches the header and
 * footer of everything, so it submits the lot — each page judged on its own
 * English readiness; "erindi" is the ten landing pages; the rest map to their
 * own path. Every page that has an English twin submits both URLs, otherwise a
 * publish would only ever refresh the Icelandic half of the site.
 */
export async function urlsForPage(pageKey: string): Promise<string[]> {
  if (pageKey === "chrome") {
    const pages = SITE_PAGES.filter((p): p is typeof p & { path: string } => !!p.path);
    const perPage = await Promise.all(pages.map((p) => bothLocales(p.key, [p.path])));
    return perPage.flat();
  }
  if (pageKey === "erindi") {
    return bothLocales("erindi", erindi.map((e) => `/erindi/${e.slug}`));
  }
  const path = SITE_PAGES.find((p) => p.key === pageKey)?.path;
  return path ? bothLocales(pageKey, [path]) : [];
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
