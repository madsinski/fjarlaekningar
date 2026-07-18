import { createClient, SupabaseClient } from "@supabase/supabase-js";

// Service-role Supabase client — server-only. Used by /api/admin/* routes to
// create staff auth users and write privileged rows. NEVER import this from a
// "use client" file or a browser bundle.
//
// Construction is deferred until first use via a Proxy so that `next build`
// doesn't crash when SUPABASE_SERVICE_ROLE_KEY isn't present in the build env.
const url =
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";

let cached: SupabaseClient | null = null;

function getAdminClient(): SupabaseClient {
  if (cached) return cached;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is not set — set it in Vercel env vars (and .env.local)",
    );
  }
  if (!url) {
    throw new Error(
      "SUPABASE_URL / NEXT_PUBLIC_SUPABASE_URL is not set — set it in Vercel env vars",
    );
  }
  cached = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  return cached;
}

export const supabaseAdmin = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    const client = getAdminClient();
    const value = (client as unknown as Record<string | symbol, unknown>)[prop as string];
    return typeof value === "function"
      ? (value as (...a: unknown[]) => unknown).bind(client)
      : value;
  },
});
