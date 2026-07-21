import type { Metadata } from "next";
import { getPage } from "@/lib/site-content/server";
import HafaSambandView from "./HafaSambandView";

export const metadata: Metadata = {
  title: "Hafa samband — Fjarlækningar ehf.",
  description:
    "Hafðu samband við Fjarlækningar ehf. Fyrir læknisþjónustu, opnaðu sjúklingagátt Fjarlækninga.",
};

// Per-request render: `lang` cookie + latest PUBLISHED content, falling back to
// the built-in Icelandic defaults so nothing changes until someone publishes.
export const dynamic = "force-dynamic";

export default async function HafaSambandPage() {
  const { c, order } = await getPage("hafa-samband");
  return <HafaSambandView c={c} order={order} />;
}
