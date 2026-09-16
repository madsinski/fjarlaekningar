import type { Metadata, Viewport } from "next";

// Vinnustöð Fjarlækninga — vinnusvæði hjúkrunarfræðinga og annars starfsfólks
// samstarfsstofnana. Ekki í leitarvélum.
//
// Íhlutirnir eru þeir sömu og í HSU-vaktakerfinu (src/app/hsu/_components);
// þeir lesa litina úr --hsu-breytunum, svo hér fá þeir lit Fjarlækninga.
export const metadata: Metadata = {
  title: { default: "Vinnustöð — Fjarlækningar", template: "%s — Vinnustöð Fjarlækninga" },
  description: "Vinnustöð starfsfólks sem vísar sjúklingum á Fjarlækningar.",
  applicationName: "Vinnustöð Fjarlækninga",
  robots: { index: false, follow: false, googleBot: { index: false, follow: false } },
  appleWebApp: { title: "Vinnustöð", capable: true, statusBarStyle: "default" },
  referrer: "no-referrer",
};

export const viewport: Viewport = { themeColor: "#0e7490" };

export default function VinnustodLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="min-h-screen bg-slate-50 text-slate-900"
      style={{ ["--hsu" as string]: "#0e7490", ["--hsu-dark" as string]: "#155e75", ["--hsu-soft" as string]: "#ecfeff" }}
    >
      {children}
    </div>
  );
}
