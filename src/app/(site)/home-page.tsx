import type { Metadata } from "next";
import { getPage, getPageContent } from "@/lib/site-content/server";
import { pressItems } from "@/lib/site-content/fjolmidlar";
import { hiddenErindiSlugs } from "@/lib/site-content/thjonusta";
import { alternatesFor } from "@/lib/seo";
import type { Locale } from "@/lib/site-content/types";
import HomeView from "./HomeView";

// The front page, rendered in one language. Both /(site)/page.tsx (Icelandic)
// and /(site)/en/page.tsx (English) are thin wrappers around this, so the two
// URLs can never drift apart — only the locale they pass differs.
//
// Rendered per request: the latest PUBLISHED content, in the language of the
// URL. Draft content never touches the public page (it's only read by the admin
// API). If the site_content table/row is missing, the resolver falls back to
// the Icelandic defaults, so the page looks exactly like before the CMS.

export async function homeMetadata(locale: Locale): Promise<Metadata> {
  const { enReady } = await getPage("home", locale);
  return {
    // Title and description come from the root layout (CMS-editable); the home
    // page only needs to claim its own URL and point at its sibling language.
    alternates: alternatesFor("/", locale, enReady),
    ...(locale === "en" && !enReady ? { robots: { index: false, follow: true } } : {}),
  };
}

export default async function HomePage({ locale }: { locale: Locale }) {
  const { c, order } = await getPage("home", locale);
  const pressContent = await getPageContent("fjolmidlar", locale);
  const press = pressItems(pressContent);
  // The erindi switches live on the Þjónusta page, next to the list itself —
  // one switch, every surface.
  const thjonusta = await getPageContent("thjonusta", locale);
  // Headings for the erindi cards live on the Erindi page, beside the pages
  // that print them.
  const erindiContent = await getPageContent("erindi", locale);
  return (
    <HomeView
      c={c}
      order={order}
      locale={locale}
      hiddenErindi={hiddenErindiSlugs(thjonusta)}
      erindiContent={erindiContent}
      press={press}
      pressHeading={pressContent.front_heading}
      pressLink={pressContent.front_link}
    />
  );
}
