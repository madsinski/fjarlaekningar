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
import { emailModeFor } from "./email-prefs";
import { notifyDoctors } from "./notify";

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
    if ((await emailModeFor(opts.fromDoctor, "marketMine")) !== "now") return;
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

// ── Vaktaskipti: vakt fyrir vakt ────────────────────────────────────────────
// Markaðurinn snýst um að GEFA vakt frá sér; skipti eru gagnkvæm og því
// sérstakar aðgerðir: báðar vaktirnar skipta um hendur í sömu andrá.

export interface SwapSide {
  id: string;
  doctor_id: string | null;
  shift_date: string;
  starts: string;
  ends: string;
  label: string;
  published: boolean;
  confirm_status: string | null;
}

const SIDE_COLS = "id, doctor_id, shift_date, starts, ends, label, published, confirm_status";

/** Báðar vaktir skiptanna í einni fyrirspurn. */
export async function loadSwapSides(aId: string, bId: string): Promise<{ a: SwapSide; b: SwapSide } | null> {
  const { data } = await supabaseAdmin.from("hsu_shifts").select(SIDE_COLS).in("id", [aId, bId]);
  const a = (data ?? []).find((s) => s.id === aId) as SwapSide | undefined;
  const b = (data ?? []).find((s) => s.id === bId) as SwapSide | undefined;
  return a && b ? { a, b } : null;
}

/**
 * Myndu skiptin setja annan hvorn á tvær vaktir sem skarast í tíma? Vaktin sem
 * læknirinn gefur frá sér telst ekki með — hún er farin eftir skiptin.
 * Skilar nafni þess sem fær tvær vaktir á sama tíma, annars null.
 */
export async function swapOverlap(a: SwapSide, b: SwapSide): Promise<"a" | "b" | null> {
  const clash = async (receiver: string, incoming: SwapSide, givenAway: string) => {
    const { data } = await supabaseAdmin
      .from("hsu_shifts").select("id, starts, ends")
      .eq("doctor_id", receiver).eq("shift_date", incoming.shift_date)
      .neq("id", givenAway).neq("id", incoming.id);
    return ((data ?? []) as { starts: string; ends: string }[]).some((r) => timesOverlap(r, incoming));
  };
  if (a.doctor_id && (await clash(a.doctor_id, b, a.id))) return "a";
  if (b.doctor_id && (await clash(b.doctor_id, a, b.id))) return "b";
  return null;
}

/**
 * Framkvæma skiptin: vaktirnar fara hver til síns nýja læknis, beiðnin er
 * samþykkt og önnur opin boð á þessar vaktir falla niður. Báðir læknar fá
 * tilkynningu og dagatöl þeirra eru samstillt.
 */
export async function swapShifts(opts: {
  swapId: string;
  a: SwapSide;      // vaktin sem beiðandinn gaf
  b: SwapSide;      // vaktin sem hann vildi í staðinn
  aDoctor: string;  // beiðandinn
  bDoctor: string;  // viðtakandinn
  actor: string;
  origin: string;
}) {
  const now = new Date().toISOString();
  // Hver vakt fer til hins læknisins.
  for (const [shiftId, doctorId] of [[opts.a.id, opts.bDoctor], [opts.b.id, opts.aDoctor]] as const) {
    const { error } = await supabaseAdmin.from("hsu_shifts").update({ doctor_id: doctorId, status: "assigned" }).eq("id", shiftId);
    if (error) throw new Error(error.message);
  }
  await supabaseAdmin.from("hsu_swaps").update({ status: "accepted", resolved_at: now, taken_by: opts.bDoctor }).eq("id", opts.swapId);
  // Opin boð á vaktir sem eru nýbúnar að skipta um hendur eiga ekki að standa.
  await supabaseAdmin.from("hsu_swaps").update({ status: "cancelled", resolved_at: now })
    .in("shift_id", [opts.a.id, opts.b.id]).in("status", ["pending", "awaiting_approval"]);
  await audit(opts.actor, "swap.done", opts.a.shift_date.slice(0, 7), {
    swapId: opts.swapId, aShift: opts.a.id, bShift: opts.b.id, aDoctor: opts.aDoctor, bDoctor: opts.bDoctor,
  });

  after(async () => { await hsuSync.syncDoctors([opts.aDoctor, opts.bDoctor]); });

  // Hvor læknir fær sína línu: hvað hann fékk og hvað hann lét. Tilkynningin
  // birtist alltaf í kerfinu; pósturinn fer eftir stillingu hvers og eins.
  const { data: docs } = await supabaseAdmin.from("hsu_doctors").select("id, name").in("id", [opts.aDoctor, opts.bDoctor]);
  const nameOf = (id: string) => (docs ?? []).find((d) => d.id === id)?.name ?? "";
  const tn = (l: Lang) => translator(notifyMsgs, l);
  notifyDoctors({
    origin: opts.origin,
    category: "marketMine",
    subject: (l) => tn(l)("swap.done.subject"),
    heading: (l) => tn(l)("swap.done.heading"),
    intro: (l) => tn(l)("swap.done.calendar"),
    notices: [
      { doctorId: opts.aDoctor, line: (l: Lang) => tn(l)("swap.done.line", { name: nameOf(opts.bDoctor), got: shiftPhrase(opts.b, l), gave: shiftPhrase(opts.a, l) }) },
      { doctorId: opts.bDoctor, line: (l: Lang) => tn(l)("swap.done.line", { name: nameOf(opts.aDoctor), got: shiftPhrase(opts.a, l), gave: shiftPhrase(opts.b, l) }) },
    ],
    cta: { label: (l) => tn(l)("cta.myShifts"), path: "/hsu/min-sida?t=plan" },
  });
}
