// Next.js instrumentation. `onRequestError` fires on any uncaught server-side
// error; we persist it to public.app_errors so /admin/errors can triage.
// Logging must NEVER throw or block the response, hence the broad try/catch.

import type { Instrumentation } from "next";

export async function register() {
  // No startup work needed; onRequestError below does the logging.
}

export const onRequestError: Instrumentation.onRequestError = async (err, request) => {
  try {
    const { supabaseAdmin } = await import("@/lib/supabase-admin");
    const e = err as { message?: string; stack?: string } | undefined;
    const message = String(e?.message ?? err ?? "Unknown error").slice(0, 4000);
    const stack = e?.stack ? String(e.stack).slice(0, 8000) : null;
    const url = (request?.path as string) || null;
    const headers = (request?.headers ?? {}) as Record<string, string | undefined>;
    const userAgent = headers["user-agent"] || headers["User-Agent"] || null;

    await supabaseAdmin.from("app_errors").insert({
      message,
      stack,
      source: "server",
      url,
      user_agent: userAgent,
    });
  } catch {
    // Swallow — never let error logging break error handling.
  }
};
