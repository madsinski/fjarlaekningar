import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { erindi } from "@/erindi";
import { getPageContent } from "@/lib/site-content/server";
import {
  organizationJsonLd,
  OG_IMAGE_PATH,
  SITE_DESCRIPTION,
  SITE_KEYWORDS,
  SITE_NAME,
  SITE_TITLE,
  SITE_URL,
  type SeoFacts,
} from "@/lib/seo";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

/**
 * Title, description, keywords and the share image are CMS-editable
 * (/admin/website → "Haus & fótur" → group "Leitarvélar (SEO)"). The code
 * constants are the defaults, so the site is fully described even before
 * anyone opens the editor.
 */
async function seoFacts(): Promise<SeoFacts> {
  const c = await getPageContent("chrome").catch(() => ({}) as Record<string, string>);
  const img = c.seo_og_image?.trim() || OG_IMAGE_PATH;
  return {
    title: c.seo_title?.trim() || SITE_TITLE,
    description: c.seo_description?.trim() || SITE_DESCRIPTION,
    ogImage: img.startsWith("http") ? img : `${SITE_URL}${img}`,
    company: c.footer_company?.trim() || SITE_NAME,
    email: c.footer_email?.trim() || "",
    address: c.footer_address?.trim() || "",
    country: c.footer_country?.trim() || "Ísland",
  };
}

export async function generateMetadata(): Promise<Metadata> {
  const f = await seoFacts();
  const c = await getPageContent("chrome").catch(() => ({}) as Record<string, string>);
  const keywords = (c.seo_keywords ?? "")
    .split(",")
    .map((k) => k.trim())
    .filter(Boolean);

  return {
    metadataBase: new URL(SITE_URL),
    title: { default: f.title, template: "%s — Fjarlækningar" },
    description: f.description,
    keywords: keywords.length ? keywords : SITE_KEYWORDS,
    applicationName: f.company,
    authors: [{ name: f.company, url: SITE_URL }],
    creator: f.company,
    publisher: f.company,
    alternates: { canonical: "/" },
    openGraph: {
      type: "website",
      siteName: f.company,
      locale: "is_IS",
      url: SITE_URL,
      title: f.title,
      description: f.description,
      images: [{ url: f.ogImage, width: 1200, height: 630, alt: f.title }],
    },
    twitter: {
      card: "summary_large_image",
      title: f.title,
      description: f.description,
      images: [f.ogImage],
    },
    robots: {
      index: true,
      follow: true,
      googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 },
    },
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const facts = await seoFacts();
  return (
    <html lang="is" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col font-sans">
        {/* Organization + WebSite structured data: what lets Google show the
            logo next to the result. The company name, e-mail and address come
            from the footer fields, so they are edited in one place. */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(organizationJsonLd(erindi.map((e) => ({ title: e.title })), facts)),
          }}
        />
        {children}
      </body>
    </html>
  );
}
