// Læknirinn skráir sjálfur hvaða vikudaga hann vinnur dagvinnu (dagvaktir).
// Fast stilling, ekki bundin mánuði — ólíkt vaktaóskum.

import { supabaseAdmin } from "@/lib/supabase-admin";
import { audit } from "@/lib/hsu/auth";
import { cleanWeekdays } from "@/lib/hsu/doctors";
import { notifyHeads } from "@/lib/hsu/notify";
import { fail, json, originOf, readJson, requireDoctor } from "@/lib/hsu/server";
import { WEEKDAY_SHORT_IS } from "@/lib/hsu/types";

export const runtime = "nodejs";

export async function PUT(req: Request) {
  const auth = await requireDoctor(req);
  if ("res" in auth) return auth.res;
  const days = cleanWeekdays((await readJson(req)).day_weekdays);
  if (!days) return fail("Ógild beiðni");

  const { data: before } = await supabaseAdmin.from("hsu_doctors").select("day_weekdays").eq("id", auth.doctor.id).maybeSingle();
  const { error } = await supabaseAdmin.from("hsu_doctors").update({ day_weekdays: days }).eq("id", auth.doctor.id);
  if (error) return fail(error.message, 500);

  const label = days.length ? days.map((d) => WEEKDAY_SHORT_IS[d]).join(", ") : "alla daga";
  await audit(auth.doctor.name, "doctor.day_weekdays", null, { days });
  // Yfirlæknir skipuleggur út frá þessu og á að vita af breytingunni.
  if (JSON.stringify(before?.day_weekdays ?? []) !== JSON.stringify(days)) {
    notifyHeads({
      origin: originOf(req),
      subject: `${auth.doctor.name} breytti dagvinnudögum`,
      heading: "Dagvinnudagar uppfærðir",
      lines: [`${auth.doctor.name} vinnur nú dagvaktir: ${label}.`],
      path: "/hsu/stjorn?t=laeknar",
    });
  }
  return json({ ok: true, day_weekdays: days });
}
