// Tilkynningar sem birtast efst í vinnustöðinni.

import { after } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { signalAnnouncements } from "@/lib/vinnustod/live";
import { getVsAdmin } from "@/lib/vinnustod/admin";
import { cleanLine, cleanText, fail, json, readJson } from "@/lib/vinnustod/server";

export const runtime = "nodejs";

const DENY = "Krefst stjórnanda með tveggja þrepa auðkenningu";

export async function GET(req: Request) {
  if (!(await getVsAdmin(req))) return fail(DENY, 403);
  const { data } = await supabaseAdmin.from("gatt_announcements")
    .select("id, created_at, created_by, title, body, level, active, expires_at").order("created_at", { ascending: false }).limit(100);
  return json({ ok: true, announcements: data ?? [] });
}

export async function POST(req: Request) {
  const admin = await getVsAdmin(req);
  if (!admin) return fail(DENY, 403);
  const body = await readJson(req);
  const title = cleanLine(body.title, 160);
  if (!title) return fail("Skrifaðu fyrirsögn.");
  const expires = typeof body.expires_at === "string" && body.expires_at ? new Date(body.expires_at) : null;
  if (expires && Number.isNaN(expires.getTime())) return fail("Ógild dagsetning.");
  const { error } = await supabaseAdmin.from("gatt_announcements").insert({
    title,
    body: cleanText(body.body, 2000),
    level: body.level === "warning" ? "warning" : "info",
    expires_at: expires?.toISOString() ?? null,
    created_by: admin.name,
  });
  if (error) return fail(error.message, 500);
  after(() => signalAnnouncements().catch(() => {}));
  return json({ ok: true });
}
