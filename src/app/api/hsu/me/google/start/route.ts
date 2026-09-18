// Byrjar Google-samþykktarferlið fyrir lækni HSU.

import { NextResponse } from "next/server";
import { consentUrl, googleConfigured } from "@/lib/google-calendar";
import { getDoctorSession } from "@/lib/hsu/auth";
import { tr } from "@/lib/hsu/i18n/server";
import { apiDoctor } from "@/lib/hsu/i18n/messages/api-doctor";

export const runtime = "nodejs";

export async function GET(req: Request) {
  if (!googleConfigured()) return new Response(tr(req, apiDoctor)("google.notConfigured"), { status: 503 });
  const doctor = await getDoctorSession();
  if (!doctor) return NextResponse.redirect(new URL("/hsu", req.url));
  // Úr fyrstu innskráningu (?return=welcome): aftur í sama gluggann á Yfirliti.
  const welcome = new URL(req.url).searchParams.get("return") === "welcome";
  return NextResponse.redirect(consentUrl(doctor.id, welcome ? "/hsu/min-sida?t=yfirlit&welcome=calendar" : "/hsu/min-sida?t=stillingar", "hsu"));
}
