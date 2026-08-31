import type { Metadata } from "next";
import ErindiPage, { erindiMetadata, type Params } from "./erindi-page";
import { erindi } from "@/erindi";

// Prerender every erindi at build time. Without this the route stays dynamic and
// each visit renders from scratch — these are the pages that have to rank, so
// they are the last ones that should be paying for a database round trip.
export function generateStaticParams() {
  return erindi.map((e) => ({ slug: e.slug }));
}

export function generateMetadata(props: Params): Promise<Metadata> {
  return erindiMetadata(props, "is");
}

export default function Page(props: Params) {
  return <ErindiPage {...props} locale="is" />;
}
