// Vaktamarkaður HSU: setja vakt á vaktamarkað, bjóða lækni, taka vakt.
// Server-only. Sameiginlegt fyrir læknaleiðir og samþykki yfirlæknis.

import { after } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { hsuSync } from "./calendar";
import { audit } from "./auth";
import { hsuEmailHtml, sendHsuEmail } from "./server";
import { hhmm, timesOverlap } from "./types";
import { DEFAULT_LANG, isLang, translator, type Lang } from "./i18n/core";
import { dayLabelL, weekdayLongL, weekdayOfDate } from "./i18n/format";
import { notifyMsgs } from "./i18n/messages/notify";
import { emailMode } from "./email-prefs";

/** „FV mánudagur 5. okt. kl. 08:00–16:00“ á tungumáli viðtakandans. */
export function shiftPhrase(s: { shift_date: string; starts: string; ends: string; label?: string }, lang: Lang = "is"): string {
  return translator(notifyMsgs, lang)("shift.phrase", {
    label: s.label ? `${s.label} ` : "",
    weekday: weekdayLongL(weekdayOfDate(s.shift_date), lang),
    date: dayLabelL(s.shift_date, lang),
    from: hhmm(s.starts),
    to: hhmm(s.ends),
  });
}

/** Færa vakt til nýs læknis og loka öllum opnum boðum á henni. */
export async function transferShift(opts: {
  swapId: string;
  shiftId: string;
  fromDoctor: string | null;
  toDoctor: string;
  actor: string;
  origin: string;
}) {
  const now = new Date().toISOString();
  const { data: shift, error } = await supabaseAdmin
    .from("hsu_shifts")
    .update({ doctor_id: opts.toDoctor, status: "assigned" })
    .eq("id", opts.shiftId)
    .select("shift_date, starts, ends, label")
    .single();
  if (error) throw new Error(error.message);
  await supabaseAdmin.from("hsu_swaps").update({ status: "accepted", resolved_at: now, taken_by: opts.toDoctor }).eq("id", opts.swapId);
  await supabaseAdmin
    .from("hsu_swaps")
    .update({ status: "cancelled", resolved_at: now })
    .eq("shift_id", opts.shiftId)
    .in("status", ["pending", "awaiting_approval"]);
  await audit(opts.actor, "market.transfer", shift.shift_date.slice(0, 7), { shiftId: opts.shiftId, from: opts.fromDoctor, to: opts.toDoctor });

  after(async () => {
    await hsuSync.syncDoctors([opts.fromDoctor, opts.toDoctor]);
    if ((await emailMode("marketMine")) !== "now") return;
    const ids = [opts.fromDoctor, opts.toDoctor].filter(Boolean) as string[];
    const { data: docs } = await supabaseAdmin.from("hsu_doctors").select("id, name, email, lang").in("id", ids);
    const from = docs?.find((d) => d.id === opts.fromDoctor);
    const to = docs?.find((d) => d.id === opts.toDoctor);
    if (from && to) {
      const lang: Lang = isLang(from.lang) ? from.lang : DEFAULT_LANG;
      const t = translator(notifyMsgs, lang);
      const vars = { name: to.name, shift: shiftPhrase(shift, lang) };
      await sendHsuEmail(
        from.email,
        t("market.taken.subject", vars),
        hsuEmailHtml({
          origin: opts.origin,
          lang,
          heading: t("market.taken.heading"),
          paragraphs: [t("market.taken.line", vars), t("market.taken.gone")],
          cta: { label: t("cta.myPage"), url: `${opts.origin}/hsu/min-sida` },
        }),
        t("market.taken.text", vars),
      );
    }
  });
}

/** Er vaktin bakvakt? */
export async function isBakvaktShift(shiftId: string): Promise<boolean> {
  const { data } = await supabaseAdmin.from("hsu_shifts").select("type:hsu_shift_types(kind)").eq("id", shiftId).maybeSingle();
  return (data?.type as unknown as { kind?: string } | null)?.kind === "bakvakt";
}

export async function canDoBakvakt(doctorId: string): Promise<boolean> {
  const { data } = await supabaseAdmin.from("hsu_doctors").select("can_bakvakt").eq("id", doctorId).maybeSingle();
  return Boolean(data?.can_bakvakt);
}

/**
 * Er læknirinn þegar á vakt SEM SKARAST í tíma þennan dag? Dagvakt og kvöldvakt
 * sama dag er leyfð (og oft forsenda mönnunar), sömuleiðis fyrir og eftir hádegi;
 * tvær vaktir á sama tíma eru það ekki.
 */
export async function hasShiftThatDay(doctorId: string, date: string, exceptShiftId: string): Promise<boolean> {
  const cols = "id, starts, ends";
  const [{ data: target }, { data }] = await Promise.all([
    supabaseAdmin.from("hsu_shifts").select(cols).eq("id", exceptShiftId).maybeSingle(),
    supabaseAdmin.from("hsu_shifts").select(cols).eq("doctor_id", doctorId).eq("shift_date", date).neq("id", exceptShiftId),
  ]);
  if (!target) return Boolean(data?.length);
  return ((data ?? []) as { starts: string; ends: string }[]).some((r) => timesOverlap(r, target as { starts: string; ends: string }));
}
