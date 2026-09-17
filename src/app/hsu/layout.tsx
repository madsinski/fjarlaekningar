import type { Metadata, Viewport } from "next";
import { LangProvider } from "@/lib/hsu/i18n/client";
import { getHsuLang } from "@/lib/hsu/i18n/server";
import { translator } from "@/lib/hsu/i18n/core";
import { auth } from "@/lib/hsu/i18n/messages/auth";
import { common } from "@/lib/hsu/i18n/messages/common";

// Vaktakerfi HSU. Hýst á fjarlaekningar.is en án vörumerkis Fjarlækninga:
// eigið merki, eigin titlar, ekki í leitarvélum.
export async function generateMetadata(): Promise<Metadata> {
  const lang = await getHsuLang();
  const t = translator(auth, lang);
  const app = translator(common, lang)("app.name");
  return {
    title: { default: t("meta.default"), template: t("meta.template") },
    description: t("meta.description"),
    applicationName: app,
    robots: { index: false, follow: false, googleBot: { index: false, follow: false } },
    openGraph: { siteName: "HSU", title: app, description: t("meta.description"), images: [] },
    twitter: { card: "summary", title: app, images: [] },
    appleWebApp: { title: t("meta.appleTitle"), capable: true, statusBarStyle: "default" },
    referrer: "no-referrer",
    // Rótaruppsetningin merkir allar síður Fjarlækningum; hér er það hreinsað.
    authors: null,
    creator: null,
    publisher: null,
    keywords: null,
  };
}

export const viewport: Viewport = { themeColor: "#1d4f91" };

export default async function HsuLayout({ children }: { children: React.ReactNode }) {
  const lang = await getHsuLang();
  return (
    <div
      lang={lang}
      className="min-h-screen bg-slate-50 text-slate-900"
      style={{ ["--hsu" as string]: "#1d4f91", ["--hsu-dark" as string]: "#163d70", ["--hsu-soft" as string]: "#e8eef7" }}
    >
      <LangProvider initial={lang}>{children}</LangProvider>
    </div>
  );
}
