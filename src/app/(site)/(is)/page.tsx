import type { Metadata } from "next";
import HomePage, { homeMetadata } from "../home-page";

// Icelandic front page. The English one is /en — see ./home-page.tsx, which
// both routes share so the two languages can never drift apart.

export function generateMetadata(): Promise<Metadata> {
  return homeMetadata("is");
}

export default function Page() {
  return <HomePage locale="is" />;
}
