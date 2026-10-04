// Börnin í smiðjunni — aðeins foreldri.
//   GET  /api/bokasmidja/children
//   POST /api/bokasmidja/children  { name, avatar, color, lang, age, pin }

import { supabaseAdmin } from "@/lib/supabase-admin";
import { CHILD_COLUMNS, hashSecret, pinOk, toChild } from "@/lib/bokasmidja/auth";
import { cleanLine, fail, json, readJson, requireParent } from "@/lib/bokasmidja/server";
import { AVATARS, COLORS, isLang } from "@/lib/bokasmidja/types";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const auth = await requireParent(req);
  if ("res" in auth) return auth.res;
  const { data } = await supabaseAdmin.from("bk_children").select(CHILD_COLUMNS).order("created_at");
  return json({ ok: true, children: (data || []).map(toChild) });
}

export async function POST(req: Request) {
  const auth = await requireParent(req);
  if ("res" in auth) return auth.res;
  const body = await readJson(req);
  const name = cleanLine(body.name, 40);
  const pin = typeof body.pin === "string" ? body.pin : "";
  if (!name) return fail("name_missing");
  if (!pinOk(pin)) return fail("weak_pin");
  const age = Number(body.age);

  const { count } = await supabaseAdmin.from("bk_children").select("id", { count: "exact", head: true });
  if ((count ?? 0) >= 12) return fail("too_many");

  const { data, error } = await supabaseAdmin.from("bk_children").insert({
    name,
    avatar: typeof body.avatar === "string" && AVATARS[body.avatar] ? body.avatar : "fox",
    color: typeof body.color === "string" && COLORS.includes(body.color) ? body.color : COLORS[0],
    lang: isLang(body.lang) ? body.lang : "is",
    age: Number.isInteger(age) && age >= 2 && age <= 17 ? age : null,
    pin_hash: await hashSecret(pin),
  }).select(CHILD_COLUMNS).single();
  if (error || !data) return fail("failed", 500);
  return json({ ok: true, child: toChild(data) });
}
