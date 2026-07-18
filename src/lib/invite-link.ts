// Generate a token_hash-based set-password link for a staff member, using the
// Supabase admin generate_link endpoint. We use token_hash (not the emailed
// PKCE ?code= link) because:
//   1. this project is on Supabase's free tier, where the invite/recovery
//      email TEMPLATES can't be customised to emit token_hash, and
//   2. the default PKCE ?code= link can't be exchanged on a device that didn't
//      initiate the flow — which is exactly the invite case.
// The admin copies this link and sends it to the new teammate however they
// like (Slack, their own email, etc.). The login page verifies token_hash via
// verifyOtp — no code-verifier required, works cross-device.

export async function generateInviteLink(email: string): Promise<string | null> {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const origin = process.env.NEXT_PUBLIC_SITE_URL || "https://www.fjarlaekningar.is";
  if (!supabaseUrl || !serviceKey) return null;

  try {
    const res = await fetch(`${supabaseUrl}/auth/v1/admin/generate_link`, {
      method: "POST",
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ type: "recovery", email, redirect_to: `${origin}/admin/login` }),
    });
    const j = await res.json().catch(() => ({}));
    const hashedToken = j?.hashed_token || j?.properties?.hashed_token;
    if (!res.ok || !hashedToken) return null;
    return `${origin}/admin/login?token_hash=${hashedToken}&type=recovery`;
  } catch {
    return null;
  }
}
