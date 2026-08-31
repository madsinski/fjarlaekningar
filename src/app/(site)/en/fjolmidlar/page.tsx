import type { Metadata } from "next";
import FjolmidlarPage, { fjolmidlarMetadata } from "../../(is)/fjolmidlar/fjolmidlar-page";


export function generateMetadata(): Promise<Metadata> {
  return fjolmidlarMetadata("en");
}

export default function Page() {
  return <FjolmidlarPage locale="en" />;
}
