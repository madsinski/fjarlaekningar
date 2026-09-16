// Viðtakendur sem stjórnandi getur sent skilaboð: allir virkir sem komast inn í
// vinnustöðina — notendur hennar, starfsfólk Fjarlækninga og læknar
// vaktakerfisins. Stjórnendur eru undanskildir: þeir sjá innhólfið sjálft.

import { getVsAdmin } from "@/lib/vinnustod/admin";
import { fail, json } from "@/lib/vinnustod/server";
import { listRecipients } from "@/lib/vinnustod/threads";

export const runtime = "nodejs";

export async function GET(req: Request) {
  if (!(await getVsAdmin(req))) return fail("Krefst stjórnanda með tveggja þrepa auðkenningu", 403);
  return json({ ok: true, recipients: await listRecipients() });
}
