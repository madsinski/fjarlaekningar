"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, AlertCircle } from "lucide-react";

// Double opt-in confirmation landing. /api/subscribe/confirm performs the
// confirmation server-side and redirects here with ?done=1 (success) or ?done=0
// (invalid/expired link), so this page only reports the outcome.

function StadfestingInner() {
  const done = useSearchParams().get("done");
  const ok = done === "1";

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
      {ok ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-8 text-center">
          <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto mb-3" />
          <h1 className="text-xl font-bold text-slate-900">Áskrift staðfest!</h1>
          <p className="text-sm text-slate-600 mt-2">
            Takk fyrir. Þú ert komin(n) á fréttalista Fjarlækninga og færð fréttir af nýrri
            þjónustu og samstarfi þegar það bætist við.
          </p>
          <Link
            href="/"
            className="mt-6 inline-flex items-center rounded-full bg-cyan-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-cyan-700"
          >
            Til baka á forsíðu
          </Link>
        </div>
      ) : (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-8 text-center">
          <AlertCircle className="w-10 h-10 text-amber-600 mx-auto mb-3" />
          <h1 className="text-xl font-bold text-slate-900">Hlekkurinn er ógildur</h1>
          <p className="text-sm text-slate-600 mt-2">
            Þessi staðfestingarhlekkur er ógildur eða útrunninn. Prófaðu að skrá þig aftur á
            forsíðunni — þá sendum við nýjan staðfestingarpóst.
          </p>
          <Link
            href="/"
            className="mt-6 inline-flex items-center rounded-full bg-cyan-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-cyan-700"
          >
            Til baka á forsíðu
          </Link>
        </div>
      )}
    </div>
  );
}

export default function StadfestingPage() {
  return (
    <Suspense fallback={<div className="max-w-2xl mx-auto px-4 py-20 text-slate-500">Hleð…</div>}>
      <StadfestingInner />
    </Suspense>
  );
}
