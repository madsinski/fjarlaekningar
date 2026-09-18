// Samþykkja óskir, biðja um breytingar, eða opna aftur. Einnig "samþykkja allar".

import { after } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { audit } from "@/lib/hsu/auth";
import { MONTH_RE, UUID_RE, fail, hsuEmailHtml, json, originOf, readJson, requireManager, sendHsuEmail } from "@/lib/hsu/server";
import { notifyDoctors } from "@/lib/hsu/notify";
import { say } from "@/lib/hsu/shift-edit";
import { translator } from "@/lib/hsu/i18n/core";
import { monthLabelL } from "@/lib/hsu/i18n/format";
import { doctorLang } from "@/lib/hsu/i18n/server";
import { tr } from "@/lib/hsu/i18n/server";
import { apiAdmin } from "@/lib/hsu/i18n/messages/api-admin";
import { emailModeFor } from "@/lib/hsu/email-prefs";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const auth = await requireManager(req);
  if ("res" in auth) return auth.res;
  const t = tr(req, apiAdmin);
  const body = await readJson(req);
  const month = String(body.month ?? "");
  const action = String(body.action ?? "");
  if (!MONTH_RE.test(month)) return fail(t("err.badMonth"));
  const now = new Date().toISOString();
  const reviewer = auth.actor.label;

  if (action === "approve_all") {
    const { data, error } = await supabaseAdmin
      .from("hsu_preferences")
      .update({ status: "approved", reviewed_at: now, reviewed_by: reviewer, review_note: "" })
      .eq("month", month)
      .eq("status", "submitted")
      .select("id, doctor_id");
    if (error) return fail(error.message, 500);
    notifyDoctors({
      origin: originOf(req),
      subject: say((l) => l("approved.subject", { month: monthLabelL(month, l.lang) })),
      heading: say((l) => l("approved.heading")),
      notices: (data ?? []).map((r) => ({ doctorId: r.doctor_id, line: say((l) => l("approved.line", { by: reviewer, month: monthLabelL(month, l.lang) })) })),
      category: "prefs",
      cta: { label: say((l) => l("approved.cta")), path: `/hsu/min-sida?t=oskir&m=${month}` },
    });
    await audit(reviewer, "prefs.approve_all", month, { count: data?.length ?? 0 });
    return json({ ok: true, count: data?.length ?? 0 });
  }

  const doctorId = String(body.doctor_id ?? "");
  if (!UUID_RE.test(doctorId)) return fail(t("err.badRequest"));
  const note = typeof body.note === "string" ? body.note.slice(0, 1000) : "";

  const { data: pref } = await supabaseAdmin.from("hsu_preferences").select("id, status").eq("month", month).eq("doctor_id", doctorId).maybeSingle();

  let patch: Record<string, unknown>;
  if (action === "approve") {
    // Engar óskir skráðar = læknirinn getur tekið hvaða dag sem er. Það má
    // samþykkja líka, svo yfirlæknir þurfi ekki að bíða eftir þeim sem hefur
    // engar sérstakar óskir.
    patch = { status: "approved", reviewed_at: now, reviewed_by: reviewer, review_note: note };
  } else if (action === "request_changes") {
    if (!note.trim()) return fail(t("err.noteRequired"));
    patch = { status: "changes_requested", reviewed_at: now, reviewed_by: reviewer, review_note: note };
  } else if (action === "reopen") {
    patch = { status: "submitted", reviewed_at: null, reviewed_by: "", review_note: "" };
  } else {
    return fail(t("err.unknownAction"));
  }

  const { error } = pref
    ? await supabaseAdmin.from("hsu_preferences").update(patch).eq("id", pref.id)
    : await supabaseAdmin.from("hsu_preferences").insert({ doctor_id: doctorId, month, entered_by: reviewer, ...patch });
  if (error) return fail(error.message, 500);
  await audit(reviewer, `prefs.${action}`, month, { doctorId });
  if (action === "approve") {
    notifyDoctors({
      origin: originOf(req),
      subject: say((l) => l("approved.subject", { month: monthLabelL(month, l.lang) })),
      heading: say((l) => l("approved.heading")),
      notices: [{ doctorId, line: say((l) => l(note ? "approved.lineNote" : "approved.line", { by: reviewer, month: monthLabelL(month, l.lang), note })) }],
      category: "prefs",
      cta: { label: say((l) => l("approved.cta")), path: `/hsu/min-sida?t=oskir&m=${month}` },
    });
  }

  if (action === "request_changes") {
    const origin = originOf(req);
    after(async () => {
      if ((await emailModeFor(doctorId, "prefs")) !== "now") return;
      const { data: d } = await supabaseAdmin.from("hsu_doctors").select("name, email").eq("id", doctorId).maybeSingle();
      if (!d) return;
      const lang = await doctorLang(doctorId);
      const tl = translator(apiAdmin, lang);
      const vars = { by: reviewer, month: monthLabelL(month, lang), note, url: `${origin}/hsu/min-sida?t=oskir&m=${month}` };
      await sendHsuEmail(d.email, tl("changes.subject", vars), hsuEmailHtml({
        origin, lang, heading: tl("changes.heading"),
        paragraphs: [tl("email.hello", { name: d.name }), tl("changes.body", vars), tl("changes.note", vars)],
        cta: { label: tl("changes.cta"), url: vars.url },
      }), tl("changes.text", vars));
    });
  }

  return json({ ok: true });
}
