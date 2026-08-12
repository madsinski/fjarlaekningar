import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { getPageContent } from "@/lib/site-content/server";

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
  const chrome = await getPageContent("chrome");
  // Site-wide toggle for the small eyebrow pill labels above headings. A class
  // on <main> lets one setting hide every eyebrow (marked .site-eyebrow) across
  // all pages without threading a prop into each hero — see globals.css.
  const eyebrowsOff = chrome.show_eyebrows === "off";
  return (
    <>
      <Navbar content={chrome} />
      <main className={`flex-1${eyebrowsOff ? " eyebrows-off" : ""}`}>{children}</main>
      <Footer content={chrome} />
    </>
  );
}
