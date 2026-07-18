// Client-side error capture. Runs in the browser (Next.js instrumentation).
// Reports uncaught errors + unhandled promise rejections to /api/errors, which
// persists them to public.app_errors for /admin/errors triage. Fire-and-forget;
// never throws or interrupts the app.

function report(message: string, stack?: string) {
  try {
    const payload = JSON.stringify({
      message: message.slice(0, 4000),
      stack: stack ? stack.slice(0, 8000) : undefined,
      url: typeof location !== "undefined" ? location.href : undefined,
    });
    // keepalive lets the report survive a navigation/unload.
    fetch("/api/errors", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: payload,
      keepalive: true,
    }).catch(() => {});
  } catch {
    /* ignore */
  }
}

if (typeof window !== "undefined") {
  window.addEventListener("error", (e: ErrorEvent) => {
    report(e.message || String(e.error) || "Uncaught error", e.error?.stack);
  });
  window.addEventListener("unhandledrejection", (e: PromiseRejectionEvent) => {
    const reason = e.reason as { message?: string; stack?: string } | undefined;
    report(reason?.message || String(e.reason) || "Unhandled rejection", reason?.stack);
  });
}
