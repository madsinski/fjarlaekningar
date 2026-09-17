import type { Metadata } from "next";
import { translator } from "@/lib/hsu/i18n/core";
import { getHsuLang } from "@/lib/hsu/i18n/server";
import { auth } from "@/lib/hsu/i18n/messages/auth";
import { common } from "@/lib/hsu/i18n/messages/common";
import { redirect } from "next/navigation";
import { getDoctorSession } from "@/lib/hsu/auth";
import LoginClient from "./_components/LoginClient";

export const dynamic = "force-dynamic";
export async function generateMetadata(): Promise<Metadata> {
  const lang = await getHsuLang();
  const t = translator(auth, lang);
  return { title: { absolute: t("meta.pageTitle", { page: t("meta.login"), app: translator(common, lang)("app.name") }) } };
}

export default async function HsuLoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const doctor = await getDoctorSession();
  const { next } = await searchParams;
  const safeNext = typeof next === "string" && next.startsWith("/hsu/") && !next.startsWith("//") ? next : "";
  if (doctor) redirect(safeNext || (doctor.role === "head" ? "/hsu/stjorn" : "/hsu/min-sida"));
  return <LoginClient next={safeNext} />;
}
