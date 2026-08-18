import type { Metadata } from "next";
import { getPage } from "@/lib/site-content/server";
import { alternatesFor } from "@/lib/seo";
import type { Locale } from "@/lib/site-content/types";
import UmOkkurView from "./UmOkkurView";

// One implementation, two URLs: /um-okkur and /en/um-okkur. The Icelandic slug
// is kept in the English path — it is the canonical name of the page.

const META = {
  is: {
    title: "Um okkur",
    description:
      "Fjarlækningar ehf. er íslenskt fyrirtæki sem býður upp á örugga fjarlæknisþjónustu í gegnum sjúklingagátt Fjarlækninga.",
  },
  en: {
    title: "About us",
    description:
      "Fjarlækningar ehf. is an Icelandic company providing secure telemedicine through the Fjarlækningar patient portal.",
  },
} as const;

export async function umOkkurMetadata(locale: Locale): Promise<Metadata> {
  const { enReady } = await getPage("um-okkur", locale);
  return {
    ...META[locale],
    alternates: alternatesFor("/um-okkur", locale, enReady),
    ...(locale === "en" && !enReady ? { robots: { index: false, follow: true } } : {}),
  };
}

export default async function UmOkkurPage({ locale }: { locale: Locale }) {
  const { c, order } = await getPage("um-okkur", locale);
  return <UmOkkurView c={c} order={order} locale={locale} />;
}
