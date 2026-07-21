"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, AlertCircle } from "lucide-react";

// Unsubscribe landing, linked from the footer of every marketing email.
//
// The GET handler on /api/unsubscribe already performs the opt-out and
// redirects here with ?done=1, so a plain link click works without JS. If we
// arrive with only a token (?token=…), we complete it here via POST.

function AfskraInner() {
  const params = useSearchParams();
  const token = params.get("token") || "";
  const done = params.get("done");

  const [state, setState] = useState<"working" | "ok" | "error">(
    done === "1" ? "ok" : done === "0" ? "error" : "working",
  );
  const [err, setErr] = useState<string | null>(
    done === "0" ? "Hlekkurinn er ógildur eða útrunninn." : null,
  );

  const run = useCallback(async () => {
    if (done === "1" || done === "0") return; // already handled by the GET redirect
    if (!token) {
      setState("error");
      setErr("Hlekkinn vantar.");
      return;
    }
    const res = await fetch("/api/unsubscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    });
    const j = await res.json().catch(() => ({}));
    if (res.ok && j.ok) {
      setState("ok");
    } else {
      setState("error");
      setErr(j.error || "Ekki tókst að afskrá netfangið.");
    }
  }, [token, done]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    run();
  }, [run]);

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
      {state === "working" && <p className="text-slate-500">Afskrái…</p>}

      {state === "ok" && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-8 text-center">
          <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto mb-3" />
          <h1 className="text-xl font-bold text-slate-900">Þú hefur verið afskráð(ur)</h1>
          <p className="text-sm text-slate-600 mt-2">
            Við sendum þér ekki fleiri fréttabréf. Þú getur alltaf skráð þig aftur á forsíðunni.
          </p>
          <Link
            href="/"
            className="mt-6 inline-flex items-center rounded-full bg-cyan-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-cyan-700"
          >
            Til baka á forsíðu
          </Link>
        </div>
      )}

      {state === "error" && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-8 text-center">
          <AlertCircle className="w-10 h-10 text-amber-600 mx-auto mb-3" />
          <h1 className="text-xl font-bold text-slate-900">Ekki tókst að afskrá</h1>
          <p className="text-sm text-slate-600 mt-2">{err}</p>
          <p className="text-sm text-slate-600 mt-2">
            Sendu okkur línu á{" "}
            <a href="mailto:fjarlaekningar@fjarlaekningar.is" className="text-cyan-700 underline">
              fjarlaekningar@fjarlaekningar.is
            </a>{" "}
            og við tökum þig af listanum.
          </p>
        </div>
      )}
    </div>
  );
}

export default function AfskraPage() {
  return (
    <Suspense fallback={<div className="max-w-2xl mx-auto px-4 py-20 text-slate-500">Hleð…</div>}>
      <AfskraInner />
    </Suspense>
  );
}
