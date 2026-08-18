import type { Metadata } from "next";
import ThjonustaPage, { thjonustaMetadata } from "../../thjonusta/thjonusta-page";

export const dynamic = "force-dynamic";

export function generateMetadata(): Promise<Metadata> {
  return thjonustaMetadata("en");
}

export default function Page() {
  return <ThjonustaPage locale="en" />;
}
