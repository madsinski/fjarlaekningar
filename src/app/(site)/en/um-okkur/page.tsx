import type { Metadata } from "next";
import UmOkkurPage, { umOkkurMetadata } from "../../um-okkur/um-okkur-page";

export const dynamic = "force-dynamic";

export function generateMetadata(): Promise<Metadata> {
  return umOkkurMetadata("en");
}

export default function Page() {
  return <UmOkkurPage locale="en" />;
}
