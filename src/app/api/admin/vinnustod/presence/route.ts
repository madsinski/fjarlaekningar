// Hver er við — sjá src/lib/vinnustod/presence.ts fyrir reglurnar.

import { getVsAdmin } from "@/lib/vinnustod/admin";
import { presenceSnapshot } from "@/lib/vinnustod/presence";
import { fail, json } from "@/lib/vinnustod/server";

export const runtime = "nodejs";

export async function GET(req: Request) {
  if (!(await getVsAdmin(req))) return fail("Krefst stjórnanda með tveggja þrepa auðkenningu", 403);
  return json({ ok: true, ...(await presenceSnapshot()) });
}
