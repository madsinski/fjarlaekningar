import Link from "next/link";
import MedaliaButton from "../components/MedaliaButton";

const services = [
  {
    title: "Kvef, hósti og hálsbólga",
    description:
      "Greining og meðferð við helstu öndunarfærakvillum.",
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
          d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    ),
  },
  {
    title: "Þvagfæra- og leggangasýkingar",
    description:
      "Greining og meðferð — með þvagstrimli heima þegar við á.",
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
    title: "Frunsa",
    description:
      "Greining og meðferð við endurtekinni frunsu.",
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
          d="M13 10V3L4 14h7v7l9-11h-7z"
        />
      </svg>
    ),
  },
  {
    title: "Frjókornaofnæmi",
    description:
      "Greining og meðferð við árstíðabundnu ofnæmi.",
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
          d="M12 3v18m0 0c-3 0-5-2-5-5m5 5c3 0 5-2 5-5M12 8c-2.5 0-4-1.5-4-4m4 4c2.5 0 4-1.5 4-4"
        />
      </svg>
    ),
  },
  {
    title: "Lyfjaendurnýjun",
    description:
      "Endurnýjun á föstum lyfjum — þó ekki ávanabindandi lyfjum.",
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
    title: "Getnaðarvörn",
    description:
      "Mat og ráðgjöf um getnaðarvarnir.",
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
          d="M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m6-1.13a4 4 0 10-4-4 4 4 0 004 4z"
        />
      </svg>
    ),
  },
];

const steps = [
  {
    n: "1",
    title: "Þú velur erindi",
    description:
      "Skráðu þig inn í sjúklingagáttina með rafrænum skilríkjum og veldu þjónustu af lista.",
  },
  {
    n: "2",
    title: "Svarar spurningalista",
    description:
      "Markvissar spurningar um einkenni — ásamt sjálfsprófi heima þegar það á við.",
  },
  {
    n: "3",
    title: "Öryggisnetið metur svörin",
    description:
      "Bendi svörin til alvarlegra veikinda færð þú strax leiðbeiningar um rétt úrræði.",
  },
  {
    n: "4",
    title: "Læknir yfirfer og ávísar",
    description:
      "Læknir fær erindið í verkefnalista, yfirfer svörin og staðfestir viðeigandi meðferð.",
  },
  {
    n: "5",
    title: "Niðurstaða og lyfseðill",
    description:
      "Þú færð skriflega niðurstöðu í gáttina og lyfseðill fer rafrænt í lyfjagátt.",
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
              Íslensk fjarlækningaþjónusta
            </span>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-900">
              Læknisþjónusta{" "}
              <span className="text-[var(--primary)]">án biðstofu</span>
            </h1>
            <p className="mt-6 text-lg text-slate-600 max-w-2xl">
              Fjarlækningar er íslenskt fyrirtæki, stofnað af læknum, sem leysir
              algeng heilsugæsluerindi í gegnum örugga sjúklingagátt — án þess
              að þú þurfir að mæta á staðinn. Þú svarar markvissum spurningalista
              þegar þér hentar og læknir yfirfer og staðfestir meðferð.
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              {["Stofnað 2021", "Íslenskir læknar", "Samstarf við Lyfju"].map(
                (chip) => (
                  <span
                    key={chip}
                    className="inline-flex items-center px-3 py-1 rounded-full bg-white/70 border border-brand-cyan-muted text-xs font-medium text-slate-600"
                  >
                    {chip}
                  </span>
                ),
              )}
            </div>
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
              Algeng erindi — leyst samdægurs
            </h2>
            <p className="mt-4 text-slate-600">
              Spurningalistar samdir af læknum utan um hvert erindi, með
              innbyggðum öryggisspurningum. Flest erindi eru afgreidd samdægurs.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
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
          <p className="mt-8 text-sm text-slate-500">
            Auk þess njálgur, ristill og risvandamál — og listinn lengist jafnt
            og þétt.
          </p>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 bg-[var(--background)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900">
              Ferlið frá upphafi til enda
            </h2>
            <p className="mt-4 text-slate-600">
              Ósamtíma þjónusta: þú svarar spurningalista þegar þér hentar,
              læknir yfirfer þegar honum hentar. Ekkert myndsímtal nauðsynlegt.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-8">
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
              Tilbúin(n) að senda inn erindi?
            </h2>
            <p className="mt-4 text-brand-cyan-subtle max-w-xl mx-auto">
              Skráðu þig inn í sjúklingagáttina og veldu erindi. Einfalt, öruggt
              og í flestum tilvikum afgreitt samdægurs.
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
