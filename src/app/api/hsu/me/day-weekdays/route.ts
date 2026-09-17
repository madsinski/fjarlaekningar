// Læknirinn skráir sjálfur hvaða vikudaga hann vinnur dagvinnu (dagvaktir).
// Fast stilling, ekki bundin mánuði — ólíkt vaktaóskum.

import { supabaseAdmin } from "@/lib/supabase-admin";
import { audit } from "@/lib/hsu/auth";
import { cleanWeekdays } from "@/lib/hsu/doctors";
import { notifyHeads } from "@/lib/hsu/notify";
import { fail, json, originOf, readJson, requireDoctor } from "@/lib/hsu/server";
import { weekdayShortL } from "@/lib/hsu/i18n/format";
import { translator, type Lang } from "@/lib/hsu/i18n/core";
import { notifyMsgs } from "@/lib/hsu/i18n/messages/notify";
import { tr } from "@/lib/hsu/i18n/server";
import { apiDoctor } from "@/lib/hsu/i18n/messages/api-doctor";

export const runtime = "nodejs";

export async function PUT(req: Request) {
  const auth = await requireDoctor(req);
  if ("res" in auth) return auth.res;
  const days = cleanWeekdays((await readJson(req)).day_weekdays);
  if (!days) return fail(tr(req, apiDoctor)("req.invalid"));

  const { data: before } = await supabaseAdmin.from("hsu_doctors").select("day_weekdays").eq("id", auth.doctor.id).maybeSingle();
  const { error } = await supabaseAdmin.from("hsu_doctors").update({ day_weekdays: days }).eq("id", auth.doctor.id);
  if (error) return fail(error.message, 500);

  await audit(auth.doctor.name, "doctor.day_weekdays", null, { days });
  // Yfirlæknir skipuleggur út frá þessu og á að vita af breytingunni.
  if (JSON.stringify(before?.day_weekdays ?? []) !== JSON.stringify(days)) {
    const name = auth.doctor.name;
    const label = (l: Lang) => (days.length ? days.map((d) => weekdayShortL(d, l)).join(", ") : translator(notifyMsgs, l)("dayWeekdays.all"));
    notifyHeads({
      origin: originOf(req),
      subject: (l) => translator(notifyMsgs, l)("dayWeekdays.subject", { name }),
      heading: (l) => translator(notifyMsgs, l)("dayWeekdays.heading"),
      lines: [(l) => translator(notifyMsgs, l)("dayWeekdays.line", { name, days: label(l) })],
      path: "/hsu/stjorn?t=laeknar",
    });
  }
  return json({ ok: true, day_weekdays: days });
}
