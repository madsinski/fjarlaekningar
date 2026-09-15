import type { Metadata, Viewport } from "next";

// Vaktakerfi HSU. Hýst á fjarlaekningar.is en án vörumerkis Fjarlækninga:
// eigið merki, eigin titlar, ekki í leitarvélum.
export const metadata: Metadata = {
  title: { default: "Vaktakerfi — HSU Vestmannaeyjum", template: "%s — Vaktakerfi HSU" },
  description: "Vaktakerfi lækna á Heilsugæslunni í Vestmannaeyjum.",
  applicationName: "Vaktakerfi HSU",
  robots: { index: false, follow: false, googleBot: { index: false, follow: false } },
  openGraph: { siteName: "HSU", title: "Vaktakerfi HSU", description: "Vaktakerfi lækna á Heilsugæslunni í Vestmannaeyjum.", images: [] },
  twitter: { card: "summary", title: "Vaktakerfi HSU", images: [] },
  appleWebApp: { title: "HSU vaktir", capable: true, statusBarStyle: "default" },
  referrer: "no-referrer",
  // Rótaruppsetningin merkir allar síður Fjarlækningum; hér er það hreinsað.
  authors: null,
  creator: null,
  publisher: null,
  keywords: null,
};

export const viewport: Viewport = { themeColor: "#1d4f91" };

export default function HsuLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="min-h-screen bg-slate-50 text-slate-900"
      style={{ ["--hsu" as string]: "#1d4f91", ["--hsu-dark" as string]: "#163d70", ["--hsu-soft" as string]: "#e8eef7" }}
    >
      {children}
    </div>
  );
}
