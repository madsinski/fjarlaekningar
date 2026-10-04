// Skipt um mál. Kakan ræður viðmótinu; barnið man málið sitt milli tækja.
//   POST /api/bokasmidja/lang  { lang }

import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getViewer, sameOrigin } from "@/lib/bokasmidja/auth";
import { fail, json, readJson } from "@/lib/bokasmidja/server";
import { LANG_COOKIE, isLang } from "@/lib/bokasmidja/types";

export const runtime = "nodejs";

export async function POST(req: Request) {
  if (!sameOrigin(req)) return fail("bad_request", 403);
  const { lang } = await readJson(req);
  if (!isLang(lang)) return fail("bad_request");
  (await cookies()).set(LANG_COOKIE, lang, { path: "/", maxAge: 31536000, sameSite: "lax" });
  const viewer = await getViewer();
  if (viewer?.role === "kid") await supabaseAdmin.from("bk_children").update({ lang }).eq("id", viewer.child.id);
  return json({ ok: true });
}
