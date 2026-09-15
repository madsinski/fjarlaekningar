// Byrjar Google-samþykktarferlið fyrir lækni HSU.

import { NextResponse } from "next/server";
import { consentUrl, googleConfigured } from "@/lib/google-calendar";
import { getDoctorSession } from "@/lib/hsu/auth";

export const runtime = "nodejs";

export async function GET(req: Request) {
  if (!googleConfigured()) return new Response("Google-tenging er ekki uppsett", { status: 503 });
  const doctor = await getDoctorSession();
  if (!doctor) return NextResponse.redirect(new URL("/hsu", req.url));
  return NextResponse.redirect(consentUrl(doctor.id, "/hsu/min-sida?t=stillingar", "hsu"));
}
