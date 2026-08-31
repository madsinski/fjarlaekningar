import type { Metadata } from "next";
import ThjonustaPage, { thjonustaMetadata } from "../../(is)/thjonusta/thjonusta-page";


export function generateMetadata(): Promise<Metadata> {
  return thjonustaMetadata("en");
}

export default function Page() {
  return <ThjonustaPage locale="en" />;
}
