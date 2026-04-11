import Link from "next/link";
import MedaliaButton from "./components/MedaliaButton";

const services = [
  {
    title: "Almenn læknisviðtöl",
    description:
      "Ráðgjöf og mat á einkennum í gegnum öruggt myndsamtal með lækni.",
    icon: (
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
          d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
        />
      </svg>
    ),
  },
  {
    title: "Lyfseðlar",
    description:
      "Endurnýjun á lyfseðlum og ávísun nýrra lyfja þegar við á, beint í lyfjagáttina.",
    icon: (
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
          d="M9 12h6m-3-3v6m9-3a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    ),
  },
  {
    title: "Veikindavottorð",
    description:
      "Útgáfa veikindavottorða án þess að þú þurfir að mæta á heilsugæsluna.",
    icon: (
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
    ),
  },
  {
    title: "Tilvísanir",
    description:
      "Tilvísanir til sérfræðilækna og rannsókna þegar þörf krefur.",
    icon: (
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
          d="M14 5l7 7m0 0l-7 7m7-7H3"
        />
      </svg>
    ),
  },
];

const steps = [
  {
    n: "1",
    title: "Skráðu þig inn",
    description:
      "Opnaðu sjúklingagáttina og skráðu þig inn með rafrænum skilríkjum.",
  },
  {
    n: "2",
    title: "Bókaðu viðtal",
    description:
      "Veldu tíma sem hentar þér — flest viðtöl eru í boði samdægurs.",
  },
  {
    n: "3",
    title: "Hittu lækninn",
    description:
      "Viðtalið fer fram í öruggu myndsamtali beint í gegnum gáttina.",
  },
];

export default function Home() {
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-brand-cyan-subtle via-white to-brand-cyan-subtle" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-28">
          <div className="max-w-3xl">
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/80 border border-brand-cyan-muted text-xs font-medium text-[var(--primary-dark)] mb-6">
              <span className="w-2 h-2 rounded-full bg-[var(--primary)]" />
              Fjarlæknisþjónusta á Íslandi
            </span>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-900">
              Læknisviðtal{" "}
              <span className="text-[var(--primary)]">hvar sem þú ert</span>
            </h1>
            <p className="mt-6 text-lg text-slate-600 max-w-2xl">
              Fjarlækningar ehf. býður upp á örugga og faglega læknisþjónustu
              í gegnum sjúklingagátt Medalia. Bókaðu viðtal, fáðu ráðgjöf og
              lyfseðla án þess að mæta á heilsugæsluna.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row gap-4">
              <MedaliaButton size="lg" label="Opna sjúklingagátt" />
              <Link
                href="/thjonusta"
                className="inline-flex items-center justify-center px-10 py-4 rounded-full border-2 border-slate-300 text-slate-700 font-semibold hover:border-slate-400 transition-colors"
              >
                Sjá þjónustu
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Services grid */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900">
              Þjónusta sem þú þarft
            </h2>
            <p className="mt-4 text-slate-600">
              Hvort sem þú þarft ráðgjöf, lyfseðil eða vottorð — allt er hægt að
              afgreiða í gegnum sjúklingagáttina.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {services.map((s) => (
              <div
                key={s.title}
                className="bg-white rounded-2xl border border-slate-200 p-6 hover:shadow-lg hover:border-brand-cyan transition-all"
              >
                <div className="w-12 h-12 rounded-xl bg-brand-cyan-subtle text-[var(--primary-dark)] flex items-center justify-center mb-4">
                  {s.icon}
                </div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">
                  {s.title}
                </h3>
                <p className="text-sm text-slate-600">{s.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 bg-[var(--background)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900">
              Svona virkar þetta
            </h2>
            <p className="mt-4 text-slate-600">
              Þrjú einföld skref og þú ert komin(n) í viðtal við lækni.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {steps.map((step) => (
              <div key={step.n} className="relative">
                <div className="w-12 h-12 rounded-full bg-[var(--primary)] text-white flex items-center justify-center text-xl font-bold mb-4">
                  {step.n}
                </div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">
                  {step.title}
                </h3>
                <p className="text-slate-600">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[var(--primary)] to-[var(--primary-dark)] p-10 sm:p-16 text-center text-white">
            <h2 className="text-3xl sm:text-4xl font-bold">
              Tilbúin(n) í læknisviðtal?
            </h2>
            <p className="mt-4 text-brand-cyan-subtle max-w-xl mx-auto">
              Skráðu þig inn í sjúklingagáttina og bókaðu tíma. Einfalt, öruggt
              og í flestum tilvikum samdægurs.
            </p>
            <div className="mt-8 flex justify-center">
              <MedaliaButton
                size="lg"
                label="Opna sjúklingagátt"
                className="bg-white !text-[var(--primary-dark)] hover:!bg-brand-cyan-subtle"
              />
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
