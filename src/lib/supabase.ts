import { createBrowserClient } from "@supabase/ssr";

// Browser Supabase client for the Fjarlækningar admin.
//
// Unlike lifeline-website (which hard-codes its project ref), this repo
// points at a SEPARATE Supabase project owned by Fjarlækningar ehf, so the
// URL + anon key come from env vars. Set both in Vercel (all environments)
// and in .env.local for local dev — see .env.local.example.
//
// Only /admin/* pages import this module, so a missing env var never breaks
// the public marketing site — it only surfaces when someone opens the admin.
// Placeholders keep `createBrowserClient` from throwing at import time (which
// would break `next build`/prerender) when env vars aren't set yet. With real
// env present — Vercel + .env.local — the real values are always used. If the
// placeholders are ever hit at runtime, API calls simply fail auth rather than
// crashing the whole route on load.
const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-anon-key";

export const supabase = createBrowserClient(url, anonKey);
