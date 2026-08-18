import type { Metadata } from "next";
import { getPage, getPageContent } from "@/lib/site-content/server";
import { pressItems } from "@/lib/site-content/fjolmidlar";
import HomeView from "./HomeView";

// Title and description come from the root layout (CMS-editable); the home
// page only needs to claim itself as the canonical root.
export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

// Rendered per request: picks up the `lang` cookie + the latest PUBLISHED
// content. Draft content never touches the public page (it's only read by the
// admin API). If the site_content table/row is missing, the resolver falls back
// to the Icelandic defaults, so the page looks exactly like before the CMS.
//
// This used to hand-roll its own Supabase query and locale cookie read, from
// before the shared registry existed. It now goes through the same getPage()
// as every other page, which is also where the section order comes from.
export const dynamic = "force-dynamic";

export default async function Home() {
  const { c, order, locale } = await getPage("home");
  const pressContent = await getPageContent("fjolmidlar");
  const press = pressItems(pressContent);
  return (
    <HomeView
      c={c}
      order={order}
      locale={locale}
      press={press}
      pressHeading={pressContent.front_heading}
      pressLink={pressContent.front_link}
    />
  );
}
