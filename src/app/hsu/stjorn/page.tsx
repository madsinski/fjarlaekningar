import type { Metadata } from "next";
import { translator } from "@/lib/hsu/i18n/core";
import { getHsuLang } from "@/lib/hsu/i18n/server";
import { auth } from "@/lib/hsu/i18n/messages/auth";
import { common } from "@/lib/hsu/i18n/messages/common";
import PlannerApp from "./PlannerApp";

export const dynamic = "force-dynamic";
export async function generateMetadata(): Promise<Metadata> {
  const lang = await getHsuLang();
  const t = translator(auth, lang);
  return { title: { absolute: t("meta.pageTitle", { page: t("meta.planner"), app: translator(common, lang)("app.name") }) } };
}

export default function StjornPage() {
  return <PlannerApp />;
}
