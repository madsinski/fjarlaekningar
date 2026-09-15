// Læknir setur eina af SÍNUM vöktum á vaktamarkað eða býður hana lækni.

import { after } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { audit } from "@/lib/hsu/auth";
import { shiftPhrase } from "@/lib/hsu/market";
import { UUID_RE, fail, hsuEmailHtml, json, originOf, readJson, requireDoctor, sendHsuEmail } from "@/lib/hsu/server";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const auth = await requireDoctor(req);
  if ("res" in auth) return auth.res;
  const me = auth.doctor;
  const body = await readJson(req);
  const shiftId = String(body.shift_id ?? "");
  const toDoctor = body.to_doctor ? String(body.to_doctor) : null;
  const note = typeof body.note === "string" ? body.note.slice(0, 300) : "";
  if (!UUID_RE.test(shiftId) || (toDoctor && !UUID_RE.test(toDoctor))) return fail("Ógild beiðni");
  if (toDoctor === me.id) return fail("Þú getur ekki boðið sjálfum þér vaktina.");

  const { data: shift } = await supabaseAdmin
    .from("hsu_shifts")
    .select("id, doctor_id, shift_date, starts, ends, label, published")
    .eq("id", shiftId)
    .maybeSingle();
  if (!shift || shift.doctor_id !== me.id || !shift.published) return fail("Vaktin tilheyrir þér ekki", 403);
  if (shift.shift_date < new Date().toISOString().slice(0, 10)) return fail("Vaktin er liðin.");

  let target: { id: string; name: string; email: string } | null = null;
  if (toDoctor) {
    const { data } = await supabaseAdmin.from("hsu_doctors").select("id, name, email, active").eq("id", toDoctor).maybeSingle();
    if (!data?.active) return fail("Læknir fannst ekki");
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
    const phrase = shiftPhrase(shift);
    const recipients = target
      ? [target]
      : ((await supabaseAdmin.from("hsu_doctors").select("id, name, email").eq("active", true).neq("id", me.id)).data ?? []);
    for (const r of recipients) {
      await sendHsuEmail(
        r.email,
        target ? `${me.name} býður þér vakt` : `Vakt á vaktamarkaði: ${phrase}`,
        hsuEmailHtml({
          origin,
          heading: target ? "Þér er boðin vakt" : "Ný vakt á vaktamarkaði",
          paragraphs: [
            target ? `${me.name} býður þér vaktina ${phrase}.` : `${me.name} hefur sett vaktina ${phrase} á vaktamarkað.`,
            ...(note ? [`Skilaboð: „${note}“`] : []),
            "Vaktin er áfram hjá lækninum sem býður hana þar til einhver tekur hana.",
          ],
          cta: { label: "Skoða á vaktamarkaði", url: `${origin}/hsu/min-sida?t=markadur` },
        }),
        `${me.name}: ${phrase}. ${origin}/hsu/min-sida?t=markadur`,
      );
    }
  });

  return json({ ok: true });
}
