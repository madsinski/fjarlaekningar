import type { Metadata } from "next";
import MedaliaButton from "../../components/MedaliaButton";

export const metadata: Metadata = {
  title: "Hafa samband — Fjarlækningar ehf.",
  description:
    "Hafðu samband við Fjarlækningar ehf. Fyrir læknisviðtal, opnaðu sjúklingagátt Medalia.",
};

export default function HafaSambandPage() {
  return (
    <>
      <section className="bg-gradient-to-br from-brand-cyan-subtle to-white py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-slate-900">
            Hafa samband
          </h1>
          <p className="mt-6 text-lg text-slate-600 max-w-2xl">
            Fyrir læknisviðtal skaltu opna sjúklingagáttina. Fyrir almennar
            fyrirspurnir, notaðu upplýsingarnar hér að neðan.
          </p>
        </div>
      </section>

      <section className="py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-2 gap-10">
          <div className="bg-white rounded-2xl border border-slate-200 p-8">
            <div className="w-12 h-12 rounded-xl bg-brand-cyan-subtle text-[var(--primary-dark)] flex items-center justify-center mb-4">
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-slate-900 mb-2">
              Bóka viðtal
            </h2>
            <p className="text-slate-600 mb-6">
              Öll viðtöl og læknisfræðileg samskipti fara fram í gegnum
              sjúklingagátt Medalia.
            </p>
            <MedaliaButton label="Opna sjúklingagátt" />
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-8">
            <div className="w-12 h-12 rounded-xl bg-brand-cyan-subtle text-[var(--primary-dark)] flex items-center justify-center mb-4">
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-slate-900 mb-2">
              Almennar fyrirspurnir
            </h2>
            <p className="text-slate-600 mb-6">
              Fyrir fyrirspurnir sem ekki tengjast læknisfræðilegum málefnum.
            </p>
            <a
              href="mailto:info@fjarlaekningar.is"
              className="inline-flex items-center gap-2 text-[var(--primary)] font-semibold hover:text-[var(--primary-dark)]"
            >
              info@fjarlaekningar.is
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M14 5l7 7m0 0l-7 7m7-7H3"
                />
              </svg>
            </a>
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 mt-16 text-center text-sm text-slate-500">
          <p>
            <strong>Neyðartilfelli:</strong> Í bráðatilvikum hringdu í 112 eða
            leitaðu strax á bráðamóttöku. Fjarlækningar eru ekki ætlaðar fyrir
            bráðaþjónustu.
          </p>
        </div>
      </section>
    </>
  );
}
