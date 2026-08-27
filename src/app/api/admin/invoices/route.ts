// Invoices the contractors have issued. Nothing is "shared" — issuing one puts
// it here, because both sides are already in the same database.

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getCallerStaff, isAdmin } from "@/lib/admin-auth";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const caller = await getCallerStaff(req);
  if (!isAdmin(caller)) return NextResponse.json({ ok: false, error: "Admin role required" }, { status: 403 });

  const { data, error } = await supabaseAdmin
    .from("contractor_invoices")
    .select("*, staff:staff_id (name, email)")
    .neq("status", "draft")
    .order("period_year", { ascending: false })
    .order("period_month", { ascending: false })
    .limit(200);
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, invoices: data ?? [] });
}
