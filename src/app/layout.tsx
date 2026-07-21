import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Fjarlækningar ehf.",
  description:
    "Íslensk fjarlækningaþjónusta fyrir einföld og afmörkuð erindi. Sama þjónusta og á læknastofu í gegnum örugga sjúklingagátt Fjarlækninga — læknir svarar innan tveggja klukkustunda, óháð staðsetningu.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="is" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col font-sans">{children}</body>
    </html>
  );
}
