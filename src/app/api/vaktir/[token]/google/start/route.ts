// Byrjar Google-samþykktarferlið. Sendir lækninn á samþykktarsíðu Google.

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { consentUrl, googleConfigured } from "@/lib/google-calendar";

export const runtime = "nodejs";

export async function GET(req: Request, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params;
  if (!token || token.length < 16) return new Response("Ógildur hlekkur", { status: 400 });
  if (!googleConfigured()) return new Response("Google-tenging er ekki uppsett", { status: 503 });

  const { data: doctor } = await supabaseAdmin
    .from("roster_doctors")
    .select("id")
    .eq("access_token", token)
    .maybeSingle();
  if (!doctor) return new Response("Læknir fannst ekki", { status: 404 });

  // Come back to whichever page sent them — Mín síða and the standalone shift
  // page both mount the same panel, and landing on the other one is confusing.
  const returnTo = new URL(req.url).searchParams.get("from") ?? "";
  return NextResponse.redirect(consentUrl(doctor.id, returnTo));
}
