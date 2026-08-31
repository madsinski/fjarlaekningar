import type { Metadata } from "next";
import FjolmidlarPage, { fjolmidlarMetadata } from "./fjolmidlar-page";


export function generateMetadata(): Promise<Metadata> {
  return fjolmidlarMetadata("is");
}

export default function Page() {
  return <FjolmidlarPage locale="is" />;
}
