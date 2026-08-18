import type { Metadata } from "next";
import FjolmidlarPage, { fjolmidlarMetadata } from "./fjolmidlar-page";

export const dynamic = "force-dynamic";

export function generateMetadata(): Promise<Metadata> {
  return fjolmidlarMetadata("is");
}

export default function Page() {
  return <FjolmidlarPage locale="is" />;
}
