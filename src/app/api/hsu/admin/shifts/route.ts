// Bæta við aukavakt á dag (utan vaktategunda, t.d. aukamönnun um Þjóðhátíð).

import { after } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { hsuSync } from "@/lib/hsu/calendar";
import { audit } from "@/lib/hsu/auth";
import { DATE_RE, SHIFT_COLUMNS, UUID_RE, fail, json, loadMonth, readJson, requireManager } from "@/lib/hsu/server";

export const runtime = "nodejs";

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

export async function POST(req: Request) {
  const auth = await requireManager(req);
  if ("res" in auth) return auth.res;
  const body = await readJson(req);
  const date = String(body.shift_date ?? "");
  if (!DATE_RE.test(date)) return fail("Ógild dagsetning");
  const starts = String(body.starts ?? "08:00");
  const ends = String(body.ends ?? "16:00");
  if (!TIME_RE.test(starts) || !TIME_RE.test(ends)) return fail("Ógildur tími");
  const doctorId = body.doctor_id ? String(body.doctor_id) : null;
  if (doctorId && !UUID_RE.test(doctorId)) return fail("Ógild beiðni");
  const m = await loadMonth(date.slice(0, 7));

  const { data, error } = await supabaseAdmin
    .from("hsu_shifts")
    .insert({
      shift_date: date, shift_type_id: null, label: String(body.label ?? "Aukavakt").slice(0, 30),
      starts, ends, doctor_id: doctorId, status: "assigned", note: String(body.note ?? "").slice(0, 300),
      published: m?.status === "published",
    })
    .select(SHIFT_COLUMNS)
    .single();
  if (error) return fail(error.message, 500);
  if (data.published && doctorId) after(async () => { await hsuSync.syncDoctors([doctorId]); });
  await audit(auth.actor.label, "shift.create", date.slice(0, 7), { shiftId: data.id, date });
  return json({ ok: true, shift: data });
}
