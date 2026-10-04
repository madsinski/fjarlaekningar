import type { Metadata, Viewport } from "next";
import { Baloo_2, Nunito } from "next/font/google";
import { getViewer } from "@/lib/bokasmidja/auth";
import { getLang } from "@/lib/bokasmidja/server";
import { BkProvider } from "./_components/Provider";
import "./bokasmidja.css";

// Bókasmiðjan — barnabókagerð fjölskyldunnar. Einkamál: ekki í leitarvélum,
// ekki í veftré og án merkinga Fjarlækninga.
const display = Baloo_2({ subsets: ["latin", "latin-ext"], weight: ["600", "800"], variable: "--font-bk-display", display: "swap", preload: false });
const body = Nunito({ subsets: ["latin", "latin-ext"], weight: ["500", "700", "800"], variable: "--font-bk-body", display: "swap", preload: false });

export const metadata: Metadata = {
  title: { absolute: "Bókasmiðjan" },
  description: "",
  applicationName: "Bókasmiðjan",
  authors: null,
  creator: null,
  publisher: null,
  keywords: null,
  openGraph: null,
  twitter: null,
  robots: { index: false, follow: false, googleBot: { index: false, follow: false } },
  appleWebApp: { title: "Bókasmiðjan", capable: true, statusBarStyle: "default" },
  referrer: "no-referrer",
};

export const viewport: Viewport = { themeColor: "#fde68a", width: "device-width", initialScale: 1 };

export const dynamic = "force-dynamic";

export default async function BokasmidjaLayout({ children }: { children: React.ReactNode }) {
  const [lang, viewer] = await Promise.all([getLang(), getViewer()]);
  return (
    <div lang={lang} className={`bk-root ${display.variable} ${body.variable} min-h-screen text-slate-800`}>
      <BkProvider lang={lang} viewer={viewer}>{children}</BkProvider>
    </div>
  );
}
