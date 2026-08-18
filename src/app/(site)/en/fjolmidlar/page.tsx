import type { Metadata } from "next";
import FjolmidlarPage, { fjolmidlarMetadata } from "../../fjolmidlar/fjolmidlar-page";

export const dynamic = "force-dynamic";

export function generateMetadata(): Promise<Metadata> {
  return fjolmidlarMetadata("en");
}

export default function Page() {
  return <FjolmidlarPage locale="en" />;
}
