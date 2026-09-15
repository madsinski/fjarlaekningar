// Handvirkar breytingar á vöktum (draga og sleppa, velja lækni). Server-only.

import { after } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { hsuSync } from "./calendar";
import { shiftPhrase } from "./market";
import { hsuEmailHtml, sendHsuEmail } from "./server";

export interface ShiftChange {
  id: string;
  doctor_id: string | null;
}

/**
 * Setja lækna á vaktir. Opin boð á vöktum sem skipta um hendur falla niður.
 * Í birtum mánuði samstillast dagatöl og læknarnir fá póst (ef notify).
 */
export async function applyShiftChanges(changes: ShiftChange[], opts: { actor: string; origin: string; notify: boolean }) {
  if (!changes.length) return { changed: 0 };
  const ids = changes.map((c) => c.id);
  const { data: before, error } = await supabaseAdmin
    .from("hsu_shifts")
    .select("id, doctor_id, shift_date, starts, ends, label, published")
    .in("id", ids);
  if (error) throw new Error(error.message);
  const byId = new Map((before ?? []).map((s) => [s.id, s]));

  const touched = new Set<string>();
  const mail: { to: string; text: string }[] = [];
  let changed = 0;
  for (const c of changes) {
    const s = byId.get(c.id);
    if (!s || (s.doctor_id ?? null) === (c.doctor_id ?? null)) continue;
    const { error: upErr } = await supabaseAdmin.from("hsu_shifts").update({ doctor_id: c.doctor_id, status: "assigned" }).eq("id", c.id);
    if (upErr) throw new Error(upErr.message);
    await supabaseAdmin
      .from("hsu_swaps")
      .update({ status: "cancelled", resolved_at: new Date().toISOString() })
      .eq("shift_id", c.id)
      .in("status", ["pending", "awaiting_approval"]);
    changed++;
    if (s.published) {
      if (s.doctor_id) { touched.add(s.doctor_id); mail.push({ to: s.doctor_id, text: `Þú ert ekki lengur á vaktinni ${shiftPhrase(s)}.` }); }
      if (c.doctor_id) { touched.add(c.doctor_id); mail.push({ to: c.doctor_id, text: `Þú hefur verið sett(ur) á vaktina ${shiftPhrase(s)}.` }); }
    }
  }

  if (touched.size) {
    after(async () => {
      await hsuSync.syncDoctors([...touched]);
      if (!opts.notify) return;
      const { data: docs } = await supabaseAdmin.from("hsu_doctors").select("id, name, email").in("id", [...touched]);
      for (const d of docs ?? []) {
        const lines = mail.filter((m) => m.to === d.id).map((m) => m.text);
        if (!lines.length) continue;
        await sendHsuEmail(d.email, "Breyting á vaktaplani", hsuEmailHtml({
          origin: opts.origin, heading: "Breyting á vaktaplani",
          paragraphs: [`Sæl/l ${d.name}.`, `${opts.actor} breytti vaktaplaninu:`, ...lines],
          cta: { label: "Sjá vaktirnar mínar", url: `${opts.origin}/hsu/min-sida` },
        }), lines.join("\n"));
      }
    });
  }
  return { changed };
}
