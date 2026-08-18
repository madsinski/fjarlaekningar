import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { erindi } from "@/erindi";
import {
  organizationJsonLd,
  OG_IMAGE,
  SITE_DESCRIPTION,
  SITE_KEYWORDS,
  SITE_NAME,
  SITE_URL,
} from "@/lib/seo";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  // Absolute base for every relative OG/canonical URL below.
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Fjarlækningar — læknisþjónusta þar sem þér hentar",
    // Pages set their own full titles, so the template only applies to those
    // that give a bare string.
    template: "%s — Fjarlækningar",
  },
  description: SITE_DESCRIPTION,
  keywords: SITE_KEYWORDS,
  applicationName: SITE_NAME,
  authors: [{ name: SITE_NAME, url: SITE_URL }],
  creator: SITE_NAME,
  publisher: SITE_NAME,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    locale: "is_IS",
    url: SITE_URL,
    title: "Fjarlækningar — læknisþjónusta þar sem þér hentar",
    description: SITE_DESCRIPTION,
    images: [{ url: OG_IMAGE, width: 1200, height: 630, alt: "Fjarlækningar — læknisþjónusta þar sem þér hentar" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Fjarlækningar — læknisþjónusta þar sem þér hentar",
    description: SITE_DESCRIPTION,
    images: [OG_IMAGE],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="is" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col font-sans">
        {/* Organization + WebSite structured data: what lets Google show the
            logo next to the result. Rendered in the body so it ships on every
            page, admin included — harmless there and simpler than duplicating
            it per layout. */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(organizationJsonLd(erindi.map((e) => ({ title: e.title })))),
          }}
        />
        {children}
      </body>
    </html>
  );
}
