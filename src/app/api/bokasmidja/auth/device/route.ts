// Fullorðinn opnar tækið með foreldrakóðanum. Tækið verður traust (börnin geta
// þá skráð sig inn með kóðanum sínum) og foreldralota hefst.
//   POST /api/bokasmidja/auth/device  { code }

import { cookies } from "next/headers";
import { checkParentCode, clientIp, deviceTrusted, parentCodeConfigured, sameOrigin, startSession, throttle, trustDevice } from "@/lib/bokasmidja/auth";
import { fail, json, readJson } from "@/lib/bokasmidja/server";

export const runtime = "nodejs";

export async function POST(req: Request) {
  if (!sameOrigin(req)) return fail("bad_request", 403);
  if (!parentCodeConfigured()) return fail("not_configured", 503);
  if (!(await throttle(`device:${clientIp(req)}`, 8, 900))) return fail("too_many", 429);
  // Líka í heild, svo dreifð ágiskun af mörgum IP-tölum komist ekki langt.
  if (!(await throttle("device:all", 60, 3600))) return fail("too_many", 429);

  const body = await readJson(req);
  const code = typeof body.code === "string" ? body.code : "";
  if (!checkParentCode(code)) return fail("wrong_code", 401);

  const jar = await cookies();
  const ua = req.headers.get("user-agent") || "";
  if (!(await deviceTrusted())) await trustDevice(jar, ua);
  await startSession(jar, "parent", null, ua);
  return json({ ok: true });
}
