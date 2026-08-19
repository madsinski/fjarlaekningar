import type { Metadata } from "next";
import ErindiPage, { erindiMetadata, type Params } from "./erindi-page";

export const dynamic = "force-dynamic";

export function generateMetadata(props: Params): Promise<Metadata> {
  return erindiMetadata(props, "is");
}

export default function Page(props: Params) {
  return <ErindiPage {...props} locale="is" />;
}
