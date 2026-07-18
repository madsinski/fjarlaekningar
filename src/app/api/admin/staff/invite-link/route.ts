// Generate a fresh token_hash set-password link for an existing staff member
// (admin only). Used by the Team page's "copy invite link" action for people
// who haven't set a password / onboarded yet.

import { NextResponse } from "next/server";
import { getCallerStaff, isAdmin } from "@/lib/admin-auth";
import { generateInviteLink } from "@/lib/invite-link";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const caller = await getCallerStaff(req);
  if (!isAdmin(caller)) {
    return NextResponse.json({ ok: false, error: "Admin role required" }, { status: 403 });
  }
  let email = "";
  try {
    email = String((await req.json())?.email || "").trim().toLowerCase();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }
  if (!email) return NextResponse.json({ ok: false, error: "Email required" }, { status: 400 });

  const link = await generateInviteLink(email);
  if (!link) return NextResponse.json({ ok: false, error: "Could not generate link" }, { status: 500 });
  return NextResponse.json({ ok: true, invite_link: link });
}
