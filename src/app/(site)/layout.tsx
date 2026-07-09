import Script from "next/script";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

export default function SiteLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <Script
        src="https://app.medalia.is/sdk.js"
        strategy="afterInteractive"
        crossOrigin="anonymous"
      />
      <Navbar />
      <main className="flex-1">{children}</main>
      <Footer />
    </>
  );
}
