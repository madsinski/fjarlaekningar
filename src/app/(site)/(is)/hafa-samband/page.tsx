import type { Metadata } from "next";
import HafaSambandPage, { hafaSambandMetadata } from "./hafa-samband-page";


export function generateMetadata(): Promise<Metadata> {
  return hafaSambandMetadata("is");
}

export default function Page() {
  return <HafaSambandPage locale="is" />;
}
