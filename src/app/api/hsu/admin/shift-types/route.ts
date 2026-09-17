// Vaktategundir: búa til nýja.

import { supabaseAdmin } from "@/lib/supabase-admin";
import { audit } from "@/lib/hsu/auth";
import { fail, json, readJson, requireManager } from "@/lib/hsu/server";
import { cleanShiftType } from "@/lib/hsu/shift-types";
import { tr } from "@/lib/hsu/i18n/server";
import { apiAdmin } from "@/lib/hsu/i18n/messages/api-admin";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const auth = await requireManager(req);
  if ("res" in auth) return auth.res;
  const row = cleanShiftType(await readJson(req), false, tr(req, apiAdmin).lang);
  if (typeof row === "string") return fail(row);
  const { data, error } = await supabaseAdmin.from("hsu_shift_types").insert(row).select("*").single();
  if (error) return fail(error.message, 500);
  await audit(auth.actor.label, "shift_type.create", null, { id: data.id, name: data.name });
  return json({ ok: true, shiftType: data });
}
