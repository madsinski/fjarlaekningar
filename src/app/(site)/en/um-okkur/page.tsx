import type { Metadata } from "next";
import UmOkkurPage, { umOkkurMetadata } from "../../(is)/um-okkur/um-okkur-page";


export function generateMetadata(): Promise<Metadata> {
  return umOkkurMetadata("en");
}

export default function Page() {
  return <UmOkkurPage locale="en" />;
}
