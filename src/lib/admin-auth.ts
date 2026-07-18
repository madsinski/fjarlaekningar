import { supabaseAdmin } from "@/lib/supabase-admin";

export interface CallerStaff {
  id: string;
  name: string;
  email: string;
  role: string;
  active: boolean;
}

// Verify the Bearer token on an /api/admin/* request and return the caller's
// active staff row, or null if not authenticated / not an active staff member.
export async function getCallerStaff(req: Request): Promise<CallerStaff | null> {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.slice("Bearer ".length);
  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data.user?.id) return null;
  const { data: staff } = await supabaseAdmin
    .from("staff")
    .select("id, name, email, role, active")
    .eq("id", data.user.id)
    .maybeSingle();
  if (!staff || !staff.active) return null;
  return staff as CallerStaff;
}

export function isAdmin(staff: CallerStaff | null): boolean {
  return !!staff && staff.active && staff.role === "admin";
}
