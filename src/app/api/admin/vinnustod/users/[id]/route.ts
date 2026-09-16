// Einn notandi vinnustöðvar: breyta, gera óvirkan, senda nýjan hlekk.

import { after } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getVsAdmin } from "@/lib/vinnustod/admin";
import { issueAccessLink } from "@/lib/vinnustod/auth";
import { UUID_RE, cleanLine, fail, json, originOf, readJson, sendVsEmail } from "@/lib/vinnustod/server";

export const runtime = "nodejs";

const DENY = "Krefst stjórnanda með tveggja þrepa auðkenningu";

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const admin = await getVsAdmin(req);
  if (!admin) return fail(DENY, 403);
  const { id } = await ctx.params;
  if (!UUID_RE.test(id)) return fail("Ógild beiðni");
  const { data: user } = await supabaseAdmin.from("gatt_users").select("id, name, email, password_hash").eq("id", id).maybeSingle();
  if (!user) return fail("Notandinn fannst ekki", 404);
  const body = await readJson(req);

  if (body.action === "resend") {
    const kind = user.password_hash ? "reset" : "invite";
    const url = await issueAccessLink(id, kind, originOf(req));
    after(async () => {
      await sendVsEmail({
        to: user.email,
        subject: kind === "invite" ? "Boð í vinnustöð Fjarlækninga" : "Nýtt lykilorð — vinnustöð Fjarlækninga",
        heading: kind === "invite" ? "Þér er boðið í vinnustöð Fjarlækninga" : "Nýtt lykilorð",
        paragraphs: [`Sæl/l ${user.name}.`, kind === "invite" ? "Smelltu á hnappinn til að velja lykilorð. Hlekkurinn gildir í 14 daga." : "Smelltu á hnappinn til að velja nýtt lykilorð. Hlekkurinn gildir í 2 klukkustundir."],
        cta: { label: kind === "invite" ? "Virkja aðgang" : "Velja nýtt lykilorð", url },
      });
    });
    return json({ ok: true, url });
  }

  const patch: Record<string, unknown> = {};
  if (typeof body.active === "boolean") patch.active = body.active;
  if (typeof body.name === "string") patch.name = cleanLine(body.name, 120);
  if (typeof body.workplace === "string") patch.workplace = cleanLine(body.workplace, 120);
  if (typeof body.title === "string") patch.title = cleanLine(body.title, 80);
  if (!Object.keys(patch).length) return fail("Engu breytt");
  if (patch.name === "") return fail("Nafn má ekki vera autt.");
  const { error } = await supabaseAdmin.from("gatt_users").update(patch).eq("id", id);
  if (error) return fail(error.message, 500);
  // Óvirkur notandi: lotur og traust tæki hverfa strax.
  if (patch.active === false) {
    await supabaseAdmin.from("gatt_sessions").delete().eq("user_id", id);
    await supabaseAdmin.from("gatt_devices").delete().eq("user_id", id);
  }
  return json({ ok: true });
}
