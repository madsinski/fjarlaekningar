import type { Metadata } from "next";
import { getPage } from "@/lib/site-content/server";
import { alternatesFor } from "@/lib/seo";
import type { Locale } from "@/lib/site-content/types";
import HafaSambandView from "./HafaSambandView";

// One implementation, two URLs: /hafa-samband and /en/hafa-samband.

const META = {
  is: {
    title: "Hafa samband",
    description:
      "Hafðu samband við Fjarlækningar ehf. Fyrir læknisþjónustu, opnaðu sjúklingagátt Fjarlækninga.",
  },
  en: {
    title: "Contact us",
    description:
      "Get in touch with Fjarlækningar ehf. For medical care, open the Fjarlækningar patient portal.",
  },
} as const;

export async function hafaSambandMetadata(locale: Locale): Promise<Metadata> {
  const { enReady } = await getPage("hafa-samband", locale);
  return {
    ...META[locale],
    alternates: alternatesFor("/hafa-samband", locale, enReady),
    ...(locale === "en" && !enReady ? { robots: { index: false, follow: true } } : {}),
  };
}

export default async function HafaSambandPage({ locale }: { locale: Locale }) {
  const { c, order } = await getPage("hafa-samband", locale);
  return <HafaSambandView c={c} order={order} locale={locale} />;
}
