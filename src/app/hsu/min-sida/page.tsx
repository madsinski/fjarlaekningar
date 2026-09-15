import { redirect } from "next/navigation";
import { getDoctorSession } from "@/lib/hsu/auth";
import { loadPortal } from "@/lib/hsu/portal";
import DoctorPortal from "./DoctorPortal";

export const dynamic = "force-dynamic";
export const metadata = { title: { absolute: "Mín síða — Vaktakerfi HSU" } };

export default async function MinSidaPage({ searchParams }: { searchParams: Promise<{ t?: string; m?: string }> }) {
  const doctor = await getDoctorSession();
  if (!doctor) redirect("/hsu?next=/hsu/min-sida");
  const { t, m } = await searchParams;
  const data = await loadPortal(doctor.id);
  return <DoctorPortal data={data} initialTab={t ?? ""} initialMonth={m ?? ""} />;
}
