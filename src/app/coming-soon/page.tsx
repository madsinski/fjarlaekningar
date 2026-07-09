import type { Metadata } from "next";
import Logo from "../components/Logo";

export const metadata: Metadata = {
  title: "Fjarlækningar ehf. — Væntanlegt",
  description: "Fjarlæknisþjónusta á Íslandi. Vefurinn opnar fljótlega.",
};

export default function ComingSoon() {
  return (
    <section className="relative flex-1 flex items-center justify-center overflow-hidden px-6 py-20">
      <div className="absolute inset-0 bg-gradient-to-b from-brand-cyan-subtle via-white to-white" />

      <div className="relative w-full max-w-md rounded-2xl border border-slate-200/70 bg-white/90 px-8 py-12 text-center shadow-[0_1px_3px_rgba(15,23,42,0.06),0_16px_48px_-16px_rgba(15,23,42,0.14)] backdrop-blur-sm sm:px-10">
        <div className="flex justify-center">
          <Logo markHeight={44} wordmarkHeight={26} />
        </div>

        <span className="mt-8 inline-flex items-center gap-2 rounded-full border border-brand-cyan-muted bg-brand-cyan-subtle/60 px-3 py-1 text-xs font-medium text-[var(--primary-dark)]">
          <span className="h-1.5 w-1.5 rounded-full bg-[var(--primary)]" />
          Væntanlegt
        </span>

        <h1 className="mt-5 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
          Vefur í <span className="text-[var(--primary)]">vinnslu</span>
        </h1>

        <p className="mx-auto mt-4 max-w-sm text-base leading-relaxed text-slate-600">
          Fjarlækningar ehf. veitir örugga og faglega fjarlæknisþjónustu í
          gegnum sjúklingagátt Medalia. Við leggjum nú lokahönd á vefinn.
        </p>

        <div className="mt-8 flex flex-col items-center gap-3">
          <a
            href="mailto:fjarlaekningar@fjarlaekningar.is"
            className="inline-flex items-center justify-center rounded-full bg-[var(--primary)] px-7 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[var(--primary-dark)]"
          >
            Hafa samband
          </a>
          <a
            href="mailto:fjarlaekningar@fjarlaekningar.is"
            className="text-sm text-slate-500 transition-colors hover:text-[var(--primary-dark)]"
          >
            fjarlaekningar@fjarlaekningar.is
          </a>
        </div>

        <p className="mt-10 border-t border-slate-100 pt-6 text-xs text-slate-400">
          © 2026 Fjarlækningar ehf. · Fjarlæknisþjónusta á Íslandi
        </p>
      </div>
    </section>
  );
}
