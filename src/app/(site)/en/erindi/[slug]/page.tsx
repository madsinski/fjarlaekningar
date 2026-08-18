import type { Metadata } from "next";
import ErindiPage, { erindiMetadata, type Params } from "../../../erindi/[slug]/erindi-page";

export const dynamic = "force-dynamic";

export function generateMetadata(props: Params): Promise<Metadata> {
  return erindiMetadata(props, "en");
}

export default function Page(props: Params) {
  return <ErindiPage {...props} locale="en" />;
}
