import type { Metadata } from "next";
import { getPageContent } from "@/lib/site-content/server";
import ThjonustaView from "./ThjonustaView";

export const metadata: Metadata = {
  title: "Þjónusta — Fjarlækningar ehf.",
  description:
    "Algeng heilsugæsluerindi leyst í gegnum örugga sjúklingagátt Fjarlækninga — spurningalistar samdir af læknum, sjálfspróf heima og lyfseðill rafrænt í lyfjagátt.",
};

// Rendered per request: picks up the `lang` cookie + the latest PUBLISHED
// content. Falls back to the built-in Icelandic defaults when nothing is
// published, so the page looks exactly as it did before the CMS.
export const dynamic = "force-dynamic";

export default async function ThjonustaPage() {
  const c = await getPageContent("thjonusta");
  return <ThjonustaView c={c} />;
}
