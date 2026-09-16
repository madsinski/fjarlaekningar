// Stjórnun vinnustöðvar — aðeins stjórnandi Fjarlækninga sem hefur staðist
// tveggja þrepa auðkenningu (aal2). Hér eru nöfn og netföng starfsfólks
// samstarfsstofnana og spurningar þeirra; það eru persónuupplýsingar.
// Server-only.

import { supabaseAdmin } from "@/lib/supabase-admin";

export interface VsAdmin {
  id: string;
  name: string;
  email: string;
}

function jwtAal(token: string): string | null {
  try {
    return JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString()).aal ?? null;
  } catch {
    return null;
  }
}

export async function getVsAdmin(req: Request): Promise<VsAdmin | null> {
  const auth = req.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) return null;
  const token = auth.slice(7);
  // getUser staðfestir undirskriftina; aal-krafan í sama lykli er þá traust.
  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data.user?.id || jwtAal(token) !== "aal2") return null;
  const { data: staff } = await supabaseAdmin
    .from("staff").select("id, name, email, role, roles, active").eq("id", data.user.id).maybeSingle();
  if (!staff?.active) return null;
  const roles: string[] = Array.isArray(staff.roles) && staff.roles.length ? staff.roles : [staff.role];
  if (!roles.includes("admin")) return null;
  return { id: staff.id, name: staff.name || staff.email, email: staff.email };
}
