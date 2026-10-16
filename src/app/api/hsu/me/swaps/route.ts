// Læknir setur eina af SÍNUM vöktum á vaktamarkað eða býður hana lækni —
// og, með want_shift_id, biður um SKIPTI: sín vakt fyrir vakt annars læknis.

import { after } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { audit } from "@/lib/hsu/auth";
import { canDoBakvakt, isBakvaktShift, loadSwapSides, shiftPhrase, swapOverlap } from "@/lib/hsu/market";
import { notifyDoctors, notifyHeads } from "@/lib/hsu/notify";
import type { Lang } from "@/lib/hsu/i18n/core";
import { UUID_RE, fail, hsuEmailHtml, json, originOf, readJson, requireDoctor, sendHsuEmail } from "@/lib/hsu/server";
import { DEFAULT_LANG, isLang, translator } from "@/lib/hsu/i18n/core";
import { notifyMsgs } from "@/lib/hsu/i18n/messages/notify";
import { tr } from "@/lib/hsu/i18n/server";
import { apiDoctor } from "@/lib/hsu/i18n/messages/api-doctor";
import { emailModesFor } from "@/lib/hsu/email-prefs";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const auth = await requireDoctor(req);
  if ("res" in auth) return auth.res;
  const t = tr(req, apiDoctor);
  const me = auth.doctor;
  const body = await readJson(req);
  const shiftId = String(body.shift_id ?? "");
  const toDoctor = body.to_doctor ? String(body.to_doctor) : null;
  const note = typeof body.note === "string" ? body.note.slice(0, 300) : "";
  if (!UUID_RE.test(shiftId) || (toDoctor && !UUID_RE.test(toDoctor))) return fail(t("req.invalid"));
  if (toDoctor === me.id) return fail(t("swap.selfOffer"));

  // Skipti eru önnur aðgerð en boð: báðar vaktir skipta um hendur og vaktirnar
  // fara EKKI á markað á meðan beðið er.
  if (body.want_shift_id !== undefined) {
    return swapRequest(req, t, me, shiftId, String(body.want_shift_id ?? ""), note);
  }

  const { data: shift } = await supabaseAdmin
    .from("hsu_shifts")
    .select("id, doctor_id, shift_date, starts, ends, label, published, confirm_status")
    .eq("id", shiftId)
    .maybeSingle();
  if (!shift || shift.doctor_id !== me.id || !shift.published) return fail(t("shift.notYours"), 403);
  if (shift.shift_date < new Date().toISOString().slice(0, 10)) return fail(t("shift.past"));
  if (shift.confirm_status === "requested") return fail(t("shift.answerRequestFirst"));
  const bakvakt = await isBakvaktShift(shiftId);
  if (bakvakt && toDoctor && !(await canDoBakvakt(toDoctor))) return fail(t("swap.targetNoBakvakt"));

  let target: { id: string; name: string; email: string; lang: string | null } | null = null;
  if (toDoctor) {
    const { data } = await supabaseAdmin.from("hsu_doctors").select("id, name, email, active, lang").eq("id", toDoctor).maybeSingle();
    if (!data?.active) return fail(t("doctor.notFound"));
    target = data;
  }

  // Eitt virkt boð á hverja vakt.
  await supabaseAdmin
    .from("hsu_swaps")
    .update({ status: "cancelled", resolved_at: new Date().toISOString() })
    .eq("shift_id", shiftId)
    .in("status", ["pending", "awaiting_approval"]);
  const { error } = await supabaseAdmin.from("hsu_swaps").insert({ shift_id: shiftId, from_doctor: me.id, to_doctor: toDoctor, note, status: "pending" });
  if (error) return fail(error.message, 500);
  await supabaseAdmin.from("hsu_shifts").update({ status: toDoctor ? "offered" : "open" }).eq("id", shiftId);
  await audit(me.name, toDoctor ? "market.offer" : "market.open", shift.shift_date.slice(0, 7), { shiftId, toDoctor });

  const origin = originOf(req);
  after(async () => {
    // Bakvakt á markaði: aðeins þeir sem mega taka hana fá póst.
    let others = supabaseAdmin.from("hsu_doctors").select("id, name, email, lang").eq("active", true).neq("id", me.id);
    if (bakvakt) others = others.eq("can_bakvakt", true);
    const recipients = target ? [target] : ((await others).data ?? []);
    // Boð á einn lækni er persónulegt; vakt á markaðinn fer á alla — sinn hvor
    // flokkurinn, og hver viðtakandi ræður sínum pósti.
    const modes = await emailModesFor(recipients.map((r) => r.id), target ? "marketMine" : "market");
    for (const r of recipients) {
      if (modes.get(r.id) !== "now") continue;
      const lang = isLang(r.lang) ? r.lang : DEFAULT_LANG;
      const tn = translator(notifyMsgs, lang);
      const kind = target ? "offer" : "open";
      const vars = { name: me.name, shift: shiftPhrase(shift, lang) };
      await sendHsuEmail(
        r.email,
        tn(`market.${kind}.subject`, vars),
        hsuEmailHtml({
          origin,
          lang,
          heading: tn(`market.${kind}.heading`),
          paragraphs: [
            tn(`market.${kind}.line`, vars),
            ...(note ? [tn("market.note", { note })] : []),
            tn("market.stillYours"),
          ],
          cta: { label: tn("cta.viewMarket"), url: `${origin}/hsu/min-sida?t=markadur` },
        }),
        tn("market.text", { ...vars, url: `${origin}/hsu/min-sida?t=markadur` }),
      );
    }
  });

  return json({ ok: true });
}

