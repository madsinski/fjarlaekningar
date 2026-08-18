import type { Metadata } from "next";
import { getPage, getPageContent } from "@/lib/site-content/server";
import { erindiPagesLive } from "@/lib/site-content/erindi-pages";
import { faqJsonLd } from "@/lib/faq-jsonld";
import { alternatesFor, SITE_URL } from "@/lib/seo";
import type { Locale } from "@/lib/site-content/types";
import ThjonustaView from "./ThjonustaView";

// One implementation, two URLs: /thjonusta (Icelandic) and /en/thjonusta.
// Falls back to the built-in Icelandic defaults when nothing is published, so
// the page looks exactly as it did before the CMS.

const META = {
  is: {
    title: "Þjónusta",
    description:
      "Algeng heilsugæsluerindi leyst í gegnum örugga sjúklingagátt — spurningalistar samdir af læknum, sjálfspróf heima og lyfseðill rafrænt í lyfjagátt.",
  },
  en: {
    title: "Services",
    description:
      "Everyday primary-care problems handled through a secure patient portal — questionnaires written by doctors, home self-tests, and prescriptions sent electronically to the pharmacy portal.",
  },
} as const;

export async function thjonustaMetadata(locale: Locale): Promise<Metadata> {
  const { enReady } = await getPage("thjonusta", locale);
  return {
    ...META[locale],
    alternates: alternatesFor("/thjonusta", locale, enReady),
    ...(locale === "en" && !enReady ? { robots: { index: false, follow: true } } : {}),
  };
}

export default async function ThjonustaPage({ locale }: { locale: Locale }) {
  const { c, order } = await getPage("thjonusta", locale);
  // Cards become links only once the erindi pages are published.
  const erindiLive = erindiPagesLive(await getPageContent("erindi", locale));
  // FAQ structured data, from the same content the page renders below — pointed
  // at whichever of the two URLs is being rendered.
  const path = locale === "en" ? "/en/thjonusta" : "/thjonusta";
  const faq = faqJsonLd(c, `${SITE_URL}${path}`);
  return (
    <>
      {faq && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faq) }} />
      )}
      <ThjonustaView c={c} order={order} locale={locale} erindiLive={erindiLive} />
    </>
  );
}
