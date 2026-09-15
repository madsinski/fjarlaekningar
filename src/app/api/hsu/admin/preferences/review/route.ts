// Samþykkja óskir, biðja um breytingar, eða opna aftur. Einnig "samþykkja allar".

import { after } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { audit } from "@/lib/hsu/auth";
import { MONTH_RE, UUID_RE, fail, hsuEmailHtml, json, originOf, readJson, requireManager, sendHsuEmail } from "@/lib/hsu/server";
import { monthLabel } from "@/lib/hsu/types";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const auth = await requireManager(req);
  if ("res" in auth) return auth.res;
  const body = await readJson(req);
  const month = String(body.month ?? "");
  const action = String(body.action ?? "");
  if (!MONTH_RE.test(month)) return fail("Ógildur mánuður");
  const now = new Date().toISOString();
  const reviewer = auth.actor.label;

  if (action === "approve_all") {
    const { data, error } = await supabaseAdmin
      .from("hsu_preferences")
      .update({ status: "approved", reviewed_at: now, reviewed_by: reviewer, review_note: "" })
      .eq("month", month)
      .eq("status", "submitted")
      .select("id");
    if (error) return fail(error.message, 500);
    await audit(reviewer, "prefs.approve_all", month, { count: data?.length ?? 0 });
    return json({ ok: true, count: data?.length ?? 0 });
  }

  const doctorId = String(body.doctor_id ?? "");
  if (!UUID_RE.test(doctorId)) return fail("Ógild beiðni");
  const note = typeof body.note === "string" ? body.note.slice(0, 1000) : "";

  const { data: pref } = await supabaseAdmin.from("hsu_preferences").select("id, status").eq("month", month).eq("doctor_id", doctorId).maybeSingle();

  let patch: Record<string, unknown>;
  if (action === "approve") {
    // Engar óskir skráðar = læknirinn getur tekið hvaða dag sem er. Það má
    // samþykkja líka, svo yfirlæknir þurfi ekki að bíða eftir þeim sem hefur
    // engar sérstakar óskir.
    patch = { status: "approved", reviewed_at: now, reviewed_by: reviewer, review_note: note };
  } else if (action === "request_changes") {
    if (!note.trim()) return fail("Skrifaðu hvað þarf að breyta.");
    patch = { status: "changes_requested", reviewed_at: now, reviewed_by: reviewer, review_note: note };
  } else if (action === "reopen") {
    patch = { status: "submitted", reviewed_at: null, reviewed_by: "", review_note: "" };
  } else {
    return fail("Óþekkt aðgerð");
  }

  const { error } = pref
    ? await supabaseAdmin.from("hsu_preferences").update(patch).eq("id", pref.id)
    : await supabaseAdmin.from("hsu_preferences").insert({ doctor_id: doctorId, month, entered_by: reviewer, ...patch });
  if (error) return fail(error.message, 500);
  await audit(reviewer, `prefs.${action}`, month, { doctorId });

  if (action === "request_changes") {
    const origin = originOf(req);
    after(async () => {
      const { data: d } = await supabaseAdmin.from("hsu_doctors").select("name, email").eq("id", doctorId).maybeSingle();
      if (!d) return;
      const label = monthLabel(month);
      await sendHsuEmail(d.email, `Breytinga óskað á vaktaóskum fyrir ${label}`, hsuEmailHtml({
        origin, heading: "Yfirlæknir óskar eftir breytingum",
        paragraphs: [`Sæl/l ${d.name}.`, `${reviewer} fór yfir vaktaóskir þínar fyrir ${label} og biður um breytingar:`, `„${note}“`],
        cta: { label: "Uppfæra óskir", url: `${origin}/hsu/min-sida?t=oskir&m=${month}` },
      }), `${reviewer} biður um breytingar á vaktaóskum fyrir ${label}: „${note}“ ${origin}/hsu/min-sida?t=oskir&m=${month}`);
    });
  }

  return json({ ok: true });
}
