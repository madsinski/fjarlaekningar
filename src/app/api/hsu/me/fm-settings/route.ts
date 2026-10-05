// Flýtimóttaka læknisins: föstu dagarnir hans og þakið á vöktum.
// Þetta eru FASTAR stillingar — þær gilda alla mánuði, ekki bara þann sem er
// opinn, og læknirinn ræður þeim sjálfur (Óskir → skref 3).
//   GET → { dayWeekdays, fmMaxWeek, fmMaxMonth }
//   PUT { day_weekdays?: number[], fm_max_week?: number|null, fm_max_month?: number|null }

import { supabaseAdmin } from "@/lib/supabase-admin";
import { cleanFmMax, cleanWeekdays } from "@/lib/hsu/doctors";
import { audit } from "@/lib/hsu/auth";
import { fail, json, readJson, requireDoctor } from "@/lib/hsu/server";
import { tr } from "@/lib/hsu/i18n/server";
import { apiDoctor } from "@/lib/hsu/i18n/messages/api-doctor";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const auth = await requireDoctor(req);
  if ("res" in auth) return auth.res;
  const { data } = await supabaseAdmin
    .from("hsu_doctors").select("day_weekdays, fm_max_week, fm_max_month").eq("id", auth.doctor.id).maybeSingle();
  return json({
    ok: true,
    dayWeekdays: Array.isArray(data?.day_weekdays) ? data.day_weekdays.map(Number) : [],
    fmMaxWeek: data?.fm_max_week ?? null,
    fmMaxMonth: data?.fm_max_month ?? null,
  });
}

export async function PUT(req: Request) {
  const auth = await requireDoctor(req);
  if ("res" in auth) return auth.res;
  const t = tr(req, apiDoctor);
  const body = await readJson(req);

  const patch: Record<string, unknown> = {};
  if (body.day_weekdays !== undefined) {
    const days = cleanWeekdays(body.day_weekdays);
    if (!days) return fail(t("req.invalid"));
    patch.day_weekdays = days;
  }
  const week = cleanFmMax(body.fm_max_week, 7);
  if (body.fm_max_week !== undefined) {
    if (week === undefined) return fail(t("fm.badWeek"));
    patch.fm_max_week = week;
  }
  const month = cleanFmMax(body.fm_max_month, 31);
  if (body.fm_max_month !== undefined) {
    if (month === undefined) return fail(t("fm.badMonth"));
    patch.fm_max_month = month;
  }
  if (!Object.keys(patch).length) return fail(t("req.invalid"));

  const { error } = await supabaseAdmin.from("hsu_doctors").update(patch).eq("id", auth.doctor.id);
  if (error) return fail(error.message, 500);
  // Yfirlæknir sér breytinguna í breytingaskránni — hún hefur áhrif á vaktaplanið.
  await audit(auth.doctor.name, "doctor.fmSettings", null, patch);
  return json({ ok: true, ...patch });
}
