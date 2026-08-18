import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import ScrollToTop from "../components/ScrollToTop";
import { getLocale, getPageContent } from "@/lib/site-content/server";

// The header + footer are CMS-editable as their own section (page key "chrome"),
// so a nav label or footer line can change without touching a page. Content is
// fetched server-side and passed down; both components fall back to their
// built-in defaults when a field is empty.
export const dynamic = "force-dynamic";

export default async function SiteLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // The language comes from the URL (/en/… vs /…), which a layout cannot read
  // from route params — getLocale() takes it off the path header the proxy
  // stamps, so the header, footer and language toggle match the page below.
  const locale = await getLocale();
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
