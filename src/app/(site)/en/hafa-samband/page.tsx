import type { Metadata } from "next";
import HafaSambandPage, { hafaSambandMetadata } from "../../(is)/hafa-samband/hafa-samband-page";


export function generateMetadata(): Promise<Metadata> {
  return hafaSambandMetadata("en");
}

export default function Page() {
  return <HafaSambandPage locale="en" />;
}
