import SiteChrome from "../SiteChrome";

// English pages under /en.
//
// lang is set here rather than on <html>: only the root layout renders <html>,
// and making it locale-aware would mean reading the request there, which is
// exactly the dynamic-rendering problem this refactor exists to remove. lang on
// a wrapper is valid HTML and screen readers honour it for the subtree; the
// language signal search engines actually use is the hreflang map, which is
// emitted per page and unaffected.
export default function EnLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <div lang="en" className="contents">
      <SiteChrome locale="en">{children}</SiteChrome>
    </div>
  );
}
