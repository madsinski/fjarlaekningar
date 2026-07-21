// Coming-soon gate state, toggleable from /admin/website.
//
// The proxy runs on EVERY request, so we cache the value in module scope with a
// short TTL rather than hitting the DB each time. Serverless instances are
// reused, so in practice this is one query per instance per TTL window.
//
// Falls back to the COMING_SOON env var whenever the table/row is missing or
// the query fails — so behaviour is unchanged until the migration is run, and
// a Supabase blip can never accidentally expose (or hide) the site.

const TTL_MS = 30_000;

let cache: { value: boolean; at: number } | null = null;

function envDefault(): boolean {
  return process.env.COMING_SOON === "true";
}

/** True when the coming-soon gate should be enforced. */
export async function isGateEnabled(): Promise<boolean> {
  const now = Date.now();
  if (cache && now - cache.at < TTL_MS) return cache.value;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) return envDefault();

  try {
    const res = await fetch(`${url}/rest/v1/site_settings?key=eq.gate&select=value`, {
      headers: { apikey: anon, Authorization: `Bearer ${anon}` },
      cache: "no-store",
    });
    if (!res.ok) return envDefault();
    const rows = (await res.json().catch(() => [])) as { value?: { coming_soon?: unknown } }[];
    const raw = rows?.[0]?.value?.coming_soon;
    const value = typeof raw === "boolean" ? raw : envDefault();
    cache = { value, at: now };
    return value;
  } catch {
    return envDefault();
  }
}

/** Drop the cache so an admin toggle takes effect immediately in this instance. */
export function clearGateCache(): void {
  cache = null;
}
