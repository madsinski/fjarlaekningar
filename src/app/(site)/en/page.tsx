import type { Metadata } from "next";
import HomePage, { homeMetadata } from "../home-page";

// English front page. Same component and same CMS content as /, rendered in
// English — a real URL so it can be indexed, shared and pointed at by hreflang.

export function generateMetadata(): Promise<Metadata> {
  return homeMetadata("en");
}

export default function Page() {
  return <HomePage locale="en" />;
}
