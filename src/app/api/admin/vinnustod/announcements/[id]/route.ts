// Ein tilkynning: fela, sýna aftur eða eyða.

import { after } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { signalAnnouncements } from "@/lib/vinnustod/live";
import { getVsAdmin } from "@/lib/vinnustod/admin";
import { UUID_RE, fail, json, readJson } from "@/lib/vinnustod/server";

export const runtime = "nodejs";

const DENY = "Krefst stjórnanda með tveggja þrepa auðkenningu";

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!(await getVsAdmin(req))) return fail(DENY, 403);
  const { id } = await ctx.params;
  if (!UUID_RE.test(id)) return fail("Ógild beiðni");
  const body = await readJson(req);
  if (typeof body.active !== "boolean") return fail("Engu breytt");
  await supabaseAdmin.from("gatt_announcements").update({ active: body.active }).eq("id", id);
  after(() => signalAnnouncements().catch(() => {}));
  return json({ ok: true });
}

export async function DELETE(req: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!(await getVsAdmin(req))) return fail(DENY, 403);
  const { id } = await ctx.params;
  if (!UUID_RE.test(id)) return fail("Ógild beiðni");
  await supabaseAdmin.from("gatt_announcements").delete().eq("id", id);
  after(() => signalAnnouncements().catch(() => {}));
  return json({ ok: true });
}
