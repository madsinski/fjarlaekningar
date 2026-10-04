// Útskráning. Tækið er áfram traust, svo næsta barn getur skráð sig inn.
//   POST /api/bokasmidja/auth/logout

import { cookies } from "next/headers";
import { endSession, sameOrigin } from "@/lib/bokasmidja/auth";
import { fail, json } from "@/lib/bokasmidja/server";

export const runtime = "nodejs";

export async function POST(req: Request) {
  if (!sameOrigin(req)) return fail("bad_request", 403);
  await endSession(await cookies());
  return json({ ok: true });
}
