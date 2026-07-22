import type { Metadata } from "next";
import { getPage } from "@/lib/site-content/server";
import UmOkkurView from "./UmOkkurView";

export const metadata: Metadata = {
  title: "Um okkur — Fjarlækningar ehf.",
  description:
    "Fjarlækningar ehf. er íslenskt fyrirtæki sem býður upp á örugga fjarlæknisþjónustu í gegnum sjúklingagátt Fjarlækninga.",
};

// Per-request render: `lang` cookie + latest PUBLISHED content, falling back to
// the built-in Icelandic defaults so nothing changes until someone publishes.
export const dynamic = "force-dynamic";

export default async function UmOkkurPage() {
  const { c, order, locale } = await getPage("um-okkur");
  return <UmOkkurView c={c} order={order} locale={locale} />;
}
