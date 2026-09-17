// Virkar starfsstöðvar fyrir nýskráningu (aðeins nöfn).

import { supabaseAdmin } from "@/lib/supabase-admin";
import { json } from "@/lib/vinnustod/server";

export const runtime = "nodejs";

export async function GET() {
  const { data } = await supabaseAdmin.from("gatt_workplaces").select("id, name").eq("active", true).order("name");
  return json({ ok: true, workplaces: data ?? [] });
}
