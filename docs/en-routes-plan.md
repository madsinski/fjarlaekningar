# Plan: real `/en` routes

Written 2026-08-18. **Shipped 2026-08-18** — kept as the rationale behind the
routing, not as outstanding work.

What landed differs from the plan in one place worth knowing about. Step 2 says
`getLocale()` must prefer the route segment over the cookie, but a *layout* gets
no route params, and both `src/app/layout.tsx` (which sets `<html lang>`) and the
site chrome need the language. So `src/proxy.ts` stamps the request path onto an
`x-pathname` header and `getLocale()` reads the locale off that; pages pass their
locale explicitly and never depend on the header. See `src/lib/locale.ts`.

Step 7's audit is enforced in code rather than done by hand: `englishCoverage()`
in the content registry measures how much of a page's Icelandic text has an
English counterpart, and anything under `EN_INDEX_THRESHOLD` is served `noindex`,
dropped from the sitemap and left out of the hreflang map. All five marketing
pages are over the line today; erindi is not, which is why its English pages
would stay out of the index if the erindi pages were switched on tomorrow.

## Why

English is currently served by a `lang` cookie on the **same** URLs
(`getLocale()` in `src/lib/site-content/server.ts` reads it). So:

- Google has no English URL to index — only Icelandic is in the index.
- `hreflang` is impossible: it needs two distinct URLs to point at each other.
- A shared English link always opens in whatever language the recipient's
  cookie says.

Metadata is already locale-correct (title, description, keywords, `<html lang>`,
`og:locale` — see `src/app/layout.tsx`). This plan is only about **URLs**.

## Target shape

| Icelandic | English |
|---|---|
| `/` | `/en` |
| `/thjonusta` | `/en/thjonusta` |
| `/um-okkur` | `/en/um-okkur` |
| `/hafa-samband` | `/en/hafa-samband` |
| `/erindi/<slug>` | `/en/erindi/<slug>` |
| `/fjolmidlar` | `/en/fjolmidlar` |

Keep the Icelandic slugs in the English paths. They are the canonical names of
the pages, they already rank, and translating slugs doubles the redirect surface
for no gain.

## Steps

1. **Route group.** Move the current `src/app/(site)/*` pages under a segment
   that carries the locale, e.g. `src/app/(site)/[[...locale]]/…`, or add a
   parallel `src/app/(site)/en/…` that renders the same views with
   `locale="en"`. The second is more duplication but far less risk to the
   Icelandic pages, which are the ones with traffic. Prefer it unless the
   duplication gets ugly.

2. **Locale resolution.** `getLocale()` must prefer the route segment over the
   cookie, falling back to the cookie only where there is no segment (the admin
   and the portal-facing routes). Everything downstream already takes a locale.

3. **Links.** Every internal `<Link href="/...">` in `(site)` and in
   `src/app/components/{Navbar,Footer}.tsx` needs an `en` prefix when the
   current locale is English. Add one helper — `localeHref(path, locale)` — and
   route every link through it rather than hand-editing each call site.

4. **Language switch.** The IS/EN toggle currently sets the cookie. It should
   navigate to the sibling URL instead, and keep the cookie only as the
   preference for a bare visit to `/`.

5. **hreflang + canonical.** Each page emits, in `generateMetadata`:
   - `alternates.canonical` = its own locale URL
   - `alternates.languages` = `{ is: <is-url>, en: <en-url>, "x-default": <is-url> }`

6. **Sitemap.** `src/app/sitemap.ts` gains the `/en` variants, each with the
   same `alternates.languages` map.

7. **CMS.** English content already exists per field (`draft.en` / the EN
   defaults). Nothing to change in the model — but pages that fall back to
   Icelandic will now do so on an English URL, which reads worse than it did
   behind a cookie. Audit which pages actually have English text before
   launching, and consider `noindex` on any English page still falling back.

8. **Redirects.** Do not redirect `/` → `/en` on Accept-Language. Google crawls
   from the US with no language preference and would only ever see English.
   Let `/` stay Icelandic and let the toggle do the work.

## Verify before shipping

- `curl` each `/en/...` returns 200 with English text in the raw HTML.
- Each page pair cross-references the other in `hreflang`, both directions.
- Icelandic URLs are byte-for-byte unchanged (they hold the current rankings).
- `sitemap.xml` lists both locales.
- The admin and `/erindi` gating still behave (erindi pages are `off`).

## Not in scope

Translating content. That is a separate pass — the routing must land first, or
there is nowhere for the translations to live.
