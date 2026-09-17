// Starfsstöðvar vinnustöðvarinnar. Server-only.
//
// gatt_users.workplace (texti) fylgir alltaf nafni stöðvarinnar, svo allt sem
// sýnir vinnustað (póstar, viðvera, samtöl) virkar óbreytt.

import { supabaseAdmin } from "@/lib/supabase-admin";

export interface Workplace { id: string; name: string; address: string; phone: string; note: string; active: boolean }

export async function findWorkplace(id: unknown): Promise<Workplace | null> {
  if (typeof id !== "string" || !/^[0-9a-f-]{36}$/i.test(id)) return null;
  const { data } = await supabaseAdmin.from("gatt_workplaces").select("id, name, address, phone, note, active").eq("id", id).maybeSingle();
  return (data as Workplace | null) ?? null;
}

/** Tengir notanda við stöð (eða aftengir með null) og uppfærir textann. */
export async function setUserWorkplace(userId: string, w: Workplace | null, freeText = "") {
  await supabaseAdmin.from("gatt_users")
    .update({ workplace_id: w?.id ?? null, workplace: w?.name ?? freeText })
    .eq("id", userId);
}