/**
 * Beiðni um vaktaskipti: læknirinn gefur `shiftId` og vill `wantId` í staðinn.
 * Viðtakandinn er sá sem er á þeirri vakt — hann eða yfirlæknir samþykkir.
 */
async function swapRequest(
  req: Request,
  t: ReturnType<typeof tr<typeof apiDoctor.is>>,
  me: { id: string; name: string },
  shiftId: string,
  wantId: string,
  note: string,
) {
  if (!UUID_RE.test(wantId)) return fail(t("req.invalid"));
  if (shiftId === wantId) return fail(t("swapReq.sameShift"));

  const sides = await loadSwapSides(shiftId, wantId);
  if (!sides) return fail(t("shift.notFound"), 404);
  const { a: mine, b: theirs } = sides;
  const today = new Date().toISOString().slice(0, 10);

  // Mín vakt.
  if (mine.doctor_id !== me.id || !mine.published) return fail(t("shift.notYours"), 403);
  if (mine.shift_date < today) return fail(t("shift.past"));
  if (mine.confirm_status === "requested") return fail(t("shift.answerRequestFirst"));
  // Vaktin sem ég vil.
  if (!theirs.published) return fail(t("shift.notFound"), 404);
  if (!theirs.doctor_id) return fail(t("swapReq.targetNotAssigned"));
  if (theirs.doctor_id === me.id) return fail(t("swapReq.targetMine"));
  if (theirs.shift_date < today) return fail(t("swapReq.targetPast"));
  if (theirs.confirm_status === "requested") return fail(t("swapReq.targetPending"));

  const { data: target } = await supabaseAdmin
    .from("hsu_doctors").select("id, name, email, lang, active").eq("id", theirs.doctor_id).maybeSingle();
  if (!target?.active) return fail(t("doctor.notFound"));

  // Bakvaktarréttindi þurfa að vera í lagi í bæði horn.
  if ((await isBakvaktShift(mine.id)) && !(await canDoBakvakt(target.id))) return fail(t("swap.targetNoBakvakt"));
  if ((await isBakvaktShift(theirs.id)) && !(await canDoBakvakt(me.id))) return fail(t("swap.noBakvakt"));

  // Hvorugur má enda á tveimur vöktum á sama tíma.
  const clash = await swapOverlap(mine, theirs);
  if (clash === "a") return fail(t("swapReq.myOverlap"), 409);
  if (clash === "b") return fail(t("swapReq.theirOverlap"), 409);

  // Ein virk beiðni í gangi um hverja vakt sem ég á.
  await supabaseAdmin
    .from("hsu_swaps")
    .update({ status: "cancelled", resolved_at: new Date().toISOString() })
    .eq("shift_id", shiftId)
    .in("status", ["pending", "awaiting_approval"]);
  const { error } = await supabaseAdmin.from("hsu_swaps").insert({
    shift_id: shiftId, want_shift_id: wantId, from_doctor: me.id, to_doctor: target.id, note, status: "pending",
  });
  if (error) return fail(error.message, 500);
  await audit(me.name, "swap.ask", mine.shift_date.slice(0, 7), { shiftId, wantId, toDoctor: target.id });

  const origin = originOf(req);
  const phrase = (s: typeof mine) => (l: Lang) => shiftPhrase(s, l);
  // Viðtakandinn: hann lætur SÍNA vakt og fær mína.
  notifyDoctors({
    origin,
    category: "marketMine",
    subject: (l) => translator(notifyMsgs, l)("swap.ask.subject", { name: me.name }),
    heading: (l) => translator(notifyMsgs, l)("swap.ask.heading"),
    intro: (l) => translator(notifyMsgs, l)("swap.ask.who"),
    notices: [{
      doctorId: target.id,
      line: (l: Lang) => {
        const tn = translator(notifyMsgs, l);
        const line = tn("swap.ask.line", { name: me.name, theirs: phrase(mine)(l), yours: phrase(theirs)(l) });
        return note ? `${line} ${tn("market.note", { note })}` : line;
      },
    }],
    cta: { label: (l) => translator(notifyMsgs, l)("cta.market"), path: "/hsu/min-sida?t=markadur" },
  });
  // Yfirlæknir má samþykkja skiptin sjálfur.
  notifyHeads({
    origin,
    subject: (l) => translator(notifyMsgs, l)("swap.head.subject", { name: me.name }),
    heading: (l) => translator(notifyMsgs, l)("swap.ask.heading"),
    lines: [(l) => translator(notifyMsgs, l)("swap.head.line", { name: me.name, other: target.name, yours: phrase(mine)(l), theirs: phrase(theirs)(l) })],
    path: "/hsu/stjorn?t=markadur",
  });

  return json({ ok: true, swap: true });
}
