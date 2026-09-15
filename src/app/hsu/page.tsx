import { redirect } from "next/navigation";
import { getDoctorSession } from "@/lib/hsu/auth";
import LoginClient from "./_components/LoginClient";

export const dynamic = "force-dynamic";
export const metadata = { title: { absolute: "Innskráning — Vaktakerfi HSU" } };

export default async function HsuLoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const doctor = await getDoctorSession();
  const { next } = await searchParams;
  const safeNext = typeof next === "string" && next.startsWith("/hsu/") && !next.startsWith("//") ? next : "";
  if (doctor) redirect(safeNext || (doctor.role === "head" ? "/hsu/stjorn" : "/hsu/min-sida"));
  return <LoginClient next={safeNext} />;
}
