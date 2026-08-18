import type { Metadata } from "next";
import UmOkkurPage, { umOkkurMetadata } from "./um-okkur-page";

export const dynamic = "force-dynamic";

export function generateMetadata(): Promise<Metadata> {
  return umOkkurMetadata("is");
}

export default function Page() {
  return <UmOkkurPage locale="is" />;
}
