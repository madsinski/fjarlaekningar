import Link from "next/link";
import MedaliaButton from "../components/MedaliaButton";
import { erindi } from "../../erindi";

const steps = [
  {
    n: "1",
    title: "Þú velur erindi af vandamálalista",
    description:
      "Skráðu þig inn með rafrænum skilríkjum og farðu í viðeigandi ferli eftir einkennum.",
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
      "Ef svör benda til alvarlegra veikinda færð þú strax leiðbeiningar um rétt úrræði.",
  },
  {
    n: "4",
    title: "Læknir metur og leggur til meðferð",
    description:
      "Læknir fer yfir svörin og leggur til viðeigandi meðferð út frá sínu læknisfræðilega mati.",
  },
  {
    n: "5",
    title: "Niðurstaða, ráðleggingar og lyfseðill",
    description:
      "Þú færð skriflega niðurstöðu og ráðleggingar — og lyfseðill fer rafrænt í lyfjagátt ef þörf er á.",
  },
];

const stats = [
  {
    value: "2 klst.",
    label:
      "Flest erindi afgreidd innan tveggja klukkustunda á opnunartíma.",
  },
  {
    value: "0 km",
    label:
      "Engin óþarfa ferðalög — þjónustan er aðgengileg um land allt.",
  },
  {
    value: "10–22",
    label:
      "Opið alla daga. Beiðnum sem berast eftir kl. 22 er svarað daginn eftir.",
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
              Aðgengileg og skilvirk{" "}
              <span className="text-[var(--primary)]">læknisþjónusta</span>
            </h1>
            <p className="mt-6 text-lg text-slate-600 max-w-2xl">
              Fjarlækningar er íslensk fjarlækningaþjónusta fyrir einföld og
              afmörkuð erindi. Sama þjónusta og á læknastofu — sömu spurningar og
              sömu vandamál — en skilvirkari leið til að leysa þau og styttri
              biðlistar. Þú svarar spurningalista heima og læknir svarar innan
              tveggja klukkustunda.
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              {["Svar innan 2 klst.", "Opið alla daga 10–22", "Óháð staðsetningu"].map(
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
              Algeng erindi leyst innan tveggja klukkustunda
            </h2>
            <p className="mt-4 text-slate-600">
              Spurningalistar sérhannaðir í samstarfi við íslenska
              sérfræðilækna, með innbyggðum öryggisspurningum. Ferlið er hannað
              eins og viðtal við lækni.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {erindi.map((s) => (
              <div
                key={s.slug}
                className="bg-white rounded-2xl border border-slate-200 p-6 hover:shadow-lg hover:border-brand-cyan transition-all"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/erindi-icons/${s.slug}.svg`}
                  alt=""
                  width={48}
                  height={48}
                  className="w-12 h-12 mb-4"
                />
                <h3 className="text-lg font-semibold text-slate-900 mb-2">
                  {s.title}
                </h3>
                <p className="text-sm text-slate-600">{s.description}</p>
              </div>
            ))}
          </div>
          <p className="mt-8 text-sm text-slate-500">
            Auk þess læknisvottorð tengt vandamálum sem sinnt hefur verið í
            gegnum Fjarlækningar. Listinn lengist jafnt og þétt eftir því sem
            þjónustan þróast — sjá{" "}
            <Link
              href="/thjonusta"
              className="text-[var(--primary)] font-medium hover:underline"
            >
              alla þjónustu
            </Link>
            .
          </p>
        </div>
      </section>

      {/* Stats */}
      <section className="py-20 bg-[var(--background)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900">
              Aukið aðgengi fyrir sjúklinga, hagræðing fyrir kerfið
            </h2>
            <p className="mt-4 text-slate-600">
              Þú sækir þjónustuna hvar sem þú ert stödd eða staddur. Markmiðið er
              að stytta biðlista heilsugæslunnar með því að leysa algengustu
              erindin í gegnum Fjarlækningar.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
            {stats.map((stat) => (
              <div
                key={stat.value}
                className="bg-white rounded-2xl border border-slate-200 p-8"
              >
                <div className="text-4xl font-extrabold text-[var(--primary)]">
                  {stat.value}
                </div>
                <p className="mt-3 text-slate-600">{stat.label}</p>
              </div>
            ))}
          </div>
          <p className="mt-8 text-sm text-slate-500">
            Alvarleg einkenni fá strax leiðbeiningar um rétt úrræði.
          </p>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900">
              Ferlið frá upphafi til enda
            </h2>
            <p className="mt-4 text-slate-600">
              Þú svarar spurningalista heima eða þar sem þú ert stödd eða
              staddur — læknir svarar erindum innan tveggja klukkustunda á
              opnunartíma.
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
              og flest erindi afgreidd innan tveggja klukkustunda á opnunartíma.
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
