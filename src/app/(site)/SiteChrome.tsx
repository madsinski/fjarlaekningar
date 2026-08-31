import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import ScrollToTop from "../components/ScrollToTop";
import { getPageContent } from "@/lib/site-content/server";
import type { Locale } from "@/lib/site-content/types";

// Header + footer, CMS-editable as their own section (page key "chrome"), so a
// nav label or footer line can change without touching a page.
//
// The locale is a PARAMETER, not something this reads off the request. That is
// the whole point: it used to come from getLocale(), which reads headers(), and
// a layout that reads headers() makes every page beneath it dynamic — no
// caching, a database round trip per visit. The two route groups know their own
// language from where they sit in the tree, so nobody has to ask the request.
export default async function SiteChrome({
  locale,
  children,
}: {
  locale: Locale;
  children: React.ReactNode;
}) {
  const chrome = await getPageContent("chrome", locale);
  // Site-wide toggle for the small eyebrow pill labels above headings. A class
  // on <main> lets one setting hide every eyebrow (marked .site-eyebrow) across
  // all pages without threading a prop into each hero — see globals.css.
  const eyebrowsOff = chrome.show_eyebrows === "off";
  return (
    <>
      <ScrollToTop />
      <Navbar content={chrome} locale={locale} />
      <main className={`flex-1${eyebrowsOff ? " eyebrows-off" : ""}`}>{children}</main>
      <Footer content={chrome} locale={locale} />
    </>
  );
}
