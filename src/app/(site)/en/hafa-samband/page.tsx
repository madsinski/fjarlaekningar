import type { Metadata } from "next";
import HafaSambandPage, { hafaSambandMetadata } from "../../hafa-samband/hafa-samband-page";

export const dynamic = "force-dynamic";

export function generateMetadata(): Promise<Metadata> {
  return hafaSambandMetadata("en");
}

export default function Page() {
  return <HafaSambandPage locale="en" />;
}
