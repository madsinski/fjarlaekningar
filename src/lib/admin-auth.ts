import { supabaseAdmin } from "@/lib/supabase-admin";

export interface CallerStaff {
  id: string;
  name: string;
  email: string;
  role: string; // primary role (drives RLS is_admin_staff)
  roles: string[]; // full set of roles a member holds
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
    .select("id, name, email, role, roles, active")
    .eq("id", data.user.id)
    .maybeSingle();
  if (!staff || !staff.active) return null;
  const roles = Array.isArray(staff.roles) && staff.roles.length ? (staff.roles as string[]) : [staff.role];
  return { ...(staff as Omit<CallerStaff, "roles">), roles } as CallerStaff;
}

/** True if the member holds `role` (primary or in the roles set). */
export function hasRole(staff: CallerStaff | null, role: string): boolean {
  return !!staff && staff.active && (staff.role === role || (staff.roles?.includes(role) ?? false));
}

export function isAdmin(staff: CallerStaff | null): boolean {
  return hasRole(staff, "admin");
}

/** Who may READ the legal module: admins and lawyers. */
export function isLegalReader(staff: CallerStaff | null): boolean {
  return isAdmin(staff) || hasRole(staff, "lawyer");
}
