import type { Metadata } from "next";
import { translator } from "@/lib/hsu/i18n/core";
import { getHsuLang } from "@/lib/hsu/i18n/server";
import { auth } from "@/lib/hsu/i18n/messages/auth";
import { common } from "@/lib/hsu/i18n/messages/common";
import { redirect } from "next/navigation";
import { getDoctorSession } from "@/lib/hsu/auth";
import { loadPortal } from "@/lib/hsu/portal";
import DoctorPortal from "./DoctorPortal";

export const dynamic = "force-dynamic";
export async function generateMetadata(): Promise<Metadata> {
  const lang = await getHsuLang();
  const t = translator(auth, lang);
  return { title: { absolute: t("meta.pageTitle", { page: t("meta.myPage"), app: translator(common, lang)("app.name") }) } };
}

export default async function MinSidaPage({ searchParams }: { searchParams: Promise<{ t?: string; m?: string }> }) {
  const doctor = await getDoctorSession();
  if (!doctor) redirect("/hsu?next=/hsu/min-sida");
  const { t, m } = await searchParams;
  const data = await loadPortal(doctor.id);
  return <DoctorPortal data={data} initialTab={t ?? ""} initialMonth={m ?? ""} />;
}
