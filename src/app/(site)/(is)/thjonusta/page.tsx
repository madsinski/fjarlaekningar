import type { Metadata } from "next";
import ThjonustaPage, { thjonustaMetadata } from "./thjonusta-page";


export function generateMetadata(): Promise<Metadata> {
  return thjonustaMetadata("is");
}

export default function Page() {
  return <ThjonustaPage locale="is" />;
}
