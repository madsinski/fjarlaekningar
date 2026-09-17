// Starfsstöðvar: listi (með fjölda notenda) og ný stöð.

import { supabaseAdmin } from "@/lib/supabase-admin";
import { getVsAdmin } from "@/lib/vinnustod/admin";
import { cleanLine, cleanText, fail, json, readJson } from "@/lib/vinnustod/server";

export const runtime = "nodejs";

const DENY = "Krefst stjórnanda með tveggja þrepa auðkenningu";

export async function GET(req: Request) {
  if (!(await getVsAdmin(req))) return fail(DENY, 403);
  const [{ data: places, error }, { data: users }] = await Promise.all([
    supabaseAdmin.from("gatt_workplaces").select("id, name, address, phone, note, active, created_at").order("name"),
    supabaseAdmin.from("gatt_users").select("workplace_id, workplace, active"),
  ]);
  if (error) return fail(error.message, 500);
  const count = new Map<string, { all: number; active: number }>();
  for (const u of users ?? []) {
    if (!u.workplace_id) continue;
    const c = count.get(u.workplace_id) ?? { all: 0, active: 0 };
    c.all++;
    if (u.active) c.active++;
    count.set(u.workplace_id, c);
  }
  // Notendur með vinnustað sem er ekki á listanum (t.d. úr nýskráningu).
  const unlinked = [...new Set((users ?? []).filter((u) => !u.workplace_id && u.workplace?.trim()).map((u) => u.workplace.trim()))];
  return json({
    ok: true,
    workplaces: (places ?? []).map((p) => ({ ...p, users: count.get(p.id)?.all ?? 0, activeUsers: count.get(p.id)?.active ?? 0 })),
    unlinked,
  });
}

export async function POST(req: Request) {
  const admin = await getVsAdmin(req);
  if (!admin) return fail(DENY, 403);
  const body = await readJson(req);
  const name = cleanLine(body.name, 120);
  if (!name) return fail("Skrifaðu nafn starfsstöðvar.");
  const { data, error } = await supabaseAdmin.from("gatt_workplaces").insert({
    name,
    address: cleanLine(body.address, 200),
    phone: cleanLine(body.phone, 40),
    note: cleanText(body.note, 500),
    created_by: admin.name,
  }).select("id").single();
  if (error?.code === "23505") return fail("Starfsstöð með þessu nafni er þegar til.", 409);
  if (error || !data) return fail(error?.message ?? "Vistun mistókst", 500);
  // Notendur sem skráðu þennan vinnustað sem texta tengjast stöðinni strax.
  const { data: loose } = await supabaseAdmin.from("gatt_users").select("id, workplace").is("workplace_id", null);
  const match = (loose ?? []).filter((u) => (u.workplace ?? "").trim().toLowerCase() === name.toLowerCase()).map((u) => u.id);
  if (match.length) await supabaseAdmin.from("gatt_users").update({ workplace_id: data.id, workplace: name }).in("id", match);
  return json({ ok: true, id: data.id, linked: match.length });
}
