import type { Metadata } from "next";
import Logo from "../components/Logo";

export const metadata: Metadata = {
  title: "Fjarlækningar ehf. — Væntanlegt",
  description: "Fjarlæknisþjónusta á Íslandi. Vefurinn opnar fljótlega.",
};

export default function ComingSoon() {
  return (
    <section className="relative flex-1 flex items-center justify-center overflow-hidden px-6 py-24">
      <div className="absolute inset-0 bg-gradient-to-br from-brand-cyan-subtle via-white to-brand-cyan-subtle" />
      <div className="relative w-full max-w-xl text-center">
        <div className="flex justify-center mb-10">
          <Logo markHeight={56} wordmarkHeight={34} />
        </div>

        <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/80 border border-brand-cyan-muted text-xs font-medium text-[var(--primary-dark)] mb-6">
          <span className="w-2 h-2 rounded-full bg-[var(--primary)]" />
          Væntanlegt
        </span>

        <h1 className="text-5xl sm:text-6xl font-extrabold tracking-tight text-slate-900">
          Vefur í{" "}
          <span className="text-[var(--primary)]">vinnslu</span>
        </h1>

        <p className="mt-6 text-lg text-slate-600">
          Fjarlækningar ehf. býður upp á örugga og faglega læknisþjónustu í
          gegnum sjúklingagátt Medalia. Við erum að leggja lokahönd á vefinn —
          hafðu samband ef þig vantar aðstoð strax.
        </p>

        <div className="mt-10">
          <a
            href="mailto:fjarlaekningar@fjarlaekningar.is"
            className="inline-flex items-center justify-center px-10 py-4 rounded-full bg-[var(--primary)] text-white font-semibold hover:bg-[var(--primary-dark)] transition-colors"
          >
            Hafa samband
          </a>
        </div>
      </div>
    </section>
  );
}
