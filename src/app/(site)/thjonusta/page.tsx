import type { Metadata } from "next";
import { getPage, getPageContent } from "@/lib/site-content/server";
import { erindiPagesLive } from "@/lib/site-content/erindi-pages";
import ThjonustaView from "./ThjonustaView";

export const metadata: Metadata = {
  alternates: { canonical: "/thjonusta" },
  title: "Þjónusta",
  description:
    "Algeng heilsugæsluerindi leyst í gegnum örugga sjúklingagátt — spurningalistar samdir af læknum, sjálfspróf heima og lyfseðill rafrænt í lyfjagátt.",
};

// Rendered per request: picks up the `lang` cookie + the latest PUBLISHED
// content. Falls back to the built-in Icelandic defaults when nothing is
// published, so the page looks exactly as it did before the CMS.
export const dynamic = "force-dynamic";

export default async function ThjonustaPage() {
  const { c, order, locale } = await getPage("thjonusta");
  // Cards become links only once the erindi pages are published.
  const erindiLive = erindiPagesLive(await getPageContent("erindi"));
  return <ThjonustaView c={c} order={order} locale={locale} erindiLive={erindiLive} />;
}
