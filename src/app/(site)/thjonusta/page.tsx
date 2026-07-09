import type { Metadata } from "next";
import MedaliaButton from "../../components/MedaliaButton";

export const metadata: Metadata = {
  title: "Þjónusta — Fjarlækningar ehf.",
  description:
    "Algeng heilsugæsluerindi leyst í gegnum örugga sjúklingagátt Medalia — spurningalistar samdir af læknum, sjálfspróf heima og lyfseðill rafrænt í lyfjagátt.",
};

const services = [
  {
    title: "Kvef, hósti og hálsbólga",
    description:
      "Greining og meðferð við helstu öndunarfærakvillum.",
  },
  {
    title: "Þvagfæra- og leggangasýkingar",
    description:
      "Greining og meðferð — með þvagstrimli heima þegar við á.",
  },
  {
    title: "Frunsa",
    description:
      "Greining og meðferð við endurtekinni frunsu.",
  },
  {
    title: "Frjókornaofnæmi",
    description:
      "Greining og meðferð við árstíðabundnu ofnæmi.",
  },
  {
    title: "Lyfjaendurnýjun",
    description:
      "Endurnýjun á föstum lyfjum — þó ekki ávanabindandi lyfjum.",
  },
  {
    title: "Getnaðarvörn",
    description:
      "Mat og ráðgjöf um getnaðarvarnir.",
  },
];

const features = [
  {
    title: "Ósamtíma þjónusta",
    description:
      "Þú svarar markvissum spurningalista þegar þér hentar — læknir yfirfer þegar honum hentar. Ekkert myndsímtal nauðsynlegt.",
  },
  {
    title: "Spurningalistar samdir af læknum",
    description:
      "Hver spurningalisti er saminn af læknum utan um sitt erindi, með innbyggðum öryggisspurningum sem vísa alvarlegum einkennum strax í rétta þjónustu.",
  },
  {
    title: "Sjálfspróf heima",
    description:
      "Þegar sjálfspróf bætir greiningu er þér leiðbeint að taka það — þvagstrimil, strep-próf eða CRP — og skrá niðurstöðuna beint í gáttina.",
  },
  {
    title: "Lyfseðill og heimsending",
    description:
      "Læknir staðfestir meðferð og lyfseðill fer rafrænt í lyfjagátt. Heimsending lyfja og sjálfsprófa í samstarfi við Lyfju þar sem hún er í boði.",
  },
];

export default function ThjonustaPage() {
  return (
    <>
      <section className="bg-gradient-to-br from-brand-cyan-subtle to-white py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-slate-900">
            Þjónusta
          </h1>
          <p className="mt-6 text-lg text-slate-600 max-w-2xl mx-auto">
            Fjarlækningar leysa algeng heilsugæsluerindi í gegnum örugga
            sjúklingagátt Medalia — án þess að þú þurfir að mæta á staðinn.
          </p>
        </div>
      </section>

      <section className="py-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mb-10">
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">
              Algeng erindi
            </h2>
            <p className="mt-3 text-slate-600">
              Flest erindi eru afgreidd samdægurs.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {services.map((s) => (
              <div
                key={s.title}
                className="bg-white rounded-2xl border border-slate-200 p-8"
              >
                <h3 className="text-xl font-semibold text-slate-900 mb-3">
                  {s.title}
                </h3>
                <p className="text-slate-600">{s.description}</p>
              </div>
            ))}
          </div>
          <p className="mt-8 text-sm text-slate-500">
            Auk þess njálgur, ristill og risvandamál — og listinn lengist jafnt
            og þétt.
          </p>
        </div>
      </section>

      <section className="py-20 bg-[var(--background)]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mb-10">
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">
              Hvernig þjónustan virkar
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {features.map((f) => (
              <div
                key={f.title}
                className="bg-white rounded-2xl border border-slate-200 p-8"
              >
                <h3 className="text-xl font-semibold text-slate-900 mb-3">
                  {f.title}
                </h3>
                <p className="text-slate-600">{f.description}</p>
              </div>
            ))}
          </div>

          <div className="mt-16 text-center">
            <p className="text-slate-600 mb-6">Tilbúin(n) að senda inn erindi?</p>
            <MedaliaButton size="lg" label="Opna sjúklingagátt" />
          </div>
        </div>
      </section>
    </>
  );
}
